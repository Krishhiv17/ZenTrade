'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Types ──────────────────────────────────────────────────

export interface PlaybookSetup {
    name: string
    entry_rules: string
    required_confluences: string
    invalidation: string
    target_logic: string
}

export interface RiskRules {
    max_risk_per_trade: string   // e.g. "1%" or "$300"
    max_daily_loss: string
    max_trades_per_day: string
    stop_after_losses: string    // "stop after N consecutive losses"
}

export interface PlaybookGoals {
    profit_target: string
    timeline: string
    good_day: string             // the user's own definition of a good day
}

export interface PlaybookData {
    setups: PlaybookSetup[]
    killzones: string[]
    instruments: string[]
    risk_rules: RiskRules
    personal_rules: string[]
    goals: PlaybookGoals
}

export interface Playbook extends PlaybookData {
    id: string
    user_id: string
    updated_at: string
}

// ─── Read ───────────────────────────────────────────────────

export async function getPlaybook(): Promise<Playbook | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) {
        console.error('getPlaybook error:', error.message)
        return null
    }
    return (data as Playbook) ?? null
}

// ─── Write (one row per user — upsert on user_id) ───────────

export async function upsertPlaybook(
    input: PlaybookData,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { error } = await supabase
        .from('playbooks')
        .upsert(
            {
                user_id: user.id,
                setups: input.setups ?? [],
                killzones: input.killzones ?? [],
                instruments: input.instruments ?? [],
                risk_rules: input.risk_rules ?? {},
                personal_rules: input.personal_rules ?? [],
                goals: input.goals ?? {},
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
        )

    if (error) return { success: false, error: error.message }

    revalidatePath('/playbook')
    revalidatePath('/coach')
    return { success: true }
}
