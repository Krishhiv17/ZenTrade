'use client'

import { useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface TradeNode {
    macro: string | null
    pnl: number
}

export default function MacroChart({ data }: { data: TradeNode[] }) {
    const chartData = useMemo(() => {
        const macroMap = new Map<string, { pnl: number, trades: number }>()

        data.forEach(t => {
            let m = (t.macro || '').trim()
            if (!m) return // skip empty

            // If it's a long sentence, truncate it to keep the chart clean
            if (m.length > 25) {
                m = m.substring(0, 25) + '...'
            }

            const cur = macroMap.get(m) || { pnl: 0, trades: 0 }
            macroMap.set(m, { pnl: cur.pnl + t.pnl, trades: cur.trades + 1 })
        })

        // Sort by PnL descending, keep top 8 to avoid crowding
        return Array.from(macroMap.entries())
            .map(([macro, stats]) => ({ macro, ...stats }))
            .sort((a, b) => b.pnl - a.pnl)
            .slice(0, 8)
    }, [data])

    if (chartData.length === 0) {
        return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No macro context data.</div>
    }

    // Dynamic margin to handle long labels
    return (
        <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis
                        type="number"
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="macro"
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        axisLine={false}
                        tickLine={false}
                        width={90}
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
                                            {data.macro}
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
                    <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={16}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
