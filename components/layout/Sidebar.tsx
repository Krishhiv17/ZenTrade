'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard, BookOpen, PlusCircle, BarChart2,
    Newspaper, BrainCircuit, Wallet, LogOut, Settings, Target,
} from 'lucide-react'
import WorldClock from '@/components/ui/WorldClock'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/trades/new', label: 'Log Trade', icon: PlusCircle },
    { href: '/trades', label: 'Journal', icon: BookOpen },
    { href: '/playbook', label: 'My Model', icon: Target },
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
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>AI Journaling Tool</div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                        return (
                            <Link key={href} href={href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                                <Icon size={16} />
                                <span>{label}</span>
                            </Link>
                        )
                    })}
                </div>

                {/* External Links */}
                <div style={{ padding: '0 0 1rem' }}>
                    <a href="https://discord.gg/P39EYFmFFJ" target="_blank" rel="noreferrer" className="sidebar-link" style={{ color: '#5865F2' }}>
                        <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.73,67.73,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.09,53,91,65.69,84.69,65.69Z" />
                        </svg>
                        <span style={{ fontWeight: 600 }}>Community</span>
                    </a>
                </div>
            </nav>

            <WorldClock />

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
