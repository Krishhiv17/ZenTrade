'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Image
                    src="/zentrade_logo.png"
                    alt="ZenTrade Logo"
                    width={48} height={48}
                    style={{ borderRadius: 12, marginBottom: '1rem', display: 'inline-block' }}
                />
                <h1 style={{ fontSize: '1.5rem', margin: 0 }}>ZenTrade</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                    Sign in to your prop firm journal
                </p>
            </div>

            {/* Card */}
            <div className="card-elevated" style={{ padding: '2rem' }}>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label className="label">Email</label>
                        <input
                            className="input"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input"
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ paddingRight: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center',
                                }}
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p style={{ color: 'var(--red)', fontSize: '0.8125rem', margin: 0, padding: '8px 12px', background: 'var(--red-muted)', borderRadius: 6 }}>
                            {error}
                        </p>
                    )}

                    <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
                        {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '1.25rem' }}>
                No account?{' '}
                <Link href="/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                    Create one free
                </Link>
            </p>
        </div>
    )
}
