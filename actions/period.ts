'use server'

import { createClient } from '@/lib/supabase/server'
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
    type DisciplineFactors,
} from '@/lib/domain/discipline'
import { getGroqClient, COACH_MODEL } from '@/lib/groq'
import type { Trade } from '@/lib/supabase/types'

export type PeriodType = 'week' | 'month'

export interface PeriodDay {
    date: string
    score: number
    netPnl: number
    trades: number
}

export interface PeriodWrapped {
    hasData: boolean
    accountId: string | null
    accountName: string | null
    period: PeriodType
    startDate: string
    endDate: string
    label: string
    score: number | null       // average daily discipline over trading days
    tiers: DisciplineTiers | null
    netPnl: number
    winRate: number
    tradeCount: number
    tradingDays: number
    disciplinedDays: number
    bestDay: PeriodDay | null
    worstDay: PeriodDay | null
    days: PeriodDay[]
}

// ─── date helpers ───────────────────────────────────────────
function addDays(dateStr: string, n: number): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
}
function rangeFor(period: PeriodType, start: string): { startDate: string; endDate: string; label: string } {
    if (period === 'week') {
        const endDate = addDays(start, 6)
        const label = `Week of ${new Date(start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        return { startDate: start, endDate, label }
    }
    // month: normalize start to the 1st
    const first = start.slice(0, 7) + '-01'
    const d = new Date(first + 'T00:00:00Z')
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
    const label = new Date(first + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return { startDate: first, endDate: end, label }
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

// Shared: resolve account + rules + the per-day computed results for a range.
async function loadPeriod(accountId?: string, period: PeriodType = 'week', start = '') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const accounts = await getAccounts()
    const activeAccs = accounts.filter(a => a.status === 'active')
    const account = accounts.find(a => a.id === (accountId ?? activeAccs[0]?.id)) ?? null
    if (!account) return null

    const { startDate, endDate, label } = rangeFor(period, start)
    const [playbook, allTrades] = await Promise.all([
        getPlaybook(),
        getTrades({ accountId: account.id, limit: 1000 }),
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

    const inRange = allTrades.filter(t => {
        const sd = t.session_date ?? t.date
        return sd >= startDate && sd <= endDate
    })

    const byDate = new Map<string, Trade[]>()
    for (const t of inRange) {
        const k = t.session_date ?? t.date
        const arr = byDate.get(k) ?? []
        arr.push(t)
        byDate.set(k, arr)
    }

    const perDay: { date: string; score: number; factors: DisciplineFactors; netPnl: number; trades: Trade[] }[] = []
    for (const [date, ts] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const r = computeDisciplineScore(ts.map(toDisc), rules)
        if (r.score === null || !r.factors) continue
        perDay.push({ date, score: r.score, factors: r.factors, netPnl: ts.reduce((s, t) => s + t.pnl, 0), trades: ts })
    }

    return { account, rules, startDate, endDate, label, perDay, inRange }
}

export async function getPeriodWrapped(accountId?: string, period: PeriodType = 'week', start = ''): Promise<PeriodWrapped> {
    const loaded = await loadPeriod(accountId, period, start)
    const base: PeriodWrapped = {
        hasData: false, accountId: null, accountName: null, period, startDate: start, endDate: start,
        label: '', score: null, tiers: null, netPnl: 0, winRate: 0, tradeCount: 0, tradingDays: 0,
        disciplinedDays: 0, bestDay: null, worstDay: null, days: [],
    }
    if (!loaded) return base

    const { account, startDate, endDate, label, perDay, inRange } = loaded
    if (perDay.length === 0) {
        return { ...base, hasData: false, accountId: account.id, accountName: account.firm_name, startDate, endDate, label }
    }

    // ── Period discipline — TOUGH BUT FAIR (blackbox; server-only) ──
    // Trading discipline is asymmetric: one tilt/revenge day can undo a month.
    // So (1) weight bad days heavier (they compound), and (2) pull the score
    // toward the single worst day. A consistent clean period is unaffected;
    // one blowup meaningfully dents the number.
    const dayWeight = (s: number) => (s < 50 ? 2 : s < DISCIPLINE_STREAK_THRESHOLD ? 1.4 : 1)
    const weights = perDay.map(d => dayWeight(d.score))
    const W = weights.reduce((a, b) => a + b, 0)
    const wAvg = (sel: (d: (typeof perDay)[number]) => number) =>
        perDay.reduce((s, d, i) => s + sel(d) * weights[i], 0) / W

    const weightedMean = wAvg(d => d.score)
    const worstScore = Math.min(...perDay.map(d => d.score))
    const score = Math.round(0.7 * weightedMean + 0.3 * worstScore)

    // Factor tiers use the same downside weighting so a bad-day pattern shows.
    const avgFactors: DisciplineFactors = {
        rule: Math.round(wAvg(d => d.factors.rule)),
        emotion: Math.round(wAvg(d => d.factors.emotion)),
        journaling: Math.round(wAvg(d => d.factors.journaling)),
        playbook: Math.round(wAvg(d => d.factors.playbook)),
        notes: [],
    }
    const wins = inRange.filter(t => t.result === 'win').length
    const losses = inRange.filter(t => t.result === 'loss').length
    const days: PeriodDay[] = perDay.map(d => ({ date: d.date, score: d.score, netPnl: d.netPnl, trades: d.trades.length }))
    const best = days.reduce((m, d) => (d.score > m.score ? d : m))
    const worst = days.reduce((m, d) => (d.score < m.score ? d : m))

    return {
        hasData: true,
        accountId: account.id,
        accountName: account.firm_name,
        period, startDate, endDate, label,
        score,
        tiers: toTiers(avgFactors),
        netPnl: inRange.reduce((s, t) => s + t.pnl, 0),
        winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
        tradeCount: inRange.length,
        tradingDays: perDay.length,
        disciplinedDays: perDay.filter(d => d.score >= DISCIPLINE_STREAK_THRESHOLD).length,
        bestDay: best,
        worstDay: worst,
        days,
    }
}

// ─── AI recap (thorough, per-day grounded, on-demand) ───────
export async function generatePeriodRecap(
    accountId: string, period: PeriodType, start: string,
): Promise<{ success: boolean; feedback?: string; error?: string }> {
    const loaded = await loadPeriod(accountId, period, start)
    if (!loaded) return { success: false, error: 'Not found' }
    if (loaded.perDay.length === 0) return { success: false, error: 'No trades in this period.' }

    const { perDay, label } = loaded
    const dayLines = perDay.map(d => {
        const flags = d.trades.filter(t => t.is_flagged).map(t => t.flag_reason).filter(Boolean)
        const notes = d.trades.map(t => t.psychology_notes).filter(Boolean).slice(0, 2)
        return `${d.date}: discipline ${d.score}/100, net $${d.netPnl.toFixed(0)}, ${d.trades.length} trade(s)`
            + `${flags.length ? `, flags: ${flags.join('; ')}` : ''}`
            + `${notes.length ? `, notes: "${notes.join('" / "')}"` : ''}`
    }).join('\n')

    const prompt = `You are a seasoned, no-nonsense trading performance coach reviewing a trader's ${period === 'week' ? 'WEEK' : 'MONTH'} (${label}). You judge PROCESS and discipline, not P&L.

Here is each trading day (discipline score is 0–100, process-based):
${dayLines}

Write a wise, straightforward, real recap of this ${period}. Requirements:
- Be thorough but tight (4–6 sentences). No filler, no platitudes, no motivational fluff.
- Identify the PATTERN across days — the trajectory, what held up, and the recurring leak (name the specific days/behaviours, e.g. tilt after a loss, drifting out of killzones, thin journaling).
- Be honest and direct, like a coach who respects the trader enough to tell the truth.
- End with ONE concrete focus for next ${period}.
- Do NOT mention any numeric score. Do NOT output markdown or JSON — plain prose only.`

    try {
        const groq = getGroqClient()
        const res = await groq.chat.completions.create({
            model: COACH_MODEL, temperature: 0.4, max_tokens: 400,
            messages: [{ role: 'user', content: prompt }],
        })
        const feedback = res.choices[0]?.message?.content?.trim()
        if (!feedback) return { success: false, error: 'No response' }
        return { success: true, feedback }
    } catch (e) {
        return { success: false, error: (e as Error).message || 'Failed to generate recap' }
    }
}
