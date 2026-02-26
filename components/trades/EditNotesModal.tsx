'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { updateTradeNotes } from '@/actions/trades'
import type { Trade } from '@/lib/supabase/types'
import { X, Save, Loader2 } from 'lucide-react'

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
    maxWidth: 540,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 14,
    padding: '1.5rem',
}

export default function EditNotesModal({ trade, onClose }: { trade: Trade; onClose: () => void }) {
    const [notes, setNotes] = useState(trade.psychology_notes ?? '')
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)

    function handleSave() {
        startTransition(async () => {
            await updateTradeNotes(trade.id, notes)
            setSaved(true)
            setTimeout(onClose, 600)
        })
    }

    const modal = (
        <div style={BACKDROP} onClick={onClose}>
            <div style={MODAL} onClick={e => e.stopPropagation()} className="animate-fade-in">

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Trade Details & Notes</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {trade.ticker} · {trade.direction === 'long' ? 'Long' : 'Short'} · {new Date(trade.date).toLocaleDateString()}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Tags & Metadata Display */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>

                    {/* Setup & Market */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Setup</div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Bias:</span> <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{trade.bias || '—'}</span></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Type:</span> <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{trade.trade_type || '—'}</span></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Session:</span> <span style={{ color: trade.session_status === 'out_of_session' ? 'var(--red)' : 'var(--text-primary)' }}>{trade.session_status === 'out_of_session' ? 'Out of Session' : 'Main Session'}</span></div>

                        {(trade.market_conditions?.length ?? 0) > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>Market Conditions:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {trade.market_conditions!.map(t => <span key={t} className="badge" style={{ background: 'var(--bg-overlay)' }}>{t}</span>)}
                                </div>
                            </div>
                        )}
                        {(trade.pd_arrays?.length ?? 0) > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>PD Arrays:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {trade.pd_arrays!.map(t => <span key={t} className="badge" style={{ background: 'var(--bg-overlay)' }}>{t}</span>)}
                                </div>
                            </div>
                        )}
                        {(trade.dols?.length ?? 0) > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>Draw on Liquidity (DOL):</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {trade.dols!.map(t => <span key={t} className="badge" style={{ background: 'var(--bg-overlay)' }}>{t}</span>)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Execution & Psychology */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Execution</div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Confidence:</span> <span style={{ color: 'var(--accent)' }}>{trade.confidence_level ? `${trade.confidence_level} / 5` : '—'}</span></div>

                        {(trade.entry_tags?.length ?? 0) > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>Entry Models:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {trade.entry_tags!.map(t => <span key={t} className="badge" style={{ background: 'var(--bg-overlay)' }}>{t}</span>)}
                                </div>
                            </div>
                        )}
                        {(trade.entry_confluences?.length ?? 0) > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>Confluences:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {trade.entry_confluences!.map(t => <span key={t} className="badge" style={{ background: 'var(--bg-overlay)' }}>{t}</span>)}
                                </div>
                            </div>
                        )}
                        {(trade.psychology_tags?.length ?? 0) > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>Psychology:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {trade.psychology_tags!.map(t => <span key={t} className="badge" style={{ background: 'var(--bg-overlay)' }}>{t}</span>)}
                                </div>
                            </div>
                        )}
                        {(trade.mistakes?.length ?? 0) > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <div style={{ color: 'var(--red)', marginBottom: 2, fontWeight: 600 }}>Mistakes:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {trade.mistakes!.map(t => <span key={t} className="badge" style={{ background: 'var(--red-glow)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>{t}</span>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '1rem 0' }} />

                <textarea
                    className="input"
                    rows={8}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Reflect on your mindset, whether you followed the plan, emotions before / during / after the trade…"
                    style={{ resize: 'vertical', marginBottom: '1rem' }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={isPending || saved} style={{ minWidth: 100, justifyContent: 'center' }}>
                        {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                        {saved ? 'Saved ✓' : isPending ? 'Saving…' : 'Save'}
                    </button>
                </div>

            </div>
        </div>
    )

    return typeof document !== 'undefined'
        ? createPortal(modal, document.body)
        : null
}
