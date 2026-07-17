'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccounts } from '@/actions/accounts'
import { getTrades } from '@/actions/trades'
import { getPlaybook } from '@/actions/playbook'
import {
    computeDisciplineScore,
    toTiers,
    DISCIPLINE_STREAK_THRESHOLD,
    type DisciplineTrade,
    type DisciplineRules,
    type DisciplineTiers,
} from '@/lib/domain/discipline'
import { currentSessionDate } from '@/lib/domain/drawdown'
import type { Trade } from '@/lib/supabase/types'

export interface TodayTrade {
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

export interface TodayOverview {
    hasAccount: boolean
    accounts: { id: string; firm_name: string }[]
    selectedAccountId: string | null
    accountName: string | null
    date: string
    // discipline (blackbox: overall score + coarse tiers/notes only)
    score: number | null
    tiers: DisciplineTiers | null
    streak: number
    // snapshot
    balance: number
    todayPnl: number
    dailyLossLimit: number | null
    dailyLossRemaining: number | null
    drawdownBuffer: number | null
    tradesToday: number
    maxDailyTrades: number | null
    killzones: string[]
    hasPlaybook: boolean
    // list
    todayTrades: TodayTrade[]
}

function parseCount(v: string | undefined | null): number | null {
    if (!v) return null
    const m = String(v).match(/\d+/)
    return m ? parseInt(m[0], 10) : null
}

const toDisc = (t: Trade): DisciplineTrade => ({
    pnl: t.pnl,
    result: t.result,
    session: t.session,
    session_status: t.session_status,
    is_flagged: t.is_flagged,
    flag_reason: t.flag_reason,
    psychology_notes: t.psychology_notes,
    ticker: t.ticker,
    entry_tags: t.entry_tags ?? [],
    pd_arrays: t.pd_arrays ?? [],
    entry_confluences: t.entry_confluences ?? [],
    created_at: t.created_at,
})

export async function getTodayOverview(accountId?: string): Promise<TodayOverview> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const accounts = await getAccounts()
    const activeAccs = accounts.filter(a => a.status === 'active')
    const today = new Date().toISOString().split('T')[0]
    const accountList = activeAccs.map(a => ({ id: a.id, firm_name: a.firm_name }))

    const selectedAccId = accountId ?? activeAccs[0]?.id
    const account = accounts.find(a => a.id === selectedAccId) ?? null

    if (!account) {
        return {
            hasAccount: false, accounts: accountList, selectedAccountId: null, accountName: null,
            date: today, score: null, tiers: null, streak: 0, balance: 0, todayPnl: 0,
            dailyLossLimit: null, dailyLossRemaining: null, drawdownBuffer: null, tradesToday: 0,
            maxDailyTrades: null, killzones: [], hasPlaybook: false, todayTrades: [],
        }
    }

    const [playbook, trades] = await Promise.all([
        getPlaybook(),
        getTrades({ accountId: account.id, limit: 400 }),
    ])

    const dailyLossLimit = account.personal_daily_loss_limit ?? account.daily_loss_limit ?? null
    const killzones = playbook?.killzones ?? []

    const rules: DisciplineRules = {
        maxDailyTrades: account.max_daily_trades,
        dailyLossLimit,
        killzones,
        instruments: playbook?.instruments ?? [],
        stopAfterLosses: parseCount(playbook?.risk_rules?.stop_after_losses),
        playbookMaxTrades: parseCount(playbook?.risk_rules?.max_trades_per_day),
        hasPlaybook: !!playbook,
    }

    // The current trading day (session), per this account's reset boundary.
    const sessionToday = currentSessionDate(account.daily_reset_time, account.daily_reset_tz)

    // Group trades by SESSION date.
    const byDate = new Map<string, Trade[]>()
    for (const t of trades) {
        const key = t.session_date ?? t.date
        const arr = byDate.get(key) ?? []
        arr.push(t)
        byDate.set(key, arr)
    }

    // Today's score.
    const todayList = byDate.get(sessionToday) ?? []
    const todayResult = computeDisciplineScore(todayList.map(toDisc), rules)

    // Streak: consecutive trading days (most recent first) at/above threshold.
    const tradingDates = [...byDate.keys()].sort((a, b) => b.localeCompare(a))
    let streak = 0
    for (const d of tradingDates) {
        const r = computeDisciplineScore((byDate.get(d) ?? []).map(toDisc), rules)
        if (r.score === null) continue
        if (r.score >= DISCIPLINE_STREAK_THRESHOLD) streak++
        else break
    }

    // Snapshot.
    const todayPnl = todayList.reduce((s, t) => s + t.pnl, 0)
    const dailyLossRemaining = dailyLossLimit !== null
        ? Math.max(0, dailyLossLimit - Math.max(0, -todayPnl))
        : null

    // Drawdown buffer from the single domain module (via getAccounts).
    const drawdownBuffer = account.drawdown_buffer !== null
        ? Math.max(0, account.drawdown_buffer)
        : null

    const todayTrades: TodayTrade[] = [...todayList]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(t => ({
            id: t.id, ticker: t.ticker, direction: t.direction, result: t.result,
            pnl: t.pnl, r_multiple: t.r_multiple, session: t.session,
            is_flagged: t.is_flagged, flag_reason: t.flag_reason,
        }))

    return {
        hasAccount: true,
        accounts: accountList,
        selectedAccountId: account.id,
        accountName: account.firm_name,
        date: sessionToday,
        score: todayResult.score,
        tiers: todayResult.factors ? toTiers(todayResult.factors) : null,
        streak,
        balance: account.current_balance,
        todayPnl,
        dailyLossLimit,
        dailyLossRemaining,
        drawdownBuffer,
        tradesToday: todayList.length,
        maxDailyTrades: account.max_daily_trades,
        killzones,
        hasPlaybook: !!playbook,
        todayTrades,
    }
}
