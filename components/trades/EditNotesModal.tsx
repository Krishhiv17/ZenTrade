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
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Psychology Notes</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {trade.ticker} · {trade.direction} · {new Date(trade.date).toLocaleDateString()}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                        <X size={18} />
                    </button>
                </div>

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
