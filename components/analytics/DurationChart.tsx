'use client'

import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts'
import type { Trade } from '@/lib/supabase/types'
import { formatCurrency } from '@/lib/utils'

interface DurationChartProps {
    trades: Trade[]
}

export default function DurationChart({ trades }: DurationChartProps) {
    const data = useMemo(() => {
        return trades
            .filter(t => t.duration_minutes !== null && t.duration_minutes > 0)
            .map(t => ({
                id: t.id,
                duration: t.duration_minutes,
                pnl: t.pnl,
                result: t.result,
                isWin: (t.result === 'win' || t.pnl > 0),
                date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }))
    }, [trades])

    if (data.length === 0) {
        return (
            <div className="card" style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No duration data available. Log trades with a duration to see this chart.
            </div>
        )
    }

    // Optional: cap the max duration for display purposes so outliers don't crush the X-axis
    // For now, we'll let it auto-scale, but sorting helps with rendering order
    data.sort((a, b) => a.duration! - b.duration!)

    return (
        <div className="card" style={{ padding: '1.5rem', height: 400 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                Duration vs. Profitability
            </h3>

            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                        type="number"
                        dataKey="duration"
                        name="Duration"
                        unit=" min"
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: 'Hold Time (Minutes)', position: 'insideBottom', offset: -15, fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <YAxis
                        type="number"
                        dataKey="pnl"
                        name="P&L"
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                    />
                    <ZAxis type="number" range={[40, 40]} /> {/* Fixed dot size */}
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload
                                return (
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4 }}>{d.date}</div>
                                        <div style={{ fontWeight: 600, color: d.isWin ? 'var(--green)' : 'var(--red)', fontSize: '1.1rem', marginBottom: 4 }}>
                                            {formatCurrency(d.pnl)}
                                        </div>
                                        <div style={{ color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                                            Held for {d.duration} mins
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        }}
                    />
                    <Scatter name="Trades" data={data}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.isWin ? 'var(--green)' : 'var(--red)'} opacity={0.7} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    )
}
