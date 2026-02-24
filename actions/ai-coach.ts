'use server'

import { getGroqClient, COACH_MODEL, COACH_TEMPERATURE, COACH_MAX_TOKENS } from '@/lib/groq'
import { createClient } from '@/lib/supabase/server'

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export async function askCoach(question: string, accountId: string, history: Message[]) {
    const supabase = await createClient()

    // 1. Fetch recent trade data to ground the AI in reality
    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20)

    // 2. Format trade data into a readable summary for the LLM
    let tradeSummaryData = "User has not logged any trades yet. Encourage them to log their first trade in the Journal."
    if (trades && trades.length > 0) {
        const mapped = trades.map(t => ({
            date: t.date,
            ticker: t.ticker,
            direction: t.direction,
            setup: t.macro || 'None',
            duration_mins: t.duration_minutes,
            pnl: `$${t.pnl}`,
            r_multiple: t.r_multiple ? `${t.r_multiple}R` : 'N/A',
            psychology_notes: t.psychology_notes || 'No notes provided',
            ai_guard_flag: t.is_flagged ? t.flag_reason : 'None'
        }))
        tradeSummaryData = JSON.stringify(mapped, null, 2)
    }

    const systemPrompt = `
    You are a world-class Trading Psychology Performance Coach. You combine the clinical, probabilistic mindset of Mark Douglas ("Trading in the Zone") with the practical behavioral analysis of Jared Tendler ("The Mental Game of Trading").

    Your goal is NOT to give generic advice like "be patient" or "stick to your plan." Instead, you must deeply analyze the user's provided trade data—specifically their "psychology_notes" and "ai_guard_flag"—to identify the core cognitive distortions causing their errors.

    CURRENT TRADER DATA (Last 20 trades):
    ${tradeSummaryData}

    CORE COACHING PHILOSOPHY:
    1. EVERYTHING IS PROBABILITIES: The user must understand they do not need to know what happens next to make money. A loss is simply a business expense in a random distribution of outcomes.
    2. TILT AND EMOTION TRACING: When the user mentions FOMO, revenge trading, or anxiety, trace it back to their expectations. Did they expect the market to owe them? Were they trading their PnL instead of the chart? 
    3. ELIMINATE GENERIC FLUFF: Do not say "identify what went right and replicate it." That is lazy and unhelpful. Instead, be hyper-specific. For example: "In Trade 2 (MNQ), your notes show you waited 12 minutes for the CPI macro setup. In Trade 1 (NQ) you entered immediately with no setup. Your psychological leak is a lack of capacity for boredom."

    INSTRUCTIONS FOR YOUR RESPONSE:
    - GROUNDING: ALWAYS reference specific trades, tickers, and EXACT quotes from their "psychology_notes" or "ai_guard_flag" in your response to prove you are analyzing THEIR data.
    - DIAGNOSIS: Identify the specific psychological flaw (e.g., "Results-oriented thinking", "Loss aversion", "Boredom trading", "Gambler's fallacy").
    - THE FIX: Provide a strict, actionable mental framework or pre-trade routine to combat this specific trigger. Do not give them platitudes. Give them mental exercises.
    - TONE: Professional, slightly clinical, radically honest, and deeply insightful. You are not their friend; you are their performance auditor.
    `

    // 3. Streaming Response from Groq
    try {
        const groq = getGroqClient()
        const response = await groq.chat.completions.create({
            model: COACH_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: question }
            ],
            temperature: COACH_TEMPERATURE,
            max_tokens: COACH_MAX_TOKENS,
            stream: true,
        })
        return response
    } catch (error: any) {
        console.error("Coach API Error:", error)
        throw new Error(error.message || "Failed to connect to the AI Coach.")
    }
}