'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/actions/profile'
import { Loader2, Save } from 'lucide-react'

// Basic types based on DB schema
interface Profile {
    id: string
    full_name: string | null
    default_account_id: string | null
    commission_per_rt: number
}

interface Account {
    id: string
    firm_name: string
}

export default function SettingsForm({
    initialProfile,
    accounts
}: {
    initialProfile: Profile | null,
    accounts: Account[]
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        full_name: initialProfile?.full_name || '',
        default_account_id: initialProfile?.default_account_id || '',
        commission_per_rt: initialProfile?.commission_per_rt || 0
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess(false)

        try {
            await updateProfile({
                full_name: formData.full_name,
                default_account_id: formData.default_account_id === '' ? null : formData.default_account_id,
                commission_per_rt: Number(formData.commission_per_rt)
            })
            setSuccess(true)
            router.refresh()
            setTimeout(() => setSuccess(false), 3000)
        } catch (err: any) {
            setError(err.message || 'Failed to update settings')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div>
                <label className="label">Full Name</label>
                <input
                    type="text"
                    className="input"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Jane Doe"
                />
            </div>

            <div>
                <label className="label">Default Account (for logging trades)</label>
                <select
                    className="input"
                    value={formData.default_account_id}
                    onChange={e => setFormData({ ...formData, default_account_id: e.target.value })}
                >
                    <option value="">-- None --</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.firm_name}</option>
                    ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    This account will be pre-selected when logging new trades.
                </p>
            </div>

            <div>
                <label className="label">Commission per Round Trip ($)</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.commission_per_rt}
                    onChange={e => setFormData({ ...formData, commission_per_rt: parseFloat(e.target.value) || 0 })}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Automatically deducted from your net P&L on new trades.
                </p>
            </div>

            {error && (
                <div style={{ color: 'var(--red)', background: 'var(--red-muted)', padding: '8px 12px', borderRadius: 8, fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{ color: 'var(--green)', background: 'var(--green-muted)', padding: '8px 12px', borderRadius: 8, fontSize: '0.875rem' }}>
                    Settings updated successfully.
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {loading ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </form>
    )
}
