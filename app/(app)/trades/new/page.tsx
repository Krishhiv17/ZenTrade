import { getAccounts } from '@/actions/accounts'
import TradeForm from '@/components/trades/TradeForm'
import { PlusCircle } from 'lucide-react'

export default async function NewTradePage() {
    const accounts = await getAccounts()

    return (
        <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <PlusCircle size={20} color="var(--accent)" />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Log Trade</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
                        Risk $, R Multiple, and Balance After are calculated automatically.
                    </p>
                </div>
            </div>

            <div className="card-elevated" style={{ padding: '1.75rem' }}>
                <TradeForm accounts={accounts} />
            </div>
        </div>
    )
}
