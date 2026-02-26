import { getAccounts } from '@/actions/accounts'
import TradeForm from '@/components/trades/TradeForm'
import { PlusCircle, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function NewTradePage({
    searchParams
}: {
    searchParams: Promise<{ account?: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const accounts = await getAccounts()
    const activeAccs = accounts.filter(a => a.status === 'active')

    const sp = await searchParams
    const selectedAccId = sp.account ?? activeAccs[0]?.id

    let isLocked = false
    let lockMessage = ''

    if (user && selectedAccId) {
        // Fetch User's timezone to get their localized today's date
        const { data: profile } = await supabase
            .from('profiles')
            .select('timezone')
            .eq('id', user.id)
            .single()

        const userTz = profile?.timezone || 'America/New_York'
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
        const parts = formatter.formatToParts(new Date())
        const todayStr = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`

        // Check if there is a daily_summaries row for today for this account
        const { data: lock } = await supabase
            .from('daily_summaries')
            .select('id')
            .eq('account_id', selectedAccId)
            .eq('date', todayStr)
            .maybeSingle()

        if (lock) {
            isLocked = true
            lockMessage = `Your journal for this account is locked for ${todayStr}. End of Day calculations have run.`
        } else {
            // Also check Max Daily Trades limit
            const account = activeAccs.find(a => a.id === selectedAccId)
            if (account && account.max_daily_trades !== null) {
                const { count } = await supabase
                    .from('trades')
                    .select('*', { count: 'exact', head: true })
                    .eq('account_id', selectedAccId)
                    .eq('date', todayStr)

                if (count !== null && count >= account.max_daily_trades) {
                    isLocked = true
                    lockMessage = `Max daily trades limit reached (${account.max_daily_trades}). You cannot log any more trades for ${todayStr}.`
                }
            }
        }
    }

    if (isLocked) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Lock size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Journal Locked</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
                    {lockMessage}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
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
