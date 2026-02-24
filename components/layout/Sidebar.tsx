'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard, BookOpen, PlusCircle, BarChart2,
    Newspaper, BrainCircuit, Wallet, LogOut, Settings,
} from 'lucide-react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/trades/new', label: 'Log Trade', icon: PlusCircle },
    { href: '/trades', label: 'Journal', icon: BookOpen },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/news', label: 'News', icon: Newspaper },
    { href: '/coach', label: 'AI Coach', icon: BrainCircuit },
    { href: '/accounts', label: 'Accounts', icon: Wallet },
    { href: '/settings', label: 'Settings', icon: Settings },
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
                <Image src="/zentrade_logo.png" alt="ZenTrade Logo" width={32} height={32} style={{ borderRadius: 8 }} />
                <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>ZenTrade</div>
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
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={handleSignOut}
                    className="sidebar-link"
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}>
                        N
                    </div>
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
