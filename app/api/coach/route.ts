import { createClient } from '@/lib/supabase/server'
import { groq, COACH_MODEL, COACH_TEMPERATURE, COACH_MAX_TOKENS } from '@/lib/groq'
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
        const systemPrompt = `You are a world-class, brutally honest prop trading coach.
You help the trader analyze their psychology, adherence to rules, and patterns based strictly on their real trade data.

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
${tradesText || 'No trades recorded yet.'}

--- INSTRUCTIONS ---
1. Answer the user's question directly, using ONLY the data provided above.
2. Cite specific trades or days if applicable (e.g., 'You lost $500 on Trade 3 because you revenge traded.').
3. Keep your answers concise, practical, and highly focused. Do not write filler.
4. If they ask a general trading question, tie it back to their own data whenever possible.
5. If the data shows emotional tilt or consecutive losses, give them extreme tough love. Keep them alive in the game.`

        // 5. Structure Messages
        const messages = [
            { role: 'system', content: systemPrompt },
            ...(history || []),
            { role: 'user', content: question }
        ]

        // 6. Call Groq
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
