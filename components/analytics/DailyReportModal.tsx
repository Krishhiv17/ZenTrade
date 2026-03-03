'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { generateDailySummary } from '@/actions/daily-summary'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Trophy, Skull, Loader2, AlertTriangle, TrendingUp, TrendingDown, Target } from 'lucide-react'

interface DailyReportModalProps {
    dateStr: string
    onClose: () => void
}

const BACKDROP: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'var(--backdrop)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '1rem',
}

const DIALOG: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
}

export default function DailyReportModal({ dateStr, onClose }: DailyReportModalProps) {
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(true)
    const [isGenerating, startGenerating] = useTransition()
    const [summary, setSummary] = useState<any>(null)
    const [dayIsFinalized, setDayIsFinalized] = useState(false)
    const [tradeCount, setTradeCount] = useState<number | null>(null)
    const [error, setError] = useState('')
    const certificateRef = useRef<HTMLDivElement>(null)

    // Load existing summary
    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Check if day is finalized (has a daily_summary row)
            const { data, error } = await supabase
                .from('daily_summaries')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', dateStr)
                .single()

            if (data) {
                setSummary(data)
                setDayIsFinalized(!!data.is_locked)
            } else {
                setDayIsFinalized(false)
            }

            // Check trade count for this date regardless of whether it's finalized
            const { count, error: countErr } = await supabase
                .from('trades')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('date', dateStr)

            if (!countErr && count !== null) {
                setTradeCount(count)
            }

            setIsLoading(false)
        }
        loadData()
    }, [dateStr, supabase])

    const handleGenerate = () => {
        startGenerating(async () => {
            setError('')

            if (!dayIsFinalized) {
                setError('Day must be finalized (locked) before generating an AI score.')
                return
            }

            if (tradeCount === 0) {
                setError('No trades recorded for this date. Cannot generate AI score.')
                return
            }

            const res = await generateDailySummary(dateStr)
            if (!res.success) {
                setError(res.error || 'Failed to generate')
                return
            }

            // Reload the summary
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase.from('daily_summaries').select('*').eq('user_id', user.id).eq('date', dateStr).single()
            if (data) setSummary(data)
        })
    }


    // Taxonomy badge styling mapping
    const TAXONOMY_COLORS: Record<string, string> = {
        'Good Win': 'var(--green)',
        'Bad Win': 'var(--orange)',
        'Good Loss': 'var(--blue)',
        'Bad Loss': 'var(--red)',
    }
    const taxonomyColor = summary?.taxonomy ? TAXONOMY_COLORS[summary.taxonomy] || 'var(--text-primary)' : 'var(--text-primary)'

    const modal = (
        <div style={BACKDROP} onClick={onClose} className="animate-fade-in">
            <div style={DIALOG} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Daily Report</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>✕</button>
                </div>

                <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>

                    {isLoading ? (
                        <div style={{ display: 'flex', height: 200, alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 size={24} className="animate-spin" color="var(--text-muted)" />
                        </div>
                    ) : summary && summary.score !== null ? (
                        <>
                            {/* Certificate Rendering Box */}
                            <div ref={certificateRef} style={{
                                width: 440,
                                margin: '0 auto',
                                boxSizing: 'border-box',
                                background: '#121214', // Explicit hex code for html2canvas
                                border: '1px solid #27272a',
                                borderRadius: '12px',
                                padding: '30px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '16px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Decorative elements */}
                                <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: taxonomyColor, opacity: 0.1, borderRadius: '50%', filter: 'blur(30px)' }} />

                                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                    ZenTrade AI Evaluation
                                </div>

                                {/* Score Circle */}
                                <div style={{
                                    width: 100, height: 100,
                                    borderRadius: '50%',
                                    border: `4px solid ${taxonomyColor}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    textAlign: 'center', lineHeight: '90px', // Fallback for html2canvas
                                    fontSize: '2.5rem', fontWeight: 800,
                                    color: taxonomyColor,
                                    textShadow: `0 0 20px ${taxonomyColor}40`,
                                    boxShadow: `0 0 30px ${taxonomyColor}20`
                                }}>
                                    {summary.score}
                                </div>

                                {/* Taxonomy Badge */}
                                <div style={{ background: `${taxonomyColor}20`, border: `1px solid ${taxonomyColor}50`, color: taxonomyColor, padding: '6px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {summary.taxonomy === 'Good Win' || summary.taxonomy === 'Bad Win' ? <Trophy size={14} /> : <Skull size={14} />}
                                    {summary.taxonomy}
                                </div>

                                {/* Results row */}
                                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', background: '#18181b', border: '1px solid #27272a', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ color: '#a1a1aa' }}>Net P&L</span>
                                        <span style={{ fontWeight: 600, color: summary.net_pnl >= 0 ? '#4ade80' : '#f87171' }}>{formatCurrency(summary.net_pnl || 0)}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ color: '#a1a1aa' }}>Trades</span>
                                        <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{summary.trade_count || 0}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ color: '#a1a1aa' }}>Date</span>
                                        <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{dateStr}</span>
                                    </div>
                                </div>

                                {/* AI Feedback */}
                                <div style={{ fontSize: '0.9rem', color: '#a1a1aa', textAlign: 'center', lineHeight: 1.5, fontStyle: 'italic', padding: '0 10px' }}>
                                    "{summary.ai_feedback}"
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <Target size={40} color="var(--text-muted)" style={{ margin: '0 auto' }} />
                            <div>
                                <h3 style={{ margin: 0, marginBottom: 8 }}>
                                    {tradeCount === 0 ? "No Trades Today" : "Day Locked & Loaded"}
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    {tradeCount === 0
                                        ? "Take a rest, no trades were recorded today. The AI coach has nothing to evaluate!"
                                        : "Your trades are in. Ready to consult the AI coach for your daily evaluation score?"}
                                </p>
                            </div>
                            {error && <div style={{ color: 'var(--red)', fontSize: '0.8rem', background: 'var(--red-muted)', padding: '8px', borderRadius: 4 }}>{error}</div>}

                            {tradeCount !== 0 && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !dayIsFinalized}
                                    style={{ opacity: !dayIsFinalized ? 0.5 : 1, cursor: !dayIsFinalized ? 'not-allowed' : 'pointer' }}
                                >
                                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : 'Generate AI Score'}
                                </button>
                            )}

                            {!dayIsFinalized && tradeCount !== 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--orange)', marginTop: 8 }}>
                                    <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                                    You must lock the day (EOD) before generating a score.
                                </p>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )

    // Safety check since we are using document.body
    if (typeof document === 'undefined') return null

    return createPortal(modal, document.body)
}
