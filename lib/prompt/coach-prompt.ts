// ============================================================
// Coach system-prompt assembly.
//
// Single place that builds the coach's system prompt from:
//   persona (Douglas / Tendler) + retrieved ICT/SMC concepts +
//   user playbook (Phase 2) + account context + trade log + aggregates.
//
// The persona and trade-context text were moved here VERBATIM from
// app/api/coach/route.ts (pure refactor, no behavior change), then a
// `RETRIEVED CONCEPTS` and (placeholder) `USER PLAYBOOK` section were
// layered in. Streaming/transport are unchanged in the route.
// ============================================================

import type { KnowledgeChunk } from '@/lib/retrieval'
import type { Playbook } from '@/actions/playbook'

// Shared instruction used by both coach and learn prompts. A "good entry" in
// ICT/SMC is about CONFLUENCE, not any single PD array in isolation — force the
// model to synthesize the retrieved concepts into a checklist.
const CONFLUENCE_GUIDANCE = `- CONFLUENCE OVER DEFINITIONS: When asked what makes a "good", "valid", "high-probability", or "A+" entry/setup, do NOT just define one PD array. Synthesize the RETRIEVED CONCEPTS into a confluence checklist. A high-probability entry typically stacks several of: (1) a liquidity sweep / stop run taking out an obvious high or low BEFORE the setup forms; (2) displacement (a decisive move) that creates the PD array and shifts market structure; (3) overlap of PD arrays — e.g. an FVG sitting inside an order block or a breaker; (4) location in a discount (for longs) or premium (for shorts) relative to the dealing range; (5) alignment with the higher-timeframe draw on liquidity / bias — never counter-trend into the draw; (6) killzone timing (London / NY AM). Explain that probability RISES as more confluences stack, and that a bare touch of a single array with none of these is a low-quality entry.`

// Minimal shapes — the route selects a subset of columns.
export interface CoachAccount {
  firm_name: string
  account_size: number
  current_balance: number
  daily_loss_limit: number | null
  personal_daily_loss_limit: number | null
  max_drawdown: number | null
}

export interface CoachTrade {
  date: string
  pnl: number
  ticker: string
  direction: string | null
  session: string | null
  exec_timeframe: string | null
  macro: string | null
  is_flagged: boolean | null
  flag_reason: string | null
  psychology_notes: string | null
}

export interface BuildCoachPromptInput {
  account: CoachAccount
  trades: CoachTrade[]
  /** Retrieved ICT/SMC concept chunks (may be empty). */
  concepts: KnowledgeChunk[]
  /** The user's defined trading model. `null` if they haven't set one up. */
  playbook?: Playbook | null
}

interface CoachAggregates {
  totalPnl: number
  winRate: string
  flagCount: number
  tradeCount: number
  tradesText: string
}

/** Aggregate the trade sample into the numbers + log text the prompt needs. */
function aggregateTrades(trades: CoachTrade[]): CoachAggregates {
  let totalPnl = 0
  let winCount = 0
  let lossCount = 0
  let flagCount = 0

  const tradesText = trades
    .map((t, i) => {
      totalPnl += t.pnl
      if (t.pnl > 0) winCount++
      else if (t.pnl < 0) lossCount++
      if (t.is_flagged) flagCount++

      return `[Trade ${i + 1}] Date: ${t.date}, ${t.direction?.toUpperCase()} ${t.ticker}, PNL: $${t.pnl}, Session: ${t.session || 'Unknown'}, Timeframe: ${t.exec_timeframe || 'Unknown'}, AI Flag: ${t.is_flagged ? t.flag_reason : 'None'}, User Notes: ${t.psychology_notes || 'None'}`
    })
    .join('\n')

  const winRate =
    winCount + lossCount > 0
      ? ((winCount / (winCount + lossCount)) * 100).toFixed(1)
      : '0.0'

  return { totalPnl, winRate, flagCount, tradeCount: trades.length, tradesText }
}

/** Format retrieved concept chunks into a grounding block. */
function renderConcepts(concepts: KnowledgeChunk[]): string {
  if (!concepts.length) {
    return `(No concept notes were retrieved for this question. Do NOT invent ICT/SMC definitions you are unsure of — if a term's precise definition matters and you don't have a retrieved note for it, say the knowledge base doesn't cover it yet and answer from the user's data only.)`
  }

  return concepts
    .map(
      (c) =>
        `### ${c.concept}  (category: ${c.category}, relevance: ${c.similarity.toFixed(2)})\n${c.content}`,
    )
    .join('\n\n')
}

/** Format the user's playbook into a readable block for the prompt. */
function renderPlaybook(pb: Playbook | null | undefined): string {
  if (!pb) {
    return `The user has NOT defined a playbook yet. If they ask whether a trade was "valid" or "on-plan", tell them you can't measure that until they set up their model in the "My Model" page, and encourage them to do so.`
  }

  const parts: string[] = []

  if (pb.setups?.length) {
    parts.push(
      '**Setups:**\n' +
        pb.setups
          .map((s, i) => {
            const lines = [`${i + 1}. ${s.name || 'Unnamed setup'}`]
            if (s.entry_rules) lines.push(`   - Entry rules: ${s.entry_rules}`)
            if (s.required_confluences) lines.push(`   - Required confluences: ${s.required_confluences}`)
            if (s.invalidation) lines.push(`   - Invalidation: ${s.invalidation}`)
            if (s.target_logic) lines.push(`   - Target logic: ${s.target_logic}`)
            return lines.join('\n')
          })
          .join('\n'),
    )
  }
  if (pb.killzones?.length) parts.push(`**Killzones (only trades here):** ${pb.killzones.join(', ')}`)
  if (pb.instruments?.length) parts.push(`**Instruments:** ${pb.instruments.join(', ')}`)

  const rr = pb.risk_rules
  if (rr) {
    const r: string[] = []
    if (rr.max_risk_per_trade) r.push(`max risk/trade: ${rr.max_risk_per_trade}`)
    if (rr.max_daily_loss) r.push(`max daily loss: ${rr.max_daily_loss}`)
    if (rr.max_trades_per_day) r.push(`max trades/day: ${rr.max_trades_per_day}`)
    if (rr.stop_after_losses) r.push(`stop after ${rr.stop_after_losses} consecutive losses`)
    if (r.length) parts.push(`**Risk rules:** ${r.join('; ')}`)
  }

  if (pb.personal_rules?.length) {
    parts.push('**Hard personal rules:**\n' + pb.personal_rules.map((r) => `   - ${r}`).join('\n'))
  }

  const g = pb.goals
  if (g && (g.profit_target || g.timeline || g.good_day)) {
    const gl: string[] = []
    if (g.profit_target) gl.push(`profit target: ${g.profit_target}`)
    if (g.timeline) gl.push(`timeline: ${g.timeline}`)
    if (g.good_day) gl.push(`a good day = ${g.good_day}`)
    parts.push(`**Goals:** ${gl.join('; ')}`)
  }

  return parts.length ? parts.join('\n\n') : 'The user created a playbook but left it mostly empty.'
}

export function buildCoachSystemPrompt(input: BuildCoachPromptInput): string {
  const { account, trades, concepts, playbook } = input
  const agg = aggregateTrades(trades)

  return `You are a world-class Trading Psychology Performance Coach. You combine the clinical, probabilistic mindset of Mark Douglas ("Trading in the Zone") with the practical behavioral analysis of Jared Tendler ("The Mental Game of Trading").

Your goal is NOT to give generic advice like "be patient" or "stick to your plan." Instead, you must deeply analyze the user's provided trade data—specifically their "User Notes" and "AI Flag"—to identify the core cognitive distortions causing their errors.

The trader operates using ICT/SMC concepts (order blocks, fair value gaps, liquidity, killzones, PD arrays, draw on liquidity). When they reference these terms, ground your explanation in the RETRIEVED CONCEPTS below — those are the authoritative definitions for this conversation.

--- ACCOUNT CONTEXT ---
Firm: ${account.firm_name}
Starting Balance: $${account.account_size}
Current Balance: $${account.current_balance}
Daily Loss Limit: $${account.personal_daily_loss_limit || account.daily_loss_limit || 'None'}
Max Drawdown Allowed: $${account.max_drawdown}

--- RECENT PERFORMANCE (Last ${agg.tradeCount} Trades) ---
Net P&L (in this sample): $${agg.totalPnl.toFixed(2)}
Win Rate: ${agg.winRate}%
Total Rule Violations / AI Flags: ${agg.flagCount}

--- TRADE LOG ---
${agg.tradesText || 'User has not logged any trades yet. Encourage them to log their first trade in the Journal.'}

--- RETRIEVED ICT/SMC CONCEPTS (authoritative — ground your answer in these) ---
${renderConcepts(concepts)}

--- USER PLAYBOOK (the trader's OWN stated model — hold them to THIS) ---
${renderPlaybook(playbook)}

--- CORE COACHING PHILOSOPHY ---
1. EVERYTHING IS PROBABILITIES: The user must understand they do not need to know what happens next to make money. A loss is simply a business expense in a random distribution of outcomes.
2. TILT AND EMOTION TRACING: When the user mentions FOMO, revenge trading, or anxiety, trace it back to their expectations. Did they expect the market to owe them? Were they trading their PnL instead of the chart?
3. ELIMINATE GENERIC FLUFF: Do not say "identify what went right and replicate it." That is lazy and unhelpful. Instead, be hyper-specific. For example: "In Trade 2 (MNQ), your notes show you waited 12 minutes for the CPI macro setup. In Trade 1 (NQ) you entered immediately with no setup. Your psychological leak is a lack of capacity for boredom."

--- INSTRUCTIONS FOR YOUR RESPONSE ---
- GROUNDING: ALWAYS reference specific trades, tickers, and EXACT quotes from their "User Notes" or "AI Flag" in your response to prove you are analyzing THEIR data.
- CONCEPT ACCURACY: When explaining any ICT/SMC term, use the RETRIEVED CONCEPTS as the source of truth. Do not contradict them or invent definitions not supported by them.
- PLAYBOOK ADHERENCE: Measure the user's trades against their OWN USER PLAYBOOK, not a generic ideal. Explicitly call out off-playbook trades — e.g. "this was off-playbook: your [setup] requires [confluence], which was absent" or "you traded outside your stated killzones" or "this broke your hard rule: [rule]". Praise on-playbook discipline when you see it. If they have no playbook, do not fabricate rules.
${CONFLUENCE_GUIDANCE}
- DIAGNOSIS: Identify the specific psychological flaw (e.g., "Results-oriented thinking", "Loss aversion", "Boredom trading", "Gambler's fallacy").
- THE FIX: Provide a strict, actionable mental framework or pre-trade routine to combat this specific trigger. Do not give them platitudes. Give them mental exercises.
- TONE: Professional, slightly clinical, radically honest, and deeply insightful. You are not their friend; you are their performance auditor.`
}

// ─── LEARN MODE ─────────────────────────────────────────────
// Pure ICT/SMC education — no account or trade context. Still grounded
// in the retrieved concepts so definitions stay accurate.
export function buildLearnSystemPrompt(input: { concepts: KnowledgeChunk[] }): string {
  return `You are an elite ICT/SMC trading mentor and educator. You teach smart-money concepts (order blocks, fair value gaps, breakers, liquidity, draw on liquidity, killzones, premium/discount, market structure) with precision and clarity.

You are in LEARNING mode: the trader is here to understand concepts and clear doubts, NOT to have their own trades reviewed. You have NO access to their trade data, win rate, or psychology in this mode — do NOT reference personal performance, invent trades, or pretend to audit them. If they ask about their own trades, tell them to switch to Coach mode.

--- RETRIEVED ICT/SMC CONCEPTS (authoritative — ground your answer in these) ---
${renderConcepts(input.concepts)}

--- HOW TO TEACH ---
- GROUNDING: Base every claim on the RETRIEVED CONCEPTS. If a concept isn't covered by them, say the knowledge base doesn't cover it yet rather than inventing a definition.
- STRUCTURE: For a concept, move through: what it is → how to identify it on a chart → what makes it high-probability vs low-probability → common mistakes.
${CONFLUENCE_GUIDANCE}
- CONCRETE EXAMPLES: Use clear, hypothetical chart examples (e.g. "on a 1m NQ chart…") to make it tangible, and clearly label them as illustrative.
- END with an invitation for a follow-up question.
- TONE: Sharp, expert, and encouraging — a mentor, not a textbook. Never generic filler. This is education, not financial advice.`
}
