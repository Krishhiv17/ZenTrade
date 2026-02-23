'use client'

import { useState, useRef } from 'react'
import { createAccount } from '@/actions/accounts'
import { PlusCircle, X, Loader2 } from 'lucide-react'

const FIRMS = ['Apex Trader Funding', 'TopstepX', 'Funded Next', 'FTMO', 'The Funded Trader', 'MyFundedFutures', 'Other']
const SIZES = [25000, 50000, 75000, 100000, 150000, 200000, 250000, 300000]

export default function CreateAccountForm() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [trailing, setTrailing] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(formRef.current!)
        fd.set('trailing_drawdown', trailing ? 'true' : 'false')
        try {
            await createAccount(fd)
            setOpen(false)
            formRef.current?.reset()
            setTrailing(false)
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        } finally {
            setLoading(false)
        }
    }

    if (!open) return (
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <PlusCircle size={16} /> Add Account
        </button>
    )

    return (
        <>
            {/* Backdrop */}
            <div onClick={() => setOpen(false)} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 49, backdropFilter: 'blur(2px)'
            }} />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                zIndex: 50, width: '100%', maxWidth: 560,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
                borderRadius: 16, padding: '1.75rem',
                maxHeight: '90vh', overflowY: 'auto',
            }} className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Add Prop Account</h2>
                    <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                        <X size={20} />
                    </button>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Firm name */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Prop Firm</label>
                        <select name="firm_name" className="input" required>
                            {FIRMS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    {/* Account type */}
                    <div>
                        <label className="label">Type</label>
                        <select name="account_type" className="input" required>
                            <option value="evaluation">Evaluation</option>
                            <option value="funded">Funded</option>
                        </select>
                    </div>

                    {/* Account size */}
                    <div>
                        <label className="label">Account Size ($)</label>
                        <select name="account_size" className="input" required>
                            {SIZES.map(s => <option key={s} value={s}>${s.toLocaleString()}</option>)}
                        </select>
                    </div>

                    {/* Profit target */}
                    <div>
                        <label className="label">Profit Target ($) <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                        <input className="input" type="number" name="profit_target" placeholder="e.g. 3000" min={0} step={0.01} />
                    </div>

                    {/* Max Drawdown */}
                    <div>
                        <label className="label">Max Drawdown ($) <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                        <input className="input" type="number" name="max_drawdown" placeholder="e.g. 2500" min={0} step={0.01} />
                    </div>

                    {/* Trailing drawdown toggle */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            type="button" onClick={() => setTrailing(!trailing)}
                            style={{
                                width: 40, height: 22, borderRadius: 11,
                                background: trailing ? 'var(--accent)' : 'var(--bg-overlay)',
                                border: '1px solid var(--border-strong)',
                                cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                            }}
                        >
                            <span style={{
                                position: 'absolute', top: 2, left: trailing ? 20 : 2,
                                width: 16, height: 16, borderRadius: '50%',
                                background: '#fff', transition: 'left 0.2s',
                            }} />
                        </button>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Trailing drawdown (Apex-style)</span>
                    </div>

                    {/* Daily loss limit (firm) */}
                    <div>
                        <label className="label">Firm Daily Loss Limit ($) <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                        <input className="input" type="number" name="daily_loss_limit" placeholder="e.g. 1000" min={0} step={0.01} />
                    </div>

                    {/* Personal daily loss limit */}
                    <div>
                        <label className="label">Your Personal Limit ($) <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                        <input className="input" type="number" name="personal_daily_loss_limit" placeholder="e.g. 500" min={0} step={0.01} />
                    </div>

                    {/* Consistency rule */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Consistency Rule <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                        <input className="input" type="text" name="consistency_rule" placeholder='e.g. "No single day > 30% of total profit"' />
                    </div>

                    {/* Start date */}
                    <div>
                        <label className="label">Start Date</label>
                        <input className="input" type="date" name="start_date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>

                    {/* Submit */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <PlusCircle size={14} />}
                            {loading ? 'Creating…' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}
