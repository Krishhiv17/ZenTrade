'use server'

import { createClient } from '@/lib/supabase/server'
import { getGroqClient, COACH_MODEL } from '@/lib/groq'
import { revalidatePath } from 'next/cache'

export async function generateDailySummary(dateStr: string) {
    const supabase = await createClient()

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    const userId = userData.user.id

    // 1. Fetch all trades for this date
    const { data: trades, error: tradesErr } = await supabase
        .from('trades')
        .select(`
            id, pnl, r_multiple, size, direction, ticker, mistakes, psychology_notes, psychology_tags
        `)
        .eq('user_id', userId)
        .eq('date', dateStr)

    if (tradesErr) return { success: false, error: tradesErr.message }
    if (!trades || trades.length === 0) {
        return { success: false, error: 'No trades found for this date.' }
    }

    // 2. Aggregate stats
    let totalPnl = 0
    let totalR = 0
    let winCount = 0
    let lossCount = 0
    const allMistakes: string[] = []
    const allPsychTags: string[] = []
    const allNotes: string[] = []

    trades.forEach(t => {
        totalPnl += t.pnl
        if (t.r_multiple) totalR += t.r_multiple
        if (t.pnl >= 0) winCount++
        else lossCount++

        if (t.mistakes && Array.isArray(t.mistakes)) {
            allMistakes.push(...t.mistakes)
        }
        if (t.psychology_notes) {
            allNotes.push(t.psychology_notes)
        }

        if (t.psychology_tags && Array.isArray(t.psychology_tags)) {
            allPsychTags.push(...t.psychology_tags)
        }
    })

    // 3. Formulate AI Prompt
    const prompt = `
You are an expert trading psychologist evaluating a trader's daily performance.
Analyze their trading day based 50% on their results and 50% on their psychology/behavior.

[DAILY RESULTS]:
- Net PnL: $${totalPnl.toFixed(2)}
- Total R-Multiple: ${totalR.toFixed(2)}R
- Trades taken: ${trades.length} (${winCount} Wins, ${lossCount} Losses)

[PSYCHOLOGY & BEHAVIOR]:
- Mistake Tags Logged: ${allMistakes.length > 0 ? allMistakes.join(', ') : 'None'}
- Psychology Tags Logged: ${allPsychTags.length > 0 ? allPsychTags.join(', ') : 'None'}
- Written Notes/Thoughts: ${allNotes.length > 0 ? allNotes.join(' || ') : 'None'}

[YOUR TASK]:
Evaluate this day and return a STRICT JSON object with exactly three fields:
1. "score": An integer from 0 to 100 representing the day's quality. 100 means flawless execution, 0 means complete tilt and rule-breaking.
2. "taxonomy": Must be exactly one of the following strings: "Good Win", "Good Loss", "Bad Win", "Bad Loss". A Good Loss is when they followed rules but the setup failed. A Bad Win is when they broke rules or revenge traded but got lucky.
3. "feedback": A precise, hard-hitting 2-sentence explanation of why they got this score, speaking directly to them (e.g., "You executed well but let FOMO dictate...").

DO NOT output any markdown blocks, backticks, or other text. ONLY valid JSON.
`

    try {
        const groq = getGroqClient()
        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile', // Specifically use a highly intelligent model for scoring
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1, // Low temp for consistent Jason
            response_format: { type: "json_object" }
        })

        const content = response.choices[0]?.message?.content
        if (!content) throw new Error('No AI response')

        const parsed = JSON.parse(content) as { score: number, taxonomy: string, feedback: string }

        // 4. Update the existing daily_summaries row for this date
        // Since daily_summaries is usually generated per account, and the user's view might be combined...
        // Let's actually update ALL daily_summaries for this user on this date with the SAME score for consistency,
        // OR we can just pick the first one. Let's update all arrays for that date.

        const { error: updateErr } = await supabase
            .from('daily_summaries')
            .update({
                score: parsed.score,
                taxonomy: parsed.taxonomy,
                ai_feedback: parsed.feedback
            })
            .eq('user_id', userId)
            .eq('date', dateStr)

        if (updateErr) throw new Error(updateErr.message)

        revalidatePath('/analytics')

        return { success: true, data: parsed }

    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to generate summary' }
    }
}
