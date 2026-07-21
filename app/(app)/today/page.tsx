import Link from 'next/link'
import { getTodayOverview, type TodayOverview } from '@/actions/today'
import type { FactorTier } from '@/lib/domain/discipline'
import { formatCurrency, formatR } from '@/lib/utils'
import {
    Flame, PlusCircle, Target, ShieldAlert, Wallet, Activity,
    AlertTriangle, Clock, TrendingUp, Lock, Check,
} from 'lucide-react'

export const metadata = { title: 'Today | ZenTrade' }

function scoreColor(score: number): string {
    if (score >= 70) return 'var(--green)'
    if (score >= 45) return 'var(--yellow)'
    return 'var(--red)'
}

function ScoreRing({ score }: { score: number | null }) {
    const r = 62
    const c = 2 * Math.PI * r
    const pct = score ?? 0
    const dash = (pct / 100) * c
    const col = score === null ? 'var(--border-strong)' : scoreColor(score)
    return (
        <div style={{ position: 'relative', width: 156, height: 156, flexShrink: 0 }}>
            <svg width="156" height="156" viewBox="0 0 156 156" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="78" cy="78" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="9" />
                {score !== null && (
                    <circle cx="78" cy="78" r={r} fill="none" stroke={col} strokeWidth="9"
                        strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
                )}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tabnums" style={{ fontSize: '2.8rem', fontWeight: 700, lineHeight: 1, color: score === null ? 'var(--text-muted)' : col }}>
                    {score ?? '—'}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 5 }}>
                    Discipline
                </span>
            </div>
        </div>
    )
}

const TIER_META: Record<FactorTier, { label: string; color: string }> = {
    strong: { label: 'Strong', color: 'var(--green)' },
    solid: { label: 'Solid', color: 'var(--accent)' },
    shaky: { label: 'Shaky', color: 'var(--yellow)' },
    weak: { label: 'Weak', color: 'var(--red)' },
}

// Qualitative only — no numbers, no weights (the scoring formula is a blackbox).
function FactorRow({ label, tier }: { label: string; tier: FactorTier }) {
    const m = TIER_META[tier]
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: m.color, border: `1px solid ${m.color}`, borderRadius: 9999, padding: '2px 10px', opacity: 0.9 }}>
                {m.label}
            </span>
        </div>
    )
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
    return (
        <div className="card" style={{ padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                {icon} {label}
            </div>
            <div className="tabnums" style={{ fontSize: '1.35rem', fontWeight: 700, color: tone ?? 'var(--text-primary)' }}>{value}</div>
        </div>
    )
}

type StepState = 'done' | 'current' | 'todo'

function StepDot({ state, icon, label, sub, href }: {
    state: StepState; icon: React.ReactNode; label: string; sub: string; href: string
}) {
    const col = state === 'done' ? 'var(--green)' : state === 'current' ? 'var(--accent)' : 'var(--text-muted)'
    const bg = state === 'done' ? 'var(--green)' : state === 'current' ? 'var(--accent-glow)' : 'transparent'
    return (
        <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}>
            <div style={{
                width: 32, height: 32, borderRadius: 9999, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: bg, border: `1.5px solid ${col}`, color: state === 'done' ? '#07110F' : col,
            }}>
                {state === 'done' ? <Check size={16} /> : icon}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: state === 'todo' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
            </div>
        </Link>
    )
}

// The daily loop, made explicit: Plan → Log → Review.
function DailyLoop({ data }: { data: TodayOverview }) {
    const planDone = data.hasPlaybook
    const logDone = data.tradesToday > 0
    const reviewDone = data.reviewed
    const current: string = !planDone ? 'plan' : !logDone ? 'log' : !reviewDone ? 'review' : 'none'
    const st = (k: string, done: boolean): StepState => (done ? 'done' : current === k ? 'current' : 'todo')
    const line = (done: boolean) => (
        <div style={{ flex: 1, height: 2, minWidth: 16, background: done ? 'var(--green)' : 'var(--border)', borderRadius: 2 }} />
    )
    return (
        <div className="card hscroll" style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <StepDot state={st('plan', planDone)} icon={<Target size={15} />} label="Plan"
                sub={planDone ? 'Model set' : 'Define your model'} href="/playbook" />
            {line(planDone)}
            <StepDot state={st('log', logDone)} icon={<PlusCircle size={15} />} label="Log"
                sub={logDone ? `${data.tradesToday} logged` : 'Log your trades'} href="/trades/new" />
            {line(logDone)}
            <StepDot state={st('review', reviewDone)} icon={<Lock size={15} />} label="Review"
                sub={reviewDone ? 'Day locked' : 'End your day'} href={`/today/review?account=${data.selectedAccountId}`} />
        </div>
    )
}

export default async function TodayPage({
    searchParams,
}: {
    searchParams: Promise<{ account?: string }>
}) {
    const sp = await searchParams
    const data: TodayOverview = await getTodayOverview(sp.account)

    const prettyDate = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1080, margin: '0 auto' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', margin: 0, letterSpacing: '-0.02em' }}>Today</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{prettyDate}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {data.accounts.length > 1 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {data.accounts.map(a => {
                                const active = a.id === data.selectedAccountId
                                return (
                                    <Link key={a.id} href={`/today?account=${a.id}`} style={{
                                        fontSize: '0.8rem', fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                                        textDecoration: 'none', border: '1px solid var(--border)',
                                        background: active ? 'var(--accent)' : 'var(--bg-surface)',
                                        color: active ? '#07110F' : 'var(--text-secondary)',
                                    }}>
                                        {a.firm_name}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                    {data.hasAccount && (
                        <Link href={`/today/review?account=${data.selectedAccountId}`} className="btn btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}>
                            <Lock size={15} /> Review &amp; end day
                        </Link>
                    )}
                </div>
            </div>

            {!data.hasAccount ? (
                <div className="card-elevated" style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <Wallet size={28} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                    <h3 style={{ margin: '0 0 6px' }}>No account yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
                        Create your first trading account to start tracking your discipline.
                    </p>
                    <Link href="/accounts" className="btn btn-primary" style={{ padding: '0.7rem 1.4rem' }}>
                        <PlusCircle size={16} /> Add account
                    </Link>
                </div>
            ) : (
                <>
                    {/* ── Daily loop: Plan → Log → Review ── */}
                    <DailyLoop data={data} />

                    {/* ── Discipline hero + factors ── */}
                    <div className="card-elevated zen-hero" style={{ padding: '1.75rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <ScoreRing score={data.score} />
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '5px 12px', borderRadius: 9999 }}>
                                <Flame size={15} /> {data.streak}-day streak
                            </div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                            {data.score === null || !data.tiers ? (
                                <div>
                                    <h3 style={{ margin: '0 0 6px' }}>No trades logged yet today</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
                                        Your discipline score appears once you log today&rsquo;s trades — it grades your <em>process</em>, not your P&amp;L.
                                    </p>
                                    <Link href="/trades/new" className="btn btn-primary" style={{ padding: '0.65rem 1.3rem' }}>
                                        <PlusCircle size={16} /> Log a trade
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem 1.5rem', marginBottom: data.tiers.notes.length ? '1.25rem' : 0 }}>
                                        <FactorRow label="Rules" tier={data.tiers.rule} />
                                        <FactorRow label="Emotion" tier={data.tiers.emotion} />
                                        <FactorRow label="Journaling" tier={data.tiers.journaling} />
                                        <FactorRow label="Playbook" tier={data.tiers.playbook} />
                                    </div>
                                    {data.tiers.notes.length > 0 && (
                                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                            {data.tiers.notes.map((note, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                    <AlertTriangle size={13} color="var(--yellow)" style={{ flexShrink: 0 }} /> {note}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Snapshot ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem' }}>
                        <StatTile icon={<Wallet size={13} />} label="Balance" value={formatCurrency(data.balance)} />
                        <StatTile icon={<TrendingUp size={13} />} label="Today's P&L" value={`${data.todayPnl >= 0 ? '+' : ''}${formatCurrency(data.todayPnl)}`}
                            tone={data.todayPnl > 0 ? 'var(--green)' : data.todayPnl < 0 ? 'var(--red)' : undefined} />
                        <StatTile icon={<ShieldAlert size={13} />} label="Daily loss left"
                            value={data.dailyLossRemaining !== null ? formatCurrency(data.dailyLossRemaining) : '—'} />
                        <StatTile icon={<Activity size={13} />} label="Drawdown buffer"
                            value={data.drawdownBuffer !== null ? formatCurrency(data.drawdownBuffer) : '—'} />
                        <StatTile icon={<Target size={13} />} label="Trades today"
                            value={data.maxDailyTrades !== null ? `${data.tradesToday} / ${data.maxDailyTrades}` : `${data.tradesToday}`} />
                    </div>

                    {/* ── Plan strip (killzones) ── */}
                    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Clock size={16} color="var(--accent)" />
                        {data.killzones.length > 0 ? (
                            <>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your killzones today:</span>
                                {data.killzones.map(kz => (
                                    <span key={kz} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 9999, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>{kz}</span>
                                ))}
                            </>
                        ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Define your setups &amp; killzones in{' '}
                                <Link href="/playbook" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>My Model</Link>
                                {' '}to sharpen your discipline score.
                            </span>
                        )}
                    </div>

                    {/* ── Today's trades ── */}
                    <div className="card-elevated" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: data.todayTrades.length ? '1rem' : 0 }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Today&rsquo;s trades</h3>
                            <Link href="/trades/new" className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', border: '1px solid var(--border-strong)' }}>
                                <PlusCircle size={15} /> Log trade
                            </Link>
                        </div>

                        {data.todayTrades.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.75rem 0 0' }}>No trades logged today.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {data.todayTrades.map(t => {
                                    const pnlCol = t.pnl > 0 ? 'var(--green)' : t.pnl < 0 ? 'var(--red)' : 'var(--text-secondary)'
                                    return (
                                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: t.direction === 'long' ? 'var(--green)' : 'var(--red)', width: 44 }}>
                                                {t.direction}
                                            </span>
                                            <span style={{ fontWeight: 600, width: 64 }}>{t.ticker}</span>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.session ?? '—'}
                                                {t.is_flagged && <span style={{ color: 'var(--yellow)', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={11} /> {t.flag_reason}</span>}
                                            </span>
                                            {t.r_multiple !== null && (
                                                <span className="tabnums" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', width: 60, textAlign: 'right' }}>{formatR(t.r_multiple)}</span>
                                            )}
                                            <span className="tabnums" style={{ fontWeight: 700, color: pnlCol, width: 90, textAlign: 'right' }}>
                                                {t.pnl >= 0 ? '+' : ''}{formatCurrency(t.pnl)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
