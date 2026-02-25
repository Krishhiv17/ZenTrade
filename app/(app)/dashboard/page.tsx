import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/actions/accounts'
import { getTrades } from '@/actions/trades'
import { redirect } from 'next/navigation'
import { formatCurrency, formatR } from '@/lib/utils'
import EquityMiniChart from '@/components/dashboard/EquityMiniChart'
import NewsWidget from '@/components/dashboard/NewsWidget'
import Link from 'next/link'
import { Trophy, TrendingUp, AlertTriangle, ShieldAlert, Crosshair, Ban, LayoutDashboard, PlusCircle, Calendar as CalendarIcon, Clock, Target, Maximize, TrendingDown, Activity, Flame } from 'lucide-react'
import AccountSwitcher from '../../../components/accounts/AccountSwitcher'

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ account?: string; view?: 'cumulative' }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const sp = await searchParams
    const isCumulative = sp.view === 'cumulative'

    const accounts = await getAccounts()
    const activeAccs = accounts.filter(a => a.status === 'active')

    const selectedAccId = sp.account ?? activeAccs[0]?.id
    const selectedAcc = accounts.find(a => a.id === selectedAccId) ?? null

    const allTrades = await getTrades(
        isCumulative ? {} : { accountId: selectedAccId, limit: 200 }
    )

    // ── Date helpers ──
    const today = new Date().toISOString().split('T')[0]
    const todayTrades = allTrades.filter(t => t.date === today)
    const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0)

    // ── Win/Loss stats ──
    const wins = allTrades.filter(t => t.result === 'win').length
    const losses = allTrades.filter(t => t.result === 'loss').length
    const bes = allTrades.filter(t => t.result === 'breakeven').length
    const winRate = allTrades.length > 0 ? Math.round((wins / allTrades.length) * 100) : 0
    const rTrades = allTrades.filter(t => t.r_multiple !== null)
    const avgR = rTrades.length > 0
        ? rTrades.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / rTrades.length
        : null

    // ── P&L ──
    const totalPnl = isCumulative
        ? accounts.reduce((s, a) => s + (a.current_balance - a.account_size), 0)
        : selectedAcc ? selectedAcc.current_balance - selectedAcc.account_size : 0

    // ── Profit factor ──
    const grossWin = allTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
    const grossLoss = Math.abs(allTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
    const profitFactor = grossLoss > 0 ? parseFloat((grossWin / grossLoss).toFixed(2)) : null

    // ── Avg win / avg loss ──
    const winTrades = allTrades.filter(t => t.pnl > 0)
    const lossTrades = allTrades.filter(t => t.pnl < 0)
    const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + t.pnl, 0) / winTrades.length : null
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length : null

    // ── Best / worst trade ──
    const bestTrade = allTrades.length > 0 ? allTrades.reduce((m, t) => t.pnl > m.pnl ? t : m) : null
    const worstTrade = allTrades.length > 0 ? allTrades.reduce((m, t) => t.pnl < m.pnl ? t : m) : null

    // ── Current streak ──
    let streak = 0
    const sortedByDate = [...allTrades].sort((a, b) =>
        b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    for (const t of sortedByDate) {
        if (streak === 0) { streak = t.pnl >= 0 ? 1 : -1; continue }
        if (streak > 0 && t.pnl >= 0) streak++
        else if (streak < 0 && t.pnl < 0) streak--
        else break
    }

    // ── Long vs Short ──
    const longWins = allTrades.filter(t => t.direction === 'long' && t.result === 'win').length
    const longLosses = allTrades.filter(t => t.direction === 'long' && t.result === 'loss').length
    const shortWins = allTrades.filter(t => t.direction === 'short' && t.result === 'win').length
    const shortLosses = allTrades.filter(t => t.direction === 'short' && t.result === 'loss').length

    // ── Session performance ──
    const sessionMap = new Map<string, { pnl: number; trades: number }>()
    for (const t of allTrades) {
        const s = (t as { session?: string | null }).session ?? 'Unknown'
        if (!s || s === 'Unknown') continue
        const cur = sessionMap.get(s) ?? { pnl: 0, trades: 0 }
        sessionMap.set(s, { pnl: cur.pnl + t.pnl, trades: cur.trades + 1 })
    }
    const sessionData = Array.from(sessionMap.entries()).map(([session, v]) => ({ session, ...v }))
    const bestSession = sessionData.length > 0 ? sessionData.reduce((m, s) => s.pnl > m.pnl ? s : m) : null

    // ── Equity curve ──
    const sortedTrades = [...allTrades].sort((a, b) =>
        a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    const startBal = isCumulative
        ? accounts.reduce((s, a) => s + a.account_size, 0)
        : selectedAcc?.account_size ?? 0

    let runningBal = startBal
    let peakBal = startBal
    const allEquityPoints = sortedTrades.map((t, index) => {
        // Track Intraday Peak (moves up mid-trade)
        if (!isCumulative && selectedAcc?.drawdown_type === 'intraday') {
            const floatingPeak = (t as any).max_unrealized_pnl !== null ? (t as any).max_unrealized_pnl : t.pnl
            const highestPoint = Math.max(t.pnl, floatingPeak)
            if (runningBal + highestPoint > peakBal) {
                peakBal = runningBal + highestPoint
            }
        }

        runningBal += t.pnl

        // Track EOD Peak (moves up only at end-of-day)
        if (!isCumulative && selectedAcc?.drawdown_type === 'eod') {
            const isEod = index === sortedTrades.length - 1 || sortedTrades[index + 1].date !== t.date
            if (isEod && runningBal > peakBal) {
                peakBal = runningBal
            }
        }

        // Calculate mathematical stop-out limit at this exact moment in history
        let drawdownLimit: number | undefined = undefined
        if (!isCumulative && selectedAcc?.max_drawdown) {
            if (selectedAcc.drawdown_type === 'static') {
                drawdownLimit = Math.max(0, selectedAcc.account_size - selectedAcc.max_drawdown)
            } else {
                drawdownLimit = Math.max(0, Math.min(peakBal - selectedAcc.max_drawdown, selectedAcc.account_size))
            }
        }

        return { date: t.date, balance: runningBal, drawdownLimit }
    })

    const equityData = allEquityPoints.slice(-30)
    if (equityData.length > 0) {
        const firstIncludedTradeIndex = sortedTrades.length - equityData.length
        const firstIncludedTrade = sortedTrades[firstIncludedTradeIndex]
        const previousBal = equityData[0].balance - firstIncludedTrade.pnl

        let initialDrawdownLimit: number | undefined = undefined
        if (!isCumulative && selectedAcc?.max_drawdown) {
            if (firstIncludedTradeIndex > 0) {
                initialDrawdownLimit = allEquityPoints[firstIncludedTradeIndex - 1].drawdownLimit
            } else {
                initialDrawdownLimit = Math.max(0, selectedAcc.account_size - selectedAcc.max_drawdown)
            }
        }

        equityData.unshift({ date: equityData[0].date, balance: previousBal, drawdownLimit: initialDrawdownLimit })
    } else {
        let initialDrawdownLimit: number | undefined = undefined
        if (!isCumulative && selectedAcc?.max_drawdown) {
            initialDrawdownLimit = Math.max(0, selectedAcc.account_size - selectedAcc.max_drawdown)
        }
        equityData.push({ date: new Date().toISOString().split('T')[0], balance: startBal, drawdownLimit: initialDrawdownLimit })
    }

    // ── Consistency rule violation check ──
    // Rule: no single day's P&L > X% of total profit
    const consistencyPct = selectedAcc?.consistency_rule as number | null ?? null
    let consistencyViolation: { violated: boolean; worstDay: string; worstDayPnl: number; worstDayPct: number; neededTotalPnl: number } | null = null
    if (consistencyPct && totalPnl > 0 && !isCumulative) {
        // Group trades by day
        const dayMap = new Map<string, number>()
        for (const t of allTrades) {
            dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + t.pnl)
        }
        let maxDayPnl = 0, maxDayDate = ''
        for (const [date, pnl] of dayMap.entries()) {
            if (pnl > maxDayPnl) { maxDayPnl = pnl; maxDayDate = date }
        }

        // Use 3000 as minimum reference profit for consistency if actual profit is lower
        const consistencyRefPnl = Math.max(totalPnl, 3000)
        const maxDayPct = (maxDayPnl / consistencyRefPnl) * 100

        if (maxDayPct > consistencyPct) {
            // To fix violation: totalPnl must be at least (maxDayPnl / (consistencyPct/100))
            const neededTotalPnl = maxDayPnl / (consistencyPct / 100)
            consistencyViolation = {
                violated: true,
                worstDay: maxDayDate,
                worstDayPnl: maxDayPnl,
                worstDayPct: Math.round(maxDayPct),
                neededTotalPnl,
            }
        }
    }

    // ── Flags & limits ──
    const lastFlagged = allTrades.find(t => t.is_flagged)
    const effectiveDailyLimit = selectedAcc
        ? (selectedAcc.personal_daily_loss_limit ?? selectedAcc.daily_loss_limit ?? null)
        : null
    const personalHit = selectedAcc?.personal_daily_loss_limit && todayPnl < -selectedAcc.personal_daily_loss_limit
    const firmHit = selectedAcc?.daily_loss_limit && todayPnl < -selectedAcc.daily_loss_limit

    let drawdownUsed = 0
    if (selectedAcc && selectedAcc.max_drawdown) {
        const drawdownLevel = selectedAcc.drawdown_type !== 'static'
            ? Math.min(selectedAcc.peak_eod_balance - selectedAcc.max_drawdown, selectedAcc.account_size)
            : selectedAcc.account_size - selectedAcc.max_drawdown

        const buffer = selectedAcc.current_balance - drawdownLevel
        drawdownUsed = Math.max(selectedAcc.max_drawdown - buffer, 0)
    }

    const tradingDays = new Set(allTrades.map(t => t.date)).size
    const avgDailyPnl = tradingDays > 0 ? totalPnl / tradingDays : 0
    const daysToTarget = selectedAcc?.profit_target && avgDailyPnl > 0
        ? Math.ceil((selectedAcc.profit_target - Math.max(totalPnl, 0)) / avgDailyPnl)
        : null

    const profitPct = selectedAcc?.profit_target && totalPnl > 0 ? Math.min((totalPnl / selectedAcc.profit_target) * 100, 100) : 0
    const drawdownPct = selectedAcc?.max_drawdown && drawdownUsed > 0 ? Math.min((drawdownUsed / selectedAcc.max_drawdown) * 100, 100) : 0
    const dailyLimitPct = effectiveDailyLimit && todayPnl < 0 ? Math.min((Math.abs(todayPnl) / effectiveDailyLimit) * 100, 100) : 0

    // ── Shared card styles ──
    const sectionTitle = (
        icon: React.ReactNode, label: string
    ): React.ReactNode => (
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.875rem' }}>
            {icon} {label}
        </div>
    )

    return (
        <div className="animate-fade-in">
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LayoutDashboard size={20} color="var(--accent)" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Dashboard</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
                            {isCumulative ? 'All accounts combined' : (selectedAcc?.firm_name ?? 'No active account')}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!isCumulative && activeAccs.length > 1 && (
                        <AccountSwitcher accounts={activeAccs} selectedId={selectedAccId} />
                    )}
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        <Link href={`/dashboard${selectedAccId ? `?account=${selectedAccId}` : ''}`}
                            style={{ padding: '5px 14px', fontSize: '0.8rem', textDecoration: 'none', background: !isCumulative ? 'var(--accent)' : 'transparent', color: !isCumulative ? '#fff' : 'var(--text-secondary)' }}>
                            Per Account
                        </Link>
                        <Link href="/dashboard?view=cumulative"
                            style={{ padding: '5px 14px', fontSize: '0.8rem', textDecoration: 'none', background: isCumulative ? 'var(--accent)' : 'transparent', color: isCumulative ? '#fff' : 'var(--text-secondary)' }}>
                            Cumulative
                        </Link>
                    </div>
                    <Link href="/trades/new" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                        <PlusCircle size={14} /> Log Trade
                    </Link>
                </div>
            </div>

            {/* ── Banners ── */}
            {/* Consistency rule violation */}
            {consistencyViolation?.violated && (
                <div style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.5)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} color="#a855f7" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <div style={{ color: '#a855f7', fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>
                            ⚠ Consistency Rule Violated — {consistencyViolation.worstDayPct}% of profit in one day
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                            Your best day ({new Date(consistencyViolation.worstDay).toLocaleDateString()}) made {formatCurrency(consistencyViolation.worstDayPnl)},
                            which is {consistencyViolation.worstDayPct}% of total profit — exceeds your {consistencyPct}% rule.
                            To satisfy the rule, grow total profit to at least {formatCurrency(consistencyViolation.neededTotalPnl)} (+{formatCurrency(consistencyViolation.neededTotalPnl - totalPnl)} more).
                        </div>
                    </div>
                </div>
            )}

            {/* AI Guard */}
            {lastFlagged && (
                <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'var(--yellow-muted)', border: '1px solid var(--yellow)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <ShieldAlert size={16} color="var(--yellow)" />
                    <div style={{ flex: 1 }}>
                        <span style={{ color: 'var(--yellow)', fontWeight: 600, fontSize: '0.875rem' }}>AI Guard: </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{lastFlagged.flag_reason}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {lastFlagged.ticker} · {new Date(lastFlagged.date).toLocaleDateString()}
                    </span>
                </div>
            )}

            {/* Personal limit */}
            {personalHit && !firmHit && (
                <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'rgba(249,115,22,0.12)', border: '1px solid var(--orange)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <AlertTriangle size={16} color="var(--orange)" />
                    <span style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '0.875rem' }}>Personal daily limit reached — consider stopping for today.</span>
                </div>
            )}

            {/* Firm limit */}
            {firmHit && (
                <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'var(--red-muted)', border: '1px solid var(--red)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <AlertTriangle size={16} color="var(--red)" />
                    <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '0.875rem' }}>🔴 Firm daily loss limit breached — stop trading for today.</span>
                </div>
            )}

            {accounts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>
                        No accounts yet. <Link href="/accounts" style={{ color: 'var(--accent)' }}>Create one</Link> to get started.
                    </p>
                </div>
            ) : (
                <>
                    {/* ── Metric cards ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

                        {/* Total P&L */}
                        <div className="card" style={{ borderLeft: `3px solid ${totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}` }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total P&L</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
                            </div>
                        </div>

                        {/* Today's P&L */}
                        <div className="card" style={{ borderLeft: `3px solid ${todayPnl >= 0 ? 'var(--green)' : 'var(--red)'}` }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Today&apos;s P&L</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                {todayPnl >= 0 ? '+' : ''}{formatCurrency(todayPnl)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{todayTrades.length} trade{todayTrades.length !== 1 ? 's' : ''}</div>
                        </div>

                        {/* Win Rate */}
                        <div className="card">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Win Rate</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>{winRate}%</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{wins}W · {losses}L · {bes}BE</div>
                        </div>

                        {/* Avg R */}
                        <div className="card">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Avg R</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: avgR !== null ? (avgR >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)' }}>
                                {avgR !== null ? formatR(avgR) : '—'}
                            </div>
                        </div>

                        {/* Profit Factor */}
                        <div className="card">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Profit Factor</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: profitFactor !== null ? (profitFactor >= 1 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)' }}>
                                {profitFactor ?? '—'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Gross win / |loss|</div>
                        </div>

                        {/* Streak */}
                        <div className="card">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Current Streak</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: streak >= 0 ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {streak !== 0 && <Flame size={16} color={streak > 0 ? 'var(--green)' : 'var(--red)'} />}
                                {Math.abs(streak) > 0 ? `${Math.abs(streak)}${streak > 0 ? 'W' : 'L'}` : '—'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{streak > 0 ? 'winning' : streak < 0 ? 'losing' : 'no trades'}</div>
                        </div>

                        {/* Balance */}
                        {!isCumulative && selectedAcc && (
                            <div className="card">
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Balance</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatCurrency(selectedAcc.current_balance)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Started {formatCurrency(selectedAcc.account_size)}</div>
                            </div>
                        )}

                        {/* Trades */}
                        <div className="card">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Trades</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{allTrades.length}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{tradingDays} day{tradingDays !== 1 ? 's' : ''} traded</div>
                        </div>

                    </div>

                    {/* ── Equity + Rules ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem', marginBottom: '1.25rem' }}>
                        <div className="card">
                            {sectionTitle(<Activity size={14} color="var(--accent)" />, 'Equity Curve')}
                            {daysToTarget !== null && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: -8, marginBottom: 8 }}>~{daysToTarget}d to target at current rate</div>
                            )}
                            <EquityMiniChart data={equityData} accountSize={selectedAcc?.account_size ?? 0} />
                        </div>

                        {!isCumulative && selectedAcc && (
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {sectionTitle(<Target size={14} color="var(--accent)" />, 'Account Rules')}

                                {selectedAcc.profit_target && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7125rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                            <span>Profit Target</span>
                                            <span style={{ color: 'var(--green)' }}>{formatCurrency(Math.max(totalPnl, 0))} / {formatCurrency(selectedAcc.profit_target)}</span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3 }}>
                                            <div style={{ height: '100%', width: `${profitPct}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 0.4s' }} />
                                        </div>
                                    </div>
                                )}

                                {selectedAcc?.max_drawdown && (
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 8, color: 'var(--text-secondary)' }}>
                                            <span>{selectedAcc.drawdown_type === 'static' ? 'Total Loss Limit Used' : 'Trailing Drawdown Used'}</span>
                                            <span style={{ fontWeight: 600, color: drawdownUsed > selectedAcc.max_drawdown ? 'var(--red)' : 'var(--yellow)' }}>
                                                {formatCurrency(drawdownUsed)} / {formatCurrency(selectedAcc.max_drawdown)}
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${drawdownPct}%`, background: drawdownPct > 90 ? 'var(--red)' : 'var(--yellow)' }} />
                                        </div>
                                    </div>
                                )}

                                {effectiveDailyLimit && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7125rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                            <span>Daily Loss {selectedAcc.personal_daily_loss_limit ? '(Personal)' : '(Firm)'}</span>
                                            <span style={{ color: dailyLimitPct > 80 ? 'var(--red)' : dailyLimitPct > 50 ? 'var(--orange)' : 'var(--green)' }}>
                                                {formatCurrency(Math.abs(Math.min(todayPnl, 0)))} / {formatCurrency(effectiveDailyLimit)}
                                            </span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3 }}>
                                            <div style={{ height: '100%', width: `${dailyLimitPct}%`, background: dailyLimitPct > 80 ? 'var(--red)' : dailyLimitPct > 50 ? 'var(--orange)' : 'var(--green)', borderRadius: 3 }} />
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatCurrency(effectiveDailyLimit - Math.abs(Math.min(todayPnl, 0)))} remaining today</div>
                                    </div>
                                )}

                                {consistencyPct && (
                                    <div style={{ padding: '8px 10px', background: consistencyViolation?.violated ? 'rgba(168,85,247,0.12)' : 'var(--yellow-muted)', border: `1px solid ${consistencyViolation?.violated ? 'rgba(168,85,247,0.5)' : 'var(--yellow)'}`, borderRadius: 6, fontSize: '0.75rem', color: consistencyViolation?.violated ? '#a855f7' : 'var(--yellow)' }}>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <AlertTriangle size={12} />
                                            {consistencyViolation?.violated
                                                ? `Consistency violated: ${consistencyViolation.worstDayPct}% in one day (limit: ${consistencyPct}%)`
                                                : `Consistency: max ${consistencyPct}% of profit per day`}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Market Conditions / News Widget ── */}
                    <NewsWidget />

                    {/* ── Recent trades ── */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TrendingUp size={14} color="var(--accent)" /> Recent Trades
                            </div>
                            <Link href="/trades" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
                        </div>
                        {allTrades.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>No trades yet. <Link href="/trades/new" style={{ color: 'var(--accent)' }}>Log your first trade</Link>.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {allTrades.slice(0, 8).map(t => (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, background: 'var(--bg-elevated)' }}>
                                        {t.is_flagged && <AlertTriangle size={11} color="var(--yellow)" />}
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 72 }}>
                                            {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span style={{ fontWeight: 600, fontSize: '0.8125rem', width: 36 }}>{t.ticker}</span>
                                        <span className={`badge ${t.direction === 'long' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.6rem' }}>
                                            {t.direction === 'long' ? '▲ L' : '▼ S'}
                                        </span>
                                        {(t as { session?: string | null }).session && (
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                {(t as { session?: string | null }).session}
                                            </span>
                                        )}
                                        <span style={{ fontWeight: 700, color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)', marginLeft: 'auto', fontSize: '0.8125rem' }}>
                                            {t.pnl >= 0 ? '+' : ''}{formatCurrency(t.pnl)}
                                        </span>
                                        {t.r_multiple !== null && (
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 44, textAlign: 'right' }}>
                                                {formatR(t.r_multiple)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )
            }
        </div >
    )
}
