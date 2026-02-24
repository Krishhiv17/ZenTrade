'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Filter } from 'lucide-react'

const IMPACTS = ['High', 'Medium', 'Low']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']

export default function NewsFilters() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const selectedImpacts = searchParams.get('impact')?.split(',').filter(Boolean) || []
    const selectedCurrencies = searchParams.get('currency')?.split(',').filter(Boolean) || []

    const toggleFilter = (key: 'impact' | 'currency', value: string) => {
        const current = key === 'impact' ? selectedImpacts : selectedCurrencies
        const next = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value]

        const params = new URLSearchParams(searchParams.toString())
        if (next.length > 0) {
            params.set(key, next.join(','))
        } else {
            params.delete(key)
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const clearFilters = () => {
        router.replace(pathname, { scroll: false })
    }

    const hasFilters = selectedImpacts.length > 0 || selectedCurrencies.length > 0

    return (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600 }}>
                <Filter size={14} color="var(--accent)" /> Filters
            </div>

            <div style={{ flex: 1, display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Impact</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {IMPACTS.map(imp => {
                            const active = selectedImpacts.includes(imp)
                            return (
                                <button key={imp} onClick={() => toggleFilter('impact', imp)}
                                    style={{
                                        padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                                        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                                        color: active ? '#fff' : 'var(--text-secondary)',
                                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`
                                    }}>
                                    {imp}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Currency</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {CURRENCIES.map(cur => {
                            const active = selectedCurrencies.includes(cur)
                            return (
                                <button key={cur} onClick={() => toggleFilter('currency', cur)}
                                    style={{
                                        padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                                        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                                        color: active ? '#fff' : 'var(--text-secondary)',
                                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`
                                    }}>
                                    {cur}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {hasFilters && (
                <button onClick={clearFilters} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Clear All
                </button>
            )}
        </div>
    )
}
