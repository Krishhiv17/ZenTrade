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
        // Log the real error server-side (Vercel logs); show users a friendly message.
        console.error('[waitlist] insert failed:', error.code, error.message)
        return { success: false, error: 'Something went wrong. Please try again in a moment.' }
    }
    return { success: true }
}
