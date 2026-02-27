'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface SessionStat {
    session: string
    pnl: number
    trades: number
}

export default function SessionPerformanceChart({ data }: { data: SessionStat[] }) {
    if (data.length === 0) {
        return <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No session data yet</div>
    }

    const sorted = [...data].sort((a, b) => b.pnl - a.pnl)

    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sorted} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <XAxis dataKey="session" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={s => s.replace('New York ', 'NY ').replace('Pre-Market', 'Pre')} />
                <YAxis hide />
                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: '0.75rem' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, _name: any, props: any) => {
                        const d = props?.payload as SessionStat | undefined
                        return [`$${(v ?? 0).toLocaleString()} · ${d?.trades ?? 0} trade${d?.trades !== 1 ? 's' : ''}`, 'P&L']
                    }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {sorted.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
