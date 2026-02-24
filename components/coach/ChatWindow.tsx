'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import type { PropAccount } from '@/lib/supabase/types'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const SUGGESTED_CHIPS = [
    "What's my biggest leak right now?",
    "Am I taking too much risk?",
    "Why do I struggle holding winners?",
    "Analyze my performance by session."
]

export default function ChatWindow({ accounts, initialAccountId }: { accounts: PropAccount[], initialAccountId: string }) {
    const router = useRouter()

    const [accountId, setAccountId] = useState(initialAccountId)
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'What\'s on your mind? I\'ve got your latest trade data loaded and ready to analyze.' }
    ])
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Sync account switch to URL
    useEffect(() => {
        if (accountId !== initialAccountId) {
            router.push(`/coach?account=${accountId}`)
        }
    }, [accountId, initialAccountId, router])

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return

        const userMsg: Message = { role: 'user', content: text.trim() }
        const newHistory = [...messages, userMsg]
        setMessages(newHistory)
        setInput('')
        setIsLoading(true)

        // Add empty assistant message to stream into
        setMessages(prev => [...prev, { role: 'assistant', content: '' }])

        try {
            const res = await fetch('/api/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: text.trim(),
                    accountId,
                    history: newHistory.filter(m => m.content) // exclude empty ones
                })
            })

            if (!res.ok) throw new Error('API Error: ' + res.statusText)

            if (!res.body) throw new Error('ReadableStream not supported')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let done = false

            let textAccumulator = ''

            while (!done) {
                const { value, done: doneReading } = await reader.read()
                done = doneReading
                const chunkValue = decoder.decode(value, { stream: true })

                if (chunkValue) {
                    textAccumulator += chunkValue
                    setMessages(prev => {
                        const copy = [...prev]
                        const last = copy[copy.length - 1]
                        if (last.role === 'assistant') {
                            last.content = textAccumulator
                        }
                        return copy
                    })
                }
            }
        } catch (err: any) {
            console.error(err)
            setMessages(prev => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                if (last.role === 'assistant') {
                    last.content = `Error: ${err.message}. Please try again later.`
                }
                return copy
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    const selectedAcc = accounts.find(a => a.id === accountId)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={16} color="var(--accent)" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>AI Psychology Coach</h2>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Llama 3.3 · Grounded in your live data</div>
                    </div>
                </div>

                <select className="input" style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 10px', height: 'auto' }}
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.firm_name}</option>)}
                </select>
            </div>

            {/* ── Message Area ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', scrollBehavior: 'smooth' }}>
                {messages.map((m, i) => {
                    const isAsst = m.role === 'assistant'
                    return (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', alignSelf: isAsst ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                            {isAsst && (
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                                    <Bot size={14} color="var(--accent)" />
                                </div>
                            )}
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: isAsst ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                                background: isAsst ? 'var(--bg-elevated)' : 'var(--accent)',
                                color: isAsst ? 'var(--text-primary)' : '#fff',
                                fontSize: '0.9rem',
                                lineHeight: 1.5,
                                border: isAsst ? '1px solid var(--border)' : 'none',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {m.content || (isAsst && isLoading && <span style={{ opacity: 0.5 }}>Thinking...</span>)}
                            </div>
                            {!isAsst && (
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                                    <User size={14} color="var(--text-secondary)" />
                                </div>
                            )}
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area ── */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                {/* Suggested Chips */}
                {messages.length === 1 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem', justifyContent: 'center' }}>
                        {SUGGESTED_CHIPS.map(chip => (
                            <button key={chip}
                                onClick={() => sendMessage(chip)}
                                disabled={isLoading}
                                style={{
                                    padding: '6px 14px', fontSize: '0.75rem', borderRadius: 20,
                                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                                    color: 'var(--text-secondary)', cursor: isLoading ? 'default' : 'pointer',
                                    transition: 'all 0.2s', whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                            >
                                {chip}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.35rem 0.5rem' }}>
                    <textarea
                        className="input"
                        placeholder={`Ask AI Coach about your ${selectedAcc?.firm_name ?? ''} performance... (Shift+Enter for newline)`}
                        style={{ flex: 1, border: 'none', background: 'transparent', resize: 'none', minHeight: 44, maxHeight: 150, padding: '10px 12px', outline: 'none', boxShadow: 'none' }}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        rows={1}
                    />
                    <button
                        className="btn btn-primary"
                        style={{ height: 40, width: 40, borderRadius: 8, padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => sendMessage(input)}
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 10 }}>
                    AI responses are generated by Groq (Llama 3.3) and based on your last 30 trades. Not financial advice.
                </div>
            </div>
        </div>
    )
}
