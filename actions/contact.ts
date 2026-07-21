'use server'

import { createClient } from '@/lib/supabase/server'

export type ContactResult = { success: true } | { success: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const str = (fd: FormData, key: string) => (fd.get(key) as string | null ?? '').trim()

export async function submitContact(formData: FormData): Promise<ContactResult> {
    // Honeypot: bots fill hidden fields; humans leave them empty. Pretend success.
    if (str(formData, 'company')) return { success: true }

    const name = str(formData, 'name')
    const email = str(formData, 'email')
    const subject = str(formData, 'subject')
    const message = str(formData, 'message')

    if (!name) return { success: false, error: 'Please enter your name.' }
    if (!EMAIL_RE.test(email)) return { success: false, error: 'Please enter a valid email address.' }
    if (message.length < 10) return { success: false, error: 'Please write a bit more (at least 10 characters).' }
    if (message.length > 5000) return { success: false, error: 'Message is too long (5000 characters max).' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('contact_messages').insert({
        name,
        email,
        subject: subject || null,
        message,
        user_id: user?.id ?? null,
    })

    if (error) {
        return { success: false, error: 'Something went wrong sending your message. Please try again.' }
    }
    return { success: true }
}
