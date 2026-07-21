import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import LegalDoc from '@/components/legal/LegalDoc'

export const metadata = {
    title: 'Terms of Service | ZenTrade',
    description: 'The terms governing your use of ZenTrade.',
}

export default function TermsPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '2rem 1.25rem' }}>
            <div style={{ width: '100%', maxWidth: 900 }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                    <ArrowLeft size={16} /> Back to home
                </Link>
                <LegalDoc slug="terms" />
            </div>
        </div>
    )
}
