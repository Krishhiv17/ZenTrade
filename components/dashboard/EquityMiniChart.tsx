'use client'

import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface EquityPoint {
    date: string
    balance: number
}

export default function EquityMiniChart({
    data,
    accountSize,
}: {
    data: EquityPoint[]
    accountSize: number
}) {
    if (data.length < 2) {
        return (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Log at least 2 trades to see equity curve
            </div>
        )
    }

    const isUp = data[data.length - 1].balance >= data[0].balance

    return (
        <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                    contentStyle={{
                        background: 'var(--bg-overlay)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                    }}
                    formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(0)}`, 'Balance']}
                    labelStyle={{ color: 'var(--text-muted)' }}
                />
                <ReferenceLine y={accountSize} stroke="var(--text-muted)" strokeDasharray="4 4" strokeWidth={1} />
                <Line
                    type="monotone"
                    dataKey="balance"
                    stroke={isUp ? 'var(--green)' : 'var(--red)'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: isUp ? 'var(--green)' : 'var(--red)' }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
