'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { updateTrade } from '@/actions/trades'
import type { PropAccount, Trade } from '@/lib/supabase/types'
import { calcRiskDollars, calcRMultiple, calcPnL, formatCurrency } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Loader2, X, Pencil } from 'lucide-react'

// Reusing generic advanced components
import StarRating from '@/components/ui/StarRating'
import TagMultiSelect from '@/components/ui/TagMultiSelect'
import MultiImageUploader from '@/components/trades/MultiImageUploader'
import { createPortal } from 'react-dom'

const BACKDROP: React.CSSProperties = {
    position: 'fixed', inset: 0, width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
}

const MODAL: React.CSSProperties = {
    width: '100%', maxWidth: 1000, background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)', borderRadius: 16,
    padding: '2rem', maxHeight: '95vh', overflowY: 'auto',
    position: 'relative'
}

const TICKERS = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K']
const FOREX_TICKERS = ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'XAUUSD', 'XAGUSD', 'WTI', 'BRENT']

const SESSIONS = ['Asia', 'London', 'Pre-Market', 'New York AM', 'New York PM']
const MACROS = ['NY AM Macro 1  (9:50–10:10 AM)', 'NY AM Macro 2  (10:50–11:10 AM)', 'NY Lunch Macro (11:50 AM–12:10 PM)', 'NY PM Macro    (1:10–1:40 PM)', 'NY Last Hour   (3:15–3:45 PM)', 'London Macro 1 (2:33–3:00 AM GMT)', 'London Macro 2 (4:03–4:30 AM GMT)']
const TIMEFRAMES = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h']

const DEFAULT_ENTRY_MODELS = ['FVG', 'Breaker', 'iFVG', 'Turtle Soup', 'Order Block', 'Propulsion Block', 'Silver Bullet', '2022 Model']
const DEFAULT_MARKET_CONDITIONS = ['Choppy', 'Volatile', 'Bullish Volatile', 'Bearish Volatile', 'Crashing', 'Pumping', 'Consolidating', 'Trending']
const DEFAULT_PSYCH_TAGS = ['Patient', 'Focused', 'Confident', 'Flow State', 'Neutral', 'Hesitant', 'Anxious', 'Euphoric', 'Tilted']
const DEFAULT_MISTAKES = ['FOMO Entry', 'Revenge Trading', 'Overleveraging', 'Moved Stop Loss', 'Boredom', 'Early Entry', 'Late Exit', 'Forced Trade', 'Ignored Rules']
const DEFAULT_PD_ARRAYS = ['Daily FVG', '4H FVG', '1H Breaker', '15m OB', 'Previous Day High', 'Previous Day Low', 'Session High', 'Session Low', 'Weekly Open']
const DEFAULT_DOLS = ['London high', 'London low', 'Asia high', 'Asia low', 'Previous Day High', 'Previous Day Low', 'Previous Week High', 'Previous Week Low', 'Data high', 'Data low', '9:30 high', '9:30 low']
const DEFAULT_CONFLUENCES = ['Time of Day', 'SMT Divergence', 'Higher Timeframe Bias', 'Macro Alignment', 'News Release', 'Yields/DXY Divergence']

export default function EditTradeModal({ trade, accounts, onClose }: { trade: Trade, accounts: PropAccount[], onClose: () => void }) {
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)

    const [error, setError] = useState('')

    // Auto-calc inputs initialized from trade
    const isManualInit = trade.tp_avg === null && trade.sl === null && (trade.r_multiple !== null || trade.risk_dollars !== null)
    const [isManual, setIsManual] = useState(isManualInit)
    const [ticker, setTicker] = useState(trade.ticker)
    const [direction, setDirection] = useState<'long' | 'short'>(trade.direction as any)
    const [result, setResult] = useState<'win' | 'loss' | 'breakeven'>(trade.result as any)
    const [entry, setEntry] = useState(trade.entry.toString())
    const [sl, setSl] = useState(trade.sl?.toString() ?? '')
    const [tpAvg, setTpAvg] = useState(trade.tp_avg?.toString() ?? '')
    const [size, setSize] = useState(trade.size.toString())
    const [selectedAccId, setSelectedAccId] = useState(trade.account_id)

    // Manual overrides
    const [manualPnl, setManualPnl] = useState(trade.pnl.toString())
    const [manualRisk, setManualRisk] = useState(trade.risk_dollars?.toString() ?? '')
    const [manualR, setManualR] = useState(trade.r_multiple?.toString() ?? '')

    // Advanced Logging State
    const [confidence, setConfidence] = useState<number>(trade.confidence_level ?? 3)
    const [tradeType, setTradeType] = useState<'continuation' | 'reversal' | 'other' | ''>((trade.trade_type as any) ?? '')
    const [bias, setBias] = useState<'bullish' | 'bearish' | 'neutral' | ''>((trade.bias as any) ?? '')
    const [sessionStatus, setSessionStatus] = useState<'in_session' | 'out_of_session'>((trade.session_status as any) ?? 'in_session')

    // Array tags
    const [entryTags, setEntryTags] = useState<string[]>(trade.entry_tags || [])
    const [marketConditions, setMarketConditions] = useState<string[]>(trade.market_conditions || [])
    const [psychTags, setPsychTags] = useState<string[]>(trade.psychology_tags || [])
    const [mistakes, setMistakes] = useState<string[]>(trade.mistakes || [])
    const [pdArrays, setPdArrays] = useState<string[]>(trade.pd_arrays || [])
    const [dols, setDols] = useState<string[]>(trade.dols || [])
    const [confluences, setConfluences] = useState<string[]>(trade.entry_confluences || [])

    const [files, setFiles] = useState<File[]>([])

    // Handlers
    const displayTicker = isManual ? '' : ticker
    const selectedAcc = accounts.find(a => a.id === selectedAccId)
    const currentTickers = selectedAcc?.market_type === 'forex' ? FOREX_TICKERS : TICKERS

    // Calculators
    const pnlCalc = isManual ? null : calcPnL(result, direction, parseFloat(entry), sl ? parseFloat(sl) : null, tpAvg ? parseFloat(tpAvg) : null, parseFloat(size), displayTicker)
    const riskDollars = isManual ? null : calcRiskDollars(parseFloat(entry), parseFloat(sl), parseFloat(size), displayTicker)
    const rMultiple = isManual ? null : (riskDollars && pnlCalc !== null ? calcRMultiple(pnlCalc, riskDollars) : null)
    const pnlColor = isManual ? undefined : (pnlCalc !== null ? (pnlCalc >= 0 ? 'var(--green)' : 'var(--red)') : undefined)

    const finalPnl = isManual ? (manualPnl ? parseFloat(manualPnl) : null) : pnlCalc
    const finalRisk = isManual ? (manualRisk ? parseFloat(manualRisk) : null) : riskDollars
    const finalR = isManual ? (manualR ? parseFloat(manualR) : null) : rMultiple

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (!isManual && pnlCalc === null) {
            setError(result === 'win' ? 'TP Avg is required for a Win.' : 'Stop Loss is required for a Loss.')
            return
        }
        if (isManual && finalPnl === null) {
            setError('P&L is explicitly required in Manual Mode.')
            return
        }
        const maxUnrealizedInput = (formRef.current?.elements.namedItem('max_unrealized_pnl') as HTMLInputElement)?.value
        if (selectedAcc?.drawdown_type === 'intraday' && !maxUnrealizedInput) {
            setError('Max Unrealized P&L is required for Intraday accounts.')
            return
        }

        const fd = new FormData(formRef.current!)
        fd.set('is_manual', isManual ? 'true' : 'false')
        if (finalPnl !== null) fd.set('pnl', String(finalPnl))
        fd.set('result', result)
        if (finalRisk !== null) fd.set('risk_dollars', String(finalRisk))
        if (finalR !== null) fd.set('r_multiple', String(finalR))

        fd.set('confidence_level', String(confidence))
        if (tradeType) fd.set('trade_type', tradeType)
        if (bias) fd.set('bias', bias)
        fd.set('session_status', sessionStatus)

        fd.set('entry_tags', JSON.stringify(entryTags))
        fd.set('market_conditions', JSON.stringify(marketConditions))
        fd.set('psychology_tags', JSON.stringify(psychTags))
        fd.set('mistakes', JSON.stringify(mistakes))
        fd.set('pd_arrays', JSON.stringify(pdArrays))
        fd.set('dols', JSON.stringify(dols))
        fd.set('entry_confluences', JSON.stringify(confluences))

        files.forEach(f => fd.append('screenshots', f))

        startTransition(async () => {
            const res = await updateTrade(trade.id, fd)
            if (!res.success) {
                setError(res.error || 'Failed to update trade')
            } else {
                onClose()
            }
        })
    }

    const modal = (
        <div style={BACKDROP} onClick={onClose}>
            <div style={MODAL} onClick={e => e.stopPropagation()} className="animate-fade-in">
                <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>

                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                        Edit Trade <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'var(--bg-overlay)', borderRadius: 12, color: 'var(--text-muted)' }}>{trade.ticker} · {trade.date}</span>
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Modify trade parameters and metadata. Historic P&L balances will be automatically recalculated.
                    </p>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {error && (
                        <div style={{ padding: '12px 16px', background: 'var(--red-muted)', color: 'var(--red)', borderRadius: 8, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    {/* Mode Toggle */}
                    <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 4, alignSelf: 'flex-start', border: '1px solid var(--border)' }}>
                        <button type="button" onClick={() => setIsManual(false)} style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: !isManual ? 'var(--accent)' : 'transparent', color: !isManual ? '#fff' : 'var(--text-secondary)' }}>Auto-Calc</button>
                        <button type="button" onClick={() => setIsManual(true)} style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: isManual ? 'var(--accent)' : 'transparent', color: isManual ? '#fff' : 'var(--text-secondary)' }}>Manual Entry</button>
                    </div>

                    {/* Basic Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label className="label">Account</label>
                            <select className="input" name="account_id" value={selectedAccId} onChange={e => setSelectedAccId(e.target.value)} required>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.firm_name} - ${a.account_size.toLocaleString()}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Date</label>
                            <input className="input" type="date" name="date" defaultValue={trade.date} required />
                        </div>
                        <div>
                            <label className="label">Ticker</label>
                            {isManual ? (
                                <input className="input" type="text" name="ticker" placeholder="e.g. AAPL" defaultValue={trade.ticker} required />
                            ) : (
                                <select className="input" name="ticker" value={ticker} onChange={e => setTicker(e.target.value)} required>
                                    {currentTickers.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="label">Direction</label>
                            <select className="input" name="direction" value={direction} onChange={e => setDirection(e.target.value as any)} required>
                                <option value="long">Long</option>
                                <option value="short">Short</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Result</label>
                            <select className="input" value={result} onChange={e => setResult(e.target.value as any)} required>
                                <option value="win">Win</option>
                                <option value="loss">Loss</option>
                                <option value="breakeven">Break-even</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">{FOREX_TICKERS.includes(displayTicker) ? 'Lot Size' : 'Quantity'}</label>
                            <input className="input" type="number" name="size" min={0.01} step={0.01} value={size} onChange={e => setSize(e.target.value)} required />
                        </div>
                    </div>

                    {/* Exits */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="label">Entry Price</label>
                            <input className="input" type="number" name="entry" step="0.01" value={entry} onChange={e => setEntry(e.target.value)} required />
                        </div>
                        <div>
                            <label className="label">Stop Loss</label>
                            <input className="input" type="number" name="sl" step="0.01" value={sl} onChange={e => setSl(e.target.value)} />
                        </div>
                        <div>
                            <label className="label">TP Avg</label>
                            <input className="input" type="number" name="tp_avg" step="0.01" value={tpAvg} onChange={e => setTpAvg(e.target.value)} />
                        </div>
                    </div>

                    {/* PnL Preview */}
                    <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>P&L</div>
                                {isManual ? (
                                    <input className="input" type="number" step="0.01" style={{ textAlign: 'center', marginTop: 4 }} value={manualPnl} onChange={e => setManualPnl(e.target.value)} required />
                                ) : (
                                    <div style={{ color: pnlColor ?? 'var(--text-muted)', fontWeight: 700, marginTop: 8, fontSize: '1.2rem' }}>
                                        {pnlCalc !== null ? `${pnlCalc >= 0 ? '+' : ''}${formatCurrency(pnlCalc)}` : '—'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk</div>
                                {isManual ? (
                                    <input className="input" type="number" step="0.01" style={{ textAlign: 'center', marginTop: 4 }} value={manualRisk} onChange={e => setManualRisk(e.target.value)} />
                                ) : (
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 8, fontSize: '1.1rem' }}>
                                        {riskDollars ? formatCurrency(riskDollars) : '—'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>R-Multiple</div>
                                {isManual ? (
                                    <input className="input" type="number" step="0.01" style={{ textAlign: 'center', marginTop: 4 }} value={manualR} onChange={e => setManualR(e.target.value)} />
                                ) : (
                                    <div style={{ color: rMultiple ? (rMultiple >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)', fontWeight: 700, marginTop: 8, fontSize: '1.1rem' }}>
                                        {rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R` : '—'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

                    {/* Metadata */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label className="label">Session</label>
                            <select className="input" name="session" defaultValue={trade.session || ''}>
                                <option value="">None</option>
                                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Timeframe</label>
                            <select className="input" name="exec_timeframe" defaultValue={trade.exec_timeframe || ''}>
                                <option value="">None</option>
                                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Macro <span style={{ fontSize: 10 }}>(ICT)</span></label>
                            <select className="input" name="macro" defaultValue={trade.macro || ''}>
                                <option value="">None</option>
                                {MACROS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Duration (Mins)</label>
                            <input className="input" type="number" name="duration_minutes" defaultValue={trade.duration_minutes || ''} min={0} />
                        </div>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />

                    {/* Tagging Engine */}
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Confluence & Tagging</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                            <TagMultiSelect category="entry_model" label="Entry Models" defaultOptions={DEFAULT_ENTRY_MODELS} selectedTags={entryTags} onChange={setEntryTags} />
                            <TagMultiSelect category="entry_confluence" label="Entry Confluences" defaultOptions={DEFAULT_CONFLUENCES} selectedTags={confluences} onChange={setConfluences} />
                            <TagMultiSelect category="dol" label="Draw on Liquidity (DOL)" defaultOptions={DEFAULT_DOLS} selectedTags={dols} onChange={setDols} />
                            <TagMultiSelect category="pd_array" label="PD Arrays" defaultOptions={DEFAULT_PD_ARRAYS} selectedTags={pdArrays} onChange={setPdArrays} />
                            <TagMultiSelect category="market_condition" label="Market Conditions" defaultOptions={DEFAULT_MARKET_CONDITIONS} selectedTags={marketConditions} onChange={setMarketConditions} />
                            <TagMultiSelect category="psychology" label="Psychology Tags" defaultOptions={DEFAULT_PSYCH_TAGS} selectedTags={psychTags} onChange={setPsychTags} />
                            <TagMultiSelect category="mistake" label="Mistakes Made" defaultOptions={DEFAULT_MISTAKES} selectedTags={mistakes} onChange={setMistakes} />
                        </div>
                    </div>

                    {/* Upload */}
                    <div style={{ marginTop: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Add Screenshots</h3>
                        <MultiImageUploader files={files} onFilesChange={setFiles} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Existing screenshots will be retained.</div>
                    </div>

                    {/* Submit */}
                    <div style={{ position: 'sticky', bottom: -32, padding: '1.5rem 0', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: 'auto', zIndex: 10 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isPending} style={{ padding: '0 2rem' }}>
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Save Changes</>}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )

    return createPortal(modal, document.body)
}
