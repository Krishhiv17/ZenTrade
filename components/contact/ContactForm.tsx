'use client'

import { useState, useTransition } from 'react'
import { submitContact } from '@/actions/contact'
import { Loader2, Send, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function ContactForm() {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false)

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
            const res = await submitContact(fd)
            if (res.success) setSent(true)
            else setError(res.error)
        })
    }

    if (sent) {
        return (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <CheckCircle2 size={38} color="var(--green)" />
                </div>
                <h3 style={{ margin: '0 0 6px' }}>Message sent</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    Thanks for reaching out — we&rsquo;ll get back to you at the email you provided.
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Honeypot — visually hidden, off the tab order, ignored by humans. */}
            <input
                type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.1rem' }}>
                <div>
                    <label className="label" htmlFor="c-name">Name</label>
                    <input id="c-name" className="input" name="name" type="text" placeholder="Your name" required />
                </div>
                <div>
                    <label className="label" htmlFor="c-email">Email</label>
                    <input id="c-email" className="input" name="email" type="email" placeholder="you@example.com" required />
                </div>
            </div>

            <div>
                <label className="label" htmlFor="c-subject">Subject <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="c-subject" className="input" name="subject" type="text" placeholder="What&rsquo;s this about?" />
            </div>

            <div>
                <label className="label" htmlFor="c-message">Message</label>
                <textarea id="c-message" className="input" name="message" rows={5} required
                    placeholder="How can we help?" style={{ resize: 'vertical' }} />
            </div>

            {error && (
                <div style={{ color: 'var(--red)', fontSize: '0.82rem', padding: '8px 12px', background: 'var(--red-muted)', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}
                </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={isPending}
                style={{ justifyContent: 'center', minHeight: 44 }}>
                {isPending
                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
                    : <><Send size={15} /> Send message</>}
            </button>
        </form>
    )
}
