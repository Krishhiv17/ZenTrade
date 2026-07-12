import { getPlaybook } from '@/actions/playbook'
import PlaybookForm from '@/components/playbook/PlaybookForm'

export const metadata = { title: 'My Model | ZenTrade' }

export default async function PlaybookPage() {
    const playbook = await getPlaybook()

    return (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: '1.5rem', margin: 0 }}>My Model</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 6, maxWidth: 620, lineHeight: 1.5 }}>
                    Define your trading model once. In Coach mode, the AI holds your trades to
                    <strong style={{ color: 'var(--text-primary)' }}> these exact rules</strong> — flagging off-playbook
                    entries, out-of-killzone trades, and broken personal rules.
                </p>
            </div>

            <PlaybookForm initial={playbook} />
        </div>
    )
}
