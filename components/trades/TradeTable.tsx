'use client'

import { useState, useTransition } from 'react'
import { deleteTrade } from '@/actions/trades'
import type { Trade } from '@/lib/supabase/types'
import { formatCurrency, formatR } from '@/lib/utils'
import { Trash2, AlertTriangle, ImageIcon, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
import ScreenshotLightbox from './ScreenshotLightbox'
import TradeDetailsModal from './TradeDetailsModal'
import EditTradeModal from './EditTradeModal'
import type { PropAccount } from '@/lib/supabase/types'

interface TradeTableProps {
    trades: Trade[]
    accountMap: Record<string, string> // id → firm_name
    accounts: PropAccount[]
}

type SortKey = 'date' | 'ticker' | 'pnl' | 'r_multiple' | 'balance_after'

export default function TradeTable({ trades, accountMap, accounts }: TradeTableProps) {
    const [isPending, startTransition] = useTransition()
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const [viewingTrade, setViewingTrade] = useState<Trade | null>(null)
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
    const [sortKey, setSortKey] = useState<SortKey>('date')
    const [sortAsc, setSortAsc] = useState(false)

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(false) }
    }

    const sorted = [...trades].sort((a, b) => {
        const av: number | string = a[sortKey] ?? 0
        const bv: number | string = b[sortKey] ?? 0
        if (typeof av === 'string' && typeof bv === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
        return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

    function handleDelete(id: string) {
        if (!confirm('Delete this trade? The balance will be reversed automatically.')) return
        startTransition(() => deleteTrade(id))
    }

    function SortIcon({ col }: { col: SortKey }) {
        if (sortKey !== col) return <ChevronUp size={10} color="var(--text-muted)" />
        return sortAsc ? <ChevronUp size={10} color="var(--accent)" /> : <ChevronDown size={10} color="var(--accent)" />
    }

    function Th({ col, label, align }: { col: SortKey; label: string; align?: 'right' }) {
        return (
            <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: align ?? 'left' }} onClick={() => handleSort(col)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {label} <SortIcon col={col} />
                </span>
            </th>
        )
    }

    if (trades.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                No trades match your filters.
            </div>
        )
    }

    const dateStr = (t: Trade) => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const pnlClass = (t: Trade) => (t.pnl > 0 ? 'pnl-positive' : t.pnl < 0 ? 'pnl-negative' : 'pnl-neutral')

    return (
        <>
            {/* ── Desktop: compact table (full detail on row click) ── */}
            <div className="trades-desktop table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 24 }}></th>
                            <Th col="date" label="Date" />
                            <th>Account</th>
                            <th>Ticker</th>
                            <th>Dir.</th>
                            <Th col="pnl" label="P&L" align="right" />
                            <Th col="r_multiple" label="R" align="right" />
                            <Th col="balance_after" label="Bal. After" align="right" />
                            <th style={{ textAlign: 'right' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(t => {
                            const pnlPos = t.pnl >= 0
                            const hasShots = !!t.screenshot_urls && t.screenshot_urls.length > 0
                            return (
                                <tr key={t.id} style={{ opacity: isPending ? 0.5 : 1, cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setViewingTrade(t)} className="hover-bg-subtle">
                                    <td style={{ padding: '0 4px' }}>
                                        {t.is_flagged && (
                                            <span title={t.flag_reason ?? 'AI Guard flagged'} style={{ display: 'inline-flex' }}>
                                                <AlertTriangle size={13} color="var(--yellow)" />
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{dateStr(t)}</td>
                                    <td style={{ color: 'var(--text-secondary)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {accountMap[t.account_id] ?? '—'}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            {t.ticker}
                                            {hasShots && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setLightboxUrl(t.screenshot_urls![0]) }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', padding: 0 }}
                                                    title={`View ${t.screenshot_urls!.length} screenshot(s)`}
                                                >
                                                    <ImageIcon size={12} />
                                                </button>
                                            )}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${t.direction === 'long' ? 'badge-green' : 'badge-red'}`}>
                                            {t.direction === 'long' ? '▲ L' : '▼ S'}
                                        </span>
                                    </td>
                                    <td className={pnlClass(t)} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {pnlPos ? '+' : ''}{formatCurrency(t.pnl)}
                                    </td>
                                    <td style={{ textAlign: 'right', color: t.r_multiple === null ? 'var(--text-muted)' : t.r_multiple >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                        {t.r_multiple !== null ? formatR(t.r_multiple) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        {t.balance_after ? formatCurrency(t.balance_after) : '—'}
                                    </td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                            <button onClick={() => setEditingTrade(t)} title="Edit trade"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => handleDelete(t.id)} title="Delete trade"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── Mobile: card list ── */}
            <div className="trades-mobile">
                {sorted.map(t => {
                    const pnlPos = t.pnl >= 0
                    return (
                        <div key={t.id} className="card" onClick={() => setViewingTrade(t)}
                            style={{ padding: '0.85rem 1rem', cursor: 'pointer', opacity: isPending ? 0.5 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span className={`badge ${t.direction === 'long' ? 'badge-green' : 'badge-red'}`}>
                                    {t.direction === 'long' ? '▲ L' : '▼ S'}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.ticker}</span>
                                {t.is_flagged && <AlertTriangle size={13} color="var(--yellow)" />}
                                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dateStr(t)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                                <span className={pnlClass(t)} style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                                    {pnlPos ? '+' : ''}{formatCurrency(t.pnl)}
                                </span>
                                <span style={{ fontSize: '0.82rem', color: t.r_multiple === null ? 'var(--text-muted)' : t.r_multiple >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                    {t.r_multiple !== null ? formatR(t.r_multiple) : '—'}
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {accountMap[t.account_id] ?? '—'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setEditingTrade(t)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', minHeight: 36 }}>
                                    <Pencil size={13} /> Edit
                                </button>
                                <button onClick={() => handleDelete(t.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', minHeight: 36 }}>
                                    <Trash2 size={13} /> Delete
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {viewingTrade && (
                <TradeDetailsModal
                    trade={viewingTrade}
                    accountName={accountMap[viewingTrade.account_id] ?? 'Unknown Account'}
                    onClose={() => setViewingTrade(null)}
                />
            )}

            {editingTrade && (
                <EditTradeModal
                    trade={editingTrade}
                    accounts={accounts}
                    onClose={() => setEditingTrade(null)}
                />
            )}

            {lightboxUrl && (
                <ScreenshotLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
            )}
        </>
    )
}
