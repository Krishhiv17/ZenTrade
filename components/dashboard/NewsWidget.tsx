import { fetchCalendar } from '@/lib/news'
import { buildRecommendations, nextHighImpact } from '@/lib/recommendations'
import { fmtTime } from '@/lib/news'
import Link from 'next/link'
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Info, Shield } from 'lucide-react'

function severityIcon(severity: string) {
    switch (severity) {
        case 'avoid': return <AlertTriangle size={12} color="var(--red)" />
        case 'caution': return <AlertTriangle size={12} color="var(--orange)" />
        case 'opportunity': return <TrendingUp size={12} color="var(--green)" />
        default: return <Info size={12} color="var(--accent)" />
    }
}

function severityColor(severity: string) {
    switch (severity) {
        case 'avoid': return 'var(--red)'
        case 'caution': return 'var(--orange)'
        case 'opportunity': return 'var(--green)'
        default: return 'var(--accent)'
    }
}

export default async function NewsWidget() {
    const events = await fetchCalendar()
    const recs = buildRecommendations(events)
    const next = nextHighImpact(events)

    // Show top recommendation only
    const topRec = recs[0] ?? null

    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={14} color="var(--accent)" /> Market Conditions
                </div>
                <Link href="/news" style={{ fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none' }}>
                    Full calendar →
                </Link>
            </div>

            {/* Top recommendation */}
            {topRec && (
                <div style={{
                    padding: '10px 12px',
                    background: `${severityColor(topRec.severity)}11`,
                    border: `1px solid ${severityColor(topRec.severity)}55`,
                    borderRadius: 8, marginBottom: '0.75rem',
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                    <div style={{ flexShrink: 0, marginTop: 1 }}>{severityIcon(topRec.severity)}</div>
                    <div>
                        <div style={{ color: severityColor(topRec.severity), fontWeight: 600, fontSize: '0.8rem', marginBottom: 2 }}>
                            {topRec.headline}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7125rem', lineHeight: 1.5 }}>
                            {topRec.detail.length > 140 ? topRec.detail.slice(0, 140) + '…' : topRec.detail}
                        </div>
                    </div>
                </div>
            )}

            {/* Next high-impact event */}
            {next ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                    <Clock size={12} color="var(--red)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{next.title}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {next.minutesFromNow < 60
                                ? `In ${Math.round(next.minutesFromNow)} min`
                                : `In ${Math.round(next.minutesFromNow / 60)}h`} · {fmtTime(next.dateObj)}
                        </div>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--red)', background: 'var(--red-muted)', padding: '2px 6px', borderRadius: 4 }}>HIGH</span>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                    <CheckCircle size={12} color="var(--green)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No upcoming high-impact events this week</span>
                </div>
            )}

            {/* Other rec count */}
            {recs.length > 1 && (
                <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    +{recs.length - 1} more recommendation{recs.length - 1 !== 1 ? 's' : ''} —{' '}
                    <Link href="/news" style={{ color: 'var(--accent)', textDecoration: 'none' }}>view all</Link>
                </div>
            )}
        </div>
    )
}
