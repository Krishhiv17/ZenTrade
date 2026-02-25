import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Tick values per contract (round-turn)
export const TICK_VALUES: Record<string, number> = {
    NQ: 5,
    MNQ: 0.5,
    ES: 12.5,
    MES: 1.25,
    // Major Forex pairs (Standard Lot pip value approx)
    EURUSD: 10,
    GBPUSD: 10,
    AUDUSD: 10,
    USDCAD: 10,
    USDJPY: 10,
    GBPJPY: 10,
}

// Points per tick for each instrument (or pips per point for Forex)
export const TICKS_PER_POINT: Record<string, number> = {
    NQ: 4,
    MNQ: 4,
    ES: 4,
    MES: 4,
    // Forex standard lot size multiplier logic for decimal math
    EURUSD: 10000,
    GBPUSD: 10000,
    AUDUSD: 10000,
    USDCAD: 10000,
    USDJPY: 100,
    GBPJPY: 100,
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
 * Calculate P&L from result, direction, prices, size, and ticker.
 * Win  long:  (tp_avg - entry) × size × pointValue
 * Win  short: (entry - tp_avg) × size × pointValue
 * Loss long:  (sl - entry)     × size × pointValue  (negative)
 * Loss short: (entry - sl)     × size × pointValue  (negative)
 * Breakeven:  0
 */
export function calcPnL(
    result: 'win' | 'loss' | 'breakeven',
    direction: 'long' | 'short',
    entry: number,
    sl: number | null,
    tp_avg: number | null,
    size: number,
    ticker: string,
): number | null {
    const tickValue = TICK_VALUES[ticker] ?? 1
    const ticksPerPoint = TICKS_PER_POINT[ticker] ?? 4
    const pointValue = tickValue * ticksPerPoint

    if (result === 'breakeven') return 0

    if (result === 'win') {
        if (tp_avg === null) return null
        const points = direction === 'long' ? tp_avg - entry : entry - tp_avg
        return parseFloat((points * size * pointValue).toFixed(2))
    }

    // loss
    if (sl === null) return null
    const points = direction === 'long' ? sl - entry : entry - sl
    return parseFloat((points * size * pointValue).toFixed(2))
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
