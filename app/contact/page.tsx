import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import ContactForm from '@/components/contact/ContactForm'

export const metadata = {
    title: 'Contact | ZenTrade',
    description: 'Get in touch with the ZenTrade team.',
}

export default function ContactPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.25rem' }}>
            <div style={{ width: '100%', maxWidth: 620 }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.75rem' }}>
                    <ArrowLeft size={16} /> Back to home
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Mail size={20} color="var(--accent)" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, letterSpacing: '-0.02em' }}>Contact us</h1>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55, margin: '0 0 1.75rem' }}>
                    Questions, feedback, or a privacy request? Send us a note and we&rsquo;ll get back to you.
                </p>

                <div className="card-elevated" style={{ padding: '1.75rem' }}>
                    <ContactForm />
                </div>
            </div>
        </div>
    )
}
