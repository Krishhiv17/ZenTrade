'use server'

import { groq, COACH_MODEL, COACH_TEMPERATURE, COACH_MAX_TOKENS } from '@/lib/groq'
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
        .order('exit_time', { ascending: false })
        .limit(30)

    // 2. Format trade data into a readable summary for the LLM
    const tradeSummary = trades?.map(t => ({
        pnl: t.pnl,
        duration: t.duration_minutes,
        setup: t.setup_name,
        result: t.pnl > 0 ? 'Win' : 'Loss',
        time: t.exit_time
    }))

    const systemPrompt = `
    You are the AI Psychology Coach, embodying the professional wisdom of Mark Douglas (author of "Trading in the Zone").
    
    CORE PHILOSOPHY:
    - You view trading as a numbers game based on probabilities, not individual outcomes.
    - You are professional, direct, and slightly clinical. You do not offer "hope"; you offer "structure."
    - You emphasize that the user does NOT need to know what happens next to be profitable.
    
    CURRENT TRADING DATA (Last 30 trades):
    ${JSON.stringify(tradeSummary)}

    GUIDELINES:
    1. Analyze the user's question against their actual data.
    2. If they are emotional about a loss, remind them of the random distribution of wins/losses.
    3. Use "Chain of Thought": Think step-by-step about their psychological leak before giving the final advice.
    4. Focus on "Risk Acceptance" and "Objective Perspective."
    `

    // 3. Streaming Response from Groq
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
}