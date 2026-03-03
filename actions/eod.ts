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

export async function autoLockEndOfDay() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Find all active accounts
    const { data: accounts } = await supabase
        .from('prop_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')

    if (!accounts || accounts.length === 0) return

    // 1. Get current time in New York
    const nyTimeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })

    const parts = nyTimeFormatter.formatToParts(new Date())
    const nyDate = new Date(`${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:00`)

    // Create Date strings needed
    const todayStr = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`

    // Yesterday
    const yesterdayDate = new Date(nyDate.getTime() - (24 * 60 * 60 * 1000))
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`

    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)

    // If it's 11 PM EST (23:00) or later, today is over and journaling time is up. 
    // If it's before 11 PM EST, we only auto-lock yesterday.
    const datesToCheck: string[] = []

    // Always check yesterday to ensure it was locked
    datesToCheck.push(yesterdayStr)

    // Only check and lock TODAY if it is >= 11 PM EST.
    // Trading stops at 5 PM EST, but we give traders 6 hours to journal.
    if (hour >= 23) {
        datesToCheck.push(todayStr)
    }

    // Check each valid day to ensure it is locked
    for (const d of datesToCheck) {
        for (const account of accounts) {
            // Did they already lock this day?
            const { data: lock } = await supabase
                .from('daily_summaries')
                .select('id, is_locked')
                .eq('account_id', account.id)
                .eq('date', d)
                .maybeSingle()

            // If completely unlocked (or only has an intraday tracking row without the lock flag), finalize it
            if (!lock || !lock.is_locked) {
                await finalizeEndOfDay(account.id, d)
            }
        }
    }
}
