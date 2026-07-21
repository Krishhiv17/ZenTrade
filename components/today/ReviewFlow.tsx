'use client'

import { useState } from 'react'
import Link from 'next/link'
import { finalizeEndOfDay } from '@/actions/eod'
import { generateDailySummary } from '@/actions/daily-summary'
import { formatCurrency, formatR } from '@/lib/utils'
import type { ReviewData } from '@/actions/review'
import type { FactorTier } from '@/lib/domain/discipline'
import {
    ArrowLeft, Lock, Loader2, Flame, Sparkles, AlertTriangle, Brain, Trophy,
} from 'lucide-react'
import posthog from 'posthog-js'

function scoreColor(score: number): string {
    if (score >= 70) return 'var(--green)'
    if (score >= 45) return 'var(--yellow)'
    return 'var(--red)'
}

const TIER_META: Record<FactorTier, { label: string; color: string }> = {
    strong: { label: 'Strong', color: 'var(--green)' },
    solid: { label: 'Solid', color: 'var(--accent)' },
    shaky: { label: 'Shaky', color: 'var(--yellow)' },
    weak: { label: 'Weak', color: 'var(--red)' },
}

function Ring({ score, size = 150 }: { score: number | null; size?: number }) {
    const stroke = 9
    const r = size / 2 - stroke
    const c = 2 * Math.PI * r
    const dash = ((score ?? 0) / 100) * c
    const col = score === null ? 'var(--border-strong)' : scoreColor(score)
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-strong)" strokeWidth={stroke} />
                {score !== null && (
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke}
                        strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
                )}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tabnums" style={{ fontSize: size * 0.28, fontWeight: 700, lineHeight: 1, color: score === null ? 'var(--text-muted)' : col }}>{score ?? '—'}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>Discipline</span>
            </div>
        </div>
    )
}

// Qualitative only — no numbers, no weights (the scoring formula is a blackbox).
function FactorRow({ label, tier }: { label: string; tier: FactorTier }) {
    const m = TIER_META[tier]
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: m.color, border: `1px solid ${m.color}`, borderRadius: 9999, padding: '2px 10px', opacity: 0.9 }}>
                {m.label}
            </span>
        </div>
    )
}

const prettyDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

export default function ReviewFlow({ initial }: { initial: ReviewData }) {
    const [locked, setLocked] = useState(initial.isLocked)
    const [locking, setLocking] = useState(false)
    const [lockError, setLockError] = useState('')

    const [feedback, setFeedback] = useState<string | null>(initial.aiFeedback)
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState('')

    async function doLock() {
        if (!initial.accountId) return
        setLocking(true); setLockError('')
        const res = await finalizeEndOfDay(initial.accountId, initial.sessionDate)
        setLocking(false)
        if (res.success) {
            posthog.capture('review_completed', { score: initial.score ?? null })
            setLocked(true)
        }
        else setLockError(res.error ?? 'Failed to lock the day.')
    }

    async function getAiTake() {
        setAiLoading(true); setAiError('')
        const res = await generateDailySummary(initial.sessionDate)
        setAiLoading(false)
        if (res.success && res.data) setFeedback(res.data.feedback)
        else setAiError(res.error ?? 'Could not generate the AI recap.')
    }

    const tiers = initial.tiers

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div>
                <Link href="/today" className="hover:text-white" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: 10 }}>
                    <ArrowLeft size={15} /> Today
                </Link>
                <h1 style={{ fontSize: '1.6rem', margin: 0, letterSpacing: '-0.02em' }}>
                    {locked ? 'Your Wrapped' : 'End of Day Review'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                    {prettyDate(initial.sessionDate)}{initial.accountName ? ` · ${initial.accountName}` : ''}
                </p>
            </div>

            {!initial.hasAccount || initial.tradeCount === 0 ? (
                <div className="card-elevated" style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        {initial.hasAccount ? 'No trades to review for this trading day.' : 'Create an account to start reviewing your days.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* ── The Wrapped / score card (shareable) ── */}
                    <div className="card-elevated" style={{ padding: '1.9rem', position: 'relative', overflow: 'hidden' }}>
                        <div className="zen-glow" style={{ top: -80, right: -60, width: 320, height: 320 }} />
                        <div className="zen-hero" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.75rem', alignItems: 'center' }}>
                            <Ring score={initial.score} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                                    {locked ? 'Locked · Process grade' : 'Process grade'}
                                </div>
                                {tiers && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 1.4rem' }}>
                                        <FactorRow label="Rules" tier={tiers.rule} />
                                        <FactorRow label="Emotion" tier={tiers.emotion} />
                                        <FactorRow label="Journaling" tier={tiers.journaling} />
                                        <FactorRow label="Playbook" tier={tiers.playbook} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 18, marginTop: 16, fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Net P&amp;L{' '}
                                        <span className="tabnums" style={{ fontWeight: 700, color: initial.netPnl > 0 ? 'var(--green)' : initial.netPnl < 0 ? 'var(--red)' : 'var(--text-primary)' }}>
                                            {initial.netPnl >= 0 ? '+' : ''}{formatCurrency(initial.netPnl)}
                                        </span>
                                    </span>
                                    <span style={{ color: 'var(--text-secondary)' }}>Trades <span className="tabnums" style={{ fontWeight: 700 }}>{initial.tradeCount}</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Process notes */}
                        {tiers && tiers.notes.length > 0 && (
                            <div style={{ position: 'relative', borderTop: '1px solid var(--border)', marginTop: '1.4rem', paddingTop: '1.1rem', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {tiers.notes.map((n, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        <AlertTriangle size={13} color="var(--yellow)" style={{ flexShrink: 0 }} /> {n}
                                    </div>
                                ))}
                            </div>
                        )}
                        {tiers && tiers.notes.length === 0 && (
                            <div style={{ position: 'relative', borderTop: '1px solid var(--border)', marginTop: '1.4rem', paddingTop: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--green)' }}>
                                <Trophy size={14} /> Clean, disciplined day — no rule breaks flagged.
                            </div>
                        )}

                        {locked && (
                            <div style={{ position: 'relative', marginTop: '1.4rem', textAlign: 'right', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                                ZenTrade · Discipline over P&amp;L
                            </div>
                        )}
                    </div>

                    {/* ── Trades walk ── */}
                    <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Your trades</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {initial.trades.map((t, i) => {
                                const col = t.pnl > 0 ? 'var(--green)' : t.pnl < 0 ? 'var(--red)' : 'var(--text-secondary)'
                                return (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.65rem 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: t.direction === 'long' ? 'var(--green)' : 'var(--red)', width: 42 }}>{t.direction}</span>
                                        <span style={{ fontWeight: 600, width: 60 }}>{t.ticker}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {t.session ?? '—'}{t.is_flagged && <span style={{ color: 'var(--yellow)', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={11} /> {t.flag_reason}</span>}
                                        </span>
                                        {t.r_multiple !== null && <span className="tabnums" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: 56, textAlign: 'right' }}>{formatR(t.r_multiple)}</span>}
                                        <span className="tabnums" style={{ fontWeight: 700, color: col, width: 88, textAlign: 'right' }}>{t.pnl >= 0 ? '+' : ''}{formatCurrency(t.pnl)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── AI coach's take (on-demand, commentary only) ── */}
                    {locked && (
                        <div className="card-elevated" style={{ padding: '1.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: feedback ? '0.9rem' : '0.6rem' }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Brain size={15} color="var(--accent)" />
                                </div>
                                <div style={{ fontWeight: 600 }}>Coach&rsquo;s take</div>
                            </div>
                            {feedback ? (
                                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{feedback}</p>
                            ) : (
                                <div>
                                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0 0 0.9rem' }}>
                                        Get an AI read on today&rsquo;s process — which trades held your discipline and which broke it.
                                    </p>
                                    <button className="btn btn-primary" onClick={getAiTake} disabled={aiLoading} style={{ padding: '0.6rem 1.2rem' }}>
                                        {aiLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
                                        {aiLoading ? 'Analyzing…' : "Get the coach's take"}
                                    </button>
                                    {aiError && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 10 }}>{aiError}</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Lock CTA / shareable hint ── */}
                    {!locked ? (
                        <div className="card" style={{ padding: '1.25rem 1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 380 }}>
                                Finalize the day to lock your discipline score into your history and streak. This can&rsquo;t be undone.
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                <button className="btn btn-primary" onClick={doLock} disabled={locking} style={{ padding: '0.7rem 1.5rem' }}>
                                    {locking ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={15} />}
                                    {locking ? 'Locking…' : 'Lock day & reveal Wrapped'}
                                </button>
                                {lockError && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{lockError}</span>}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <Flame size={14} color="var(--accent)" /> Day locked. Screenshot your Wrapped to share it.
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
