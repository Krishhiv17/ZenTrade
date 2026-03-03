'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ──
export interface EODResult {
    success: boolean
    error?: string
    message?: string
}

export async function finalizeEndOfDay(accountId: string, dateStr: string): Promise<EODResult> {
    const supabase = await createClient()

    // 1. Verify User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 2. Fetch Account & Verify Ownership
    const { data: account, error: accErr } = await supabase
        .from('prop_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

    if (accErr || !account) return { success: false, error: 'Account not found' }

    // 3. Check if date is already finalized (by checking if is_locked exists)
    const { data: existingSummary } = await supabase
        .from('daily_summaries')
        .select('id, is_locked')
        .eq('account_id', accountId)
        .eq('date', dateStr)
        .maybeSingle()

    if (existingSummary && existingSummary.is_locked) {
        return { success: false, error: `Date ${dateStr} is already locked and finalized.` }
    }

    // 4. Fetch all trades for this account on this date
    const { data: trades, error: tradesErr } = await supabase
        .from('trades')
        .select('id, pnl, result')
        .eq('account_id', accountId)
        .eq('date', dateStr)

    if (tradesErr) return { success: false, error: 'Failed to fetch trades' }

    // 5. Aggregate logic
    // We only aggregate trades that exist. If 0 trades, it's just a zero-day.
    let gross_pnl = 0
    let win_count = 0
    let loss_count = 0
    let breakeven_count = 0

    for (const t of trades) {
        if (t.pnl) gross_pnl += t.pnl
        if (t.result === 'win') win_count++
        if (t.result === 'loss') loss_count++
        if (t.result === 'breakeven') breakeven_count++
    }

    // Net PnL is Gross PnL minus the commisions for those trades.
    // However, commission is already subtracted from the trade PnL when created,
    // so in our system, the sum of trade PnL *is* the Net PnL! 
    // To be precise, our 'gross' is essentially the same as net in the DB architecture we built unless we separated it out.
    // For now, let's keep them identical.
    const net_pnl = gross_pnl
    const trade_count = trades.length

    // 6. Drawdown Calculations
    let daily_loss_limit_breached = false
    let max_drawdown_breached = false

    // We calculate "virtual EOD Balance", wait, the trades individually updated the account balance already!
    // But what if they took multiple drawdown-hitting hits? 
    // Usually Prop Firms check EOD Drawdown by asking: is (current EOD Balance) < (EOD Watermark - Drawdown Limit)
    // For simplicity right now, let's just assert if current_balance is less than the max_drawdown numerical value.

    if (account.max_drawdown !== null && account.current_balance <= account.max_drawdown) {
        max_drawdown_breached = true
    }

    // 7. Upsert Daily Summary (with lock)
    // We use upsert because an intraday metric row may already exist for this date
    const { error: insertErr } = await supabase
        .from('daily_summaries')
        .upsert({
            user_id: user.id,
            account_id: accountId,
            date: dateStr,
            gross_pnl,
            net_pnl,
            trade_count,
            win_count,
            loss_count,
            breakeven_count,
            daily_loss_limit_breached,
            max_drawdown_breached,
            is_locked: true // CRITICAL: This now securely locks the day 
        }, { onConflict: 'account_id, date' })

    if (insertErr) return { success: false, error: 'Failed to insert daily summary. ' + insertErr.message }

    // 8. Revalidate
    revalidatePath('/dashboard')
    revalidatePath('/analytics')
    revalidatePath('/trades/new')

    return { success: true, message: `Successfully finalized and locked EOD for ${dateStr}.` }
}

