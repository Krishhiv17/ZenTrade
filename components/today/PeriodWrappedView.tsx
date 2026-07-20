'use client'

import { useState } from 'react'
import Link from 'next/link'
import { generatePeriodRecap, type PeriodWrapped } from '@/actions/period'
import { formatCurrency } from '@/lib/utils'
import type { FactorTier } from '@/lib/domain/discipline'
import { ArrowLeft, Sparkles, Loader2, Brain, Trophy, TrendingDown } from 'lucide-react'

function scoreColor(s: number): string {
    if (s >= 72) return 'var(--green)'
    if (s >= 45) return 'var(--yellow)'
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
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>Discipline</span>
            </div>
        </div>
    )
}

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

const shortDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function PeriodWrappedView({ initial }: { initial: PeriodWrapped }) {
    const [feedback, setFeedback] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState('')

    async function getRecap() {
        if (!initial.accountId) return
        setLoading(true); setErr('')
        const res = await generatePeriodRecap(initial.accountId, initial.period, initial.startDate)
        setLoading(false)
        if (res.success && res.feedback) setFeedback(res.feedback)
        else setErr(res.error ?? 'Could not generate the recap.')
    }

    const title = initial.period === 'week' ? 'Weekly Wrapped' : 'Monthly Wrapped'
    const t = initial.tiers

    return (
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
                <Link href="/analytics" className="hover:text-white" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: 10 }}>
                    <ArrowLeft size={15} /> Analytics
                </Link>
                <h1 style={{ fontSize: '1.6rem', margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                    {initial.label}{initial.accountName ? ` · ${initial.accountName}` : ''}
                </p>
            </div>

            {!initial.hasData ? (
                <div className="card-elevated" style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No trades in this {initial.period}.</p>
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <div className="card-elevated" style={{ padding: '1.9rem', position: 'relative', overflow: 'hidden' }}>
                        <div className="zen-glow" style={{ top: -80, right: -60, width: 320, height: 320 }} />
                        <div className="zen-hero" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.75rem', alignItems: 'center' }}>
                            <Ring score={initial.score} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Process grade · avg</div>
                                {t && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 1.4rem' }}>
                                        <FactorRow label="Rules" tier={t.rule} />
                                        <FactorRow label="Emotion" tier={t.emotion} />
                                        <FactorRow label="Journaling" tier={t.journaling} />
                                        <FactorRow label="Playbook" tier={t.playbook} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* stats */}
                        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.9rem', borderTop: '1px solid var(--border)', marginTop: '1.4rem', paddingTop: '1.2rem' }}>
                            <Stat label="Disciplined days" value={`${initial.disciplinedDays} / ${initial.tradingDays}`} />
                            <Stat label="Net P&L" value={`${initial.netPnl >= 0 ? '+' : ''}${formatCurrency(initial.netPnl)}`} tone={initial.netPnl > 0 ? 'var(--green)' : initial.netPnl < 0 ? 'var(--red)' : undefined} />
                            <Stat label="Win rate" value={`${initial.winRate}%`} />
                            <Stat label="Trades" value={`${initial.tradeCount}`} />
                        </div>

                        {(initial.bestDay || initial.worstDay) && (
                            <div style={{ position: 'relative', display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: '1rem', fontSize: '0.82rem' }}>
                                {initial.bestDay && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                        <Trophy size={13} color="var(--green)" /> Best: {shortDate(initial.bestDay.date)} (<span className="tabnums" style={{ color: scoreColor(initial.bestDay.score) }}>{initial.bestDay.score}</span>)
                                    </span>
                                )}
                                {initial.worstDay && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                        <TrendingDown size={13} color="var(--red)" /> Toughest: {shortDate(initial.worstDay.date)} (<span className="tabnums" style={{ color: scoreColor(initial.worstDay.score) }}>{initial.worstDay.score}</span>)
                                    </span>
                                )}
                            </div>
                        )}

                        <div style={{ position: 'relative', marginTop: '1.3rem', textAlign: 'right', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                            ZenTrade · Discipline over P&amp;L
                        </div>
                    </div>

                    {/* Per-day */}
                    <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Day by day</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {initial.days.map((d, i) => (
                                <Link key={d.date} href={`/today/review?date=${d.date}&account=${initial.accountId}`}
                                    className="hover-bg-subtle"
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0.4rem', borderTop: i === 0 ? 'none' : '1px solid var(--border)', textDecoration: 'none', color: 'inherit', borderRadius: 6 }}>
                                    <span className="tabnums" style={{ fontSize: '1rem', fontWeight: 700, color: scoreColor(d.score), width: 40 }}>{d.score}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>{shortDate(d.date)}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.trades} {d.trades === 1 ? 'trade' : 'trades'}</span>
                                    <span className="tabnums" style={{ fontWeight: 600, color: d.netPnl > 0 ? 'var(--green)' : d.netPnl < 0 ? 'var(--red)' : 'var(--text-secondary)', width: 84, textAlign: 'right' }}>
                                        {d.netPnl >= 0 ? '+' : ''}{formatCurrency(d.netPnl)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Coach's take */}
                    <div className="card-elevated" style={{ padding: '1.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: feedback ? '0.9rem' : '0.6rem' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Brain size={15} color="var(--accent)" />
                            </div>
                            <div style={{ fontWeight: 600 }}>Coach&rsquo;s {initial.period === 'week' ? 'weekly' : 'monthly'} take</div>
                        </div>
                        {feedback ? (
                            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{feedback}</p>
                        ) : (
                            <div>
                                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0 0 0.9rem' }}>
                                    A thorough, honest read of your {initial.period} — the pattern across days and one focus for next {initial.period}.
                                </p>
                                <button className="btn btn-primary" onClick={getRecap} disabled={loading} style={{ padding: '0.6rem 1.2rem' }}>
                                    {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
                                    {loading ? 'Analyzing…' : "Get the coach's take"}
                                </button>
                                {err && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 10 }}>{err}</p>}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
    return (
        <div>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div className="tabnums" style={{ fontSize: '1.15rem', fontWeight: 700, color: tone ?? 'var(--text-primary)' }}>{value}</div>
        </div>
    )
}
