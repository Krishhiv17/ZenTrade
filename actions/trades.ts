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
    pnl: number,
    size: number,
    accountSize: number
): Promise<AIGuardResult> {
    const supabase = await createClient()

    // Fetch last 5 trades for this account, ordered most recent first
    const { data: recentTrades } = await supabase
        .from('trades')
        .select('pnl, created_at, size')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(5)

    const trades = recentTrades ?? []

    // 1. Revenge trade: previous trade was a loss AND this trade was placed < 5 min after
    if (trades.length > 0) {
        const lastTrade = trades[0]
        const lastWasLoss = lastTrade.pnl < 0
        const msSinceLast = Date.now() - new Date(lastTrade.created_at).getTime()
        const minsSinceLast = msSinceLast / 60000
        if (lastWasLoss && minsSinceLast < 5) {
            return { flagged: true, reason: `Revenge trade detected — entered ${minsSinceLast.toFixed(1)} min after a loss.` }
        }
    }

    // 2. Three consecutive losses
    if (trades.length >= 3 && trades.slice(0, 3).every(t => t.pnl < 0)) {
        return { flagged: true, reason: '3 consecutive losses — high emotional risk. Consider stepping away.' }
    }

    // 3. Oversize position: size > 2% account risk rule (size * max_risk_per_contract heuristic)
    //    Simple proxy: if position size > 10 contracts on a < $50k account
    if (size > 10 && accountSize <= 50000) {
        return { flagged: true, reason: `Oversized position: ${size} contracts on a ${accountSize < 50000 ? '$' + accountSize.toLocaleString() : '$50k'} account.` }
    }

    // 4. No flag
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
    const size = parseInt(formData.get('size') as string, 10)
    const entry = parseFloat(formData.get('entry') as string)
    const sl = formData.get('sl') ? parseFloat(formData.get('sl') as string) : null
    const tp_avg = formData.get('tp_avg') ? parseFloat(formData.get('tp_avg') as string) : null
    const pnl = parseFloat(formData.get('pnl') as string)
    const macro = (formData.get('macro') as string) || null
    const exec_tf = (formData.get('exec_timeframe') as string) || null
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

    // ── Server-side calculations ──
    const riskDollars = sl ? calcRiskDollars(entry, sl, size, ticker) : null
    const rMultiple = riskDollars ? calcRMultiple(pnl, riskDollars) : null
    const result = deriveResult(pnl)
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
            exec_timeframe: exec_tf,
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
    const guard = await runAIGuard(user.id, accountId, pnl, size, account.account_size)

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
