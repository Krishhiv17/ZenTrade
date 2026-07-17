'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeDrawdown, type DrawdownTrade } from '@/lib/domain/drawdown'
import { computeDisciplineScore, type DisciplineTrade, type DisciplineRules } from '@/lib/domain/discipline'
import { getPlaybook } from '@/actions/playbook'

function parseCount(v: string | undefined | null): number | null {
    if (!v) return null
    const m = String(v).match(/\d+/)
    return m ? parseInt(m[0], 10) : null
}

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

    // 4. Fetch all trades for this account on this trading day (session date)
    const { data: trades, error: tradesErr } = await supabase
        .from('trades')
        .select('id, pnl, result, session, session_status, is_flagged, flag_reason, psychology_notes, ticker, entry_tags, pd_arrays, entry_confluences, created_at')
        .eq('account_id', accountId)
        .eq('session_date', dateStr)

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

    // 6. Rule breach calculations
    // Daily loss: net P&L for the session below the effective (personal|firm) limit.
    const effectiveDailyLimit = account.personal_daily_loss_limit ?? account.daily_loss_limit ?? null
    const daily_loss_limit_breached = effectiveDailyLimit !== null && net_pnl < -effectiveDailyLimit

    // Max drawdown: the REAL floor (static = size − dd; trailing = peak − dd, capped at size),
    // computed via the single drawdown domain module across all the account's trades.
    let max_drawdown_breached = false
    if (account.max_drawdown !== null) {
        const { data: allTrades } = await supabase
            .from('trades')
            .select('pnl, max_unrealized_pnl, session_date, date, created_at')
            .eq('account_id', accountId)
        const dd = computeDrawdown(
            {
                account_size: account.account_size,
                current_balance: account.current_balance,
                max_drawdown: account.max_drawdown,
                drawdown_type: account.drawdown_type,
            },
            (allTrades ?? []).map((t): DrawdownTrade => ({
                pnl: t.pnl, max_unrealized_pnl: t.max_unrealized_pnl,
                session_date: t.session_date ?? t.date, created_at: t.created_at,
            })),
        )
        max_drawdown_breached = dd.breached
    }

    // 6b. Discipline Score (deterministic, process-first) — persisted at lock.
    const playbook = await getPlaybook()
    const disciplineRules: DisciplineRules = {
        maxDailyTrades: account.max_daily_trades,
        dailyLossLimit: effectiveDailyLimit,
        killzones: playbook?.killzones ?? [],
        instruments: playbook?.instruments ?? [],
        stopAfterLosses: parseCount(playbook?.risk_rules?.stop_after_losses),
        playbookMaxTrades: parseCount(playbook?.risk_rules?.max_trades_per_day),
        hasPlaybook: !!playbook,
    }
    const discipline = computeDisciplineScore(
        trades.map((t): DisciplineTrade => ({
            pnl: t.pnl, result: t.result, session: t.session, session_status: t.session_status,
            is_flagged: t.is_flagged, flag_reason: t.flag_reason, psychology_notes: t.psychology_notes,
            ticker: t.ticker, entry_tags: t.entry_tags ?? [], pd_arrays: t.pd_arrays ?? [],
            entry_confluences: t.entry_confluences ?? [], created_at: t.created_at,
        })),
        disciplineRules,
    )

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
            discipline_score: discipline.score,
            score_factors: discipline.factors,
            is_locked: true // CRITICAL: This now securely locks the day
        }, { onConflict: 'account_id, date' })

    if (insertErr) return { success: false, error: 'Failed to insert daily summary. ' + insertErr.message }

    // 8. Revalidate
    revalidatePath('/today')
    revalidatePath('/today/review')
    revalidatePath('/dashboard')
    revalidatePath('/analytics')
    revalidatePath('/trades/new')

    return { success: true, message: `Successfully finalized and locked EOD for ${dateStr}.` }
}

