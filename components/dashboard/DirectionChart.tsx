'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
    longWins: number
    longLosses: number
    shortWins: number
    shortLosses: number
}

export default function DirectionChart({ longWins, longLosses, shortWins, shortLosses }: Props) {
    const data = [
        { name: 'Long', wins: longWins, losses: longLosses },
        { name: 'Short', wins: shortWins, losses: shortLosses },
    ]

    const hasData = longWins + longLosses + shortWins + shortLosses > 0
    if (!hasData) {
        return <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No trades yet</div>
    }

    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: '0.75rem' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) => [(v ?? 0), String(name ?? '').charAt(0).toUpperCase() + String(name ?? '').slice(1)]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
                <Bar dataKey="wins" name="Wins" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}
