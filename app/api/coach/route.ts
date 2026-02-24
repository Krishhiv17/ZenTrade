import { createClient } from '@/lib/supabase/server'
import { getGroqClient, COACH_MODEL, COACH_TEMPERATURE, COACH_MAX_TOKENS } from '@/lib/groq'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const { question, accountId, history } = await req.json()

        if (!accountId) return new NextResponse('Missing accountId', { status: 400 })
        if (!question) return new NextResponse('Missing question', { status: 400 })

        // 1. Fetch account 
        const { data: account } = await supabase
            .from('prop_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('user_id', user.id)
            .single()

        if (!account) return new NextResponse('Account not found', { status: 404 })

        // 2. Fetch last 30 trades
        const { data: trades } = await supabase
            .from('trades')
            .select('date, pnl, ticker, direction, session, exec_timeframe, macro, is_flagged, flag_reason, psychology_notes')
            .eq('account_id', accountId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(30)

        // 3. Aggregate 
        let totalPnl = 0
        let winCount = 0
        let lossCount = 0
        let flagCount = 0
        const tradesText = (trades || []).map((t, i) => {
            totalPnl += t.pnl
            if (t.pnl > 0) winCount++
            else if (t.pnl < 0) lossCount++
            if (t.is_flagged) flagCount++

            return `[Trade ${i + 1}] Date: ${t.date}, ${t.direction?.toUpperCase()} ${t.ticker}, PNL: $${t.pnl}, Session: ${t.session || 'Unknown'}, Timeframe: ${t.exec_timeframe || 'Unknown'}, AI Flag: ${t.is_flagged ? t.flag_reason : 'None'}, User Notes: ${t.psychology_notes || 'None'}`
        }).join('\n')

        const winRate = winCount + lossCount > 0 ? (winCount / (winCount + lossCount) * 100).toFixed(1) : '0.0'

        // 4. Build System Prompt
        const systemPrompt = `You are a world-class Trading Psychology Performance Coach. You combine the clinical, probabilistic mindset of Mark Douglas ("Trading in the Zone") with the practical behavioral analysis of Jared Tendler ("The Mental Game of Trading").

Your goal is NOT to give generic advice like "be patient" or "stick to your plan." Instead, you must deeply analyze the user's provided trade data—specifically their "User Notes" and "AI Flag"—to identify the core cognitive distortions causing their errors.

--- ACCOUNT CONTEXT ---
Firm: ${account.firm_name}
Starting Balance: $${account.account_size}
Current Balance: $${account.current_balance}
Daily Loss Limit: $${account.personal_daily_loss_limit || account.daily_loss_limit || 'None'}
Max Drawdown Allowed: $${account.max_drawdown}

--- RECENT PERFORMANCE (Last ${trades?.length || 0} Trades) ---
Net P&L (in this sample): $${totalPnl.toFixed(2)}
Win Rate: ${winRate}%
Total Rule Violations / AI Flags: ${flagCount}

--- TRADE LOG ---
${tradesText || 'User has not logged any trades yet. Encourage them to log their first trade in the Journal.'}

--- CORE COACHING PHILOSOPHY ---
1. EVERYTHING IS PROBABILITIES: The user must understand they do not need to know what happens next to make money. A loss is simply a business expense in a random distribution of outcomes.
2. TILT AND EMOTION TRACING: When the user mentions FOMO, revenge trading, or anxiety, trace it back to their expectations. Did they expect the market to owe them? Were they trading their PnL instead of the chart? 
3. ELIMINATE GENERIC FLUFF: Do not say "identify what went right and replicate it." That is lazy and unhelpful. Instead, be hyper-specific. For example: "In Trade 2 (MNQ), your notes show you waited 12 minutes for the CPI macro setup. In Trade 1 (NQ) you entered immediately with no setup. Your psychological leak is a lack of capacity for boredom."

--- INSTRUCTIONS FOR YOUR RESPONSE ---
- GROUNDING: ALWAYS reference specific trades, tickers, and EXACT quotes from their "User Notes" or "AI Flag" in your response to prove you are analyzing THEIR data.
- DIAGNOSIS: Identify the specific psychological flaw (e.g., "Results-oriented thinking", "Loss aversion", "Boredom trading", "Gambler's fallacy").
- THE FIX: Provide a strict, actionable mental framework or pre-trade routine to combat this specific trigger. Do not give them platitudes. Give them mental exercises.
- TONE: Professional, slightly clinical, radically honest, and deeply insightful. You are not their friend; you are their performance auditor.`        // 5. Structure Messages
        const messages = [
            { role: 'system', content: systemPrompt },
            ...(history || []),
            { role: 'user', content: question }
        ]

        // 6. Call Groq
        const groq = getGroqClient()
        const response = await groq.chat.completions.create({
            model: COACH_MODEL,
            temperature: COACH_TEMPERATURE,
            max_tokens: COACH_MAX_TOKENS,
            messages: messages as any,
            stream: true,
        })

        // 7. Transform to ReadableStream for Next.js Route Handler
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of response) {
                        const content = chunk.choices[0]?.delta?.content || ''
                        if (content) {
                            controller.enqueue(new TextEncoder().encode(content))
                        }
                    }
                    controller.close()
                } catch (err) {
                    controller.error(err)
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            }
        })

    } catch (error: any) {
        console.error('Coach API Error:', error)
        return new NextResponse(error.message || 'Server error', { status: 500 })
    }
}
