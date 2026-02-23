'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard, BookOpen, PlusCircle, BarChart2,
    Newspaper, BrainCircuit, Wallet, LogOut, TrendingUp,
} from 'lucide-react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/trades/new', label: 'Log Trade', icon: PlusCircle },
    { href: '/trades', label: 'Journal', icon: BookOpen },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/news', label: 'News', icon: Newspaper },
    { href: '/coach', label: 'AI Coach', icon: BrainCircuit },
    { href: '/accounts', label: 'Accounts', icon: Wallet },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div style={{
                padding: '1.25rem 1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <TrendingUp size={16} color="var(--accent)" />
                </div>
                <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>TradeJournal</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PROP FIRM AI</div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                    return (
                        <Link key={href} href={href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                            <Icon size={16} />
                            <span>{label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Sign out */}
            <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={handleSignOut}
                    className="sidebar-link"
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
