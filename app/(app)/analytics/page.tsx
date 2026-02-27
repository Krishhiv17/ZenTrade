import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/actions/accounts'
import { getTrades } from '@/actions/trades'
import { getProfile } from '@/actions/profile'
import { redirect } from 'next/navigation'
import { formatCurrency, formatR } from '@/lib/utils'
import WinRatePie from '@/components/dashboard/WinRatePie'
import SessionChart from '@/components/dashboard/SessionChart'
import DirectionChart from '@/components/dashboard/DirectionChart'
import MonthCalendar from '@/components/analytics/MonthCalendar'
import FullEquityCurve from '@/components/analytics/FullEquityCurve'
import TimeframeChart from '@/components/analytics/TimeframeChart'
import MacroChart from '@/components/analytics/MacroChart'
import DurationChart from '@/components/analytics/DurationChart'
import Link from 'next/link'
import {
    BarChart2, TrendingUp, Activity, Award, Calendar, Layers, Activity as MacroIcon, Timer
} from 'lucide-react'

export default async function AnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ account?: string; view?: 'cumulative' }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const profile = await getProfile()
    const userTimezone = profile?.timezone || 'America/New_York'

    const sp = await searchParams
    const isCumulative = sp.view === 'cumulative'

    const accounts = await getAccounts()
    const activeAccs = accounts.filter(a => a.status === 'active')

    const selectedAccId = sp.account ?? activeAccs[0]?.id
    const selectedAcc = accounts.find(a => a.id === selectedAccId) ?? null

    // We want ALL trades for analytics (no limit). We sort normally.
    const allTrades = await getTrades(
        isCumulative ? {} : { accountId: selectedAccId }
    )

    // ── Win/Loss stats ──
    const wins = allTrades.filter(t => t.result === 'win').length
    const losses = allTrades.filter(t => t.result === 'loss').length
    const bes = allTrades.filter(t => t.result === 'breakeven').length

    // ── Avg win / avg loss ──
    const winTrades = allTrades.filter(t => t.pnl > 0)
    const lossTrades = allTrades.filter(t => t.pnl < 0)
    const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + t.pnl, 0) / winTrades.length : null
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length : null

    // ── Best / worst trade ──
    const bestTrade = allTrades.length > 0 ? allTrades.reduce((m, t) => t.pnl > m.pnl ? t : m) : null
    const worstTrade = allTrades.length > 0 ? allTrades.reduce((m, t) => t.pnl < m.pnl ? t : m) : null

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

    const sectionTitle = (icon: React.ReactNode, label: string) => (
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.875rem' }}>
            {icon} {label}
        </div>
    )

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BarChart2 size={20} color="var(--accent)" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Analytics</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
                            {isCumulative ? 'All accounts combined' : (selectedAcc?.firm_name ?? 'No active account')}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!isCumulative && activeAccs.length > 1 && (
                        <select className="input" style={{ width: 'auto', fontSize: '0.8rem' }}
                            defaultValue={selectedAccId}
                            onChange={e => { (window as Window).location.href = `/analytics?account=${e.target.value}` }}>
                            {activeAccs.map(a => <option key={a.id} value={a.id}>{a.firm_name}</option>)}
                        </select>
                    )}
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        <Link href={`/analytics${selectedAccId ? `?account=${selectedAccId}` : ''}`}
                            style={{ padding: '5px 14px', fontSize: '0.8rem', textDecoration: 'none', background: !isCumulative ? 'var(--accent)' : 'transparent', color: !isCumulative ? '#fff' : 'var(--text-secondary)' }}>
                            Per Account
                        </Link>
                        <Link href="/analytics?view=cumulative"
                            style={{ padding: '5px 14px', fontSize: '0.8rem', textDecoration: 'none', background: isCumulative ? 'var(--accent)' : 'transparent', color: isCumulative ? '#fff' : 'var(--text-secondary)' }}>
                            Cumulative
                        </Link>
                    </div>
                </div>
            </div>

            {allTrades.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No trade data available for analytics.</p>
                </div>
            ) : (
                <>
                    {/* Row 1: Calendar */}
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <MonthCalendar data={allTrades.map(t => ({ date: t.date, pnl: t.pnl }))} timezone={userTimezone} />
                    </div>

                    {/* Row 2: Full Equity Curve */}
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        {sectionTitle(<TrendingUp size={14} color="var(--accent)" />, 'Full Equity Curve')}
                        {(() => {
                            const startBal = isCumulative ? accounts.reduce((s, a) => s + a.account_size, 0) : (selectedAcc?.account_size ?? 0)
                            const sortedTradesAnalytics = [...allTrades].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))

                            let runningBal = startBal
                            let peakBal = startBal
                            const equityDataAnalytics = sortedTradesAnalytics.map((t, index) => {
                                // Track intraday peak
                                if (!isCumulative && selectedAcc?.drawdown_type === 'intraday') {
                                    const floatingPeak = (t as any).max_unrealized_pnl !== null ? (t as any).max_unrealized_pnl : t.pnl
                                    const highestPoint = Math.max(t.pnl, floatingPeak)
                                    if (runningBal + highestPoint > peakBal) {
                                        peakBal = runningBal + highestPoint
                                    }
                                }

                                runningBal += t.pnl

                                // Track EOD peak
                                if (!isCumulative && selectedAcc?.drawdown_type === 'eod') {
                                    const isEod = index === sortedTradesAnalytics.length - 1 || sortedTradesAnalytics[index + 1].date !== t.date
                                    if (isEod && runningBal > peakBal) {
                                        peakBal = runningBal
                                    }
                                }

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

                            // Add starting point
                            if (equityDataAnalytics.length > 0) {
                                const previousBal = equityDataAnalytics[0].balance - sortedTradesAnalytics[0].pnl
                                let initialDrawdownLimit: number | undefined = undefined
                                if (!isCumulative && selectedAcc?.max_drawdown) {
                                    initialDrawdownLimit = Math.max(0, selectedAcc.account_size - selectedAcc.max_drawdown)
                                }
                                equityDataAnalytics.unshift({ date: equityDataAnalytics[0].date, balance: previousBal, drawdownLimit: initialDrawdownLimit })
                            }

                            return (
                                <FullEquityCurve
                                    data={equityDataAnalytics}
                                    startBalance={startBal}
                                />
                            )
                        })()}
                    </div>

                    {/* 3-Column Grid for Metrics (Win Rate, Directions, Stats, Session, Timeframe, Macro) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                        <div className="card">
                            {sectionTitle(<BarChart2 size={14} color="var(--accent)" />, 'Win / Loss Distribution')}
                            <WinRatePie wins={wins} losses={losses} breakevens={bes} />
                        </div>

                        <div className="card">
                            {sectionTitle(<TrendingUp size={14} color="var(--accent)" />, 'Long vs Short Results')}
                            <DirectionChart longWins={longWins} longLosses={longLosses} shortWins={shortWins} shortLosses={shortLosses} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Long:</span> <span style={{ color: 'var(--green)' }}>{longWins}W</span> / <span style={{ color: 'var(--red)' }}>{longLosses}L</span>
                                    {(longWins + longLosses) > 0 && <span style={{ color: 'var(--text-muted)' }}> ({Math.round(longWins / (longWins + longLosses) * 100)}%)</span>}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Short:</span> <span style={{ color: 'var(--green)' }}>{shortWins}W</span> / <span style={{ color: 'var(--red)' }}>{shortLosses}L</span>
                                    {(shortWins + shortLosses) > 0 && <span style={{ color: 'var(--text-muted)' }}> ({Math.round(shortWins / (shortWins + shortLosses) * 100)}%)</span>}
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            {sectionTitle(<Award size={14} color="var(--accent)" />, 'Trade Statistics')}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg Win</span>
                                    <span style={{ fontWeight: 700, color: 'var(--green)' }}>{avgWin !== null ? formatCurrency(avgWin) : '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg Loss</span>
                                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>{avgLoss !== null ? formatCurrency(avgLoss) : '—'}</span>
                                </div>
                                {avgWin !== null && avgLoss !== null && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reward / Risk</span>
                                        <span style={{ fontWeight: 700 }}>{(avgWin / Math.abs(avgLoss)).toFixed(2)}x</span>
                                    </div>
                                )}
                                {bestTrade && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Best Trade</span>
                                        <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                                            {formatCurrency(bestTrade.pnl)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{bestTrade.ticker}</span>
                                        </span>
                                    </div>
                                )}
                                {worstTrade && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Worst Trade</span>
                                        <span style={{ fontWeight: 700, color: 'var(--red)' }}>
                                            {formatCurrency(worstTrade.pnl)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{worstTrade.ticker}</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* 4. Session */}
                        <div className="card">
                            {sectionTitle(<Activity size={14} color="var(--accent)" />, 'Performance by Session')}
                            {bestSession && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: -8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Award size={11} color="var(--green)" /> Best: <span style={{ color: 'var(--green)' }}>{bestSession.session}</span> ({formatCurrency(bestSession.pnl)})
                                </div>
                            )}
                            <SessionChart data={sessionData} />
                        </div>

                        <div className="card">
                            {sectionTitle(<Layers size={14} color="var(--accent)" />, 'P&L By Timeframe')}
                            <TimeframeChart data={allTrades.map(t => ({ exec_timeframe: t.exec_timeframe, pnl: t.pnl }))} />
                        </div>

                        <div className="card">
                            {sectionTitle(<MacroIcon size={14} color="var(--accent)" />, 'P&L By Macro Setup')}
                            <MacroChart data={allTrades.map(t => ({ macro: t.macro, pnl: t.pnl }))} />
                        </div>

                        <div className="card" style={{ gridColumn: 'span 2' }}>
                            {sectionTitle(<Timer size={14} color="var(--accent)" />, 'Hold Time vs Profitability')}
                            <DurationChart trades={allTrades} />
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
