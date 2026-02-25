'use client'

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
    if (data.length < 2) {
        return (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Log at least 2 trades to see equity curve
            </div>
        )
    }

    const isUp = data[data.length - 1].balance >= data[0].balance

    // Create unique IDs to prevent Recharts from merging duplicate date categories on the X-axis
    const chartData = data.map((d, i) => ({ ...d, dateId: `${d.date}_${i}` }))

    return (
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
    )
}
