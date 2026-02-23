import { Suspense } from 'react'
import { getTrades } from '@/actions/trades'
import { getAccounts } from '@/actions/accounts'
import TradeTable from '@/components/trades/TradeTable'
import TradeFilters from '@/components/trades/TradeFilters'
import { BookOpen, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import type { GetTradesOptions } from '@/actions/trades'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function TradesPage({ searchParams }: PageProps) {
    const sp = await searchParams
    const accounts = await getAccounts()

    const opts: GetTradesOptions = {
        accountId: sp.account,
        ticker: sp.ticker,
        direction: sp.direction as GetTradesOptions['direction'],
        result: sp.result as GetTradesOptions['result'],
        dateFrom: sp.from,
        dateTo: sp.to,
    }

    const trades = await getTrades(opts)

    // Build account id → name map for table display
    const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.firm_name]))

    // Quick stats from fetched trades
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
    const wins = trades.filter(t => t.result === 'win').length
    const losses = trades.filter(t => t.result === 'loss').length
    const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0
    const avgR = trades.filter(t => t.r_multiple !== null).length > 0
        ? (trades.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / trades.filter(t => t.r_multiple !== null).length).toFixed(2)
        : '—'

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <BookOpen size={20} color="var(--accent)" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Trade Journal</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
                            {trades.length} trade{trades.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <Link href="/trades/new" className="btn btn-primary">
                    <PlusCircle size={15} /> Log Trade
                </Link>
            </div>

            {/* Quick stats bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {[
                    { label: 'Net P&L', value: totalPnl >= 0 ? `+$${totalPnl.toFixed(0)}` : `-$${Math.abs(totalPnl).toFixed(0)}`, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
                    { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? 'var(--green)' : 'var(--red)' },
                    { label: 'Wins', value: String(wins), color: 'var(--green)' },
                    { label: 'Losses', value: String(losses), color: 'var(--red)' },
                    { label: 'Avg R', value: avgR !== '—' ? `${Number(avgR) >= 0 ? '+' : ''}${avgR}R` : '—', color: 'var(--text-primary)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '0.6rem 1rem', flex: '0 0 auto' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '1rem' }}>
                <Suspense>
                    <TradeFilters accounts={accounts} />
                </Suspense>
            </div>

            {/* Table */}
            <TradeTable trades={trades} accountMap={accountMap} />
        </div>
    )
}
