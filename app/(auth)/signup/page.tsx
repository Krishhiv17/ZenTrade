'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function SignupPage() {
    const router = useRouter()
    const supabase = createClient()
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        })
        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
            setTimeout(() => router.push('/dashboard'), 1500)
        }
    }

    return (
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 48, height: 48, borderRadius: 12,
                    background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                    marginBottom: '1rem',
                }}>
                    <TrendingUp size={24} color="var(--accent)" />
                </div>
                <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Create Account</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                    Start journalling your prop firm trades
                </p>
            </div>

            <div className="card-elevated" style={{ padding: '2rem' }}>
                {success ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                        <p style={{ color: 'var(--green)', fontWeight: 500 }}>Account created! Redirecting…</p>
                    </div>
                ) : (
                    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Full Name</label>
                            <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required />
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="input"
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    minLength={8}
                                    required
                                    style={{ paddingRight: '2.5rem' }}
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center',
                                }}>
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
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>
                )}
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '1.25rem' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                    Sign in
                </Link>
            </p>
        </div>
    )
}
