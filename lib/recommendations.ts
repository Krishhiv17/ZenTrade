import type { ParsedEvent } from './news'

// ─── Types ────────────────────────────────────────────────────

export type RecommendationSeverity = 'avoid' | 'caution' | 'opportunity' | 'info'

export interface Recommendation {
    severity: RecommendationSeverity
    headline: string
    detail: string
    triggerEvent?: string   // which event caused this rule
}

// ─── Keyword matchers ─────────────────────────────────────────

const NFP_KEYWORDS = ['non-farm', 'nonfarm', 'nfp', 'employment change']
const FOMC_KEYWORDS = ['federal funds rate', 'fomc', 'fed rate', 'interest rate decision', 'monetary policy']
const CPI_KEYWORDS = ['cpi', 'consumer price index', 'inflation']
const FED_SPEAK = ['fed chair', 'powell', 'fed governor', 'fomc member', 'federal reserve chair', 'fed president']
const TRUMP_KEYWORDS = ['trump']
const GDP_KEYWORDS = ['gdp', 'gross domestic product']
const PPI_KEYWORDS = ['ppi', 'producer price']
const JOLTS_KEYWORDS = ['jolts', 'job openings']
const RETAIL_KEYWORDS = ['retail sales']
const ISM_KEYWORDS = ['ism manufacturing', 'ism services', 'ism non-manufacturing']

function matches(title: string, keywords: string[]): boolean {
    const t = title.toLowerCase()
    return keywords.some(k => t.includes(k))
}

// ─── Main recommendation engine ───────────────────────────────

export function buildRecommendations(events: ParsedEvent[]): Recommendation[] {
    const recs: Recommendation[] = []
    const now = new Date()
    const dayOfWeek = now.getDay()  // 0 = Sun, 1 = Mon

    const todayHigh = events.filter(e => e.isToday && e.impact === 'High' && e.country === 'USD')
    const tomorrowHigh = events.filter(e => e.isTomorrow && e.impact === 'High' && e.country === 'USD')
    const weekHigh = events.filter(e => e.impact === 'High' && e.country === 'USD')

    // ── Rule 1: NFP ───────────────────────────────────────────
    // NFP is 1st Friday — day before = Thursday
    const nfpToday = todayHigh.find(e => matches(e.title, NFP_KEYWORDS))
    const nfpTomorrow = tomorrowHigh.find(e => matches(e.title, NFP_KEYWORDS))

    if (nfpTomorrow) {
        recs.push({
            severity: 'avoid',
            headline: '⛔ NFP Tomorrow — Low Risk Day',
            detail: 'Non-Farm Payrolls releases tomorrow. Avoid aggressive positions today. Keep size minimal — market often coils before NFP.',
            triggerEvent: nfpTomorrow.title,
        })
    }

    if (nfpToday) {
        recs.push({
            severity: 'opportunity',
            headline: '📢 NFP Day — Wait for Release',
            detail: `NFP releases at ${nfpToday.dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })} EST. Avoid trading before the number. Wait 15–30 min after for volatility to settle, then look for a confirmed trend entry.`,
            triggerEvent: nfpToday.title,
        })
    }

    // ── Rule 2: FOMC ─────────────────────────────────────────
    const fomcToday = todayHigh.find(e => matches(e.title, FOMC_KEYWORDS))
    const fomcTomorrow = tomorrowHigh.find(e => matches(e.title, FOMC_KEYWORDS))

    if (fomcTomorrow) {
        recs.push({
            severity: 'caution',
            headline: '⚠️ FOMC Tomorrow — Reduce Size',
            detail: 'Fed rate decision tomorrow. Markets tend to consolidate the day before. Trade lighter and avoid carrying positions overnight.',
            triggerEvent: fomcTomorrow.title,
        })
    }

    if (fomcToday) {
        recs.push({
            severity: 'opportunity',
            headline: '🏦 FOMC Day — Trade Post-Release Only',
            detail: `Rate decision at ${fomcToday.dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })} EST. Do NOT trade the NY AM session before the announcement. After release: wait for Powell's presser to end, then trade the confirmed direction.`,
            triggerEvent: fomcToday.title,
        })
    }

    // ── Rule 3: No News Monday ────────────────────────────────
    if (dayOfWeek === 1) {
        const highImpactToday = todayHigh.length
        if (highImpactToday === 0) {
            recs.push({
                severity: 'avoid',
                headline: '⛔ No News Monday — Expect Chop',
                detail: 'No high-impact USD events today. Mondays without catalysts typically see low volume, tight range, and choppy price action. Best to observe and mark key levels. Sit on hands.',
            })
        }
    }

    // ── Rule 4: Trump / Political event ──────────────────────
    const trumpEvent = events.find(e =>
        (e.isToday || e.isTomorrow) && matches(e.title, TRUMP_KEYWORDS)
    )
    if (trumpEvent) {
        recs.push({
            severity: 'avoid',
            headline: '🇺🇸 Political Event — Avoid the Day',
            detail: `"${trumpEvent.title}" detected. Presidential addresses and executive actions cause unpredictable volatility. Avoid trading until market digests. Wait for price to reclaim or reject key levels post-speech.`,
            triggerEvent: trumpEvent.title,
        })
    }

    // ── Rule 5: Fed Speaker ───────────────────────────────────
    const fedSpeak = todayHigh.find(e => matches(e.title, FED_SPEAK))
    if (fedSpeak && !fomcToday) {
        recs.push({
            severity: 'caution',
            headline: '🎙 Fed Speaker — Watch for Rate Hints',
            detail: `${fedSpeak.title} speaking today. If they signal rate changes, expect a sharp intraday move. Avoid entries 15 min before the speech window, then trade the reaction.`,
            triggerEvent: fedSpeak.title,
        })
    }

    // ── Rule 6: CPI ───────────────────────────────────────────
    const cpiToday = todayHigh.find(e => matches(e.title, CPI_KEYWORDS))
    const cpiTomorrow = tomorrowHigh.find(e => matches(e.title, CPI_KEYWORDS))

    if (cpiTomorrow) {
        recs.push({
            severity: 'caution',
            headline: '⚠️ CPI Tomorrow — Reduce NY AM Size',
            detail: 'Consumer Price Index releases tomorrow morning. Markets are sensitive pre-CPI. Consider sitting out NY Pre-Market and AM Macro today.',
            triggerEvent: cpiTomorrow.title,
        })
    }
    if (cpiToday) {
        recs.push({
            severity: 'opportunity',
            headline: '📊 CPI Day — Avoid Pre-Market, Trade Reaction',
            detail: `CPI releases at ${cpiToday.dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })} EST. Stay flat until number drops. Trade the impulse only after a 5-min candle close confirms direction.`,
            triggerEvent: cpiToday.title,
        })
    }

    // ── Rule 7: Multiple high-impact same day ─────────────────
    if (todayHigh.length >= 3 && !nfpToday && !fomcToday) {
        recs.push({
            severity: 'caution',
            headline: `⚠️ Heavy News Day — ${todayHigh.length} High-Impact Events`,
            detail: 'Multiple high-impact events today create unpredictable volatility windows. Reduce position size, widen stops, and be prepared to step aside entirely.',
        })
    }

    // ── Rule 8: Clean day ─────────────────────────────────────
    if (recs.length === 0 && todayHigh.length === 0) {
        recs.push({
            severity: 'info',
            headline: '✅ Clean Session — No High-Impact Events',
            detail: 'No USD high-impact events today. Full focus on technicals and session structure. Optimal conditions for planned execution.',
        })
    }

    return recs
}

// ─── Next upcoming high-impact event ─────────────────────────

export function nextHighImpact(events: ParsedEvent[]): ParsedEvent | null {
    return events
        .filter(e => e.impact === 'High' && e.country === 'USD' && e.minutesFromNow > 0)
        .sort((a, b) => a.minutesFromNow - b.minutesFromNow)[0] ?? null
}
