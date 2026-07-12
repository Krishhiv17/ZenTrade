'use client'

import { useState } from 'react'
import {
    upsertPlaybook,
    type Playbook,
    type PlaybookSetup,
    type RiskRules,
    type PlaybookGoals,
} from '@/actions/playbook'
import { Plus, Trash2, Loader2, Check } from 'lucide-react'

const emptySetup = (): PlaybookSetup => ({
    name: '', entry_rules: '', required_confluences: '', invalidation: '', target_logic: '',
})
const emptyRisk = (): RiskRules => ({
    max_risk_per_trade: '', max_daily_loss: '', max_trades_per_day: '', stop_after_losses: '',
})
const emptyGoals = (): PlaybookGoals => ({ profit_target: '', timeline: '', good_day: '' })

const parseList = (text: string, sep: string) =>
    text.split(sep).map(s => s.trim()).filter(Boolean)

const sectionStyle: React.CSSProperties = { marginBottom: '1.25rem' }
const sectionTitle: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }
const sectionHint: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.9rem' }

export default function PlaybookForm({ initial }: { initial: Playbook | null }) {
    const [setups, setSetups] = useState<PlaybookSetup[]>(
        initial?.setups?.length ? initial.setups : [emptySetup()],
    )
    const [instrumentsText, setInstrumentsText] = useState((initial?.instruments ?? []).join(', '))
    const [killzonesText, setKillzonesText] = useState((initial?.killzones ?? []).join(', '))
    const [personalRulesText, setPersonalRulesText] = useState((initial?.personal_rules ?? []).join('\n'))
    const [risk, setRisk] = useState<RiskRules>({ ...emptyRisk(), ...(initial?.risk_rules ?? {}) })
    const [goals, setGoals] = useState<PlaybookGoals>({ ...emptyGoals(), ...(initial?.goals ?? {}) })

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    const updateSetup = (i: number, field: keyof PlaybookSetup, value: string) =>
        setSetups(prev => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
    const addSetup = () => setSetups(prev => [...prev, emptySetup()])
    const removeSetup = (i: number) =>
        setSetups(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

    async function handleSave() {
        setSaving(true)
        setError('')
        setSaved(false)

        const res = await upsertPlaybook({
            setups: setups.filter(s => s.name.trim() || s.entry_rules.trim()),
            killzones: parseList(killzonesText, ','),
            instruments: parseList(instrumentsText, ','),
            risk_rules: risk,
            personal_rules: parseList(personalRulesText, '\n'),
            goals,
        })

        setSaving(false)
        if (res.success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        } else {
            setError(res.error ?? 'Failed to save.')
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '5rem' }}>

            {/* ── Setups ── */}
            <div className="card">
                <div style={sectionTitle}>Setups</div>
                <div style={sectionHint}>The specific plays you take. The coach checks each trade against these.</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {setups.map((s, i) => (
                        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', background: 'var(--bg-base)' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                                <input
                                    className="input"
                                    placeholder="Setup name — e.g. Silver Bullet, OTE Reversal"
                                    value={s.name}
                                    onChange={e => updateSetup(i, 'name', e.target.value)}
                                    style={{ flex: 1, fontWeight: 600 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeSetup(i)}
                                    disabled={setups.length === 1}
                                    title="Remove setup"
                                    style={{
                                        background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                                        color: 'var(--text-muted)', cursor: setups.length === 1 ? 'default' : 'pointer',
                                        opacity: setups.length === 1 ? 0.4 : 1, padding: '8px 10px', display: 'flex',
                                    }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <Field label="Entry rules" full>
                                    <textarea className="input" rows={2} placeholder="What has to be true to enter?"
                                        value={s.entry_rules} onChange={e => updateSetup(i, 'entry_rules', e.target.value)} style={{ resize: 'vertical' }} />
                                </Field>
                                <Field label="Required confluences" full>
                                    <textarea className="input" rows={2} placeholder="e.g. liquidity sweep + FVG in discount + HTF draw alignment"
                                        value={s.required_confluences} onChange={e => updateSetup(i, 'required_confluences', e.target.value)} style={{ resize: 'vertical' }} />
                                </Field>
                                <Field label="Invalidation">
                                    <textarea className="input" rows={2} placeholder="When is the idea dead?"
                                        value={s.invalidation} onChange={e => updateSetup(i, 'invalidation', e.target.value)} style={{ resize: 'vertical' }} />
                                </Field>
                                <Field label="Target logic">
                                    <textarea className="input" rows={2} placeholder="Where do you take profit?"
                                        value={s.target_logic} onChange={e => updateSetup(i, 'target_logic', e.target.value)} style={{ resize: 'vertical' }} />
                                </Field>
                            </div>
                        </div>
                    ))}
                </div>

                <button type="button" className="btn btn-ghost" onClick={addSetup} style={{ marginTop: '1rem' }}>
                    <Plus size={15} /> Add setup
                </button>
            </div>

            {/* ── Instruments & Killzones ── */}
            <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                        <div style={sectionTitle}>Instruments</div>
                        <div style={sectionHint}>Comma-separated.</div>
                        <input className="input" placeholder="NQ, MNQ, ES, MES"
                            value={instrumentsText} onChange={e => setInstrumentsText(e.target.value)} />
                    </div>
                    <div>
                        <div style={sectionTitle}>Killzones</div>
                        <div style={sectionHint}>The only windows you trade. Comma-separated.</div>
                        <input className="input" placeholder="London Open, New York AM"
                            value={killzonesText} onChange={e => setKillzonesText(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* ── Risk rules ── */}
            <div className="card">
                <div style={sectionTitle}>Risk rules</div>
                <div style={sectionHint}>Your hard risk limits. The coach flags trades that breach them.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                    <Field label="Max risk per trade">
                        <input className="input" placeholder="e.g. 1% or $300"
                            value={risk.max_risk_per_trade} onChange={e => setRisk({ ...risk, max_risk_per_trade: e.target.value })} />
                    </Field>
                    <Field label="Max daily loss">
                        <input className="input" placeholder="e.g. $600"
                            value={risk.max_daily_loss} onChange={e => setRisk({ ...risk, max_daily_loss: e.target.value })} />
                    </Field>
                    <Field label="Max trades per day">
                        <input className="input" placeholder="e.g. 3"
                            value={risk.max_trades_per_day} onChange={e => setRisk({ ...risk, max_trades_per_day: e.target.value })} />
                    </Field>
                    <Field label="Stop after N losses">
                        <input className="input" placeholder="e.g. 2"
                            value={risk.stop_after_losses} onChange={e => setRisk({ ...risk, stop_after_losses: e.target.value })} />
                    </Field>
                </div>
            </div>

            {/* ── Personal rules ── */}
            <div className="card">
                <div style={sectionTitle}>Hard personal rules</div>
                <div style={sectionHint}>One per line. Non-negotiables — e.g. &quot;No trades after 2 losses&quot;, &quot;No trading through red-folder news&quot;.</div>
                <textarea className="input" rows={4} placeholder={"No revenge trades\nNo trading the first 5 min after the open\nNo moving my stop"}
                    value={personalRulesText} onChange={e => setPersonalRulesText(e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            {/* ── Goals ── */}
            <div className="card">
                <div style={sectionTitle}>Goals</div>
                <div style={sectionHint}>What you&apos;re working toward — gives the coach context on your objectives.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                    <Field label="Profit target">
                        <input className="input" placeholder="e.g. Pass eval / $3,000"
                            value={goals.profit_target} onChange={e => setGoals({ ...goals, profit_target: e.target.value })} />
                    </Field>
                    <Field label="Timeline">
                        <input className="input" placeholder="e.g. 30 trading days"
                            value={goals.timeline} onChange={e => setGoals({ ...goals, timeline: e.target.value })} />
                    </Field>
                    <Field label="What a good day looks like" full>
                        <input className="input" placeholder="e.g. Followed my plan, 1 A+ setup, no revenge trades — regardless of P&L"
                            value={goals.good_day} onChange={e => setGoals({ ...goals, good_day: e.target.value })} />
                    </Field>
                </div>
            </div>

            {/* ── Save bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
                {error && (
                    <span style={{ color: 'var(--red)', fontSize: '0.8125rem' }}>{error}</span>
                )}
                {saved && (
                    <span style={{ color: 'var(--green)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Check size={15} /> Saved
                    </span>
                )}
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    {saving ? 'Saving…' : 'Save Model'}
                </button>
            </div>
        </div>
    )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
    return (
        <div style={full ? { gridColumn: '1 / -1' } : undefined}>
            <label className="label">{label}</label>
            {children}
        </div>
    )
}
