'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccounts } from '@/actions/accounts'
import { getTrades } from '@/actions/trades'
import { getPlaybook } from '@/actions/playbook'
import {
    computeDisciplineScore,
    toTiers,
    type DisciplineTrade,
    type DisciplineRules,
    type DisciplineTiers,
} from '@/lib/domain/discipline'
import { currentSessionDate } from '@/lib/domain/drawdown'
import type { Trade } from '@/lib/supabase/types'

export interface ReviewTrade {
    id: string
    ticker: string
    direction: string
    result: string | null
    pnl: number
    r_multiple: number | null
    session: string | null
    is_flagged: boolean
    flag_reason: string | null
}

export interface ReviewData {
    hasAccount: boolean
    accountId: string | null
    accountName: string | null
    accounts: { id: string; firm_name: string }[]
    sessionDate: string
    isToday: boolean
    isLocked: boolean
    // deterministic discipline (blackbox: overall score + coarse tiers/notes)
    score: number | null
    tiers: DisciplineTiers | null
    // day stats
    netPnl: number
    tradeCount: number
    trades: ReviewTrade[]
    // AI coach's take — commentary only, on-demand
    aiFeedback: string | null
}

function parseCount(v: string | undefined | null): number | null {
    if (!v) return null
    const m = String(v).match(/\d+/)
    return m ? parseInt(m[0], 10) : null
}

const toDisc = (t: Trade): DisciplineTrade => ({
    pnl: t.pnl, result: t.result, session: t.session, session_status: t.session_status,
    is_flagged: t.is_flagged, flag_reason: t.flag_reason, psychology_notes: t.psychology_notes,
    ticker: t.ticker, entry_tags: t.entry_tags ?? [], pd_arrays: t.pd_arrays ?? [],
    entry_confluences: t.entry_confluences ?? [], created_at: t.created_at,
})

/** Per-session-day discipline scores for one account — powers the history calendar. */
export async function getDisciplineByDay(
    accountId?: string,
): Promise<{ accountId: string | null; scores: Record<string, number> }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { accountId: null, scores: {} }

    const accounts = await getAccounts()
    const activeAccs = accounts.filter(a => a.status === 'active')
    const account = accounts.find(a => a.id === (accountId ?? activeAccs[0]?.id)) ?? null
    if (!account) return { accountId: null, scores: {} }

    const [playbook, allTrades] = await Promise.all([
        getPlaybook(),
        getTrades({ accountId: account.id, limit: 800 }),
    ])

    const rules: DisciplineRules = {
        maxDailyTrades: account.max_daily_trades,
        dailyLossLimit: account.personal_daily_loss_limit ?? account.daily_loss_limit ?? null,
        killzones: playbook?.killzones ?? [],
        instruments: playbook?.instruments ?? [],
        stopAfterLosses: parseCount(playbook?.risk_rules?.stop_after_losses),
        playbookMaxTrades: parseCount(playbook?.risk_rules?.max_trades_per_day),
        hasPlaybook: !!playbook,
    }

    const byDate = new Map<string, typeof allTrades>()
    for (const t of allTrades) {
        const k = t.session_date ?? t.date
        const arr = byDate.get(k) ?? []
        arr.push(t)
        byDate.set(k, arr)
    }

    const scores: Record<string, number> = {}
    for (const [d, ts] of byDate) {
        const r = computeDisciplineScore(ts.map(toDisc), rules)
        if (r.score !== null) scores[d] = r.score
    }
    return { accountId: account.id, scores }
}

export async function getReviewData(accountId?: string, date?: string): Promise<ReviewData> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const accounts = await getAccounts()
    const activeAccs = accounts.filter(a => a.status === 'active')
    const accountList = activeAccs.map(a => ({ id: a.id, firm_name: a.firm_name }))

    const selectedAccId = accountId ?? activeAccs[0]?.id
    const account = accounts.find(a => a.id === selectedAccId) ?? null

    const empty: ReviewData = {
        hasAccount: false, accountId: null, accountName: null, accounts: accountList,
        sessionDate: new Date().toISOString().split('T')[0], isToday: true, isLocked: false,
        score: null, tiers: null, netPnl: 0, tradeCount: 0, trades: [],
        aiFeedback: null,
    }
    if (!account) return empty

    const nowSession = currentSessionDate(account.daily_reset_time, account.daily_reset_tz)
    const sessionDate = date ?? nowSession

    const [playbook, allTrades] = await Promise.all([
        getPlaybook(),
        getTrades({ accountId: account.id, limit: 400 }),
    ])
    const sessionTrades = allTrades.filter(t => (t.session_date ?? t.date) === sessionDate)

    const dailyLossLimit = account.personal_daily_loss_limit ?? account.daily_loss_limit ?? null
    const rules: DisciplineRules = {
        maxDailyTrades: account.max_daily_trades,
        dailyLossLimit,
        killzones: playbook?.killzones ?? [],
        instruments: playbook?.instruments ?? [],
        stopAfterLosses: parseCount(playbook?.risk_rules?.stop_after_losses),
        playbookMaxTrades: parseCount(playbook?.risk_rules?.max_trades_per_day),
        hasPlaybook: !!playbook,
    }
    const disc = computeDisciplineScore(sessionTrades.map(toDisc), rules)

    const { data: summary } = await supabase
        .from('daily_summaries')
        .select('is_locked, ai_feedback')
        .eq('account_id', account.id)
        .eq('date', sessionDate)
        .maybeSingle()

    const trades: ReviewTrade[] = [...sessionTrades]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(t => ({
            id: t.id, ticker: t.ticker, direction: t.direction, result: t.result,
            pnl: t.pnl, r_multiple: t.r_multiple, session: t.session,
            is_flagged: t.is_flagged, flag_reason: t.flag_reason,
        }))

    return {
        hasAccount: true,
        accountId: account.id,
        accountName: account.firm_name,
        accounts: accountList,
        sessionDate,
        isToday: sessionDate === nowSession,
        isLocked: !!summary?.is_locked,
        score: disc.score,
        tiers: disc.factors ? toTiers(disc.factors) : null,
        netPnl: sessionTrades.reduce((s, t) => s + t.pnl, 0),
        tradeCount: sessionTrades.length,
        trades,
        aiFeedback: summary?.ai_feedback ?? null,
    }
}
