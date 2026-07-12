import { createClient } from '@/lib/supabase/server'
import { getGroqClient, COACH_MODEL, COACH_TEMPERATURE, COACH_MAX_TOKENS } from '@/lib/groq'
import { matchKnowledge } from '@/lib/retrieval'
import { buildCoachSystemPrompt, buildLearnSystemPrompt } from '@/lib/prompt/coach-prompt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const { question, accountId, history, mode } = await req.json()

        if (!question) return new NextResponse('Missing question', { status: 400 })

        // Two modes:
        //  - 'learn': pure ICT/SMC education, NO account/trade context.
        //  - 'coach' (default): grounded in the selected account's trade data.
        const isLearn = mode === 'learn'
        if (!isLearn && !accountId) return new NextResponse('Missing accountId', { status: 400 })

        // RAG: retrieve relevant ICT/SMC concept chunks for this question (both modes).
        // Best-effort — matchKnowledge never throws; empty on failure.
        const concepts = await matchKnowledge(question, { client: supabase })

        let systemPrompt: string

        if (isLearn) {
            // Learn mode — concepts only, no personal data.
            systemPrompt = buildLearnSystemPrompt({ concepts })
        } else {
            // Coach mode — fetch account + last 30 trades and ground in them.
            const { data: account } = await supabase
                .from('prop_accounts')
                .select('*')
                .eq('id', accountId)
                .eq('user_id', user.id)
                .single()

            if (!account) return new NextResponse('Account not found', { status: 404 })

            const { data: trades } = await supabase
                .from('trades')
                .select('date, pnl, ticker, direction, session, exec_timeframe, macro, is_flagged, flag_reason, psychology_notes')
                .eq('account_id', accountId)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(30)

            // Playbook is Phase 2 — passed null for now.
            systemPrompt = buildCoachSystemPrompt({
                account,
                trades: trades ?? [],
                concepts,
                playbook: null,
            })
        }

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
