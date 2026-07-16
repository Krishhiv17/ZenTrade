// ============================================================
// Drawdown + session-date domain — pure, the single source of truth.
//
// Replaces the duplicated, inconsistent drawdown logic that lived in
// getAccounts (display) and eod.ts / createTrade (broken breach math,
// which compared balance to the drawdown *magnitude* instead of the floor).
//
// Also owns the "trading day" boundary: a prop-firm day ends at a market
// reset time (5 PM ET for futures), not calendar midnight.
// ============================================================

export type DrawdownType = 'static' | 'eod' | 'intraday'

// ─── Session dates ──────────────────────────────────────────

/** Add one calendar day to a YYYY-MM-DD string (DST-safe via UTC). */
export function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Session (trading) day for a manually-logged trade. `date` and `time`
 * are the account-local wall clock (same tz as `resetTime`), so a trade
 * at/after the reset time belongs to the NEXT trading day.
 * `time` null (legacy / no time captured) → the date is taken as-is.
 */
export function sessionDateFromLocal(date: string, time: string | null, resetTime: string): string {
  if (!time) return date
  return time.slice(0, 5) >= resetTime.slice(0, 5) ? nextDay(date) : date
}

/** The current trading day, given an account's reset time + timezone. */
export function currentSessionDate(resetTime: string, resetTz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resetTz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  const date = `${get('year')}-${get('month')}-${get('day')}`
  const time = `${get('hour')}:${get('minute')}`
  return sessionDateFromLocal(date, time, resetTime)
}

// ─── Drawdown ───────────────────────────────────────────────

export interface DrawdownAccount {
  account_size: number
  current_balance: number
  max_drawdown: number | null
  drawdown_type: DrawdownType
}

export interface DrawdownTrade {
  pnl: number
  max_unrealized_pnl: number | null
  session_date: string
  created_at: string
}

export interface DrawdownResult {
  /** Current stop-out balance; null when the account has no max drawdown. */
  floor: number | null
  /** High-water mark driving a trailing floor (= account_size for static). */
  peakBalance: number
  /** Did the balance ever reach/breach the floor at any point in history? */
  breached: boolean
  /** current_balance − floor (how much room is left); null if no drawdown. */
  remainingBuffer: number | null
}

/**
 * Compute the drawdown floor/peak/breach for an account from its trades.
 *
 * - static:   floor = account_size − max_drawdown (fixed).
 * - eod:      peak ratchets to the running balance at each session's close.
 * - intraday: peak ratchets to the highest intraday equity (incl. floating).
 *
 * Trailing floor = min(peak − max_drawdown, account_size) — i.e. it stops
 * trailing once it reaches the starting balance (locks at breakeven).
 */
export function computeDrawdown(account: DrawdownAccount, tradesIn: DrawdownTrade[]): DrawdownResult {
  const { account_size, current_balance, max_drawdown, drawdown_type } = account

  if (max_drawdown === null) {
    return { floor: null, peakBalance: account_size, breached: false, remainingBuffer: null }
  }

  const staticFloor = account_size - max_drawdown
  const trades = [...tradesIn].sort(
    (a, b) => a.session_date.localeCompare(b.session_date) || a.created_at.localeCompare(b.created_at),
  )

  if (drawdown_type === 'static') {
    let running = account_size
    let breached = current_balance <= staticFloor
    for (const t of trades) {
      running += t.pnl
      if (running <= staticFloor) breached = true
    }
    return {
      floor: staticFloor,
      peakBalance: account_size,
      breached,
      remainingBuffer: current_balance - staticFloor,
    }
  }

  // Trailing (eod | intraday)
  let running = account_size
  let peak = account_size
  let breached = false

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i]

    if (drawdown_type === 'intraday') {
      const floating = t.max_unrealized_pnl !== null ? t.max_unrealized_pnl : t.pnl
      const highest = Math.max(t.pnl, floating)
      if (running + highest > peak) peak = running + highest
    }

    running += t.pnl

    if (drawdown_type === 'eod') {
      const isSessionClose = i === trades.length - 1 || trades[i + 1].session_date !== t.session_date
      if (isSessionClose && running > peak) peak = running
    }

    const floorNow = Math.min(peak - max_drawdown, account_size)
    if (running <= floorNow) breached = true
  }

  const floor = Math.min(peak - max_drawdown, account_size)
  return {
    floor,
    peakBalance: peak,
    breached: breached || current_balance <= floor,
    remainingBuffer: current_balance - floor,
  }
}
