'use client'

import { useState } from 'react'
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface EquityPoint {
    date: string
    balance: number
    drawdownLimit?: number
}

export default function EquityMiniChart({
    data,
    accountSize,
}: {
    data: EquityPoint[]
    accountSize: number
}) {
    const [viewMode, setViewMode] = useState<'trade' | 'daily'>('trade')

    if (data.length < 2) {
        return (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Log at least 2 trades to see equity curve
            </div>
        )
    }

    // If 'daily' view is selected, we only want to plot the last trade of each day
    // The data array is already sorted chronologically
    let displayData = data
    if (viewMode === 'daily') {
        const dailyPoints: EquityPoint[] = []
        // Always include the starting reference point (data[0]) which is unshifted upstream
        // But to avoid duplicate exact same data points if data[0] is somehow the only point, we add it first.
        if (data.length > 0) {
            dailyPoints.push(data[0])
        }

        for (let i = 1; i < data.length; i++) {
            const current = data[i]
            const isLastOfDay = i === data.length - 1 || data[i + 1].date !== current.date
            if (isLastOfDay) {
                dailyPoints.push(current)
            }
        }
        displayData = dailyPoints
    }

    const isUp = displayData.length > 0 && displayData[displayData.length - 1].balance >= displayData[0].balance

    // Create unique IDs to prevent Recharts from merging duplicate date categories on the X-axis
    const chartData = displayData.map((d, i) => ({ ...d, dateId: `${d.date}_${i}` }))

    return (
        <div style={{ position: 'relative' }}>
            {/* View Toggle */}
            <div style={{ display: 'flex', position: 'absolute', top: -35, right: 0, gap: 4, background: 'var(--bg-overlay)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
                <button
                    onClick={() => setViewMode('trade')}
                    style={{
                        background: viewMode === 'trade' ? 'var(--bg-elevated)' : 'transparent',
                        border: viewMode === 'trade' ? '1px solid var(--border-strong)' : '1px solid transparent',
                        color: viewMode === 'trade' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '0.65rem', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Trade
                </button>
                <button
                    onClick={() => setViewMode('daily')}
                    style={{
                        background: viewMode === 'daily' ? 'var(--bg-elevated)' : 'transparent',
                        border: viewMode === 'daily' ? '1px solid var(--border-strong)' : '1px solid transparent',
                        color: viewMode === 'daily' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '0.65rem', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Daily
                </button>
            </div>

            <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis
                        dataKey="dateId"
                        tickFormatter={(val) => {
                            const rawDate = typeof val === 'string' ? val.split('_')[0] : val
                            if (!rawDate) return ''
                            const d = new Date(rawDate + 'T12:00:00')
                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }}
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            color: 'var(--text-primary)',
                        }}
                        formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(0)}`, 'Balance']}
                        labelFormatter={(label) => typeof label === 'string' ? label.split('_')[0] : label}
                        labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                    />
                    <ReferenceLine y={accountSize} stroke="var(--text-muted)" strokeDasharray="4 4" strokeWidth={1} />
                    <Line
                        type="monotone"
                        dataKey="drawdownLimit"
                        stroke="var(--orange)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                        name="Limit"
                    />
                    <Line
                        type="monotone"
                        dataKey="balance"
                        stroke={isUp ? 'var(--green)' : 'var(--red)'}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: isUp ? 'var(--green)' : 'var(--red)' }}
                        name="Balance"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
