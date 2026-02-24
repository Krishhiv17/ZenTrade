'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/utils'

interface TradeNode {
    date: string
    pnl: number
}

export default function CalendarHeatmap({ data }: { data: TradeNode[] }) {
    // Group pnl by date string (YYYY-MM-DD)
    const dailyMap = new Map<string, number>()
    let maxAbsPnl = 0

    data.forEach(t => {
        const val = (dailyMap.get(t.date) || 0) + t.pnl
        dailyMap.set(t.date, val)
        if (Math.abs(val) > maxAbsPnl) maxAbsPnl = Math.abs(val)
    })

    if (data.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No performance data available.
            </div>
        )
    }

    // Determine the date range to show (last 90 days)
    const today = new Date()
    const days = []
    for (let i = 89; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        days.push({
            dateObj: d,
            dateStr,
            pnl: dailyMap.get(dateStr) ?? 0,
            hasTrades: dailyMap.has(dateStr)
        })
    }

    // We can group days into weeks starting on Sunday, to render a github-style graph
    const weeks: typeof days[] = []
    let currentWeek: typeof days = []

    // Pad the first week with nulls to align with correct weekday
    if (days.length > 0) {
        const firstDayOfWeek = days[0].dateObj.getDay()
        for (let i = 0; i < firstDayOfWeek; i++) {
            currentWeek.push(null as any) // Padding
        }
    }

    days.forEach(day => {
        currentWeek.push(day)
        if (currentWeek.length === 7) {
            weeks.push(currentWeek)
            currentWeek = []
        }
    })
    if (currentWeek.length > 0) weeks.push(currentWeek)

    // Helper to determine color intensity
    const getColor = (pnl: number, hasTrades: boolean) => {
        if (!hasTrades) return 'var(--bg-elevated)'
        if (pnl === 0) return 'var(--border)'

        // Opacity mapping based on max
        const ratio = Math.max(0.3, Math.min(1, Math.abs(pnl) / (maxAbsPnl || 1)))

        if (pnl > 0) {
            // green scale: from rgba(34,197,94, 0.3) to 1.0 (or whatever var(--green) is)
            return `rgba(34, 197, 94, ${ratio})`
        } else {
            // red scale
            return `rgba(239, 68, 68, ${ratio})`
        }
    }

    const monthLabels = weeks.map((w, i) => {
        if (w[0] && w[0].dateObj.getDate() <= 7) {
            return { idx: i, label: w[0].dateObj.toLocaleDateString('en-US', { month: 'short' }) }
        }
        return null
    }).filter(Boolean)

    return (
        <TooltipProvider>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowX: 'auto', paddingBottom: 10 }}>
                {/* Month labels header */}
                <div style={{ display: 'flex', marginLeft: 30, position: 'relative', height: 16 }}>
                    {monthLabels.map((ml: any, i) => (
                        <div key={i} style={{ position: 'absolute', left: ml.idx * 16, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {ml.label}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                    {/* Day labels (Mon, Wed, Fri) */}
                    <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 12px)', gap: 4, marginRight: 8, fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 0 }}>
                        <span style={{ visibility: 'hidden' }}>Sun</span>
                        <span>Mon</span>
                        <span style={{ visibility: 'hidden' }}>Tue</span>
                        <span>Wed</span>
                        <span style={{ visibility: 'hidden' }}>Thu</span>
                        <span>Fri</span>
                        <span style={{ visibility: 'hidden' }}>Sat</span>
                    </div>

                    {/* Heatmap grid */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {weeks.map((week, wIdx) => (
                            <div key={wIdx} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 12px)', gap: 4 }}>
                                {week.map((day, dIdx) => {
                                    if (!day) return <div key={dIdx} style={{ width: 12, height: 12 }} /> // Pad

                                    return (
                                        <Tooltip key={dIdx}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    style={{
                                                        width: 12, height: 12, borderRadius: 2,
                                                        backgroundColor: getColor(day.pnl, day.hasTrades),
                                                        cursor: day.hasTrades ? 'pointer' : 'default',
                                                        transition: 'transform 0.1s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (day.hasTrades) e.currentTarget.style.transform = 'scale(1.2)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'scale(1)'
                                                    }}
                                                />
                                            </TooltipTrigger>
                                            {day.hasTrades && (
                                                <TooltipContent style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', padding: '6px 10px' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                                                        {day.dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: day.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                                        {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl)}
                                                    </div>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}
