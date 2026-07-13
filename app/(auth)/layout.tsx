import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'

const BULLETS = [
    'An AI coach that knows your playbook',
    'A daily ritual that builds discipline',
    'Your own rules, enforced on every trade',
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="auth-split">
            {/* ── Brand panel (hidden on mobile) ── */}
            <div className="auth-brand">
                <div className="zen-grain" />
                <div className="zen-glow zen-breathe" style={{ top: '12%', left: '-12%', width: 480, height: 480 }} />

                <Link href="/" className="hover:text-white" style={{
                    position: 'absolute', top: 28, left: 32, zIndex: 3,
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                }}>
                    <ArrowLeft size={16} /> Home
                </Link>

                <div style={{ position: 'relative', zIndex: 2, maxWidth: 440 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '2.25rem' }}>
                        <svg width="46" height="46" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                            <circle cx="65" cy="65" r="54" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray="316 340" />
                        </svg>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>ZenTrade</span>
                    </div>

                    <h2 className="zen-display" style={{ fontSize: 'clamp(2rem, 3vw, 2.7rem)', marginBottom: '1.25rem' }}>
                        Trade your plan.<br />
                        <span style={{ color: 'var(--accent)' }}>Master your mind.</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2.25rem' }}>
                        The AI trading coach that keeps you disciplined — grounded in your own model, not your P&amp;L.
                    </p>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 15 }}>
                        {BULLETS.map(b => (
                            <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: '0.98rem' }}>
                                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Check size={13} color="var(--accent)" />
                                </span>
                                {b}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* ── Form side ── */}
            <div className="auth-form-side">
                <div className="zen-grain" />
                <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
                    {children}
                </div>
            </div>
        </div>
    )
}
