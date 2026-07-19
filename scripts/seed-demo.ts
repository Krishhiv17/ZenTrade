// ============================================================
// Demo user seeder — populates a showcase account with realistic
// data (account + playbook + ~3 weeks of trades) so the whole app
// looks alive for marketing demos.
//
// Run:  npm run seed:demo               (uses demo@zentrade.app)
//   or: npm run seed:demo -- you@x.com  (any email)
//
// It will CREATE the auth user if it doesn't exist (and print the
// login), then wipe + reseed that user's trading data. Idempotent.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
// ============================================================

import { createAdminClient } from '../lib/supabase/admin'
import { computeDisciplineScore, type DisciplineTrade, type DisciplineRules } from '../lib/domain/discipline'

const EMAIL = process.argv[2] || 'demo@zentrade.app'
const PASSWORD = 'ZenDemo2026!'

const ACCOUNT_SIZE = 50000
const MAX_DD = 2500
const DAILY_LOSS = 1000
const MAX_TRADES = 4

const KILLZONES = ['New York AM', 'London Open']
const INSTRUMENTS = ['NQ', 'MNQ', 'ES']

const RULES: DisciplineRules = {
    maxDailyTrades: MAX_TRADES,
    dailyLossLimit: DAILY_LOSS,
    killzones: KILLZONES,
    instruments: INSTRUMENTS,
    stopAfterLosses: 2,
    playbookMaxTrades: MAX_TRADES,
    hasPlaybook: true,
}

const GOOD_NOTES = [
    'Waited for the London sweep, clean OTE entry off the FVG.',
    'HTF bias aligned, took the A+ setup and trailed to target.',
    'Patient — one clean New York AM trade, banked it and stopped.',
    'Textbook order block retest, respected my stop, held the runner.',
    'Sweep of the session low, displacement up, entered the discount FVG.',
]
const BAD_NOTES = [
    'Revenge traded after the loss, total FOMO. Broke my rules.',
    'Chased price outside my killzone, no setup, pure tilt.',
    'Forced a trade out of session — should have walked away.',
]
const EMO_FLAG = 'Emotional loss detected (revenge/FOMO/tilt). Step away to protect your capital.'

function lastWeekdays(n: number): string[] {
    const out: string[] = []
    const d = new Date()
    while (out.length < n) {
        const day = d.getDay()
        if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10))
        d.setDate(d.getDate() - 1)
    }
    return out.reverse() // oldest → newest
}

interface GenTrade {
    session_date: string
    executed_at: string
    ticker: string
    direction: 'long' | 'short'
    result: 'win' | 'loss' | 'breakeven'
    pnl: number
    session: string
    notes: string
    tags: string[]
    flagged: boolean
}

function buildTrades(sessions: string[]): GenTrade[] {
    const trades: GenTrade[] = []
    // A few deliberately "bad" days so scores vary and the streak has a start.
    const badDays = new Set([2, 3, 9])
    sessions.forEach((date, i) => {
        const bad = badDays.has(i)
        const count = bad ? 3 : 1 + (i % 3 === 0 ? 1 : 0) // 1–2 good, 3 bad
        for (let k = 0; k < count; k++) {
            const ticker = INSTRUMENTS[(i + k) % INSTRUMENTS.length]
            const hour = 9 + k // NY AM-ish
            const badTrade = bad && k > 0
            const win = badTrade ? false : (i + k) % 3 !== 0
            const pnl = badTrade
                ? -(150 + ((i * 37 + k * 53) % 300))          // −150..−450
                : win ? 180 + ((i * 41 + k * 29) % 620)        // +180..+800
                    : -(120 + ((i * 23 + k * 17) % 260))       // −120..−380
            trades.push({
                session_date: date,
                executed_at: `${date}T${String(hour).padStart(2, '0')}:${badTrade ? '55' : '20'}:00`,
                ticker,
                direction: (i + k) % 2 === 0 ? 'long' : 'short',
                result: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven',
                pnl: Math.round(pnl),
                session: badTrade ? 'New York PM' : (k === 0 ? 'New York AM' : 'London'),
                notes: badTrade ? BAD_NOTES[(i + k) % BAD_NOTES.length] : GOOD_NOTES[(i + k) % GOOD_NOTES.length],
                tags: badTrade ? [] : ['FVG', 'Order Block'].slice(0, 1 + (k % 2)),
                flagged: badTrade,
            })
        }
    })
    return trades
}

async function main() {
    const supabase = createAdminClient()

    // 1. Resolve or create the demo auth user.
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    let user = list?.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())
    if (!user) {
        const { data: created, error } = await supabase.auth.admin.createUser({
            email: EMAIL, password: PASSWORD, email_confirm: true,
            user_metadata: { full_name: 'Demo Trader' },
        })
        if (error || !created?.user) throw new Error(`Failed to create demo user: ${error?.message}`)
        user = created.user
        console.log(`\ncreated demo login →  ${EMAIL}  /  ${PASSWORD}`)
    } else {
        console.log(`\nusing existing user  ${EMAIL}`)
    }
    const userId = user.id

    // Ensure a profile row exists (in case the signup trigger didn't run).
    await supabase.from('profiles').upsert({ id: userId, full_name: 'Demo Trader' }, { onConflict: 'id' })

    // 2. Wipe existing demo data (idempotent reseed).
    await supabase.from('trades').delete().eq('user_id', userId)
    await supabase.from('daily_summaries').delete().eq('user_id', userId)
    await supabase.from('playbooks').delete().eq('user_id', userId)
    await supabase.from('prop_accounts').delete().eq('user_id', userId)

    // 3. Account.
    const { data: acc, error: accErr } = await supabase.from('prop_accounts').insert({
        user_id: userId, firm_name: 'Apex 50K Eval', account_type: 'evaluation', market_type: 'futures',
        account_size: ACCOUNT_SIZE, current_balance: ACCOUNT_SIZE, profit_target: 3000,
        max_drawdown: MAX_DD, drawdown_type: 'eod', daily_loss_limit: DAILY_LOSS,
        personal_daily_loss_limit: 800, max_daily_trades: MAX_TRADES, status: 'active',
        daily_reset_time: '17:00', daily_reset_tz: 'America/New_York',
    }).select('id').single()
    if (accErr || !acc) throw new Error(`account insert failed: ${accErr?.message}`)
    const accountId = acc.id

    // 4. Playbook.
    await supabase.from('playbooks').insert({
        user_id: userId,
        setups: [{ name: 'NY AM Silver Bullet', entry_rules: 'Sweep → displacement → FVG in OTE', required_confluences: 'liquidity sweep + FVG + HTF draw', invalidation: 'close back through the FVG', target_logic: 'opposing liquidity' }],
        killzones: KILLZONES, instruments: INSTRUMENTS,
        risk_rules: { max_risk_per_trade: '0.5%', max_daily_loss: '$800', max_trades_per_day: '4', stop_after_losses: '2' },
        personal_rules: ['No revenge trades', 'No trading outside my killzones', 'Stop after 2 losses'],
        goals: { profit_target: 'Pass the 50K eval', timeline: '25 trading days', good_day: 'Followed my model, no rule breaks — regardless of P&L' },
    })

    // 5. Trades.
    const sessions = lastWeekdays(15)
    const gen = buildTrades(sessions)
    let running = ACCOUNT_SIZE
    const rows = gen.map(g => {
        running += g.pnl
        const risk = 200
        return {
            account_id: accountId, user_id: userId, date: g.session_date, session_date: g.session_date,
            executed_at: g.executed_at, ticker: g.ticker, direction: g.direction, result: g.result,
            size: 1, entry: g.ticker === 'ES' ? 5000 : 20000, sl: g.ticker === 'ES' ? 4994 : 19980,
            tp_avg: g.ticker === 'ES' ? 5012 : 20040, risk_dollars: risk, pnl: g.pnl,
            r_multiple: Math.round((g.pnl / risk) * 100) / 100, balance_after: running,
            session: g.session, session_status: g.flagged ? 'out_of_session' : 'in_session',
            psychology_notes: g.notes, entry_tags: g.tags, pd_arrays: [], entry_confluences: [],
            is_flagged: g.flagged, flag_reason: g.flagged ? EMO_FLAG : null,
        }
    })
    const { error: tErr } = await supabase.from('trades').insert(rows)
    if (tErr) throw new Error(`trades insert failed: ${tErr.message}`)

    // 6. Update account balance to reflect the trades.
    await supabase.from('prop_accounts').update({ current_balance: running }).eq('id', accountId)

    // 7. Finalize (lock) all past sessions with a persisted discipline score.
    //    Leave the most recent session UNLOCKED so the demo can show Review → Lock.
    const today = sessions[sessions.length - 1]
    const byDate = new Map<string, GenTrade[]>()
    for (const g of gen) { const a = byDate.get(g.session_date) ?? []; a.push(g); byDate.set(g.session_date, a) }
    for (const [date, ts] of byDate) {
        if (date === today) continue
        const discTrades: DisciplineTrade[] = ts.map(g => ({
            pnl: g.pnl, result: g.result, session: g.session,
            session_status: g.flagged ? 'out_of_session' : 'in_session',
            is_flagged: g.flagged, flag_reason: g.flagged ? EMO_FLAG : null,
            psychology_notes: g.notes, ticker: g.ticker, entry_tags: g.tags, pd_arrays: [],
            entry_confluences: [], created_at: g.executed_at,
        }))
        const disc = computeDisciplineScore(discTrades, RULES)
        const net = ts.reduce((s, g) => s + g.pnl, 0)
        await supabase.from('daily_summaries').upsert({
            user_id: userId, account_id: accountId, date,
            gross_pnl: net, net_pnl: net, trade_count: ts.length,
            win_count: ts.filter(g => g.result === 'win').length,
            loss_count: ts.filter(g => g.result === 'loss').length,
            breakeven_count: ts.filter(g => g.result === 'breakeven').length,
            daily_loss_limit_breached: net < -DAILY_LOSS,
            discipline_score: disc.score, score_factors: disc.factors, is_locked: true,
        }, { onConflict: 'account_id, date' })
    }

    console.log(`\n🌱 Demo seeded for ${EMAIL}`)
    console.log(`   account: Apex 50K Eval · ${gen.length} trades over ${sessions.length} sessions`)
    console.log(`   balance: $${running.toLocaleString()} · today (${today}) left unlocked for the Review demo`)
    console.log(`\n   Login:  ${EMAIL}  /  ${PASSWORD}\n`)
}

main().catch(err => { console.error('\nseed-demo failed:', err); process.exit(1) })
