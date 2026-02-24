'use client'

import { useState, useTransition } from 'react'
import { deleteTrade, updateTradeNotes } from '@/actions/trades'
import type { Trade } from '@/lib/supabase/types'
import { formatCurrency, formatR } from '@/lib/utils'
import { Trash2, FileText, AlertTriangle, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react'
import ScreenshotLightbox from './ScreenshotLightbox'
import EditNotesModal from './EditNotesModal'

interface TradeTableProps {
    trades: Trade[]
    accountMap: Record<string, string> // id → firm_name
}

type SortKey = 'date' | 'ticker' | 'pnl' | 'r_multiple' | 'balance_after'

export default function TradeTable({ trades, accountMap }: TradeTableProps) {
    const [isPending, startTransition] = useTransition()
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
    const [sortKey, setSortKey] = useState<SortKey>('date')
    const [sortAsc, setSortAsc] = useState(false)

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(false) }
    }

    const sorted = [...trades].sort((a, b) => {
        let av: number | string = a[sortKey] ?? 0
        let bv: number | string = b[sortKey] ?? 0
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

    function Th({ col, label }: { col: SortKey; label: string }) {
        return (
            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(col)}>
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

    return (
        <>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <Th col="date" label="Date" />
                            <th>Account</th>
                            <th>Ticker</th>
                            <th>Dir.</th>
                            <th>Size</th>
                            <th>Entry</th>
                            <th>SL</th>
                            <th>TP Avg</th>
                            <th>Risk $</th>
                            <Th col="pnl" label="P&L" />
                            <Th col="r_multiple" label="R" />
                            <Th col="balance_after" label="Bal. After" />
                            <th>Macro</th>
                            <th>TF</th>
                            <th>Dur.</th>
                            <th>News</th>
                            <th>📷</th>
                            <th>Notes</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(t => {
                            const pnlPos = t.pnl >= 0
                            return (
                                <tr key={t.id} style={{ opacity: isPending ? 0.5 : 1 }}>
                                    {/* Flag indicator */}
                                    <td style={{ width: 28, padding: '0 4px' }}>
                                        {t.is_flagged && (
                                            <span title={t.flag_reason ?? 'AI Guard flagged'}>
                                                <AlertTriangle size={13} color="var(--yellow)" />
                                            </span>
                                        )}
                                    </td>
                                    <td>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                    <td style={{ color: 'var(--text-secondary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {accountMap[t.account_id] ?? '—'}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{t.ticker}</td>
                                    <td>
                                        <span className={`badge ${t.direction === 'long' ? 'badge-green' : 'badge-red'}`}>
                                            {t.direction === 'long' ? '▲ L' : '▼ S'}
                                        </span>
                                    </td>
                                    <td>{t.size}</td>
                                    <td>{t.entry?.toFixed(2)}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{t.sl?.toFixed(2) ?? '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{t.tp_avg?.toFixed(2) ?? '—'}</td>
                                    <td style={{ color: 'var(--yellow)' }}>
                                        {t.risk_dollars ? formatCurrency(t.risk_dollars) : '—'}
                                    </td>
                                    <td className={pnlPos ? 'pnl-positive' : t.pnl < 0 ? 'pnl-negative' : 'pnl-neutral'}>
                                        {pnlPos ? '+' : ''}{formatCurrency(t.pnl)}
                                    </td>
                                    <td style={{ color: t.r_multiple === null ? 'var(--text-muted)' : t.r_multiple >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                        {t.r_multiple !== null ? formatR(t.r_multiple) : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {t.balance_after ? formatCurrency(t.balance_after) : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {t.macro ?? '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{t.exec_timeframe ?? '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {t.duration_minutes ? `${t.duration_minutes}m` : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.news ?? ''}>
                                        {t.news ?? '—'}
                                    </td>

                                    {/* Screenshot */}
                                    <td>
                                        {t.screenshot_url ? (
                                            <button
                                                onClick={() => setLightboxUrl(t.screenshot_url!)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex' }}
                                                title="View screenshot"
                                            >
                                                <ExternalLink size={13} />
                                            </button>
                                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>

                                    {/* Psychology notes button */}
                                    <td>
                                        <button
                                            onClick={() => setEditingTrade(t)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: t.psychology_notes ? 'var(--accent)' : 'var(--text-muted)', display: 'flex'
                                            }}
                                            title={t.psychology_notes ?? 'Add notes'}
                                        >
                                            <FileText size={13} />
                                        </button>
                                    </td>

                                    {/* Delete */}
                                    <td>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                                            title="Delete trade"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {lightboxUrl && <ScreenshotLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
            {editingTrade && <EditNotesModal trade={editingTrade} onClose={() => setEditingTrade(null)} />}
        </>
    )
}
