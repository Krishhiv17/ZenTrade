// ============================================================
// Discipline Score — pure, deterministic, process-first.
//
// A 0–100 daily score for ONE account on ONE day, blended from four
// process signals (weights locked 2026-07-14):
//   rule adherence 45% · emotional control 25% · journaling 20% · playbook 10%
//
// Deliberately NOT driven by P&L — this measures how well the trader
// followed their own process, per the product's north star.
//
// Zero I/O so it's trivially testable. The caller supplies the day's
// trades + the account/playbook rules it needs.
// ============================================================

export const DISCIPLINE_WEIGHTS = { rule: 0.45, emotion: 0.25, journaling: 0.20, playbook: 0.10 } as const

/** Score at/above this = a "disciplined day" (counts toward the streak). */
export const DISCIPLINE_STREAK_THRESHOLD = 70

// Trades aren't linked to a specific playbook setup yet, so playbook
// adherence is approximate. When we can't assess it, we use this neutral
// value rather than unfairly rewarding or penalizing.
const PLAYBOOK_NEUTRAL = 70

export interface DisciplineTrade {
  pnl: number
  result: 'win' | 'loss' | 'breakeven' | null
  session: string | null
  session_status: 'in_session' | 'out_of_session' | null
  is_flagged: boolean | null
  flag_reason: string | null
  psychology_notes: string | null
  ticker: string
  entry_tags: string[]
  pd_arrays: string[]
  entry_confluences: string[]
  created_at: string
}

export interface DisciplineRules {
  /** Firm/account cap on trades per day (from prop_accounts). */
  maxDailyTrades: number | null
  /** Personal or firm daily loss limit ($), stricter wins. */
  dailyLossLimit: number | null
  /** Playbook killzones the trader is supposed to trade (free-text labels). */
  killzones: string[]
  /** Playbook instruments. */
  instruments: string[]
  /** Playbook: stop after N consecutive losses. */
  stopAfterLosses: number | null
  /** Playbook: max trades per day (separate from the firm cap). */
  playbookMaxTrades: number | null
  /** Whether a playbook exists at all (affects what we can assess). */
  hasPlaybook: boolean
}

export interface DisciplineFactors {
  rule: number
  emotion: number
  journaling: number
  playbook: number
  notes: string[] // human-readable deductions, for the UI breakdown
}

export interface DisciplineResult {
  score: number | null // null = no trades that day (nothing to assess)
  factors: DisciplineFactors | null
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

const EMOTIONAL_FLAG_TERMS = ['revenge', 'tilt', 'fomo', 'consecutive', 'emotional', 'angry']

function isEmotionalFlag(reason: string | null): boolean {
  if (!reason) return false
  const r = reason.toLowerCase()
  return EMOTIONAL_FLAG_TERMS.some(term => r.includes(term))
}

/** Does the trade's session fall inside one of the playbook killzones? */
function inKillzone(session: string | null, killzones: string[]): boolean {
  if (!session) return true // unknown session — don't penalize
  if (!killzones.length) return true // no killzones defined — can't assess
  const s = norm(session)
  return killzones.some(kz => {
    const k = norm(kz)
    return k.includes(s) || s.includes(k)
  })
}

function hasSetupTags(t: DisciplineTrade): boolean {
  return (t.entry_tags?.length ?? 0) + (t.pd_arrays?.length ?? 0) + (t.entry_confluences?.length ?? 0) > 0
}

function instrumentMatches(instruments: string[], ticker: string): boolean {
  if (!instruments.length) return false
  const tk = norm(ticker)
  return instruments.some(i => norm(i) === tk)
}

export function computeDisciplineScore(
  tradesIn: DisciplineTrade[],
  rules: DisciplineRules,
): DisciplineResult {
  if (!tradesIn.length) return { score: null, factors: null }

  // Chronological order (for consecutive-loss detection).
  const trades = [...tradesIn].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const n = trades.length
  const notes: string[] = []

  // ── Emotional control (25%) ──
  const emotionalFlags = trades.filter(t => t.is_flagged && isEmotionalFlag(t.flag_reason))
  const emotion = clamp(100 - emotionalFlags.length * 34)
  if (emotionalFlags.length) {
    notes.push(`${emotionalFlags.length} emotional flag${emotionalFlags.length > 1 ? 's' : ''} (revenge / tilt / FOMO)`)
  }

  // ── Journaling (20%) ──
  const journaled = trades.filter(t => t.psychology_notes && t.psychology_notes.trim().length > 0).length
  const journaling = Math.round((journaled / n) * 100)
  if (journaled < n) notes.push(`${n - journaled} of ${n} trades logged without notes`)

  // ── Rule adherence (45%) ── start at 100, deduct violations
  let ruleDeduction = 0

  // out-of-window trades (explicit flag OR outside playbook killzones)
  const outOfWindow = trades.filter(
    t => t.session_status === 'out_of_session' || !inKillzone(t.session, rules.killzones),
  ).length
  if (outOfWindow) {
    ruleDeduction += Math.min(48, outOfWindow * 12)
    notes.push(`${outOfWindow} trade${outOfWindow > 1 ? 's' : ''} outside your killzones`)
  }

  // exceeded max trades/day (stricter of firm cap and playbook cap)
  const caps = [rules.maxDailyTrades, rules.playbookMaxTrades].filter((x): x is number => typeof x === 'number' && x > 0)
  const maxTrades = caps.length ? Math.min(...caps) : null
  if (maxTrades !== null && n > maxTrades) {
    ruleDeduction += 20
    notes.push(`Overtraded: ${n} trades vs your ${maxTrades} limit`)
  }

  // daily loss limit breached
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0)
  if (rules.dailyLossLimit !== null && netPnl < -rules.dailyLossLimit) {
    ruleDeduction += 30
    notes.push(`Daily loss limit breached`)
  }

  // kept trading after N consecutive losses
  if (rules.stopAfterLosses !== null && rules.stopAfterLosses > 0) {
    let consec = 0
    let violated = false
    for (const t of trades) {
      if (consec >= rules.stopAfterLosses) { violated = true; break }
      if (t.result === 'loss' || t.pnl < 0) consec++
      else consec = 0
    }
    if (violated) {
      ruleDeduction += 20
      notes.push(`Traded past your ${rules.stopAfterLosses}-loss stop`)
    }
  }

  const rule = clamp(100 - ruleDeduction)

  // ── Playbook adherence (10%) — approximate ──
  let playbook: number
  if (rules.hasPlaybook && rules.instruments.length) {
    const matched = trades.filter(t => instrumentMatches(rules.instruments, t.ticker) && hasSetupTags(t)).length
    playbook = Math.round((matched / n) * 100)
    if (matched < n) notes.push(`${n - matched} of ${n} trades not clearly on a defined setup`)
  } else {
    playbook = PLAYBOOK_NEUTRAL // can't assess without a playbook
  }

  const score = Math.round(
    DISCIPLINE_WEIGHTS.rule * rule +
    DISCIPLINE_WEIGHTS.emotion * emotion +
    DISCIPLINE_WEIGHTS.journaling * journaling +
    DISCIPLINE_WEIGHTS.playbook * playbook,
  )

  return { score, factors: { rule, emotion, journaling, playbook, notes } }
}
