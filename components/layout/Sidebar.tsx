'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard, BookOpen, PlusCircle, BarChart2,
    Newspaper, BrainCircuit, Wallet, LogOut, Settings, Target, Sunrise,
    Menu, X, MessageSquare,
} from 'lucide-react'
import WorldClock from '@/components/ui/WorldClock'

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number }> }

// Grouped desktop navigation.
const GROUPS: { label: string; items: Item[] }[] = [
    { label: 'Daily', items: [
        { href: '/today', label: 'Today', icon: Sunrise },
        { href: '/trades/new', label: 'Log Trade', icon: PlusCircle },
        { href: '/trades', label: 'Journal', icon: BookOpen },
    ] },
    { label: 'Improve', items: [
        { href: '/playbook', label: 'My Model', icon: Target },
        { href: '/analytics', label: 'Analytics', icon: BarChart2 },
        { href: '/coach', label: 'AI Coach', icon: BrainCircuit },
    ] },
    { label: 'Manage', items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/accounts', label: 'Accounts', icon: Wallet },
        { href: '/news', label: 'News', icon: Newspaper },
        { href: '/settings', label: 'Settings', icon: Settings },
    ] },
]

// Five mobile destinations only. Everything else lives in "More".
const MOBILE_PRIMARY: Item[] = [
    { href: '/today', label: 'Today', icon: Sunrise },
    { href: '/trades/new', label: 'Log', icon: PlusCircle },
    { href: '/trades', label: 'Journal', icon: BookOpen },
    { href: '/coach', label: 'Coach', icon: BrainCircuit },
]
const MOBILE_MORE: Item[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/playbook', label: 'My Model', icon: Target },
    { href: '/accounts', label: 'Accounts', icon: Wallet },
    { href: '/news', label: 'News', icon: Newspaper },
    { href: '/settings', label: 'Settings', icon: Settings },
]

const DISCORD = 'https://discord.gg/nPAP62yDDP'

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [moreOpen, setMoreOpen] = useState(false)

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // Journal (/trades) must not light up on /trades/new (Log Trade).
    const isActive = (href: string) =>
        href === '/trades' ? pathname === '/trades' : pathname === href || pathname.startsWith(href + '/')

    return (
        <>
            {/* ── Desktop sidebar ── */}
            <aside className="sidebar">
                <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Image src="/zentrade_logo.png" alt="ZenTrade Logo" width={32} height={32} style={{ borderRadius: 8 }} />
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>ZenTrade</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>AI Journaling Tool</div>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1 }}>
                        {GROUPS.map(group => (
                            <div key={group.label} style={{ marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.5rem 1.25rem 0.35rem' }}>
                                    {group.label}
                                </div>
                                {group.items.map(({ href, label, icon: Icon }) => (
                                    <Link key={href} href={href} className={`sidebar-link ${isActive(href) ? 'active' : ''}`}>
                                        <Icon size={16} />
                                        <span>{label}</span>
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '0 0 1rem' }}>
                        <a href={DISCORD} target="_blank" rel="noreferrer" className="sidebar-link" style={{ color: '#5865F2' }}>
                            <MessageSquare size={16} />
                            <span style={{ fontWeight: 600 }}>Community</span>
                        </a>
                    </div>
                </nav>

                <WorldClock />

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button onClick={handleSignOut} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ── Mobile bottom nav (5 destinations) ── */}
            <nav className="mobile-nav" aria-label="Primary">
                {MOBILE_PRIMARY.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} className={`mnav-item ${isActive(href) ? 'mnav-active' : ''}`}>
                        <Icon size={20} />
                        <span>{label}</span>
                    </Link>
                ))}
                <button className="mnav-item" onClick={() => setMoreOpen(true)} aria-label="More">
                    <Menu size={20} />
                    <span>More</span>
                </button>
            </nav>

            {/* ── Mobile "More" drawer ── */}
            {moreOpen && (
                <>
                    <div className="mobile-more-overlay" onClick={() => setMoreOpen(false)} />
                    <div className="mobile-more-sheet">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontWeight: 700 }}>More</span>
                            <button onClick={() => setMoreOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {MOBILE_MORE.map(({ href, label, icon: Icon }) => (
                                <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: isActive(href) ? 'var(--accent)' : 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
                                    <Icon size={18} /> {label}
                                </Link>
                            ))}
                        </div>
                        <a href={DISCORD} target="_blank" rel="noreferrer" onClick={() => setMoreOpen(false)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: '#5865F2', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, marginTop: 10 }}>
                            <MessageSquare size={18} /> Community
                        </a>
                        <button onClick={() => { setMoreOpen(false); handleSignOut() }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', width: '100%', cursor: 'pointer', fontSize: '0.9rem', marginTop: 10 }}>
                            <LogOut size={18} /> Sign Out
                        </button>
                    </div>
                </>
            )}
        </>
    )
}
