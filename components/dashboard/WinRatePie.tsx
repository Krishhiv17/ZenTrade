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
        { name: 'Wins', value: wins },
        { name: 'Losses', value: losses },
        { name: 'BE', value: breakevens },
    ].filter(d => d.value > 0)

    if (data.length === 0) {
        return <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No trades yet</div>
    }

    return (
        <ResponsiveContainer width="100%" height={180}>
            <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                    dataKey="value" paddingAngle={3}>
                    {data.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} stroke="transparent" />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: '0.75rem' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) => [`${v ?? 0} trade${(v ?? 0) !== 1 ? 's' : ''}`, name ?? '']}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
            </PieChart>
        </ResponsiveContainer>
    )
}
