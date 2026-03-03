'use client'

import React, { useState } from 'react'
import { finalizeEndOfDay } from '@/actions/eod'
import { Ban, CheckCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EndDayButton({
    accountId,
    dateStr,
    isLocked
}: {
    accountId: string
    dateStr: string
    isLocked?: boolean
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(isLocked || false)
    const router = useRouter()

    async function handleEndDay() {
        if (!confirm(`Are you sure you want to finalize and lock your journal for ${dateStr}?`)) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await finalizeEndOfDay(accountId, dateStr)
            if (res.success) {
                setSuccess(true)
                router.refresh()
            } else {
                setError(res.error || 'Failed to finalize day.')
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div style={{ padding: '6px 12px', background: 'var(--green-muted)', border: '1px solid var(--green)', borderRadius: 6, color: 'var(--green)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <CheckCircle size={14} /> Day Finalized
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
                onClick={handleEndDay}
                disabled={loading}
                style={{
                    padding: '8px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                    opacity: loading ? 0.7 : 1
                }}
                className="hover-bg-elevated"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} color="var(--red)" />}
                End Trading Day
            </button>
            {error && <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>{error}</span>}
        </div>
    )
}
