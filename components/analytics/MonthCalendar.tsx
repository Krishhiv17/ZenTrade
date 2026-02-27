'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TradeNode {
    date: string
    pnl: number
}

function formatCompactPnL(value: number): string {
    const absVal = Math.abs(value)
    const sign = value >= 0 ? '+' : '-'

    if (absVal >= 1000) {
        const formatted = (absVal / 1000).toFixed(1)
        // Remove trailing .0 if it's a whole number
        return `${sign}$${formatted.replace(/\.0$/, '')}k`
    }

    return `${sign}$${absVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function MonthCalendar({ data, timezone }: { data: TradeNode[], timezone?: string }) {
    // Current viewed month state
    const [currentDate, setCurrentDate] = useState(() => {
        // Default to current month, unless there's data, then maybe default to latest trade?
        // Let's just use current real-world month.
        const d = new Date()
        d.setDate(1) // lock to 1st of month to avoid overflow bugs
        return d
    })

    // Group PnL and count trades per date string (YYYY-MM-DD)
    const dailyMap = new Map<string, { pnl: number, trades: number }>()
    data.forEach(t => {
        // extract 'YYYY-MM-DD' from whatever ISO string format it has
        const dStr = t.date.split('T')[0]
        const val = dailyMap.get(dStr) || { pnl: 0, trades: 0 }
        dailyMap.set(dStr, { pnl: val.pnl + t.pnl, trades: val.trades + 1 })
    })

    // Navigation functions
    const prevMonth = () => {
        setCurrentDate(prev => {
            const d = new Date(prev)
            d.setMonth(d.getMonth() - 1)
            return d
        })
    }
    const nextMonth = () => {
        setCurrentDate(prev => {
            const d = new Date(prev)
            d.setMonth(d.getMonth() + 1)
            return d
        })
    }

    // Build calendar grid
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const daysInMonth = lastDayOfMonth.getDate()
    const startOffset = firstDayOfMonth.getDay() // 0 = Sunday, 1 = Monday...

    // Array of day objects for the grid
    const calendarDays: Array<{ dateStr: string | null, dayNum: number | null, isToday: boolean, pnl: number, trades: number }> = []

    // Pad empty slots before 1st day of month
    for (let i = 0; i < startOffset; i++) {
        calendarDays.push({ dateStr: null, dayNum: null, isToday: false, pnl: 0, trades: 0 })
    }

    // Build a local today string that matches the user's timezone reliably
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })

    // Formatter returns MM/DD/YYYY
    const formattedParts = formatter.formatToParts(new Date())
    const tYear = formattedParts.find(p => p.type === 'year')?.value
    const tMonth = formattedParts.find(p => p.type === 'month')?.value
    const tDay = formattedParts.find(p => p.type === 'day')?.value
    const todayStr = `${tYear}-${tMonth}-${tDay}`
    const todayNum = parseInt(tDay || '1', 10)

    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
        // Force local padding to format properly as YYYY-MM-DD
        const strY = year
        const strM = String(month + 1).padStart(2, '0')
        const strD = String(i).padStart(2, '0')
        const dateStr = `${strY}-${strM}-${strD}`

        const stats = dailyMap.get(dateStr) || { pnl: 0, trades: 0 }
        const isToday = dateStr === todayStr

        calendarDays.push({
            dateStr,
            dayNum: i,
            isToday,
            pnl: stats.pnl,
            trades: stats.trades
        })
    }

    // Month formatter
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={prevMonth} className="btn-ghost" style={{ padding: 4, borderRadius: 6, opacity: 0.7, cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
                    <ChevronLeft size={18} />
                </button>
                <button onClick={nextMonth} className="btn-ghost" style={{ padding: 4, borderRadius: 6, opacity: 0.7, cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
                    <ChevronRight size={18} />
                </button>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{monthName}</span>
            </div>

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 8,
                background: 'var(--bg-elevated)',
                padding: '1rem',
                borderRadius: 12,
                border: '1px solid var(--border)'
            }}>
                {/* Weekday Labels */}
                {WEEKDAYS.map(d => (
                    <div key={d} style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8, letterSpacing: '0.05em' }}>
                        {d}
                    </div>
                ))}

                {/* Days */}
                {calendarDays.map((day, i) => {
                    if (!day.dateStr) {
                        return <div key={`pad-${i}`} style={{ minHeight: 90, borderRadius: 8, background: 'transparent' }} />
                    }

                    const hasActivity = day.trades > 0
                    const isWin = day.pnl >= 0

                    // Background coloring based on PnL
                    let bg = '#121214' // default empty dark box
                    let border = '1px solid transparent'

                    if (hasActivity) {
                        if (day.pnl > 0) {
                            bg = 'rgba(34, 197, 94, 0.08)'
                            border = '1px solid rgba(34, 197, 94, 0.2)'
                        } else if (day.pnl < 0) {
                            bg = 'rgba(239, 68, 68, 0.08)'
                            border = '1px solid rgba(239, 68, 68, 0.2)'
                        } else {
                            bg = 'rgba(255, 255, 255, 0.05)'
                            border = '1px solid rgba(255, 255, 255, 0.1)'
                        }
                    }

                    return (
                        <div key={day.dateStr} style={{
                            minHeight: 90,
                            borderRadius: 8,
                            background: bg,
                            border: border,
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative'
                        }}>
                            {/* Top Right: Date Number */}
                            <div style={{ alignSelf: 'flex-end', fontSize: '0.8rem', color: day.isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: day.isToday ? 700 : 500 }}>
                                {day.dayNum}
                            </div>

                            {/* Bottom Left: Stats */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {hasActivity && (
                                    <>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: day.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                            {formatCompactPnL(day.pnl)}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            {day.trades} {day.trades === 1 ? 'trade' : 'trades'}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }} />
                    Profit
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }} />
                    Loss
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ color: 'var(--accent)', fontWeight: 700 }}>{todayNum}</div>
                    Today
                </div>
            </div>
        </div>
    )
}
