// Supabase auto-generated types — regenerate with:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type AccountType = 'evaluation' | 'funded'
export type AccountStatus = 'active' | 'passed' | 'blown'
export type TradeDirection = 'long' | 'short'
export type TradeResult = 'win' | 'loss' | 'breakeven'

export interface Profile {
    id: string
    full_name: string | null
    default_account_id: string | null
    commission_per_rt: number
    created_at: string
}

export interface PropAccount {
    id: string
    user_id: string
    firm_name: string
    account_type: AccountType
    account_size: number
    current_balance: number
    profit_target: number | null
    max_drawdown: number | null
    trailing_drawdown: boolean
    daily_loss_limit: number | null
    personal_daily_loss_limit: number | null
    consistency_rule: string | null
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
    exec_timeframe: string | null
    news: string | null
    screenshot_url: string | null
    psychology_notes: string | null
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
