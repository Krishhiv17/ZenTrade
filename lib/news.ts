// ─── ForexFactory public feed types ──────────────────────────

export interface FFEvent {
    title: string
    country: string
    date: string          // ISO string, EST-offset e.g. "2026-02-24T08:30:00-0500"
    impact: 'High' | 'Medium' | 'Low' | 'Holiday'
    forecast: string
    previous: string
    actual: string
}

export interface ParsedEvent extends FFEvent {
    dateObj: Date         // parsed to JS Date (UTC)
    isToday: boolean
    isTomorrow: boolean
    minutesFromNow: number
}

// ─── Fetch this week's events ─────────────────────────────────

export async function fetchCalendar(timeZone: string = 'America/New_York'): Promise<ParsedEvent[]> {
    try {
        const res = await fetch(
            'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
            { next: { revalidate: 1800 } }   // re-fetch every 30 min server-side
        )
        if (!res.ok) return []
        const raw: FFEvent[] = await res.json()

        const now = new Date()

        const getEstDateStr = (d: Date) => d.toLocaleDateString('en-US', {
            timeZone,
            year: 'numeric', month: '2-digit', day: '2-digit'
        })

        const todayStr = getEstDateStr(now)
        // Add 24 hours to safely step into tomorrow's calendar date
        const tomorrowObj = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const tomorrowStr = getEstDateStr(tomorrowObj)

        return raw.map(e => {
            const dateObj = new Date(e.date)
            const eventDateStr = getEstDateStr(dateObj)
            return {
                ...e,
                dateObj,
                isToday: eventDateStr === todayStr,
                isTomorrow: eventDateStr === tomorrowStr,
                minutesFromNow: (dateObj.getTime() - now.getTime()) / 60000,
            }
        })
    } catch {
        return []
    }
}

// ─── Impact color helper ──────────────────────────────────────

export function impactColor(impact: FFEvent['impact']): string {
    switch (impact) {
        case 'High': return 'var(--red)'
        case 'Medium': return 'var(--yellow)'
        case 'Low': return 'var(--green)'
        default: return 'var(--text-muted)'
    }
}

export function impactLabel(impact: FFEvent['impact']): string {
    switch (impact) {
        case 'High': return '🔴 High'
        case 'Medium': return '🟡 Medium'
        case 'Low': return '🟢 Low'
        default: return '📅 Holiday'
    }
}

// ─── Format time in user-friendly EST label ───────────────────

export function fmtTime(dateObj: Date, timeZone: string = 'America/New_York'): string {
    return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone,
    })
}

export function fmtDate(dateObj: Date, timeZone: string = 'America/New_York'): string {
    return dateObj.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        timeZone,
    })
}
