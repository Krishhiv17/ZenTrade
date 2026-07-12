'use server'

import { createClient } from '@/lib/supabase/server'

export interface CoachFeedbackInput {
    rating: 'up' | 'down'
    mode: 'coach' | 'learn'
    accountId?: string | null
    question: string
    answer: string
    concepts: { concept: string; category: string }[]
    note?: string
}

export async function submitCoachFeedback(
    input: CoachFeedbackInput,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase.from('coach_feedback').insert({
        user_id: user.id,
        rating: input.rating,
        mode: input.mode,
        account_id: input.mode === 'coach' ? (input.accountId ?? null) : null,
        question: input.question?.slice(0, 4000) ?? null,
        answer: input.answer?.slice(0, 8000) ?? null,
        concepts: input.concepts ?? [],
        note: input.note?.slice(0, 2000) ?? null,
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
}
