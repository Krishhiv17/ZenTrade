'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

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
            {/* Heading */}
            <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: '1.75rem', margin: 0, letterSpacing: '-0.02em' }}>Welcome back</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: 6 }}>
                    Sign in to continue building your edge
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

                    <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ margin: '0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={async () => {
                            await supabase.auth.signInWithOAuth({
                                provider: 'google',
                                options: {
                                    redirectTo: `${window.location.origin}/auth/callback`
                                }
                            })
                        }}
                        style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', border: '1px solid var(--border)' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.73 17.57V20.34H19.3C21.39 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4" />
                            <path d="M12 23C14.97 23 17.46 22.02 19.3 20.34L15.73 17.57C14.74 18.24 13.48 18.66 12 18.66C9.14 18.66 6.71 16.73 5.84 14.15H2.15V17.01C3.96 20.6 7.69 23 12 23Z" fill="#34A853" />
                            <path d="M5.84 14.15C5.61 13.48 5.49 12.76 5.49 12C5.49 11.24 5.61 10.52 5.84 9.85V6.99H2.15C1.4 8.49 1 10.19 1 12C1 13.81 1.4 15.51 2.15 17.01L5.84 14.15Z" fill="#FBBC05" />
                            <path d="M12 5.34C13.62 5.34 15.06 5.9 16.21 7.01L19.38 3.84C17.45 2.05 14.97 1 12 1C7.69 1 3.96 3.4 2.15 6.99L5.84 9.85C6.71 7.27 9.14 5.34 12 5.34Z" fill="#EA4335" />
                        </svg>
                        Continue with Google
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
