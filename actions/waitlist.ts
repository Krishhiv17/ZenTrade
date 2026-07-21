'use server'

import { createClient } from '@/lib/supabase/server'

export type WaitlistResult = { success: true } | { success: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function joinWaitlist(emailRaw: string): Promise<WaitlistResult> {
    const email = (emailRaw ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return { success: false, error: 'Please enter a valid email address.' }

    const supabase = await createClient()
    // Insert, silently ignoring anyone already on the list (ON CONFLICT DO NOTHING).
    const { error } = await supabase
        .from('waitlist')
        .upsert({ email, source: 'coming_soon' }, { onConflict: 'email', ignoreDuplicates: true })

    if (error) return { success: false, error: 'Something went wrong. Please try again.' }
    return { success: true }
}
