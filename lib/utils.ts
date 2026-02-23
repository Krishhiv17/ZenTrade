import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Tick values per contract (round-turn)
export const TICK_VALUES: Record<string, number> = {
    NQ: 5,    // $5 per tick, 0.25 tick size = $1.25 per tick × 4 = $5 per point... actually per tick $5
    MNQ: 0.5,
    ES: 12.5,
    MES: 1.25,
}

// Points per tick for each instrument
export const TICKS_PER_POINT: Record<string, number> = {
    NQ: 4,
    MNQ: 4,
    ES: 4,
    MES: 4,
}

/**
 * Calculate risk in dollars
 * risk$ = |entry - sl| * contracts * tick_value * ticks_per_point
 */
export function calcRiskDollars(
    entry: number,
    sl: number,
    contracts: number,
    ticker: string
): number {
    const tickValue = TICK_VALUES[ticker] ?? 1
    const ticksPerPoint = TICKS_PER_POINT[ticker] ?? 4
    const pointRisk = Math.abs(entry - sl)
    return parseFloat((pointRisk * contracts * tickValue * ticksPerPoint).toFixed(2))
}

/**
 * Calculate R Multiple
 * r = pnl / risk$
 */
export function calcRMultiple(pnl: number, riskDollars: number): number {
    if (riskDollars === 0) return 0
    return parseFloat((pnl / riskDollars).toFixed(2))
}

/**
 * Derive trade result from PnL
 */
export function deriveResult(pnl: number): 'win' | 'loss' | 'breakeven' {
    if (pnl > 0) return 'win'
    if (pnl < 0) return 'loss'
    return 'breakeven'
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

/**
 * Format R multiple with sign
 */
export function formatR(r: number): string {
    const sign = r >= 0 ? '+' : ''
    return `${sign}${r.toFixed(2)}R`
}
