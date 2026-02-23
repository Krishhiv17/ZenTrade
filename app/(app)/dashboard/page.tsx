import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/actions/accounts'
import { getTrades } from '@/actions/trades'
import { redirect } from 'next/navigation'
import { formatCurrency, formatR } from '@/lib/utils'
import EquityMiniChart from '@/components/dashboard/EquityMiniChart'
import Link from 'next/link'
import {
    LayoutDashboard, TrendingUp, TrendingDown,
    AlertTriangle, PlusCircle, Target, ShieldAlert, Activity,
} from 'lucide-react'

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

    // Determine selected account
    const selectedAccId = sp.account ?? activeAccs[0]?.id
    const selectedAcc = accounts.find(a => a.id === selectedAccId) ?? null

    // Fetch trades (per account or all)
    const allTrades = await getTrades(
        isCumulative ? {} : { accountId: selectedAccId, limit: 100 }
    )

    // Today's trades
    const today = new Date().toISOString().split('T')[0]
    const todayTrades = allTrades.filter(t => t.date === today)
    const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0)

    // Overall stats
    const wins = allTrades.filter(t => t.result === 'win').length
    const losses = allTrades.filter(t => t.result === 'loss').length
    const winRate = allTrades.length > 0 ? Math.round((wins / allTrades.length) * 100) : 0
    const rTrades = allTrades.filter(t => t.r_multiple !== null)
    const avgR = rTrades.length > 0
        ? rTrades.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / rTrades.length
        : null

    // Total P&L (cumulative across all accounts or per-account)
    const totalPnl = isCumulative
        ? accounts.reduce((s, a) => s + (a.current_balance - a.account_size), 0)
        : selectedAcc ? selectedAcc.current_balance - selectedAcc.account_size : 0

    // Equity curve data (last 30 days, sorted by date asc)
    const sortedTrades = [...allTrades].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    let runningBalance = isCumulative
        ? accounts.reduce((s, a) => s + a.account_size, 0)
        : selectedAcc?.account_size ?? 0
    const equityData = sortedTrades
        .filter(t => t.balance_after !== null)
        .slice(-30)
        .map(t => ({ date: t.date, balance: t.balance_after! }))
    // Prepend starting balance
    if (equityData.length > 0) {
        equityData.unshift({ date: equityData[0].date, balance: runningBalance })
    }

    // Last flagged trade
    const lastFlagged = allTrades.find(t => t.is_flagged)

    // Daily loss check (per-account only)
    const effectiveDailyLimit = selectedAcc
        ? (selectedAcc.personal_daily_loss_limit ?? selectedAcc.daily_loss_limit ?? null)
        : null
    const personalHit = selectedAcc?.personal_daily_loss_limit && todayPnl < -selectedAcc.personal_daily_loss_limit
    const firmHit = selectedAcc?.daily_loss_limit && todayPnl < -selectedAcc.daily_loss_limit

    // Drawdown
    const drawdownUsed = selectedAcc ? Math.max(selectedAcc.account_size - selectedAcc.current_balance, 0) : 0

    // Days to profit target (at current daily avg)
    const tradingDays = new Set(allTrades.map(t => t.date)).size
    const avgDailyPnl = tradingDays > 0 ? totalPnl / tradingDays : 0
    const daysToTarget = selectedAcc?.profit_target && avgDailyPnl > 0
        ? Math.ceil((selectedAcc.profit_target - Math.max(totalPnl, 0)) / avgDailyPnl)
        : null

    const profitPct = selectedAcc?.profit_target && totalPnl > 0
        ? Math.min((totalPnl / selectedAcc.profit_target) * 100, 100)
        : 0
    const drawdownPct = selectedAcc?.max_drawdown && drawdownUsed > 0
        ? Math.min((drawdownUsed / selectedAcc.max_drawdown) * 100, 100)
        : 0
    const dailyLimitPct = effectiveDailyLimit && todayPnl < 0
        ? Math.min((Math.abs(todayPnl) / effectiveDailyLimit) * 100, 100)
        : 0

    return (
        <div className="animate-fade-in">
            {/* Header + view toggle */}
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
                    {/* Account selector */}
                    {!isCumulative && activeAccs.length > 1 && (
                        <select className="input" style={{ width: 'auto', fontSize: '0.8rem' }}
                            defaultValue={selectedAccId}
                            onChange={e => window.location.href = `/dashboard?account=${e.target.value}`}>
                            {activeAccs.map(a => <option key={a.id} value={a.id}>{a.firm_name}</option>)}
                        </select>
                    )}
                    {/* Per-account / Cumulative toggle */}
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        <Link href={`/dashboard${selectedAccId ? `?account=${selectedAccId}` : ''}`}
                            style={{
                                padding: '5px 14px', fontSize: '0.8rem', textDecoration: 'none',
                                background: !isCumulative ? 'var(--accent)' : 'transparent',
                                color: !isCumulative ? '#fff' : 'var(--text-secondary)',
                                transition: 'all 0.15s',
                            }}>
                            Per Account
                        </Link>
                        <Link href={`/dashboard?view=cumulative`}
                            style={{
                                padding: '5px 14px', fontSize: '0.8rem', textDecoration: 'none',
                                background: isCumulative ? 'var(--accent)' : 'transparent',
                                color: isCumulative ? '#fff' : 'var(--text-secondary)',
                                transition: 'all 0.15s',
                            }}>
                            Cumulative
                        </Link>
                    </div>
                    <Link href="/trades/new" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                        <PlusCircle size={14} /> Log Trade
                    </Link>
                </div>
            </div>

            {/* AI Guard Banner */}
            {lastFlagged && (
                <div style={{ marginBottom: '1.25rem', padding: '10px 14px', background: 'var(--yellow-muted)', border: '1px solid var(--yellow)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
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

            {/* Personal limit warning */}
            {personalHit && !firmHit && (
                <div style={{ marginBottom: '1.25rem', padding: '10px 14px', background: 'rgba(249,115,22,0.12)', border: '1px solid var(--orange)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <AlertTriangle size={16} color="var(--orange)" />
                    <span style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '0.875rem' }}>Personal daily limit reached — consider stopping for today.</span>
                </div>
            )}

            {/* Firm limit warning */}
            {firmHit && (
                <div style={{ marginBottom: '1.25rem', padding: '10px 14px', background: 'var(--red-muted)', border: '1px solid var(--red)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <AlertTriangle size={16} color="var(--red)" />
                    <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '0.875rem' }}>🔴 Firm daily loss limit breached — stop trading for today.</span>
                </div>
            )}

            {/* Empty state */}
            {accounts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>
                        No accounts yet. <Link href="/accounts" style={{ color: 'var(--accent)' }}>Create one</Link> to get started.
                    </p>
                </div>
            ) : (
                <>
                    {/* Metric cards row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {/* Total P&L */}
                        <div className="card" style={{ borderLeft: `3px solid ${totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}` }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total P&L</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
                            </div>
                        </div>

                        {/* Today's P&L */}
                        <div className="card" style={{ borderLeft: `3px solid ${todayPnl >= 0 ? 'var(--green)' : 'var(--red)'}` }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Today&apos;s P&L</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                {todayPnl >= 0 ? '+' : ''}{formatCurrency(todayPnl)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{todayTrades.length} trade{todayTrades.length !== 1 ? 's' : ''}</div>
                        </div>

                        {/* Win Rate */}
                        <div className="card">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Win Rate</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>{winRate}%</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{wins}W · {losses}L · {allTrades.length - wins - losses}BE</div>
                        </div>

                        {/* Avg R */}
                        <div className="card">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Avg R</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: avgR !== null ? (avgR >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)' }}>
                                {avgR !== null ? formatR(avgR) : '—'}
                            </div>
                        </div>

                        {/* Current Balance */}
                        {!isCumulative && selectedAcc && (
                            <div className="card">
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Balance</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatCurrency(selectedAcc.current_balance)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Started at {formatCurrency(selectedAcc.account_size)}</div>
                            </div>
                        )}

                        {/* Total trades */}
                        <div className="card">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Trades</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{allTrades.length}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{tradingDays} day{tradingDays !== 1 ? 's' : ''} traded</div>
                        </div>
                    </div>

                    {/* Rule gauges + equity chart — 2 col grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {/* Equity curve */}
                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                                <Activity size={14} color="var(--accent)" />
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Equity Curve</span>
                                {daysToTarget !== null && (
                                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        ~{daysToTarget}d to target at current rate
                                    </span>
                                )}
                            </div>
                            <EquityMiniChart data={equityData} accountSize={selectedAcc?.account_size ?? 0} />
                        </div>

                        {/* Rule gauges */}
                        {!isCumulative && selectedAcc && (
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Target size={14} color="var(--accent)" /> Account Rules
                                </div>

                                {/* Profit target */}
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

                                {/* Max drawdown */}
                                {selectedAcc.max_drawdown && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7125rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                            <span>Drawdown Used</span>
                                            <span style={{ color: drawdownPct > 70 ? 'var(--red)' : 'var(--yellow)' }}>
                                                {formatCurrency(drawdownUsed)} / {formatCurrency(selectedAcc.max_drawdown)}
                                            </span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3 }}>
                                            <div style={{ height: '100%', width: `${drawdownPct}%`, background: drawdownPct > 70 ? 'var(--red)' : 'var(--yellow)', borderRadius: 3, transition: 'width 0.4s' }} />
                                        </div>
                                    </div>
                                )}

                                {/* Daily loss limit */}
                                {effectiveDailyLimit && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7125rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                            <span>Daily Loss Used {selectedAcc.personal_daily_loss_limit ? '(Personal)' : '(Firm)'}</span>
                                            <span style={{ color: dailyLimitPct > 80 ? 'var(--red)' : dailyLimitPct > 50 ? 'var(--orange)' : 'var(--green)' }}>
                                                {formatCurrency(Math.abs(Math.min(todayPnl, 0)))} / {formatCurrency(effectiveDailyLimit)}
                                            </span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3 }}>
                                            <div style={{
                                                height: '100%', width: `${dailyLimitPct}%`,
                                                background: dailyLimitPct > 80 ? 'var(--red)' : dailyLimitPct > 50 ? 'var(--orange)' : 'var(--green)',
                                                borderRadius: 3, transition: 'width 0.4s'
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                            {formatCurrency(effectiveDailyLimit - Math.abs(Math.min(todayPnl, 0)))} remaining today
                                        </div>
                                    </div>
                                )}

                                {/* Consistency rule */}
                                {selectedAcc.consistency_rule && (
                                    <div style={{ padding: '8px 10px', background: 'var(--yellow-muted)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--yellow)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                                        {selectedAcc.consistency_rule}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Recent trades */}
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
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, background: 'var(--bg-elevated)' }}>
                                        {t.is_flagged && <AlertTriangle size={11} color="var(--yellow)" />}
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 72 }}>
                                            {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span style={{ fontWeight: 600, fontSize: '0.8125rem', width: 36 }}>{t.ticker}</span>
                                        <span className={`badge ${t.direction === 'long' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.6rem' }}>
                                            {t.direction === 'long' ? '▲ L' : '▼ S'}
                                        </span>
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
            )}
        </div>
    )
}
