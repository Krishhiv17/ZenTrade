'use server'

import { createClient } from '@/lib/supabase/server'

export type WaitlistResult = { success: true } | { success: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function joinWaitlist(emailRaw: string): Promise<WaitlistResult> {
    const email = (emailRaw ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return { success: false, error: 'Please enter a valid email address.' }

    const supabase = await createClient()
    const { error } = await supabase.from('waitlist').insert({ email, source: 'coming_soon' })

    if (error) {
        // Duplicate email → already on the list, treat as success.
        if (error.code === '23505') return { success: true }
        // TEMPORARY: surface the real Postgres error so we can diagnose in prod.
        console.error('[waitlist] insert failed:', error.code, error.message)
        return { success: false, error: `Could not join (${error.code ?? '?'}): ${error.message}` }
    }
    return { success: true }
}
