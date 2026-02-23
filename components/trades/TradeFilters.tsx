'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { PropAccount } from '@/lib/supabase/types'
import { Filter } from 'lucide-react'

const TICKERS = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K']

export default function TradeFilters({ accounts }: { accounts: PropAccount[] }) {
    const router = useRouter()
    const pathname = usePathname()
    const sp = useSearchParams()

    const push = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(sp.toString())
        if (value) params.set(key, value)
        else params.delete(key)
        router.push(`${pathname}?${params.toString()}`)
    }, [sp, pathname, router])

    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={14} color="var(--text-muted)" />

            {/* Account filter */}
            <select className="input" style={{ width: 'auto', fontSize: '0.8rem' }}
                value={sp.get('account') ?? ''} onChange={e => push('account', e.target.value)}>
                <option value="">All Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.firm_name}</option>)}
            </select>

            {/* Ticker */}
            <select className="input" style={{ width: 'auto', fontSize: '0.8rem' }}
                value={sp.get('ticker') ?? ''} onChange={e => push('ticker', e.target.value)}>
                <option value="">All Tickers</option>
                {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Direction */}
            <select className="input" style={{ width: 'auto', fontSize: '0.8rem' }}
                value={sp.get('direction') ?? ''} onChange={e => push('direction', e.target.value)}>
                <option value="">Both Directions</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
            </select>

            {/* Result */}
            <select className="input" style={{ width: 'auto', fontSize: '0.8rem' }}
                value={sp.get('result') ?? ''} onChange={e => push('result', e.target.value)}>
                <option value="">All Results</option>
                <option value="win">Wins</option>
                <option value="loss">Losses</option>
                <option value="breakeven">Breakeven</option>
            </select>

            {/* Date from */}
            <input type="date" className="input" style={{ width: 'auto', fontSize: '0.8rem' }}
                value={sp.get('from') ?? ''} onChange={e => push('from', e.target.value)} />

            {/* Date to */}
            <input type="date" className="input" style={{ width: 'auto', fontSize: '0.8rem' }}
                value={sp.get('to') ?? ''} onChange={e => push('to', e.target.value)} />

            {/* Clear */}
            {sp.size > 0 && (
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => router.push(pathname)}>
                    Clear
                </button>
            )}
        </div>
    )
}
