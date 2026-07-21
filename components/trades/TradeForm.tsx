'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTrade } from '@/actions/trades'
import type { PropAccount } from '@/lib/supabase/types'
import {
    calcRiskDollars, calcRMultiple, calcPnL,
    formatCurrency,
} from '@/lib/utils'
import { AlertTriangle, CheckCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

// New advanced components
import StarRating from '@/components/ui/StarRating'
import TagMultiSelect from '@/components/ui/TagMultiSelect'
import MultiImageUploader from '@/components/trades/MultiImageUploader'

// ─── Constants ────────────────────────────────────────────────

const TICKERS = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K', 'GC', 'CL', 'UB', 'NG']
const FOREX_TICKERS = ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'XAUUSD', 'XAGUSD', 'WTI', 'BRENT']

const SESSIONS = [
    'Asia',
    'London',
    'Pre-Market',
    'New York AM',
    'New York PM',
]

const MACROS = [
    'NY AM Macro 1  (9:50–10:10 AM)',
    'NY AM Macro 2  (10:50–11:10 AM)',
    'NY Lunch Macro (11:50 AM–12:10 PM)',
    'NY PM Macro    (1:10–1:40 PM)',
    'NY Last Hour   (3:15–3:45 PM)',
    'London Macro 1 (2:33–3:00 AM GMT)',
    'London Macro 2 (4:03–4:30 AM GMT)',
]

const TIMEFRAMES = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h']

// ─── Default Tags ─────────────────────────────────────────────

const DEFAULT_ENTRY_MODELS = ['FVG', 'Breaker', 'iFVG', 'Turtle Soup', 'Order Block', 'Propulsion Block', 'Silver Bullet', '2022 Model']
const DEFAULT_MARKET_CONDITIONS = ['Choppy', 'Volatile', 'Bullish Volatile', 'Bearish Volatile', 'Crashing', 'Pumping', 'Consolidating', 'Trending']
const DEFAULT_PSYCH_TAGS = ['Patient', 'Focused', 'Confident', 'Flow State', 'Neutral', 'Hesitant', 'Anxious', 'Euphoric', 'Tilted']
const DEFAULT_MISTAKES = ['FOMO Entry', 'Revenge Trading', 'Overleveraging', 'Moved Stop Loss', 'Boredom', 'Early Entry', 'Late Exit', 'Forced Trade', 'Ignored Rules']
const DEFAULT_PD_ARRAYS = ['Daily FVG', '4H FVG', '1H Breaker', '15m OB', 'Previous Day High', 'Previous Day Low', 'Session High', 'Session Low', 'Weekly Open']
const DEFAULT_DOLS = ['London high', 'London low', 'Asia high', 'Asia low', 'Previous Day High', 'Previous Day Low', 'Previous Week High', 'Previous Week Low', 'Data high', 'Data low', '9:30 high', '9:30 low']
const DEFAULT_CONFLUENCES = ['Time of Day', 'SMT Divergence', 'Higher Timeframe Bias', 'Macro Alignment', 'News Release', 'Yields/DXY Divergence']

// ─── Stepper ──────────────────────────────────────────────────

const STEP_LABELS = ['Execution', 'Setup', 'Review']

function Stepper({ step, onStep }: { step: number; onStep: (n: number) => void }) {
    return (
        <div className="hscroll" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {STEP_LABELS.map((label, i) => {
                const n = i + 1
                const done = step > n
                const active = step === n
                const col = active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text-muted)'
                return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button type="button" onClick={() => onStep(n)} disabled={n > step}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                                cursor: n <= step ? 'pointer' : 'default', padding: '4px 2px', minHeight: 40,
                            }}>
                            <span style={{
                                width: 26, height: 26, borderRadius: 9999, flexShrink: 0, fontSize: '0.78rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? 'var(--green)' : active ? 'var(--accent-glow)' : 'transparent',
                                border: `1.5px solid ${col}`, color: done ? '#07110F' : col,
                            }}>
                                {done ? <CheckCircle size={15} /> : n}
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: active ? 700 : 500, color: active || done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {label}
                            </span>
                        </button>
                        {n < STEP_LABELS.length && (
                            <div style={{ width: 28, height: 2, background: done ? 'var(--green)' : 'var(--border)', borderRadius: 2 }} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Component ────────────────────────────────────────────────

interface TradeFormProps {
    accounts: PropAccount[]
}

export default function TradeForm({ accounts }: TradeFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)

    // UI state
    const [guard, setGuard] = useState<{ flagged: boolean; reason: string } | null>(null)
    const [error, setError] = useState('')
    const [isManual, setIsManual] = useState(false)
    const [step, setStep] = useState(1) // 1 Execution · 2 Setup · 3 Review

    // Trade date + execution time drive the session (trading) day. Both default to
    // "now in New York (ET)" — the account's reset timezone — so the 5 PM ET rollover
    // is unambiguous regardless of where the trader physically sits. Set on mount
    // (client-only, so no SSR hydration mismatch).
    const [execDate, setExecDate] = useState('')
    const [execTime, setExecTime] = useState('')
    useEffect(() => {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date())
        const g = (t: string) => parts.find(p => p.type === t)?.value ?? ''
        setExecDate(`${g('year')}-${g('month')}-${g('day')}`)
        setExecTime(`${g('hour')}:${g('minute')}`)
    }, [])

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

    // Advanced Logging State
    const [confidence, setConfidence] = useState<number>(3)
    const [tradeType, setTradeType] = useState<'continuation' | 'reversal' | 'other' | ''>('')
    const [bias, setBias] = useState<'bullish' | 'bearish' | 'neutral' | ''>('')
    const [sessionStatus, setSessionStatus] = useState<'in_session' | 'out_of_session'>('in_session')

    // Array tags
    const [entryTags, setEntryTags] = useState<string[]>([])
    const [marketConditions, setMarketConditions] = useState<string[]>([])
    const [psychTags, setPsychTags] = useState<string[]>([])
    const [mistakes, setMistakes] = useState<string[]>([])
    const [pdArrays, setPdArrays] = useState<string[]>([])
    const [dols, setDols] = useState<string[]>([])
    const [confluences, setConfluences] = useState<string[]>([])

    // File state
    const [files, setFiles] = useState<File[]>([])

    const activeAccounts = accounts.filter(a => a.status === 'active')
    const selectedAcc = accounts.find(a => a.id === selectedAccId)

    const isForex = selectedAcc?.market_type === 'forex'
    const displayTicker = isForex ? ticker : (TICKERS.includes(ticker) ? ticker : TICKERS[0])
    const effectiveIsManual = isForex || isManual

    // ── Derived calcs ──
    const entryN = entry ? parseFloat(entry) : null
    const slN = sl ? parseFloat(sl) : null
    const tpAvgN = tpAvg ? parseFloat(tpAvg) : null
    const sizeN = size ? parseFloat(size) : 1

    const pnlCalc = entryN !== null ? calcPnL(result, direction, entryN, slN, tpAvgN, sizeN, displayTicker) : null
    const riskDollars = (entryN !== null && slN !== null) ? calcRiskDollars(entryN, slN, sizeN, displayTicker) : null
    const rMultiple = (pnlCalc !== null && riskDollars) ? calcRMultiple(pnlCalc, riskDollars) : null

    // Final values sent to DB or used for balance preview
    const finalPnl = effectiveIsManual ? (manualPnl ? parseFloat(manualPnl) : null) : pnlCalc
    const finalRisk = effectiveIsManual ? (manualRisk ? parseFloat(manualRisk) : null) : riskDollars
    const finalR = effectiveIsManual ? (manualR ? parseFloat(manualR) : null) : rMultiple
    const balanceAfter = (selectedAcc && finalPnl !== null) ? selectedAcc.current_balance + finalPnl : null

    // Validate everything on Step 1 (Execution). Because later steps stay mounted
    // (hidden), we can't lean on native `required` — the browser can't focus a
    // hidden control — so the form uses noValidate and we gate advancing here.
    function validateExecution(): string | null {
        if (activeAccounts.length === 0) return 'Create an active account before logging a trade.'
        if (!selectedAccId) return 'Select an account.'
        if (!execDate) return 'Date is required.'
        if (!entry) return 'Entry price is required.'
        if (!size || parseFloat(size) <= 0) return 'Quantity / lot size is required.'
        if (!effectiveIsManual && pnlCalc === null) {
            return result === 'win' ? 'TP Avg is required for a Win.' : 'Stop Loss is required for a Loss.'
        }
        if (effectiveIsManual && finalPnl === null) return 'P&L is required in Manual Mode.'
        const maxUnrealizedInput = (formRef.current?.elements.namedItem('max_unrealized_pnl') as HTMLInputElement)?.value
        if (selectedAcc?.drawdown_type === 'intraday' && !maxUnrealizedInput) {
            return 'Max Unrealized P&L is required for Intraday Trailing accounts.'
        }
        return null
    }

    function goNext() {
        if (step === 1) {
            const err = validateExecution()
            if (err) { setError(err); return }
        }
        setError('')
        setStep(s => Math.min(3, s + 1))
    }

    // ── Submit ──
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(''); setGuard(null)

        const err = validateExecution()
        if (err) { setError(err); setStep(1); return }

        const fd = new FormData(formRef.current!)
        fd.set('is_manual', effectiveIsManual ? 'true' : 'false')

        // Inject computed values
        if (finalPnl !== null) fd.set('pnl', String(finalPnl))
        fd.set('result', result)
        if (finalRisk !== null) fd.set('risk_dollars', String(finalRisk))
        if (finalR !== null) fd.set('r_multiple', String(finalR))
        if (balanceAfter !== null) fd.set('balance_after', String(balanceAfter))

        // Inject advanced advanced fields
        fd.set('confidence_level', String(confidence))
        if (tradeType) fd.set('trade_type', tradeType)
        if (bias) fd.set('bias', bias)
        fd.set('session_status', sessionStatus)

        // Inject JSON arrays
        fd.set('entry_tags', JSON.stringify(entryTags))
        fd.set('market_conditions', JSON.stringify(marketConditions))
        fd.set('psychology_tags', JSON.stringify(psychTags))
        fd.set('mistakes', JSON.stringify(mistakes))
        fd.set('pd_arrays', JSON.stringify(pdArrays))
        fd.set('dols', JSON.stringify(dols))
        fd.set('entry_confluences', JSON.stringify(confluences))

        // Inject files
        files.forEach(f => fd.append('screenshots', f))

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

    const pnlColor = finalPnl !== null ? (finalPnl >= 0 ? 'var(--green)' : 'var(--red)') : undefined

    return (
        <form ref={formRef} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            <Stepper step={step} onStep={(n) => { if (n < step) { setError(''); setStep(n) } }} />

            {/* ─── STEP 1: Execution ─── */}
            <div style={{ display: step === 1 ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Manual Mode Toggle Top Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Manual Mode</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {isForex ? 'Forex accounts require manual entry of P&L and Risk.' : 'Override auto-calculations and manually enter your P&L, Risk $, and R-Multiple.'}
                    </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: isForex ? 'not-allowed' : 'pointer', position: 'relative' }}>
                    <input type="checkbox" checked={effectiveIsManual} onChange={e => !isForex && setIsManual(e.target.checked)} disabled={isForex} style={{ opacity: 0, position: 'absolute' }} />
                    <div style={{ width: 44, height: 24, background: effectiveIsManual ? 'var(--accent)' : 'var(--bg-overlay)', borderRadius: 12, border: '1px solid var(--border-strong)', outline: effectiveIsManual ? '2px solid var(--accent-glow)' : 'none', position: 'relative', transition: '0.2s' }}>
                        <div style={{ width: 18, height: 18, background: '#fff', borderRadius: 9, position: 'absolute', top: 2, left: effectiveIsManual ? 22 : 2, transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                    </div>
                </label>
            </div>

                    {/* Account */}
                    <div>
                        <label className="label">Prop Account</label>
                        {activeAccounts.length === 0 ? (
                            <div style={{ color: 'var(--red)', fontSize: '0.875rem', padding: '8px 12px', background: 'var(--red-muted)', borderRadius: 6 }}>
                                No active accounts. <a href="/accounts" style={{ color: 'var(--accent)' }}>Create one.</a>
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Date <span style={{ color: 'var(--text-muted)' }}>(ET)</span></label>
                            <input className="input" type="date" name="date" value={execDate} onChange={e => setExecDate(e.target.value)} required />
                        </div>
                        <div>
                            <label className="label">Time <span style={{ color: 'var(--text-muted)' }}>(ET)</span></label>
                            <input className="input" type="time" name="executed_time" value={execTime} onChange={e => setExecTime(e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Result</label>
                            <select className="input" name="result" value={result} onChange={e => setResult(e.target.value as any)} required>
                                <option value="win">Win</option>
                                <option value="loss">Loss</option>
                                <option value="breakeven">Breakeven</option>
                            </select>
                        </div>
                    </div>

                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
                        Times are New York (ET). A trade at or after 5:00 PM ET counts toward the next trading day.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Ticker</label>
                            {isForex ? (
                                <input className="input" type="text" name="ticker" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. BTCUSD" required />
                            ) : (
                                <select className="input" name="ticker" value={displayTicker} onChange={e => setTicker(e.target.value)} required>
                                    {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
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
                            <label className="label">{FOREX_TICKERS.includes(displayTicker) ? 'Lot Size' : 'Quantity'}</label>
                            <input className="input" type="number" name="size" min={0.01} step={0.01} value={size} onChange={e => setSize(e.target.value)} required />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Entry Price</label>
                            <input className="input" type="number" name="entry" step="0.01" value={entry} onChange={e => setEntry(e.target.value)} placeholder="0.00" required />
                        </div>
                        <div>
                            <label className="label">Stop Loss</label>
                            <input className="input" type="number" name="sl" step="0.01" value={sl} onChange={e => setSl(e.target.value)} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="label">TP Avg</label>
                            <input className="input" type="number" name="tp_avg" step="0.01" value={tpAvg} onChange={e => setTpAvg(e.target.value)} placeholder="0.00" />
                        </div>
                    </div>

                    {/* Auto-calc displays */}
                    <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>P&L</div>
                                {effectiveIsManual ? (
                                    <input className="input" type="number" step="0.01" style={{ textAlign: 'center', padding: '4px', height: '30px' }} value={manualPnl} onChange={e => setManualPnl(e.target.value)} required />
                                ) : (
                                    <div style={{ color: pnlColor ?? 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>
                                        {pnlCalc !== null ? `${pnlCalc >= 0 ? '+' : ''}${formatCurrency(pnlCalc)}` : '—'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk</div>
                                {effectiveIsManual ? (
                                    <input className="input" type="number" step="0.01" style={{ textAlign: 'center', padding: '4px', height: '30px' }} value={manualRisk} onChange={e => setManualRisk(e.target.value)} />
                                ) : (
                                    <div style={{ color: riskDollars !== null ? 'var(--yellow)' : 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
                                        {riskDollars !== null ? formatCurrency(riskDollars) : '—'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>R-Mult</div>
                                {effectiveIsManual ? (
                                    <input className="input" type="number" step="0.01" style={{ textAlign: 'center', padding: '4px', height: '30px' }} value={manualR} onChange={e => setManualR(e.target.value)} />
                                ) : (
                                    <div style={{ color: rMultiple !== null ? (rMultiple >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
                                        {rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R` : '—'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Intraday Only: Max Unrealized */}
                    {selectedAcc?.drawdown_type === 'intraday' && (
                        <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8 }}>
                            <label className="label" style={{ color: '#60a5fa' }}>Max Unrealized P&L ($) (Required)</label>
                            <input className="input" type="number" name="max_unrealized_pnl" step="0.01" required placeholder="e.g. 500.00" style={{ borderColor: 'rgba(59,130,246,0.3)' }} />
                        </div>
                    )}
            </div>

            {/* ─── STEP 2: Setup ─── */}
            <div style={{ display: step === 2 ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Bias</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['bullish', 'bearish', 'neutral'].map(b => (
                                    <button
                                        key={b} type="button"
                                        onClick={() => setBias(b as any)}
                                        style={{
                                            flex: 1, padding: '6px 0', border: `1px solid ${bias === b ? 'var(--accent)' : 'var(--border)'}`,
                                            background: bias === b ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                                            color: bias === b ? 'var(--accent)' : 'var(--text-muted)',
                                            borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize'
                                        }}
                                    >
                                        {b}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="label">Trade Type</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['continuation', 'reversal'].map(tt => (
                                    <button
                                        key={tt} type="button"
                                        onClick={() => setTradeType(tt as any)}
                                        style={{
                                            flex: 1, padding: '6px 0', border: `1px solid ${tradeType === tt ? 'var(--accent)' : 'var(--border)'}`,
                                            background: tradeType === tt ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                                            color: tradeType === tt ? 'var(--accent)' : 'var(--text-muted)',
                                            borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize'
                                        }}
                                    >
                                        {tt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <TagMultiSelect
                        label="Entry Models" category="entry_model"
                        selectedTags={entryTags} onChange={setEntryTags} defaultOptions={DEFAULT_ENTRY_MODELS}
                    />

                    <TagMultiSelect
                        label="Market Conditions" category="market_condition"
                        selectedTags={marketConditions} onChange={setMarketConditions} defaultOptions={DEFAULT_MARKET_CONDITIONS}
                    />

                    <TagMultiSelect
                        label="Higher Timeframe PD Arrays" category="pd_array"
                        selectedTags={pdArrays} onChange={setPdArrays} defaultOptions={DEFAULT_PD_ARRAYS}
                    />

                    <TagMultiSelect
                        label="Draw on Liquidity (DOL)" category="dol"
                        selectedTags={dols} onChange={setDols} defaultOptions={DEFAULT_DOLS}
                    />

                    <TagMultiSelect
                        label="Entry Confluences" category="entry_confluence"
                        selectedTags={confluences} onChange={setConfluences} defaultOptions={DEFAULT_CONFLUENCES}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Exec. TF</label>
                            <select className="input" name="exec_timeframe">
                                <option value="">—</option>
                                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Duration (m)</label>
                            <input className="input" type="number" name="duration_minutes" min="1" step="1" placeholder="e.g. 45" />
                        </div>
                    </div>
                </div>

            {/* ─── STEP 3: Review ─── */}
            <div style={{ display: step === 3 ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>

                    <div>
                        <label className="label">Setup Confidence</label>
                        <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <StarRating value={confidence} onChange={setConfidence} />
                        </div>
                    </div>

                    <TagMultiSelect
                        label="Psychology & Mindset" category="psychology"
                        selectedTags={psychTags} onChange={setPsychTags} defaultOptions={DEFAULT_PSYCH_TAGS}
                    />

                    <TagMultiSelect
                        label="Mistake Tags" category="mistake"
                        selectedTags={mistakes} onChange={setMistakes} defaultOptions={DEFAULT_MISTAKES}
                    />

                    <div>
                        <label className="label">Session Status</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                            <button
                                type="button"
                                onClick={() => setSessionStatus('in_session')}
                                style={{
                                    flex: 1, padding: '8px 0', border: `1px solid ${sessionStatus === 'in_session' ? 'var(--accent)' : 'var(--border)'}`,
                                    background: sessionStatus === 'in_session' ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                                    color: sessionStatus === 'in_session' ? 'var(--accent)' : 'var(--text-muted)',
                                    borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: sessionStatus === 'in_session' ? 600 : 400
                                }}
                            >
                                Main Session
                            </button>
                            <button
                                type="button"
                                onClick={() => setSessionStatus('out_of_session')}
                                style={{
                                    flex: 1, padding: '8px 0', border: `1px solid ${sessionStatus === 'out_of_session' ? 'var(--red)' : 'var(--border)'}`,
                                    background: sessionStatus === 'out_of_session' ? 'var(--red-glow)' : 'var(--bg-elevated)',
                                    color: sessionStatus === 'out_of_session' ? 'var(--red)' : 'var(--text-muted)',
                                    borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: sessionStatus === 'out_of_session' ? 600 : 400
                                }}
                            >
                                Out of Session
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Session</label>
                            <select className="input" name="session">
                                <option value="">— None —</option>
                                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Macro <span style={{ fontSize: 10 }}>(ICT)</span></label>
                            <select className="input" name="macro">
                                <option value="">— None —</option>
                                {MACROS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">News Trigger</label>
                            <input className="input" type="text" name="news" placeholder="e.g. CPI" />
                        </div>
                    </div>

                    <div>
                        <label className="label">Journal Notes</label>
                        <textarea className="input" name="psychology_notes" rows={4} placeholder="What did you do well? What could be improved?" style={{ resize: 'vertical' }} />
                    </div>

                    <MultiImageUploader files={files} onFilesChange={setFiles} maxFiles={5} />
            </div>

            {/* AI Guard warning */}
            {guard?.flagged && (
                <div style={{ padding: '10px 14px', background: 'var(--yellow-muted)', border: '1px solid var(--yellow)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <div style={{ color: 'var(--yellow)', fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>AI Guard Flagged</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{guard.reason}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Trade saved. Redirecting to journal…</div>
                    </div>
                </div>
            )}

            {error && (
                <div style={{ color: 'var(--red)', fontSize: '0.8125rem', padding: '8px 12px', background: 'var(--red-muted)', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {/* Footer / Stepper controls */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                {step > 1 ? (
                    <button type="button" className="btn btn-ghost" onClick={() => { setError(''); setStep(s => s - 1) }}>
                        <ChevronLeft size={15} /> Back
                    </button>
                ) : (
                    <a href="/trades" className="btn btn-ghost">Cancel</a>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Step {step} of 3</span>
                    {step < 3 ? (
                        <button type="button" className="btn btn-primary" onClick={goNext}
                            style={{ minWidth: 120, justifyContent: 'center' }}>
                            Next <ChevronRight size={15} />
                        </button>
                    ) : (
                        <button type="submit" className="btn btn-primary"
                            disabled={isPending || activeAccounts.length === 0}
                            style={{ minWidth: 140, justifyContent: 'center' }}>
                            {isPending
                                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                                : <><CheckCircle size={15} /> Log Trade</>}
                        </button>
                    )}
                </div>
            </div>
        </form>
    )
}
