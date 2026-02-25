'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTrade } from '@/actions/trades'
import type { PropAccount } from '@/lib/supabase/types'
import {
    calcRiskDollars, calcRMultiple, calcPnL,
    formatCurrency, TICK_VALUES, TICKS_PER_POINT,
} from '@/lib/utils'
import { Upload, X, AlertTriangle, CheckCircle, Loader2, ImageIcon } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────

const TICKERS = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K']
const FOREX_TICKERS = ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD']

const SESSIONS = [
    'Asia',
    'London',
    'Pre-Market',
    'New York AM',
    'New York PM',
]

const MACROS = [
    // NY macros (EST)
    'NY AM Macro 1  (9:50–10:10 AM)',
    'NY AM Macro 2  (10:50–11:10 AM)',
    'NY Lunch Macro (11:50 AM–12:10 PM)',
    'NY PM Macro    (1:10–1:40 PM)',
    'NY Last Hour   (3:15–3:45 PM)',
    // London macros (GMT)
    'London Macro 1 (2:33–3:00 AM GMT)',
    'London Macro 2 (4:03–4:30 AM GMT)',
]

const TIMEFRAMES = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h']

// ─── Component ────────────────────────────────────────────────

interface TradeFormProps {
    accounts: PropAccount[]
}

export default function TradeForm({ accounts }: TradeFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    // File state
    const [dragging, setDragging] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)

    // UI state
    const [guard, setGuard] = useState<{ flagged: boolean; reason: string } | null>(null)
    const [error, setError] = useState('')
    const [isManual, setIsManual] = useState(false)

    // Auto-calc inputs
    const [ticker, setTicker] = useState('NQ')
    const [direction, setDirection] = useState<'long' | 'short'>('long')
    const [result, setResult] = useState<'win' | 'loss' | 'breakeven'>('win')
    const [entry, setEntry] = useState('')
    const [sl, setSl] = useState('')
    const [tpAvg, setTpAvg] = useState('')
    const [size, setSize] = useState('1')
    const [selectedAccId, setSelectedAccId] = useState(accounts.find(a => a.status === 'active')?.id ?? '')

    // Manual override inputs
    const [manualPnl, setManualPnl] = useState('')
    const [manualRisk, setManualRisk] = useState('')
    const [manualR, setManualR] = useState('')

    const activeAccounts = accounts.filter(a => a.status === 'active')
    const selectedAcc = accounts.find(a => a.id === selectedAccId)

    const currentTickers = selectedAcc?.market_type === 'forex' ? FOREX_TICKERS : TICKERS
    const displayTicker = currentTickers.includes(ticker) ? ticker : currentTickers[0]

    // ── Derived calcs ──
    const entryN = entry ? parseFloat(entry) : null
    const slN = sl ? parseFloat(sl) : null
    const tpAvgN = tpAvg ? parseFloat(tpAvg) : null
    const sizeN = size ? parseFloat(size) : 1

    const pnlCalc = entryN !== null ? calcPnL(result, direction, entryN, slN, tpAvgN, sizeN, displayTicker) : null
    const riskDollars = (entryN !== null && slN !== null) ? calcRiskDollars(entryN, slN, sizeN, displayTicker) : null
    const rMultiple = (pnlCalc !== null && riskDollars) ? calcRMultiple(pnlCalc, riskDollars) : null

    // Final values sent to DB or used for balance preview
    const finalPnl = isManual ? (manualPnl ? parseFloat(manualPnl) : null) : pnlCalc
    const finalRisk = isManual ? (manualRisk ? parseFloat(manualRisk) : null) : riskDollars
    const finalR = isManual ? (manualR ? parseFloat(manualR) : null) : rMultiple
    const balanceAfter = (selectedAcc && finalPnl !== null) ? selectedAcc.current_balance + finalPnl : null

    // ── Screenshot handlers ──
    function handleFileChange(f: File) {
        if (!f.type.startsWith('image/')) { setError('Only image files allowed.'); return }
        if (f.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
        setFile(f); setPreview(URL.createObjectURL(f)); setError('')
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault(); setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFileChange(f)
    }

    // ── Submit ──
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(''); setGuard(null)

        if (!isManual && pnlCalc === null) {
            // For wins we need TP, for losses we need SL (in auto mode)
            setError(result === 'win' ? 'TP Avg is required for a Win.' : 'Stop Loss is required for a Loss.')
            return
        }

        if (isManual && finalPnl === null) {
            setError('P&L is explicitly required in Manual Mode.')
            return
        }

        const maxUnrealizedInput = (formRef.current?.elements.namedItem('max_unrealized_pnl') as HTMLInputElement)?.value
        if (selectedAcc?.drawdown_type === 'intraday' && !maxUnrealizedInput) {
            setError('Max Unrealized P&L is required for Intraday Trailing accounts.')
            return
        }

        const fd = new FormData(formRef.current!)
        fd.set('is_manual', isManual ? 'true' : 'false')

        // Inject computed values if in auto mode, or manual values directly
        if (finalPnl !== null) fd.set('pnl', String(finalPnl))
        fd.set('result', result)
        if (finalRisk !== null) fd.set('risk_dollars', String(finalRisk))
        if (finalR !== null) fd.set('r_multiple', String(finalR))
        if (balanceAfter !== null) fd.set('balance_after', String(balanceAfter))
        if (file) fd.set('screenshot', file)

        startTransition(async () => {
            try {
                const res = await createTrade(fd)
                if (!res.success) { setError(res.error ?? 'Unknown error'); return }
                if (res.guard?.flagged) {
                    setGuard(res.guard)
                    setTimeout(() => router.push('/trades'), 3000)
                } else {
                    router.push('/trades')
                }
            } catch (err) {
                setError((err as Error).message)
            }
        })
    }

    // ── Helpers ──
    const pnlColor = finalPnl !== null ? (finalPnl >= 0 ? 'var(--green)' : 'var(--red)') : undefined

    return (
        <form ref={formRef} onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

                {/* Manual Mode Toggle */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Manual Mode</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Override auto-calculations and manually enter your P&L, Risk $, and R-Multiple.</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                        <input type="checkbox" checked={isManual} onChange={e => setIsManual(e.target.checked)} style={{ opacity: 0, position: 'absolute' }} />
                        <div style={{ width: 44, height: 24, background: isManual ? 'var(--accent)' : 'var(--bg-overlay)', borderRadius: 12, border: '1px solid var(--border-strong)', outline: isManual ? '2px solid var(--accent-glow)' : 'none', position: 'relative', transition: '0.2s' }}>
                            <div style={{ width: 18, height: 18, background: '#fff', borderRadius: 9, position: 'absolute', top: 2, left: isManual ? 22 : 2, transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        </div>
                    </label>
                </div>

                {/* Account */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Prop Account</label>
                    {activeAccounts.length === 0 ? (
                        <div style={{ color: 'var(--red)', fontSize: '0.875rem', padding: '8px 12px', background: 'var(--red-muted)', borderRadius: 6 }}>
                            No active accounts. <a href="/accounts" style={{ color: 'var(--accent)' }}>Create one first.</a>
                        </div>
                    ) : (
                        <select name="account_id" className="input" value={selectedAccId}
                            onChange={e => setSelectedAccId(e.target.value)} required>
                            {activeAccounts.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.firm_name} ({formatCurrency(a.account_size)}) — Bal: {formatCurrency(a.current_balance)}
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
                    <div style={{ position: 'relative' }}>
                        <select className="input" name="ticker" value={displayTicker}
                            onChange={e => setTicker(e.target.value)} required>
                            {currentTickers.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Direction */}
                <div>
                    <label className="label">Direction</label>
                    <select className="input" name="direction" value={direction}
                        onChange={e => setDirection(e.target.value as 'long' | 'short')} required>
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                    </select>
                </div>

                {/* Result */}
                <div>
                    <label className="label">Result</label>
                    <select className="input" name="result" value={result}
                        onChange={e => setResult(e.target.value as 'win' | 'loss' | 'breakeven')} required>
                        <option value="win">Win</option>
                        <option value="loss">Loss</option>
                        <option value="breakeven">Breakeven</option>
                    </select>
                </div>

                {/* Size */}
                <div>
                    <label className="label">Size ({selectedAcc?.market_type === 'forex' ? 'lots' : 'contracts'})</label>
                    <input className="input" type="number" name="size" min={0.01} step={0.01}
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
                    <label className="label">
                        Stop Loss {!isManual && result === 'loss' && <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>(required for loss calc)</span>}
                    </label>
                    <input className="input" type="number" name="sl" step="0.01"
                        value={sl} onChange={e => setSl(e.target.value)}
                        placeholder="e.g. 21430.00" />
                </div>

                {/* TP Avg */}
                <div>
                    <label className="label">
                        TP Avg {!isManual && result === 'win' && <span style={{ color: 'var(--green)', fontSize: '0.7rem' }}>(required for win calc)</span>}
                    </label>
                    <input className="input" type="number" name="tp_avg" step="0.01"
                        value={tpAvg} onChange={e => setTpAvg(e.target.value)}
                        placeholder="e.g. 21490.00" />
                </div>

                {/* ── Auto-calculated / Manual entry display ── */}
                <div>
                    <label className="label">P&L {isManual ? <span style={{ color: 'var(--accent)' }}>(manual)</span> : <span style={{ color: 'var(--text-muted)' }}>(auto)</span>}</label>
                    {isManual ? (
                        <input className="input" type="number" step="0.01"
                            value={manualPnl} onChange={e => setManualPnl(e.target.value)}
                            placeholder="e.g. 1500.50 or -500.00"
                            style={{ borderColor: 'var(--accent)', color: finalPnl !== null ? (finalPnl >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-primary)' }} required />
                    ) : (
                        <div className="input" style={{ color: pnlColor ?? 'var(--text-muted)', cursor: 'default', fontWeight: 600 }}>
                            {pnlCalc !== null
                                ? `${pnlCalc >= 0 ? '+' : ''}${formatCurrency(pnlCalc)}`
                                : result === 'win' ? 'Enter TP Avg →' : result === 'loss' ? 'Enter SL →' : '$0'}
                        </div>
                    )}
                </div>

                <div>
                    <label className="label">Risk $ {isManual ? <span style={{ color: 'var(--accent)' }}>(manual)</span> : <span style={{ color: 'var(--text-muted)' }}>(auto)</span>}</label>
                    {isManual ? (
                        <input className="input" type="number" step="0.01" min="0"
                            value={manualRisk} onChange={e => setManualRisk(e.target.value)}
                            placeholder="e.g. 500" style={{ borderColor: 'var(--accent)' }} />
                    ) : (
                        <div className="input" style={{ color: riskDollars !== null ? 'var(--yellow)' : 'var(--text-muted)', cursor: 'default' }}>
                            {riskDollars !== null ? formatCurrency(riskDollars) : '—'}
                        </div>
                    )}
                </div>

                <div>
                    <label className="label">R Multiple {isManual ? <span style={{ color: 'var(--accent)' }}>(manual)</span> : <span style={{ color: 'var(--text-muted)' }}>(auto)</span>}</label>
                    {isManual ? (
                        <input className="input" type="number" step="0.01"
                            value={manualR} onChange={e => setManualR(e.target.value)}
                            placeholder="e.g. 2.5 or -1.0" style={{ borderColor: 'var(--accent)' }} />
                    ) : (
                        <div className="input" style={{
                            color: rMultiple !== null ? (rMultiple >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
                            cursor: 'default',
                        }}>
                            {rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R` : '—'}
                        </div>
                    )}
                </div>

                <div>
                    <label className="label">Balance After <span style={{ color: 'var(--text-muted)' }}>(auto)</span></label>
                    <div className="input" style={{
                        color: balanceAfter !== null
                            ? (balanceAfter >= (selectedAcc?.account_size ?? 0) ? 'var(--green)' : 'var(--red)')
                            : 'var(--text-muted)',
                        cursor: 'default',
                    }}>
                        {balanceAfter !== null ? formatCurrency(balanceAfter) : '—'}
                    </div>
                </div>

                {/* Session */}
                <div>
                    <label className="label">Session</label>
                    <select className="input" name="session">
                        <option value="">— None —</option>
                        {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
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

                {/* Duration */}
                <div>
                    <label className="label">Duration (Minutes) <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                    <input className="input" type="number" name="duration_minutes" min="1" step="1"
                        placeholder="e.g. 45" />
                </div>

                {/* Macro */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Macro Window <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                    <select className="input" name="macro">
                        <option value="">— None —</option>
                        <optgroup label="New York (EST)">
                            {MACROS.slice(0, 5).map(m => <option key={m} value={m}>{m}</option>)}
                        </optgroup>
                        <optgroup label="London (GMT)">
                            {MACROS.slice(5).map(m => <option key={m} value={m}>{m}</option>)}
                        </optgroup>
                    </select>
                </div>

                {/* News */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">News / Active Events <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                    <input className="input" type="text" name="news"
                        placeholder="e.g. CPI release, Fed Chair speech" />
                </div>

                {/* Screenshot */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Screenshot <span style={{ color: 'var(--text-muted)' }}>optional · max 5MB</span></label>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }} />
                    {preview ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview} alt="Trade screenshot"
                                style={{ maxHeight: 200, borderRadius: 8, border: '1px solid var(--border-strong)', display: 'block' }} />
                            <button type="button"
                                onClick={() => { setPreview(null); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
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

                {/* Intraday Only: Max Unrealized */}
                {selectedAcc?.drawdown_type === 'intraday' && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1.25rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <label className="label" style={{ margin: 0, color: '#60a5fa' }}>Max Unrealized P&L ($)</label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Required for Intraday trailing computation</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
                            Enter the absolute highest floating profit this trade reached before you closed it. The engine will use this to accurately pull your trailing stop-out level up while you were in the trade.
                            This is explicitly required for Intraday Prop Firm accounts.
                        </p>
                        <input className="input" type="number" name="max_unrealized_pnl" step="0.01" required
                            placeholder="e.g. 500.00" style={{ maxWidth: 300, borderColor: 'rgba(59,130,246,0.3)' }} />
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
                    <button type="submit" className="btn btn-primary"
                        disabled={isPending || activeAccounts.length === 0}
                        style={{ minWidth: 140, justifyContent: 'center' }}>
                        {isPending
                            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                            : <><CheckCircle size={15} /> Log Trade</>}
                    </button>
                </div>

            </div>
        </form>
    )
}
