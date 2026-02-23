'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTrade } from '@/actions/trades'
import type { PropAccount } from '@/lib/supabase/types'
import { calcRiskDollars, calcRMultiple, formatCurrency, TICK_VALUES, TICKS_PER_POINT } from '@/lib/utils'
import { Upload, X, AlertTriangle, CheckCircle, Loader2, ImageIcon } from 'lucide-react'

const TICKERS = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K']
const TIMEFRAMES = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h']
const MACROS = ['Bullish', 'Bearish', 'Ranging', 'Break of Structure', 'Distribution', 'Accumulation', 'Trending Up', 'Trending Down']

interface TradeFormProps {
    accounts: PropAccount[]
}

export default function TradeForm({ accounts: accs }: TradeFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [guard, setGuard] = useState<{ flagged: boolean; reason: string } | null>(null)
    const [error, setError] = useState('')

    // Auto-calc state
    const [ticker, setTicker] = useState('NQ')
    const [entry, setEntry] = useState('')
    const [sl, setSl] = useState('')
    const [size, setSize] = useState('1')
    const [pnl, setPnl] = useState('')
    const [selectedAccId, setSelectedAccId] = useState(accs[0]?.id ?? '')

    const activeAccounts = accs.filter(a => a.status === 'active')

    // Derived calcs
    const riskDollars = entry && sl && size && ticker
        ? calcRiskDollars(parseFloat(entry), parseFloat(sl), parseInt(size), ticker)
        : null
    const rMultiple = riskDollars && pnl
        ? calcRMultiple(parseFloat(pnl), riskDollars)
        : null
    const selectedAcc = accs.find(a => a.id === selectedAccId)
    const balanceAfter = selectedAcc && pnl
        ? selectedAcc.current_balance + parseFloat(pnl)
        : null

    function handleFileChange(f: File) {
        if (!f.type.startsWith('image/')) { setError('Only image files allowed.'); return }
        if (f.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
        setFile(f)
        setPreview(URL.createObjectURL(f))
        setError('')
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFileChange(f)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setGuard(null)

        const fd = new FormData(formRef.current!)
        // Inject hidden calculated fields
        if (riskDollars !== null) fd.set('risk_dollars', String(riskDollars))
        if (rMultiple !== null) fd.set('r_multiple', String(rMultiple))
        if (balanceAfter !== null) fd.set('balance_after', String(balanceAfter))
        if (file) fd.set('screenshot', file)

        startTransition(async () => {
            try {
                const result = await createTrade(fd)
                if (!result.success) {
                    setError(result.error ?? 'Unknown error')
                    return
                }
                if (result.guard?.flagged) {
                    setGuard(result.guard)
                    // Still navigates after showing guard warning
                    setTimeout(() => router.push('/trades'), 3000)
                } else {
                    router.push('/trades')
                }
            } catch (err) {
                setError((err as Error).message)
            }
        })
    }

    const inputStyle = { width: '100%' }
    const pnlColor = pnl ? (parseFloat(pnl) >= 0 ? 'var(--green)' : 'var(--red)') : undefined

    return (
        <form ref={formRef} onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

                {/* Account */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Prop Account</label>
                    {activeAccounts.length === 0 ? (
                        <div style={{ color: 'var(--red)', fontSize: '0.875rem', padding: '8px 12px', background: 'var(--red-muted)', borderRadius: 6 }}>
                            No active accounts. Please create one in <a href="/accounts" style={{ color: 'var(--accent)' }}>Accounts</a> first.
                        </div>
                    ) : (
                        <select name="account_id" className="input" value={selectedAccId} onChange={e => setSelectedAccId(e.target.value)} required>
                            {activeAccounts.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.firm_name} ({formatCurrency(a.account_size)}) — Balance: {formatCurrency(a.current_balance)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Date */}
                <div>
                    <label className="label">Date</label>
                    <input className="input" type="date" name="date"
                        defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>

                {/* Ticker */}
                <div>
                    <label className="label">Ticker</label>
                    <select className="input" name="ticker" value={ticker} onChange={e => setTicker(e.target.value)} required>
                        {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {/* Direction */}
                <div>
                    <label className="label">Direction</label>
                    <select className="input" name="direction" required>
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                    </select>
                </div>

                {/* Size */}
                <div>
                    <label className="label">Size (contracts)</label>
                    <input className="input" type="number" name="size" min={1} step={1}
                        value={size} onChange={e => setSize(e.target.value)} required />
                </div>

                {/* Entry */}
                <div>
                    <label className="label">Entry Price</label>
                    <input className="input" type="number" name="entry" step="0.01"
                        value={entry} onChange={e => setEntry(e.target.value)}
                        placeholder="e.g. 21450.25" required />
                </div>

                {/* SL */}
                <div>
                    <label className="label">Stop Loss</label>
                    <input className="input" type="number" name="sl" step="0.01"
                        value={sl} onChange={e => setSl(e.target.value)}
                        placeholder="e.g. 21430.00" />
                </div>

                {/* TP */}
                <div>
                    <label className="label">TP Avg. <span style={{ color: 'var(--text-muted)' }}>(avg if partials)</span></label>
                    <input className="input" type="number" name="tp_avg" step="0.01"
                        placeholder="e.g. 21490.00" />
                </div>

                {/* PnL */}
                <div>
                    <label className="label">P&L ($)</label>
                    <input className="input" type="number" name="pnl" step="0.01"
                        value={pnl} onChange={e => setPnl(e.target.value)}
                        placeholder="e.g. 250.00 or -125.00" required
                        style={{ borderColor: pnlColor }} />
                </div>

                {/* Auto-calculated fields display (read-only) */}
                <div>
                    <label className="label">Risk $ <span style={{ color: 'var(--text-muted)' }}>(auto)</span></label>
                    <div className="input" style={{ color: riskDollars !== null ? 'var(--yellow)' : 'var(--text-muted)', cursor: 'default' }}>
                        {riskDollars !== null ? formatCurrency(riskDollars) : '—'}
                    </div>
                </div>

                <div>
                    <label className="label">R Multiple <span style={{ color: 'var(--text-muted)' }}>(auto)</span></label>
                    <div className="input" style={{
                        color: rMultiple !== null ? (rMultiple >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
                        cursor: 'default'
                    }}>
                        {rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R` : '—'}
                    </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Balance After <span style={{ color: 'var(--text-muted)' }}>(auto)</span></label>
                    <div className="input" style={{
                        color: balanceAfter !== null ? (balanceAfter >= (selectedAcc?.account_size ?? 0) ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
                        cursor: 'default'
                    }}>
                        {balanceAfter !== null ? formatCurrency(balanceAfter) : '—'}
                    </div>
                </div>

                {/* Macro */}
                <div>
                    <label className="label">Macro <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                    <select className="input" name="macro">
                        <option value="">—</option>
                        {MACROS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {/* Exec Timeframe */}
                <div>
                    <label className="label">Exec. Timeframe <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                    <select className="input" name="exec_timeframe">
                        <option value="">—</option>
                        {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {/* News */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">News / Active Events <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                    <input className="input" type="text" name="news"
                        placeholder="e.g. CPI release, Fed Chair speech" />
                </div>

                {/* Screenshot upload */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Screenshot <span style={{ color: 'var(--text-muted)' }}>optional · max 5MB</span></label>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }} />
                    {preview ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview} alt="Trade screenshot" style={{ maxHeight: 200, borderRadius: 8, border: '1px solid var(--border-strong)', display: 'block' }} />
                            <button type="button" onClick={() => { setPreview(null); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true) }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-strong)'}`,
                                borderRadius: 8, padding: '2rem', textAlign: 'center',
                                cursor: 'pointer', transition: 'border-color 0.2s',
                                background: dragging ? 'var(--accent-glow)' : 'transparent',
                            }}>
                            <ImageIcon size={28} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Drag & drop or click to upload</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPEG, WebP · max 5MB</p>
                        </div>
                    )}
                </div>

                {/* Psychology notes */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Psychology Notes <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                    <textarea className="input" name="psychology_notes" rows={4}
                        placeholder="Describe your mindset, plan adherence, emotions before/during/after the trade…"
                        style={{ resize: 'vertical' }} />
                </div>

                {/* Error */}
                {error && (
                    <div style={{ gridColumn: '1 / -1', color: 'var(--red)', fontSize: '0.8125rem', padding: '8px 12px', background: 'var(--red-muted)', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}

                {/* AI Guard warning */}
                {guard?.flagged && (
                    <div style={{ gridColumn: '1 / -1', padding: '10px 14px', background: 'var(--yellow-muted)', border: '1px solid var(--yellow)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <AlertTriangle size={16} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <div style={{ color: 'var(--yellow)', fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>🛡 AI Guard Flagged</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{guard.reason}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Trade saved. Redirecting to journal…</div>
                        </div>
                    </div>
                )}

                {/* Submit */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <a href="/trades" className="btn btn-ghost">Cancel</a>
                    <button type="submit" className="btn btn-primary" disabled={isPending || activeAccounts.length === 0}
                        style={{ minWidth: 140, justifyContent: 'center' }}>
                        {isPending
                            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                            : <><CheckCircle size={15} /> Log Trade</>
                        }
                    </button>
                </div>

            </div>
        </form>
    )
}
