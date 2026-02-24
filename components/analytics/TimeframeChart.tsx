'use client'

import { useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface TradeNode {
    exec_timeframe: string | null
    pnl: number
}

export default function TimeframeChart({ data }: { data: TradeNode[] }) {
    const chartData = useMemo(() => {
        const tfMap = new Map<string, { pnl: number, trades: number }>()

        data.forEach(t => {
            const tf = t.exec_timeframe || 'Unknown'
            const cur = tfMap.get(tf) || { pnl: 0, trades: 0 }
            tfMap.set(tf, { pnl: cur.pnl + t.pnl, trades: cur.trades + 1 })
        })

        // Sort by typical timeframe values if possible, otherwise by PnL
        const order = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h', 'D', 'W']

        return Array.from(tfMap.entries())
            .map(([timeframe, stats]) => ({ timeframe, ...stats }))
            .sort((a, b) => {
                const idxA = order.indexOf(a.timeframe)
                const idxB = order.indexOf(b.timeframe)
                if (idxA !== -1 && idxB !== -1) return idxA - idxB
                if (idxA !== -1) return -1
                if (idxB !== -1) return 1
                return b.pnl - a.pnl // Fallback to pnl desc
            })
    }, [data])

    if (chartData.length === 0) {
        return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No timeframe data.</div>
    }

    return (
        <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis
                        dataKey="timeframe"
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--border)', opacity: 0.1 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const val = payload[0].value as number
                                const data = payload[0].payload
                                return (
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4 }}>
                                            {data.timeframe} execution
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: val >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                            {val >= 0 ? '+' : ''}{formatCurrency(val)}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            {data.trades} trades
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        }}
                    />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
