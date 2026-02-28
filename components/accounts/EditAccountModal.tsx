'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { updateAccount } from '@/actions/accounts'
import { Settings, X, Loader2 } from 'lucide-react'
import type { PropAccount } from '@/lib/supabase/types'

const SIZES = [5000, 10000, 25000, 50000, 75000, 100000, 150000, 200000, 250000, 300000]

const BACKDROP: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(2px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
}

const MODAL: React.CSSProperties = {
    width: '100%',
    maxWidth: 560,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 16,
    padding: '1.75rem',
    maxHeight: '90vh',
    overflowY: 'auto',
}

export default function EditAccountModal({ account }: { account: PropAccount }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [drawdownType, setDrawdownType] = useState(account.drawdown_type || 'static')
    const [accountType, setAccountType] = useState(account.account_type)
    const formRef = useRef<HTMLFormElement>(null)

    // Sync state if account changes
    useEffect(() => {
        setDrawdownType(account.drawdown_type || 'static')
        setAccountType(account.account_type)
    }, [account])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const fd = new FormData(formRef.current!)
            await updateAccount(account.id, fd)
            setOpen(false)
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        } finally {
            setLoading(false)
        }
    }

    if (!open) return (
        <button
            onClick={(e) => { e.stopPropagation(); setOpen(true) }}
            style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', padding: 4
            }}
            title="Edit Account"
        >
            <Settings size={16} className="text-hover" />
        </button>
    )

    const modal = (
        <div style={BACKDROP} onClick={() => setOpen(false)}>
            <div style={MODAL} onClick={e => e.stopPropagation()} className="animate-fade-in">

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Edit Account</h2>
                    <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                        <X size={20} />
                    </button>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                    {/* Firm */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label">{accountType === 'personal' ? 'Broker / Account Name' : 'Prop Firm'}</label>
                        <input
                            type="text"
                            name="firm_name"
                            className="input"
                            defaultValue={account.firm_name}
                            required
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="label">Type</label>
                        <select name="account_type" className="input" required value={accountType} onChange={e => setAccountType(e.target.value as 'evaluation' | 'funded' | 'personal')}>
                            <option value="evaluation">Evaluation</option>
                            <option value="funded">Funded</option>
                            <option value="personal">Personal / Live</option>
                        </select>
                    </div>

                    {/* Market Type */}
                    <div>
                        <label className="label">Market</label>
                        <select name="market_type" className="input" required defaultValue={account.market_type}>
                            <option value="futures">Futures</option>
                            <option value="forex">Forex</option>
                        </select>
                    </div>

                    {/* Account size */}
                    <div>
                        <label className="label">Account Size ($)</label>
                        {accountType === 'personal' ? (
                            <input className="input" type="number" name="account_size" defaultValue={account.account_size} min={0} step={0.01} required />
                        ) : (
                            <select name="account_size" className="input" defaultValue={account.account_size} required>
                                {SIZES.map(s => <option key={s} value={s}>${s.toLocaleString()}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Profit target */}
                    {accountType !== 'personal' && (
                        <div>
                            <label className="label">Profit Target ($) <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                            <input className="input" type="number" name="profit_target" defaultValue={account.profit_target || ''} min={0} step={0.01} />
                        </div>
                    )}

                    {/* Max drawdown */}
                    <div>
                        <label className="label">{accountType === 'personal' ? 'Total Max Loss ($)' : 'Firm Max Drawdown ($)'} <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                        <input className="input" type="number" name="max_drawdown" defaultValue={account.max_drawdown || ''} min={0} step={0.01} />
                    </div>

                    {/* Drawdown Type */}
                    {accountType !== 'personal' && (
                        <div>
                            <label className="label">Drawdown Type</label>
                            <select name="drawdown_type" className="input" value={drawdownType} onChange={e => setDrawdownType(e.target.value as 'static' | 'eod' | 'intraday')}>
                                <option value="static">Static (Fixed floor)</option>
                                <option value="eod">End of Day (Trailing)</option>
                                <option value="intraday">Intraday (Trailing)</option>
                            </select>
                        </div>
                    )}

                    {/* Firm daily loss limit */}
                    {accountType !== 'personal' && (
                        <div>
                            <label className="label">Daily Loss Limit ($) <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                            <input className="input" type="number" name="daily_loss_limit" defaultValue={account.daily_loss_limit || ''} min={0} step={0.01} />
                        </div>
                    )}

                    {/* Max daily trades */}
                    <div>
                        <label className="label">Max Daily Trades <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                        <input className="input" type="number" name="max_daily_trades" defaultValue={account.max_daily_trades || ''} min={1} step={1} placeholder="e.g. 3" />
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    )

    return createPortal(modal, document.body)
}
