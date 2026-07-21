'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { joinWaitlist } from '@/actions/waitlist'
import { Loader2, CheckCircle2, MessageSquare, ArrowRight, AlertTriangle } from 'lucide-react'

// Launch: midnight IST, 1 August 2026.
const LAUNCH = new Date('2026-08-01T00:00:00+05:30').getTime()
const DISCORD = 'https://discord.gg/P39EYFmFFJ'

function useCountdown(target: number) {
    const [now, setNow] = useState<number | null>(null)
    useEffect(() => {
        setNow(Date.now())
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])
    if (now === null) return null // first paint: avoid hydration mismatch
    const diff = Math.max(0, target - now)
    return {
        done: diff === 0,
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
    }
}

function Cell({ value, label }: { value: number | null; label: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="card-elevated tabnums" style={{
                minWidth: 74, padding: '0.9rem 0.5rem', textAlign: 'center',
                fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 700, lineHeight: 1,
            }}>
                {value === null ? '—' : String(value).padStart(2, '0')}
            </div>
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {label}
            </span>
        </div>
    )
}

export default function ComingSoon() {
    const cd = useCountdown(LAUNCH)
    const [email, setEmail] = useState('')
    const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
    const [error, setError] = useState('')

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setState('loading'); setError('')
        const res = await joinWaitlist(email)
        if (res.success) setState('done')
        else { setState('error'); setError(res.error) }
    }

    const launched = cd?.done

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.25rem', overflow: 'hidden', background: 'var(--bg-base)', color: 'var(--text-primary)', textAlign: 'center' }}>
            <div className="zen-grain" />
            <div className="zen-glow zen-breathe" style={{ top: '-8%', left: '50%', transform: 'translateX(-50%)', width: 620, height: 620 }} />

            <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                    <Image src="/zentrade_logo.png" alt="ZenTrade" width={38} height={38} style={{ borderRadius: 10 }} />
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>ZenTrade</span>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-glow)', border: '1px solid var(--accent)', padding: '6px 14px', borderRadius: 9999, marginBottom: '1.5rem' }}>
                    Launching 1 August 2026
                </div>

                <h1 className="zen-display" style={{ fontSize: 'clamp(2.1rem, 6vw, 3.4rem)', lineHeight: 1.1, margin: '0 0 1rem' }}>
                    Trade your plan.<br /><span style={{ color: 'var(--accent)' }}>Master your mind.</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 480, margin: '0 0 2.5rem' }}>
                    The AI trading coach that builds discipline through a daily ritual — grounded in your own model, not your P&amp;L. Join the waitlist to get in first.
                </p>

                {/* Countdown */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Cell value={cd ? cd.d : null} label="Days" />
                    <Cell value={cd ? cd.h : null} label="Hours" />
                    <Cell value={cd ? cd.m : null} label="Minutes" />
                    <Cell value={cd ? cd.s : null} label="Seconds" />
                </div>

                {/* Waitlist / launched */}
                {launched ? (
                    <Link href="/signup" className="btn btn-primary" style={{ padding: '0.95rem 2rem', fontSize: '1.05rem', gap: 9 }}>
                        We&rsquo;re live — enter <ArrowRight size={19} />
                    </Link>
                ) : state === 'done' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={34} color="var(--green)" />
                        <p style={{ color: 'var(--green)', fontWeight: 600, margin: 0 }}>You&rsquo;re on the list.</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>We&rsquo;ll email you the moment we open the doors.</p>
                    </div>
                ) : (
                    <form onSubmit={submit} style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <input
                                className="input" type="email" required value={email}
                                onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                                style={{ flex: '1 1 200px', height: 48, fontSize: '1rem' }}
                            />
                            <button type="submit" className="btn btn-primary" disabled={state === 'loading'}
                                style={{ height: 48, padding: '0 1.5rem', fontSize: '1rem', justifyContent: 'center', flex: '0 0 auto' }}>
                                {state === 'loading'
                                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Joining…</>
                                    : <>Join waitlist <ArrowRight size={16} /></>}
                            </button>
                        </div>
                        {state === 'error' && (
                            <div style={{ color: 'var(--red)', fontSize: '0.82rem', display: 'flex', gap: 7, alignItems: 'center', justifyContent: 'center' }}>
                                <AlertTriangle size={13} /> {error}
                            </div>
                        )}
                    </form>
                )}

                {/* Discord */}
                <a href={DISCORD} target="_blank" rel="noreferrer" className="btn btn-ghost"
                    style={{ marginTop: '1.75rem', padding: '0.7rem 1.4rem', border: '1px solid var(--border-strong)', gap: 9 }}>
                    <MessageSquare size={17} /> Join the Discord
                </a>

                {/* Footer */}
                <div style={{ marginTop: '3rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
                    <span aria-hidden>·</span>
                    <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
                    <span aria-hidden>·</span>
                    <Link href="/contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</Link>
                    <span aria-hidden>·</span>
                    <span>© 2026 ZenTrade — not financial advice.</span>
                </div>
            </div>
        </div>
    )
}
