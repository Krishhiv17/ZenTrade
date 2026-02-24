import { fetchCalendar, impactColor, impactLabel, fmtTime, fmtDate } from '@/lib/news'
import { buildRecommendations, nextHighImpact } from '@/lib/recommendations'
import { Newspaper, Clock, AlertTriangle, CheckCircle, Info, TrendingUp, Shield } from 'lucide-react'
import NewsFilters from '@/components/news/NewsFilters'

// ─── Severity styles ─────────────────────────────────────────

function severityConfig(severity: string) {
    switch (severity) {
        case 'avoid':
            return { bg: 'var(--red-muted)', border: 'var(--red)', color: 'var(--red)', Icon: AlertTriangle }
        case 'caution':
            return { bg: 'rgba(249,115,22,0.1)', border: 'var(--orange)', color: 'var(--orange)', Icon: AlertTriangle }
        case 'opportunity':
            return { bg: 'rgba(34,197,94,0.08)', border: 'var(--green)', color: 'var(--green)', Icon: TrendingUp }
        default:
            return { bg: 'var(--bg-elevated)', border: 'var(--border)', color: 'var(--accent)', Icon: Info }
    }
}

// ─── Page ────────────────────────────────────────────────────

export default async function NewsPage({
    searchParams,
}: {
    searchParams: Promise<{ impact?: string; currency?: string }>
}) {
    const sp = await searchParams
    const selectedImpacts = sp.impact ? sp.impact.split(',') : []
    const selectedCurrencies = sp.currency ? sp.currency.split(',') : []

    const allEvents = await fetchCalendar()
    // Recommendations always use all raw events so they don't break when user filters
    const recs = buildRecommendations(allEvents)
    const next = nextHighImpact(allEvents)

    // Filter events for the UI lists below
    const events = allEvents.filter(e => {
        let match = true
        if (selectedImpacts.length > 0 && !selectedImpacts.includes(e.impact)) match = false
        if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(e.country)) match = false
        return match
    })

    const todayEvents = events.filter(e => e.isToday)
    const tomorrowEvents = events.filter(e => e.isTomorrow)
    const laterEvents = events.filter(e => !e.isToday && !e.isTomorrow)

    const highToday = todayEvents.filter(e => e.impact === 'High' && e.country === 'USD').length

    return (
        <div className="animate-fade-in">

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Newspaper size={20} color="var(--accent)" />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Economic News Feed</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
                        ForexFactory · USD events · Updated every 30 min
                    </p>
                </div>

                {/* Next event badge */}
                {next && (
                    <div style={{ marginLeft: 'auto', padding: '6px 14px', background: 'var(--red-muted)', border: '1px solid var(--red)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={13} color="var(--red)" />
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Next High Impact</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>{next.title}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {next.minutesFromNow < 60
                                    ? `${Math.round(next.minutesFromNow)}m away`
                                    : `${Math.round(next.minutesFromNow / 60)}h away`} · {fmtTime(next.dateObj)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Recommendation Panel ── */}
            {recs.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
                        <Shield size={14} color="var(--accent)" /> Trading Recommendations
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recs.map((rec, i) => {
                            const { bg, border, color, Icon } = severityConfig(rec.severity)
                            return (
                                <div key={i} style={{ padding: '12px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <div style={{ color, fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>{rec.headline}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{rec.detail}</div>
                                        {rec.triggerEvent && (
                                            <div style={{ marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                Triggered by: {rec.triggerEvent}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Filters ── */}
            <NewsFilters />

            {/* ── Today ── */}
            <EventSection
                label="Today"
                badge={highToday > 0 ? `${highToday} High Impact` : 'No High Impact'}
                badgeColor={highToday > 0 ? 'var(--red)' : 'var(--green)'}
                events={todayEvents}
                empty="No economic events scheduled for today."
            />

            {/* ── Tomorrow ── */}
            <EventSection
                label="Tomorrow"
                events={tomorrowEvents}
                empty="No events scheduled for tomorrow."
            />

            {/* ── Rest of week ── */}
            {laterEvents.length > 0 && (
                <EventSection
                    label="Rest of Week"
                    events={laterEvents}
                    showDate
                    empty=""
                />
            )}

            {events.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Unable to load economic calendar. Please check your internet connection.
                </div>
            )}
        </div>
    )
}

// ─── Event table section ──────────────────────────────────────

function EventSection({
    label, badge, badgeColor, events, empty, showDate = false,
}: {
    label: string
    badge?: string
    badgeColor?: string
    events: Awaited<ReturnType<typeof fetchCalendar>>
    empty: string
    showDate?: boolean
}) {
    // Filter to USD events first, then all others
    const usd = events.filter(e => e.country === 'USD')
    const other = events.filter(e => e.country !== 'USD')
    const sorted = [...usd, ...other]

    return (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{label}</span>
                {badge && (
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}55` }}>
                        {badge}
                    </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sorted.length} event{sorted.length !== 1 ? 's' : ''}</span>
            </div>

            {sorted.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>{empty}</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 40px 1fr 80px 90px 90px 90px', gap: '0.5rem', padding: '4px 8px', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
                        <span>Time (EST)</span>
                        <span>Cur</span>
                        <span>Event</span>
                        <span>Impact</span>
                        <span>Forecast</span>
                        <span>Previous</span>
                        <span>Actual</span>
                    </div>
                    {sorted.map((e, i) => (
                        <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 40px 1fr 80px 90px 90px 90px',
                            gap: '0.5rem',
                            padding: '8px',
                            borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                            background: e.minutesFromNow > 0 && e.minutesFromNow < 30 ? 'rgba(239,68,68,0.05)' : 'transparent',
                            borderRadius: 4,
                        }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                {showDate ? fmtDate(e.dateObj) : fmtTime(e.dateObj)}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: e.country === 'USD' ? 'var(--accent)' : 'var(--text-muted)' }}>
                                {e.country}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: e.impact === 'High' ? 600 : 400, color: e.impact === 'High' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {e.title}
                                {e.minutesFromNow > 0 && e.minutesFromNow < 60 && (
                                    <span style={{ marginLeft: 6, fontSize: '0.65rem', color: 'var(--red)' }}>
                                        {Math.round(e.minutesFromNow)}m
                                    </span>
                                )}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: impactColor(e.impact) }}>
                                {impactLabel(e.impact)}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.forecast || '—'}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.previous || '—'}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: e.actual ? 600 : 400, color: e.actual ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {e.actual || '—'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
