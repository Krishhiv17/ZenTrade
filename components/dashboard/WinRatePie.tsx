'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
    wins: number
    losses: number
    breakevens: number
}

const COLORS = ['#22c55e', '#ef4444', '#6b7280']

export default function WinRatePie({ wins, losses, breakevens }: Props) {
    const data = [
        { name: 'Wins', value: wins, color: '#22c55e' }, // var(--green)
        { name: 'Losses', value: losses, color: '#ef4444' }, // var(--red)
        { name: 'BE', value: breakevens, color: '#6b7280' }, // var(--text-muted)
    ].filter(d => d.value > 0)

    if (data.length === 0) {
        return <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No trades yet</div>
    }

    return (
        <ResponsiveContainer width="100%" height={180}>
            <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                    dataKey="value" paddingAngle={3}>
                    {data.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const p = payload[0]
                            return (
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: '0.75rem', color: p.payload.color }}>
                                    <span style={{ fontWeight: 600 }}>{p.name}</span>: {p.value} trade{p.value !== 1 ? 's' : ''}
                                </div>
                            )
                        }
                        return null
                    }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
            </PieChart>
        </ResponsiveContainer>
    )
}
