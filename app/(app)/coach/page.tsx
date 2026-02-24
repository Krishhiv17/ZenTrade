import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/actions/accounts'
import { redirect } from 'next/navigation'
import ChatWindow from '@/components/coach/ChatWindow'

export const metadata = { title: 'AI Coach | TradeJournal' }

export default async function CoachPage({
    searchParams,
}: {
    searchParams: Promise<{ account?: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const sp = await searchParams
    const accounts = await getAccounts()
    const activeAccs = accounts.filter(a => a.status === 'active')

    // Default to the first active account if none selected
    const selectedAccId = sp.account ?? activeAccs[0]?.id

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', marginTop: '-1rem' }}>
            <ChatWindow accounts={activeAccs} initialAccountId={selectedAccId} />
        </div>
    )
}
