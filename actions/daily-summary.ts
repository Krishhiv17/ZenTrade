'use server'

import { createClient } from '@/lib/supabase/server'
import { getGroqClient, COACH_MODEL } from '@/lib/groq'
import { revalidatePath } from 'next/cache'

/**
 * The coach's take on a trading day — commentary only (no score, no taxonomy).
 * Grounded in the PER-TRADE breakdown (each trade's P&L, notes, and AI-Guard
 * flag) so it can't misattribute which trade won or which broke discipline.
 */
export async function generateDailySummary(dateStr: string) {
    const supabase = await createClient()

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) return { success: false, error: 'Unauthorized' }
    const userId = userData.user.id

    // Fetch this trading day's trades (per session), each individually.
    const { data: trades, error: tradesErr } = await supabase
        .from('trades')
        .select('pnl, r_multiple, direction, ticker, session, result, is_flagged, flag_reason, mistakes, psychology_notes')
        .eq('user_id', userId)
        .eq('session_date', dateStr)
        .order('created_at', { ascending: true })

    if (tradesErr) return { success: false, error: tradesErr.message }
    if (!trades || trades.length === 0) return { success: false, error: 'No trades found for this trading day.' }

    let net = 0
    let wins = 0
    let losses = 0
    const lines = trades.map((t, i) => {
        net += t.pnl
        if (t.pnl > 0) wins++
        else if (t.pnl < 0) losses++
        const parts = [
            `[Trade ${i + 1}] ${String(t.direction).toUpperCase()} ${t.ticker}`,
            `PnL ${t.pnl >= 0 ? '+' : ''}$${t.pnl}`,
            t.r_multiple != null ? `${t.r_multiple >= 0 ? '+' : ''}${t.r_multiple}R` : null,
            `Session ${t.session || 'unknown'}`,
            t.is_flagged ? `AI-Guard flag: ${t.flag_reason}` : null,
            (Array.isArray(t.mistakes) && t.mistakes.length) ? `Mistakes: ${t.mistakes.join(', ')}` : null,
            t.psychology_notes ? `Notes: "${t.psychology_notes}"` : `Notes: (none)`,
        ].filter(Boolean)
        return parts.join(' | ')
    })

    const prompt = `You are an elite trading performance coach. Judge the trader's PROCESS for this day, NOT their profit. A green day full of rule-breaks is a bad day; a red day of clean execution is a good day.

Each trade is listed INDIVIDUALLY below — reference them ACCURATELY. Note which trades WON and which LOST, and tie any rule-break or emotional flag to the SPECIFIC trade it happened on. Never assume a profitable day means discipline, and never claim a losing trade "worked out".

DAY: net ${net >= 0 ? '+' : ''}$${net.toFixed(2)} · ${wins} win / ${losses} loss over ${trades.length} ${trades.length === 1 ? 'trade' : 'trades'}

TRADES:
${lines.join('\n')}

Return STRICT JSON with exactly one field:
{ "feedback": "2-3 sharp, specific sentences about their PROCESS today. Name the exact trade(s) that showed discipline and the exact trade(s) that broke it, using their real P&L. No platitudes. Do NOT mention any numeric score." }

Output ONLY the JSON object — no markdown, no backticks.`

    try {
        const groq = getGroqClient()
        const response = await groq.chat.completions.create({
            model: COACH_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        })

        const content = response.choices[0]?.message?.content
        if (!content) throw new Error('No AI response')

        const parsed = JSON.parse(content) as { feedback: string }

        const { error: updateErr } = await supabase
            .from('daily_summaries')
            .update({ ai_feedback: parsed.feedback })
            .eq('user_id', userId)
            .eq('date', dateStr)

        if (updateErr) throw new Error(updateErr.message)

        revalidatePath('/analytics')
        revalidatePath('/today/review')

        return { success: true, data: { feedback: parsed.feedback } }
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to generate summary' }
    }
}
