'use client'

import { updateAccountStatus, deleteAccount } from '@/actions/accounts'
import type { PropAccount } from '@/lib/supabase/types'
import { formatCurrency } from '@/lib/utils'
import { Trophy, Skull, RefreshCw, Trash2, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react'

function AccountStatusBadge({ status }: { status: PropAccount['status'] }) {
    if (status === 'active') return <span className="badge badge-blue">● Active</span>
    if (status === 'passed') return <span className="badge badge-green">🏆 Passed</span>
    if (status === 'blown') return <span className="badge badge-red">💀 Blown</span>
    return null
}

function RuleBar({ label, used, limit, danger }: { label: string; used: number; limit: number; danger?: boolean }) {
    const pct = Math.min((used / limit) * 100, 100)
    const color = danger && pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--yellow)' : 'var(--green)'
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7125rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>{label}</span>
                <span style={{ color }}>{formatCurrency(used)} / {formatCurrency(limit)}</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
            </div>
        </div>
    )
}

export default function AccountsList({ accounts }: { accounts: (PropAccount & { peak_eod_balance: number })[] }) {
    async function handleStatus(id: string, status: 'active' | 'passed' | 'blown') {
        await updateAccountStatus(id, status)
    }
    async function handleDelete(id: string, firmName: string) {
        if (!confirm(`Delete the ${firmName} account? This will also delete all trades linked to it.`)) return
        await deleteAccount(id)
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {accounts.map(acc => {
                const pnl = acc.current_balance - acc.account_size
                let drawdownUsed = 0
                if (acc.max_drawdown) {
                    const drawdownLevel = acc.trailing_drawdown
                        ? Math.min(acc.peak_eod_balance - acc.max_drawdown, acc.account_size)
                        : acc.account_size - acc.max_drawdown

                    const buffer = acc.current_balance - drawdownLevel
                    drawdownUsed = Math.max(acc.max_drawdown - buffer, 0)
                }
                const profitPct = acc.profit_target ? Math.min((pnl / acc.profit_target) * 100, 100) : null

                return (
                    <div key={acc.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{acc.firm_name}</h3>
                                    {acc.account_type !== 'personal' && <AccountStatusBadge status={acc.status} />}
                                    {acc.account_type === 'personal' && <span className="badge" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>Live</span>}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {acc.account_type === 'personal' ? 'Personal/Live' : acc.account_type === 'evaluation' ? 'Evaluation' : 'Funded'} · {formatCurrency(acc.account_size)} · Started {new Date(acc.start_date).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* Balance */}
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Current Balance</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                {formatCurrency(acc.current_balance)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: pnl >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} P&L
                            </div>
                        </div>

                        {/* Progress bars */}
                        <div>
                            {acc.profit_target && profitPct !== null && (
                                <RuleBar label="Profit Target" used={Math.max(pnl, 0)} limit={acc.profit_target} />
                            )}
                            {acc.max_drawdown && (
                                <RuleBar label="Max Drawdown Used" used={Math.max(drawdownUsed, 0)} limit={acc.max_drawdown} danger />
                            )}
                            {acc.daily_loss_limit && (
                                <div style={{ fontSize: '0.7125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <TrendingDown size={12} /> Firm daily limit: {formatCurrency(acc.daily_loss_limit)}
                                    {acc.personal_daily_loss_limit && (
                                        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>· Personal: {formatCurrency(acc.personal_daily_loss_limit)}</span>
                                    )}
                                </div>
                            )}
                            {!acc.daily_loss_limit && acc.personal_daily_loss_limit && (
                                <div style={{ fontSize: '0.7125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <TrendingDown size={12} /> Personal daily limit: {formatCurrency(acc.personal_daily_loss_limit)}
                                </div>
                            )}
                        </div>

                        {/* Consistency rule reminder */}
                        {acc.consistency_rule && (
                            <div style={{ background: 'var(--yellow-muted)', border: '1px solid var(--yellow)', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem', color: 'var(--yellow)', display: 'flex', gap: 6, alignItems: 'center' }}>
                                <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                                No single day &gt; <strong>{acc.consistency_rule}%</strong> of total profit
                            </div>
                        )}

                        {/* Trailing DD badge */}
                        {acc.trailing_drawdown && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', display: 'inline-block' }} />
                                Trailing drawdown active
                            </div>
                        )}

                        {/* Actions */}
                        {acc.status === 'active' && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                    onClick={() => handleStatus(acc.id, 'passed')}>
                                    <Trophy size={12} /> Mark Passed
                                </button>
                                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px', color: 'var(--red)' }}
                                    onClick={() => handleStatus(acc.id, 'blown')}>
                                    <Skull size={12} /> Mark Blown
                                </button>
                                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px', marginLeft: 'auto', color: 'var(--text-muted)' }}
                                    onClick={() => handleDelete(acc.id, acc.firm_name)}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        )}
                        {acc.status !== 'active' && (
                            <div style={{ display: 'flex', gap: 6, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                    onClick={() => handleStatus(acc.id, 'active')}>
                                    <RefreshCw size={12} /> Reactivate
                                </button>
                                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px', marginLeft: 'auto', color: 'var(--text-muted)' }}
                                    onClick={() => handleDelete(acc.id, acc.firm_name)}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
