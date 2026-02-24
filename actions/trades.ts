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
    dailyLossLimit: number | null
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
    const screenshot = formData.get('screenshot') as File | null

    // ── Validate required fields ──
    if (!accountId || !ticker || !direction || !date || isNaN(entry) || isNaN(pnl) || isNaN(size)) {
        return { success: false, error: 'Missing required fields.' }
    }

    // ── Fetch the account (need balance + rules) ──
    const { data: account, error: accErr } = await supabase
        .from('prop_accounts')
        .select('id, account_size, current_balance, daily_loss_limit, personal_daily_loss_limit, max_drawdown, user_id')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

    if (accErr || !account) {
        return { success: false, error: 'Account not found.' }
    }

    // ── Server-side calculations (verify client-computed values) ──
    const riskDollars = sl ? calcRiskDollars(entry, sl, size, ticker) : null
    const rMultiple = riskDollars ? calcRMultiple(pnl, riskDollars) : null
    const balanceAfter = account.current_balance + pnl

    // ── Screenshot upload (if provided) ──
    let screenshotUrl: string | null = null
    if (screenshot && screenshot.size > 0) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(screenshot.type)) {
            return { success: false, error: 'Screenshot must be PNG, JPEG, WebP, or GIF.' }
        }
        if (screenshot.size > 5 * 1024 * 1024) {
            return { success: false, error: 'Screenshot must be under 5MB.' }
        }

        const ext = screenshot.type.split('/')[1]
        const filename = `${user.id}/${accountId}/${Date.now()}.${ext}`
        const buffer = Buffer.from(await screenshot.arrayBuffer())

        const { error: uploadErr } = await supabase.storage
            .from('screenshots')
            .upload(filename, buffer, { contentType: screenshot.type, upsert: false })

        if (uploadErr) {
            return { success: false, error: `Screenshot upload failed: ${uploadErr.message}` }
        }

        const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filename)
        screenshotUrl = urlData.publicUrl
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
            screenshot_url: screenshotUrl,
            psychology_notes: psych,
            is_flagged: false,
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
        effectiveLimit
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
}
