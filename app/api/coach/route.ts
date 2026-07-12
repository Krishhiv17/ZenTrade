import { createClient } from '@/lib/supabase/server'
import { getGroqClient, COACH_MODEL, COACH_TEMPERATURE, COACH_MAX_TOKENS } from '@/lib/groq'
import { matchKnowledge } from '@/lib/retrieval'
import { buildCoachSystemPrompt } from '@/lib/prompt/coach-prompt'
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

        // 3. RAG: retrieve relevant ICT/SMC concept chunks for this question.
        //    Best-effort — matchKnowledge never throws; empty on failure.
        const concepts = await matchKnowledge(question, { client: supabase })

        // 4. Build the grounded system prompt (persona + concepts + trades + account).
        //    Playbook is Phase 2 — passed null for now.
        const systemPrompt = buildCoachSystemPrompt({
            account,
            trades: trades ?? [],
            concepts,
            playbook: null,
        })

        // 5. Structure Messages
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

        // 7. Transform to ReadableStream for Next.js Route Handler.
        //    First line is a JSON metadata header ({"concepts":[...]}\n) that the
        //    client strips for citation rendering; the answer text streams after it.
        const conceptMeta = concepts.map(c => ({ concept: c.concept, category: c.category }))
        const header = JSON.stringify({ concepts: conceptMeta }) + '\n'

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    controller.enqueue(new TextEncoder().encode(header))
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
