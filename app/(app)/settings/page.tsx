import { getProfile } from '@/actions/profile'
import { getAccounts } from '@/actions/accounts'
import SettingsForm from '@/components/settings/SettingsForm'
import { Settings } from 'lucide-react'

export const metadata = {
    title: 'Settings | ZenTrade',
}

export default async function SettingsPage() {
    const profile = await getProfile()
    const accounts = await getAccounts()

    return (
        <div className="animate-fade-in" style={{ maxWidth: 600 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings size={20} color="var(--accent)" />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Settings</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
                        Manage your profile and general preferences
                    </p>
                </div>
            </div>

            {/* Form */}
            <SettingsForm initialProfile={profile} accounts={accounts} />
        </div>
    )
}
