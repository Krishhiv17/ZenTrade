import { getAccounts } from '@/actions/accounts'
import AccountsList from '@/components/accounts/AccountsList'
import CreateAccountForm from '@/components/accounts/CreateAccountForm'
import { Wallet } from 'lucide-react'

export default async function AccountsPage() {
    const accounts = await getAccounts()

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Wallet size={20} color="var(--accent)" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Prop Accounts</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
                            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <CreateAccountForm />
            </div>

            {/* Accounts grid */}
            {accounts.length === 0 ? (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4rem 2rem' }}>
                    <Wallet size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                    <h3 style={{ color: 'var(--text-secondary)' }}>No accounts yet</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Add your first prop firm account to start tracking.
                    </p>
                </div>
            ) : (
                <AccountsList accounts={accounts} />
            )}
        </div>
    )
}
