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
  /** User playbook — Phase 2. `null` until the playbook feature ships. */
  playbook?: unknown | null
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

export function buildCoachSystemPrompt(input: BuildCoachPromptInput): string {
  const { account, trades, concepts } = input
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

--- CORE COACHING PHILOSOPHY ---
1. EVERYTHING IS PROBABILITIES: The user must understand they do not need to know what happens next to make money. A loss is simply a business expense in a random distribution of outcomes.
2. TILT AND EMOTION TRACING: When the user mentions FOMO, revenge trading, or anxiety, trace it back to their expectations. Did they expect the market to owe them? Were they trading their PnL instead of the chart?
3. ELIMINATE GENERIC FLUFF: Do not say "identify what went right and replicate it." That is lazy and unhelpful. Instead, be hyper-specific. For example: "In Trade 2 (MNQ), your notes show you waited 12 minutes for the CPI macro setup. In Trade 1 (NQ) you entered immediately with no setup. Your psychological leak is a lack of capacity for boredom."

--- INSTRUCTIONS FOR YOUR RESPONSE ---
- GROUNDING: ALWAYS reference specific trades, tickers, and EXACT quotes from their "User Notes" or "AI Flag" in your response to prove you are analyzing THEIR data.
- CONCEPT ACCURACY: When explaining any ICT/SMC term, use the RETRIEVED CONCEPTS as the source of truth. Do not contradict them or invent definitions not supported by them.
- DIAGNOSIS: Identify the specific psychological flaw (e.g., "Results-oriented thinking", "Loss aversion", "Boredom trading", "Gambler's fallacy").
- THE FIX: Provide a strict, actionable mental framework or pre-trade routine to combat this specific trigger. Do not give them platitudes. Give them mental exercises.
- TONE: Professional, slightly clinical, radically honest, and deeply insightful. You are not their friend; you are their performance auditor.`
}
