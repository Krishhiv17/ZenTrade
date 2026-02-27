'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import type { Trade } from '@/lib/supabase/types'
import { formatCurrency, formatR } from '@/lib/utils'
import { updateTradeNotes } from '@/actions/trades'
import { X, Award, AlertTriangle, TrendingUp, Calendar, Clock, DollarSign, Target, Activity, FileText, Image as ImageIcon, Save, Loader2 } from 'lucide-react'
import ScreenshotLightbox from './ScreenshotLightbox'

interface Props {
    trade: Trade
    accountName?: string
    onClose: () => void
}

const BACKDROP: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(2px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
}

const MODAL: React.CSSProperties = {
    width: '100%',
    maxWidth: 720,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 16,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
}

export default function TradeDetailsModal({ trade, accountName, onClose }: Props) {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const [notes, setNotes] = useState(trade.psychology_notes ?? '')
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)

    const isWin = trade.result === 'win'
    const isLoss = trade.result === 'loss'
    const isBe = trade.result === 'breakeven'

    const badgeColor = isWin ? 'badge-green' : isLoss ? 'badge-red' : 'badge-gray'
    const resultColor = isWin ? 'var(--green)' : isLoss ? 'var(--red)' : 'var(--text-muted)'

    const allScreenshots = trade.screenshot_urls || []

    const modal = (
        <div style={BACKDROP} onClick={onClose}>
            <div style={MODAL} onClick={e => e.stopPropagation()} className="animate-fade-in">

                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: trade.direction === 'long' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${trade.direction === 'long' ? 'var(--green)' : 'var(--red)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <TrendingUp size={20} color={trade.direction === 'long' ? 'var(--green)' : 'var(--red)'} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{trade.ticker}</h2>
                                <span className={`badge ${badgeColor}`} style={{ padding: '2px 8px' }}>
                                    {trade.result ? trade.result.toUpperCase() : 'PENDING'}
                                </span>
                                {trade.is_flagged && (
                                    <span title={trade.flag_reason || 'AI Guard Flagged'}>
                                        <AlertTriangle size={14} color="var(--yellow)" />
                                    </span>
                                )}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: '2px 0 0' }}>
                                {accountName || 'Unknown Account'} • {new Date(trade.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 8, borderRadius: 8, transition: 'all 0.2s' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body scroll view */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Top Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Net P&L</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: resultColor }}>
                                {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                            </div>
                        </div>
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>R Multiple</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: trade.r_multiple === null ? 'var(--text-muted)' : trade.r_multiple >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                {trade.r_multiple !== null ? formatR(trade.r_multiple) : '—'}
                            </div>
                        </div>
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Direction</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: trade.direction === 'long' ? 'var(--green)' : 'var(--red)' }}>
                                {trade.direction === 'long' ? 'Long' : 'Short'}
                            </div>
                        </div>
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Confidence</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>
                                {trade.confidence_level ? `${trade.confidence_level} / 5` : '—'}
                            </div>
                        </div>
                    </div>

                    {/* Meta List Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <h3 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Target size={14} /> Execution Details
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Entry Price:</span>
                                <span style={{ fontWeight: 500 }}>{trade.entry?.toFixed(2) ?? '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Stop Loss:</span>
                                <span style={{ fontWeight: 500 }}>{trade.sl?.toFixed(2) ?? '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Take Profit (Avg):</span>
                                <span style={{ fontWeight: 500 }}>{trade.tp_avg?.toFixed(2) ?? '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Position Size:</span>
                                <span style={{ fontWeight: 500 }}>{trade.size || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Risk Auth ($):</span>
                                <span style={{ fontWeight: 500, color: 'var(--yellow)' }}>{trade.risk_dollars ? formatCurrency(trade.risk_dollars) : '—'}</span>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <h3 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Activity size={14} /> Trade Environment
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Macro Condition:</span>
                                <span style={{ fontWeight: 500 }}>{trade.macro || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Session:</span>
                                <span style={{ fontWeight: 500 }}>{trade.session || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Timeframe:</span>
                                <span style={{ fontWeight: 500 }}>{trade.exec_timeframe || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                                <span style={{ fontWeight: 500 }}>{trade.duration_minutes ? `${trade.duration_minutes} min` : '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Trade Type:</span>
                                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{trade.trade_type || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tag Galleries */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* We dynamically render tag pills if there are any */}
                        <TagSection label="Entry Models" tags={trade.entry_tags} color="var(--blue)" />
                        <TagSection label="Market Conditions" tags={trade.market_conditions} color="var(--purple)" />
                        <TagSection label="Confluences" tags={trade.entry_confluences} color="var(--teal)" />
                        <TagSection label="PD Arrays" tags={trade.pd_arrays} color="var(--orange)" />
                        <TagSection label="Draws on Liquidity" tags={trade.dols} color="var(--pink)" />
                        <TagSection label="Psychology" tags={trade.psychology_tags} color="var(--green)" />
                        <TagSection label="Mistakes" tags={trade.mistakes} color="var(--red)" />
                    </div>

                    {/* Psychology Notes Editing */}
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <h3 style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={14} /> Psychology Notes
                        </h3>
                        <textarea
                            className="input"
                            rows={3}
                            value={notes}
                            onChange={e => { setNotes(e.target.value); setSaved(false); }}
                            placeholder="Reflect on your mindset, whether you followed the plan, emotions before/during/after the trade…"
                            style={{ resize: 'vertical', width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    startTransition(async () => {
                                        await updateTradeNotes(trade.id, notes)
                                        setSaved(true)
                                    })
                                }}
                                disabled={isPending || saved || notes === (trade.psychology_notes || '')}
                                style={{ padding: '6px 14px', fontSize: '0.8rem', minWidth: 90, justifyContent: 'center' }}
                            >
                                {isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                                {saved ? 'Saved ✓' : isPending ? 'Saving…' : 'Save Notes'}
                            </button>
                        </div>
                    </div>

                    {/* Screenshots */}
                    {allScreenshots.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '0.85rem', margin: '0 0 0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ImageIcon size={14} /> Screenshot Gallery ({allScreenshots.length})
                            </h3>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {allScreenshots.map((url, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setLightboxUrl(url)}
                                        style={{
                                            width: 140, height: 90, borderRadius: 8, overflow: 'hidden', cursor: 'zoom-in',
                                            border: '1px solid var(--border)', background: 'var(--bg-overlay)'
                                        }}
                                    >
                                        <img src={url} alt={`Screenshot ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {lightboxUrl && <ScreenshotLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
        </div>
    )

    return typeof document !== 'undefined'
        ? createPortal(modal, document.body)
        : null
}

function TagSection({ label, tags, color }: { label: string, tags: string[] | null | undefined, color: string }) {
    if (!tags || tags.length === 0) return null
    return (
        <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tags.map(tag => (
                    <span key={tag} style={{
                        fontSize: '0.75rem', padding: '3px 8px', borderRadius: 4,
                        background: `${color}15`, color: color, border: `1px solid ${color}30`
                    }}>
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    )
}
