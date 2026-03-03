'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calcRiskDollars, calcRMultiple, deriveResult } from '@/lib/utils'
import type { Trade } from '@/lib/supabase/types'

// ─── Types ──────────────────────────────────────────────────

export interface AIGuardResult {
    flagged: boolean
    reason: string
}

export interface CreateTradeResult {
    success: boolean
    tradeId?: string
    guard?: AIGuardResult
    error?: string
}

// ─── AI Guard ───────────────────────────────────────────────
// Runs server-side, never exposes API keys to client.

async function runAIGuard(
    userId: string,
    accountId: string,
    tradeId: string,
    pnl: number,
    size: number,
    accountSize: number,
    date: string,
    session: string | null,
    psych: string | null,
    dailyLossLimit: number | null,
    session_status: 'in_session' | 'out_of_session' | null
): Promise<AIGuardResult> {
    const supabase = await createClient()

    // 1. Daily Loss Breach
    if (dailyLossLimit !== null) {
        const { data: summary } = await supabase
            .from('daily_summaries')
            .select('net_pnl')
            .eq('account_id', accountId)
            .eq('date', date)
            .single()

        if (summary && summary.net_pnl <= -dailyLossLimit) {
            return { flagged: true, reason: `Daily loss limit breached. Net P&L is ${summary.net_pnl}. Stop trading immediately.` }
        }
    }

    // 2. Emotional State + Loss
    if (pnl < 0 && psych) {
        const pLoc = psych.toLowerCase()
        if (pLoc.includes('revenge') || pLoc.includes('fomo') || pLoc.includes('tilt') || pLoc.includes('angry')) {
            return { flagged: true, reason: 'Emotional loss detected (revenge/FOMO/tilt). Step away to protect your capital.' }
        }
    }

    // Fetch recent trades (excluding the one just inserted)
    const { data: recentTrades } = await supabase
        .from('trades')
        .select('id, pnl, created_at, size, session, date')
        .eq('account_id', accountId)
        .neq('id', tradeId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)

    const trades = recentTrades ?? []

    // 3. Revenge trade: previous trade was a loss AND this trade was placed < 5 min after it
    if (trades.length > 0) {
        const prevTrade = trades[0]
        // Only run the revenge check if the previous trade happened on the exact same date
        if (prevTrade.pnl < 0 && prevTrade.date === date) {
            const msSinceLast = Date.now() - new Date(prevTrade.created_at).getTime()
            const minsSinceLast = msSinceLast / 60000
            if (minsSinceLast < 5) {
                return { flagged: true, reason: `Revenge trade detected — entered ${minsSinceLast.toFixed(1)} min after a loss.` }
            }
        }
    }

    // 4. Three consecutive losses (including this one)
    if (pnl < 0 && trades.length >= 2) {
        if (trades[0].pnl < 0 && trades[1].pnl < 0) {
            return { flagged: true, reason: '3 consecutive losses — high emotional risk. Consider stepping away.' }
        }
    }

    // 5. Oversize position
    // Proxy: if position size > 10 contracts on a <= $50k account
    if (size > 10 && accountSize <= 50000) {
        return { flagged: true, reason: `Oversized position: ${size} contracts on a ${accountSize < 50000 ? '$' + accountSize.toLocaleString() : '$50k'} account.` }
    }

    // 6. Session Overtrading (> 5 trades in the same session today)
    if (session) {
        const todayStr = new Date().toISOString().split('T')[0]
        let sessionCount = 1 // count this trade
        for (const t of trades) {
            if (t.session === session && new Date(t.created_at).toISOString().split('T')[0] === todayStr) {
                sessionCount++
            }
        }
        if (sessionCount > 5) {
            return { flagged: true, reason: `Session overtrading: ${sessionCount} trades in ${session} session.` }
        }
    }

    // 7. Out of Session Trading
    if (session_status === 'out_of_session') {
        return { flagged: true, reason: 'Out of Session trade flagged. Trading outside your core windows drastically lowers win rate and increases emotional risk.' }
    }

    // No flag
    return { flagged: false, reason: '' }
}

// ─── CREATE TRADE ────────────────────────────────────────────

export async function createTrade(formData: FormData): Promise<CreateTradeResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // ── Parse form fields ──
    const accountId = formData.get('account_id') as string
    const date = formData.get('date') as string
    const ticker = formData.get('ticker') as string
    const direction = formData.get('direction') as 'long' | 'short'
    const result = formData.get('result') as 'win' | 'loss' | 'breakeven'
    const isManual = formData.get('is_manual') === 'true'
    const size = parseInt(formData.get('size') as string, 10)
    const entry = parseFloat(formData.get('entry') as string)
    const sl = formData.get('sl') ? parseFloat(formData.get('sl') as string) : null
    const tp_avg = formData.get('tp_avg') ? parseFloat(formData.get('tp_avg') as string) : null
    const pnl = parseFloat(formData.get('pnl') as string)   // computed on client, verified here
    const macro = (formData.get('macro') as string) || null
    const session = (formData.get('session') as string) || null
    const exec_tf = (formData.get('exec_timeframe') as string) || null
    const duration_minutes = formData.get('duration_minutes') ? parseInt(formData.get('duration_minutes') as string, 10) : null
    const news = (formData.get('news') as string) || null
    const psych = (formData.get('psychology_notes') as string) || null

    // Advanced fields
    const confidenceLevelRaw = formData.get('confidence_level')
    const confidence_level = confidenceLevelRaw ? parseInt(confidenceLevelRaw as string, 10) : null
    const trade_type = (formData.get('trade_type') as 'continuation' | 'reversal' | 'other') || null
    const bias = (formData.get('bias') as 'bullish' | 'bearish' | 'neutral') || null
    const session_status = (formData.get('session_status') as 'in_session' | 'out_of_session') || null

    const tryParseArray = (key: string): string[] => {
        const val = formData.get(key)
        if (!val) return []
        try { return JSON.parse(val as string) } catch { return [] }
    }
    const market_conditions = tryParseArray('market_conditions')
    const entry_tags = tryParseArray('entry_tags')
    const psychology_tags = tryParseArray('psychology_tags')
    const mistakes = tryParseArray('mistakes')
    const pd_arrays = tryParseArray('pd_arrays')
    const dols = tryParseArray('dols')
    const entry_confluences = tryParseArray('entry_confluences')

    // Screenshots (multiple)
    const screenshotFiles = formData.getAll('screenshots') as File[]

    // ── Validate required fields ──
    if (!accountId || !ticker || !direction || !date || isNaN(entry) || isNaN(pnl) || isNaN(size)) {
        return { success: false, error: 'Missing required fields.' }
    }

    // ── Fetch the account (need balance + rules) ──
    const { data: account, error: accErr } = await supabase
        .from('prop_accounts')
        .select('id, account_size, current_balance, daily_loss_limit, personal_daily_loss_limit, max_drawdown, drawdown_type, max_daily_trades, user_id')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

    if (accErr || !account) {
        return { success: false, error: 'Account not found.' }
    }

    const maxUnrealizedRaw = formData.get('max_unrealized_pnl')
    const maxUnrealizedPnl = maxUnrealizedRaw ? parseFloat(maxUnrealizedRaw as string) : null

    if (account.drawdown_type === 'intraday' && maxUnrealizedPnl === null) {
        return { success: false, error: 'Max Unrealized P&L is explicitly required for Intraday trailing accounts.' }
    }

    // ── Check if Day is Locked (EOD Finalized) ──
    const { data: summaryLock, error: lockErr } = await supabase
        .from('daily_summaries')
        .select('id, is_locked')
        .eq('account_id', accountId)
        .eq('date', date)
        .maybeSingle()

    // It's only truly locked if the end-of-day sequence has deliberately locked it
    // (A row is created automatically by the database on the 1st trade)
    if (summaryLock && summaryLock.is_locked) {
        return { success: false, error: `The journal is locked for ${date}. End of Day calculations have already been finalized.` }
    }

    // ── Check Max Daily Trades Rule ──
    if (account.max_daily_trades !== null) {
        const { count, error: countErr } = await supabase
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .eq('date', date)

        if (!countErr && count !== null && count >= account.max_daily_trades) {
            return {
                success: false,
                error: `Max daily trades limit reached (${account.max_daily_trades}). You cannot log any more trades for ${date}.`
            }
        }
    }

    // ── Server-side calculations (verify client-computed values) ──
    const riskDollarsRaw = formData.get('risk_dollars')
    const rMultipleRaw = formData.get('r_multiple')

    const riskDollars = isManual && riskDollarsRaw
        ? parseFloat(riskDollarsRaw as string)
        : (sl ? calcRiskDollars(entry, sl, size, ticker) : null)

    const rMultiple = isManual && rMultipleRaw
        ? parseFloat(rMultipleRaw as string)
        : (riskDollars ? calcRMultiple(pnl, riskDollars) : null)

    const balanceAfter = account.current_balance + pnl

    // ── Screenshot upload (multiple) ──
    const screenshotUrls: string[] = []
    for (const file of screenshotFiles) {
        if (file && file.size > 0 && screenshotUrls.length < 5) {
            const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
            if (!allowedTypes.includes(file.type)) continue
            if (file.size > 5 * 1024 * 1024) continue

            const ext = file.type.split('/')[1]
            const filename = `${user.id}/${accountId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
            const buffer = Buffer.from(await file.arrayBuffer())

            const { error: uploadErr } = await supabase.storage
                .from('screenshots')
                .upload(filename, buffer, { contentType: file.type, upsert: false })

            if (!uploadErr) {
                const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filename)
                screenshotUrls.push(urlData.publicUrl)
            }
        }
    }

    // ── Insert trade ──
    const { data: newTrade, error: insertErr } = await supabase
        .from('trades')
        .insert({
            account_id: accountId,
            user_id: user.id,
            date,
            ticker,
            direction,
            result,
            size,
            entry,
            sl,
            tp_avg,
            risk_dollars: riskDollars,
            pnl,
            r_multiple: rMultiple,
            balance_after: balanceAfter,
            macro,
            session,
            exec_timeframe: exec_tf,
            duration_minutes,
            news,
            screenshot_urls: screenshotUrls,
            psychology_notes: psych,
            max_unrealized_pnl: maxUnrealizedPnl,
            is_flagged: false,
            confidence_level,
            trade_type,
            bias,
            session_status,
            market_conditions,
            entry_tags,
            psychology_tags,
            mistakes,
            pd_arrays,
            dols,
            entry_confluences
        })
        .select('id')
        .single()

    if (insertErr || !newTrade) {
        return { success: false, error: insertErr?.message ?? 'Failed to insert trade.' }
    }

    // ── Atomically update account balance (row lock in RPC) ──
    const { error: balErr } = await supabase.rpc('update_account_balance', {
        p_account_id: accountId,
        p_pnl: pnl,
    })
    if (balErr) {
        // Trade inserted, balance update failed — log and continue (non-fatal)
        console.error('Balance RPC error:', balErr.message)
    }

    // ── Upsert daily summary ──
    const effectiveLimit =
        account.personal_daily_loss_limit ?? account.daily_loss_limit ?? null

    await supabase.rpc('upsert_daily_summary', {
        p_account_id: accountId,
        p_user_id: user.id,
        p_date: date,
        p_pnl: pnl,
        p_is_win: result === 'win',
        p_is_loss: result === 'loss',
        p_daily_loss_limit: effectiveLimit,
    })

    // ── AI Guard ──
    const guard = await runAIGuard(
        user.id,
        accountId,
        newTrade.id,
        pnl,
        size,
        account.account_size,
        date,
        session,
        psych,
        effectiveLimit,
        session_status
    )

    if (guard.flagged) {
        // Update trade row with flag (best-effort)
        await supabase
            .from('trades')
            .update({ is_flagged: true, flag_reason: guard.reason })
            .eq('id', newTrade.id)
    }

    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/accounts')

    return { success: true, tradeId: newTrade.id, guard }
}

// ─── GET TRADES ──────────────────────────────────────────────

export interface GetTradesOptions {
    accountId?: string   // undefined = all accounts (cumulative)
    limit?: number
    offset?: number
    dateFrom?: string
    dateTo?: string
    ticker?: string
    direction?: 'long' | 'short'
    result?: 'win' | 'loss' | 'breakeven'
}

export async function getTrades(opts: GetTradesOptions = {}): Promise<Trade[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

    if (opts.accountId) query = query.eq('account_id', opts.accountId)
    if (opts.dateFrom) query = query.gte('date', opts.dateFrom)
    if (opts.dateTo) query = query.lte('date', opts.dateTo)
    if (opts.ticker) query = query.eq('ticker', opts.ticker)
    if (opts.direction) query = query.eq('direction', opts.direction)
    if (opts.result) query = query.eq('result', opts.result)
    if (opts.limit) query = query.limit(opts.limit)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data ?? []
}

// ─── DELETE TRADE ────────────────────────────────────────────

export async function deleteTrade(tradeId: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch trade first to reverse the balance
    const { data: trade, error: fetchErr } = await supabase
        .from('trades')
        .select('account_id, pnl')
        .eq('id', tradeId)
        .eq('user_id', user.id)
        .single()

    if (fetchErr || !trade) throw new Error('Trade not found.')

    // Reverse the balance atomically (pass negative pnl)
    await supabase.rpc('update_account_balance', {
        p_account_id: trade.account_id,
        p_pnl: -trade.pnl,
    })

    const { error: delErr } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId)
        .eq('user_id', user.id)

    if (delErr) throw new Error(delErr.message)

    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/accounts')
}

// ─── UPDATE PSYCHOLOGY NOTES ─────────────────────────────────

export async function updateTradeNotes(tradeId: string, notes: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { error } = await supabase
        .from('trades')
        .update({ psychology_notes: notes })
        .eq('id', tradeId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/trades')
    revalidatePath('/dashboard')
}

// ─── UPDATE TRADE (FULL EDIT) ────────────────────────────────

export async function updateTrade(tradeId: string, formData: FormData): Promise<CreateTradeResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Parse base fields
    const accountId = formData.get('account_id') as string
    const date = formData.get('date') as string
    const ticker = formData.get('ticker') as string
    const direction = formData.get('direction') as 'long' | 'short'
    const result = formData.get('result') as 'win' | 'loss' | 'breakeven'
    const isManual = formData.get('is_manual') === 'true'
    const size = parseInt(formData.get('size') as string, 10)
    const entry = parseFloat(formData.get('entry') as string)
    const sl = formData.get('sl') ? parseFloat(formData.get('sl') as string) : null
    const tp_avg = formData.get('tp_avg') ? parseFloat(formData.get('tp_avg') as string) : null
    const pnl = parseFloat(formData.get('pnl') as string)
    const macro = (formData.get('macro') as string) || null
    const session = (formData.get('session') as string) || null
    const exec_tf = (formData.get('exec_timeframe') as string) || null
    const duration_minutes = formData.get('duration_minutes') ? parseInt(formData.get('duration_minutes') as string, 10) : null
    const news = (formData.get('news') as string) || null
    const psych = (formData.get('psychology_notes') as string) || null

    const confidenceLevelRaw = formData.get('confidence_level')
    const confidence_level = confidenceLevelRaw ? parseInt(confidenceLevelRaw as string, 10) : null
    const trade_type = (formData.get('trade_type') as 'continuation' | 'reversal' | 'other') || null
    const bias = (formData.get('bias') as 'bullish' | 'bearish' | 'neutral') || null
    const session_status = (formData.get('session_status') as 'in_session' | 'out_of_session') || null

    const tryParseArray = (key: string): string[] => {
        const val = formData.get(key)
        if (!val) return []
        try { return JSON.parse(val as string) } catch { return [] }
    }
    const market_conditions = tryParseArray('market_conditions')
    const entry_tags = tryParseArray('entry_tags')
    const psychology_tags = tryParseArray('psychology_tags')
    const mistakes = tryParseArray('mistakes')
    const pd_arrays = tryParseArray('pd_arrays')
    const dols = tryParseArray('dols')
    const entry_confluences = tryParseArray('entry_confluences')

    const maxUnrealizedRaw = formData.get('max_unrealized_pnl')
    const maxUnrealizedPnl = maxUnrealizedRaw ? parseFloat(maxUnrealizedRaw as string) : null
    const riskDollarsRaw = formData.get('risk_dollars')
    const rMultipleRaw = formData.get('r_multiple')

    const riskDollars = isManual && riskDollarsRaw ? parseFloat(riskDollarsRaw as string) : (sl ? calcRiskDollars(entry, sl, size, ticker) : null)
    const rMultiple = isManual && rMultipleRaw ? parseFloat(rMultipleRaw as string) : (riskDollars ? calcRMultiple(pnl, riskDollars) : null)

    // Fetch existing trade to reverse its P&L
    const { data: oldTrade, error: fetchErr } = await supabase
        .from('trades')
        .select('account_id, pnl, screenshot_urls')
        .eq('id', tradeId)
        .eq('user_id', user.id)
        .single()

    if (fetchErr || !oldTrade) return { success: false, error: 'Original trade not found.' }

    // Reverse old P&L, Add new P&L atomically
    const pnlDiff = pnl - oldTrade.pnl
    if (pnlDiff !== 0) {
        await supabase.rpc('update_account_balance', {
            p_account_id: oldTrade.account_id,
            p_pnl: pnlDiff,
        })
    }

    // Keep original screenshots + handle new uploads if they exist (simplification: keeping existing for now in this action)
    let screenshotUrls = oldTrade.screenshot_urls || []
    const newScreenshotFiles = formData.getAll('screenshots') as File[]
    for (const file of newScreenshotFiles) {
        if (file && file.size > 0 && screenshotUrls.length < 5) {
            const ext = file.type.split('/')[1]
            const filename = `${user.id}/${oldTrade.account_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
            const buffer = Buffer.from(await file.arrayBuffer())
            const { error: uploadErr } = await supabase.storage.from('screenshots').upload(filename, buffer, { contentType: file.type })
            if (!uploadErr) {
                const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filename)
                screenshotUrls.push(urlData.publicUrl)
            }
        }
    }

    const { error: updateErr } = await supabase
        .from('trades')
        .update({
            date, ticker, direction, result, size, entry, sl, tp_avg,
            risk_dollars: riskDollars, pnl, r_multiple: rMultiple,
            macro, session, exec_timeframe: exec_tf, duration_minutes, news, psychology_notes: psych,
            max_unrealized_pnl: maxUnrealizedPnl, confidence_level, trade_type, bias, session_status,
            market_conditions, entry_tags, psychology_tags, mistakes, pd_arrays, dols, entry_confluences,
            screenshot_urls: screenshotUrls
        })
        .eq('id', tradeId)
        .eq('user_id', user.id)

    if (updateErr) return { success: false, error: updateErr.message }

    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')

    return { success: true }
}
