'use client'

import { useMemo } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DataPoint {
    date: string
    balance: number
    drawdownLimit?: number
}

export default function FullEquityCurve({ data, startBalance }: { data: DataPoint[], startBalance: number }) {
    const chartData = useMemo(() => {
        // If data is empty, just return a flat line of startBalance
        if (data.length === 0) {
            return [{ date: new Date().toISOString().split('T')[0], balance: startBalance, dateId: `start_0` }]
        }
        return data.map((d, i) => ({ ...d, dateId: `${d.date}_${i}` }))
    }, [data, startBalance])

    const minBalanceRow = Math.min(...chartData.map(d => d.balance), startBalance)
    const minDrawdown = Math.min(...chartData.map(d => d.drawdownLimit ?? d.balance))
    const minBalance = Math.min(minBalanceRow, minDrawdown)
    const maxBalance = Math.max(...chartData.map(d => d.balance), startBalance)

    // Add some padding to Y axis
    const diff = maxBalance - minBalance
    const yMin = Math.max(0, minBalance - diff * 0.1)
    const yMax = maxBalance + diff * 0.1

    // Determine overall profitability to color the line
    const isProfitable = chartData[chartData.length - 1].balance >= startBalance
    const strokeColor = isProfitable ? 'var(--green)' : 'var(--red)'

    return (
        <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="equityFillFull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis
                        dataKey="dateId"
                        tickFormatter={(val) => {
                            const rawDate = typeof val === 'string' ? val.split('_')[0] : val
                            const d = new Date(rawDate + 'T12:00:00') // Force local midday to avoid timezone shift
                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        domain={[yMin, yMax]}
                        tickFormatter={(val) => `$${val.toLocaleString()}`}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const balanceItem = payload.find(p => p.dataKey === 'balance')
                                const limitItem = payload.find(p => p.dataKey === 'drawdownLimit')

                                const val = balanceItem ? (balanceItem.value as number) : (payload[0].value as number)
                                const limitVal = limitItem ? (limitItem.value as number) : undefined

                                const rawDate = payload[0].payload.dateId
                                const date = typeof rawDate === 'string' ? rawDate.split('_')[0] : rawDate
                                const pnl = val - startBalance
                                return (
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4 }}>
                                            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {formatCurrency(val)}
                                        </div>
                                        {limitVal !== undefined && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--orange)', marginTop: 4, fontWeight: 600 }}>
                                                {formatCurrency(limitVal)} Stop-Out Limit
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.75rem', color: pnl >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} Total P&L
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        }}
                    />
                    <ReferenceLine y={minDrawdown} stroke="var(--red)" strokeDasharray="3 3" opacity={0.5} />
                    <ReferenceLine y={startBalance} stroke="var(--text-muted)" strokeDasharray="3 3" opacity={0.5} />
                    <Area
                        type="monotone"
                        dataKey="drawdownLimit"
                        stroke="var(--orange)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fill="transparent"
                        isAnimationActive={false}
                        activeDot={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke={strokeColor}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#equityFillFull)"
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
