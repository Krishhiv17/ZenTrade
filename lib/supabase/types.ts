// Supabase auto-generated types — regenerate with:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type AccountType = 'evaluation' | 'funded' | 'personal'
export type AccountStatus = 'active' | 'passed' | 'blown'
export type TradeDirection = 'long' | 'short'
export type TradeResult = 'win' | 'loss' | 'breakeven'
export type TradeSession = 'Asia' | 'London' | 'Pre-Market' | 'New York AM' | 'New York PM'

export interface Profile {
    id: string
    full_name: string | null
    default_account_id: string | null
    commission_per_rt: number
    timezone: string
    created_at: string
}

export interface PropAccount {
    id: string
    user_id: string
    firm_name: string
    account_type: AccountType
    market_type: 'futures' | 'forex'
    account_size: number
    current_balance: number
    profit_target: number | null
    max_drawdown: number | null
    drawdown_type: 'static' | 'eod' | 'intraday'
    daily_loss_limit: number | null
    personal_daily_loss_limit: number | null
    consistency_rule: number | null
    max_daily_trades: number | null
    status: AccountStatus
    start_date: string
    created_at: string
}

export interface Trade {
    id: string
    account_id: string
    user_id: string
    date: string
    ticker: string
    direction: TradeDirection
    result: TradeResult | null
    size: number
    entry: number
    sl: number | null
    tp_avg: number | null
    risk_dollars: number | null
    pnl: number
    r_multiple: number | null
    balance_after: number | null
    macro: string | null
    session: string | null
    exec_timeframe: string | null
    duration_minutes: number | null
    news: string | null
    confidence_level: number | null
    trade_type: 'continuation' | 'reversal' | 'other' | null
    bias: 'bullish' | 'bearish' | 'neutral' | null
    session_status: 'in_session' | 'out_of_session' | null
    market_conditions: string[]
    entry_tags: string[]
    psychology_tags: string[]
    pd_arrays: string[]
    dols: string[]
    entry_confluences: string[]
    screenshot_urls: string[]
    psychology_notes: string | null
    mistakes: string[]
    max_unrealized_pnl: number | null
    is_flagged: boolean
    flag_reason: string | null
    created_at: string
}

export interface DailySummary {
    id: string
    account_id: string
    user_id: string
    date: string
    gross_pnl: number
    net_pnl: number
    trade_count: number
    win_count: number
    loss_count: number
    daily_loss_limit_breached: boolean
}
