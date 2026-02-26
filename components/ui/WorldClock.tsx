'use client'

import React, { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'

const LOCATIONS = [
    { name: 'New York', timeZone: 'America/New_York' },
    { name: 'London', timeZone: 'Europe/London' },
    { name: 'Tokyo', timeZone: 'Asia/Tokyo' },
    { name: 'Sydney', timeZone: 'Australia/Sydney' },
]

export default function WorldClock() {
    const [time, setTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const interval = setInterval(() => {
            setTime(new Date())
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    if (!mounted) return <div style={{ minHeight: '120px' }} />

    return (
        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                <Globe size={14} />
                <span>Markets</span>
            </div>
            {LOCATIONS.map(loc => {
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: loc.timeZone,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                })
                return (
                    <div key={loc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{loc.name}</span>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                            {formatter.format(time)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
