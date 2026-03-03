-- ============================================================
-- Migration 002: Atomic balance update + daily summary upsert
-- Run in Supabase Dashboard → SQL Editor AFTER 001
-- ============================================================

-- ─── FUNCTION: Atomically update account balance ────────────
-- Uses SELECT FOR UPDATE to lock the row, preventing race conditions
-- when multiple trades are saved concurrently.
CREATE OR REPLACE FUNCTION update_account_balance(
  p_account_id uuid,
  p_pnl        numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Row-level lock on the account row for this transaction
  PERFORM id FROM prop_accounts
  WHERE id = p_account_id
  FOR UPDATE;

  UPDATE prop_accounts
  SET current_balance = current_balance + p_pnl
  WHERE id = p_account_id;
END;
$$;

-- ─── FUNCTION: Upsert daily summary row ─────────────────────
CREATE OR REPLACE FUNCTION upsert_daily_summary(
  p_account_id uuid,
  p_user_id    uuid,
  p_date       date,
  p_pnl        numeric,       -- positive = win, negative = loss
  p_is_win     boolean,
  p_is_loss    boolean,
  p_is_breakeven boolean,
  p_daily_loss_limit  numeric,  -- pass NULL if no limit set
  p_max_drawdown_breached boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_net_pnl numeric;
BEGIN
  INSERT INTO daily_summaries (account_id, user_id, date, gross_pnl, net_pnl, trade_count, win_count, loss_count, breakeven_count, daily_loss_limit_breached, max_drawdown_breached)
  VALUES (
    p_account_id, p_user_id, p_date,
    p_pnl, p_pnl, 1,
    CASE WHEN p_is_win  THEN 1 ELSE 0 END,
    CASE WHEN p_is_loss THEN 1 ELSE 0 END,
    CASE WHEN p_is_breakeven THEN 1 ELSE 0 END,
    CASE WHEN p_daily_loss_limit IS NOT NULL AND p_pnl < 0 AND ABS(p_pnl) >= p_daily_loss_limit THEN true ELSE false END,
    p_max_drawdown_breached
  )
  ON CONFLICT (account_id, date)
  DO UPDATE SET
    gross_pnl       = daily_summaries.gross_pnl       + p_pnl,
    net_pnl         = daily_summaries.net_pnl         + p_pnl,
    trade_count     = daily_summaries.trade_count     + 1,
    win_count       = daily_summaries.win_count       + CASE WHEN p_is_win  THEN 1 ELSE 0 END,
    loss_count      = daily_summaries.loss_count      + CASE WHEN p_is_loss THEN 1 ELSE 0 END,
    breakeven_count = daily_summaries.breakeven_count + CASE WHEN p_is_breakeven THEN 1 ELSE 0 END,
    daily_loss_limit_breached = CASE
      WHEN p_daily_loss_limit IS NOT NULL AND (daily_summaries.net_pnl + p_pnl) < -p_daily_loss_limit THEN true
      ELSE daily_summaries.daily_loss_limit_breached
    END,
    max_drawdown_breached = p_max_drawdown_breached;

  -- Return the updated net_pnl for guard checks
  SELECT net_pnl INTO new_net_pnl
  FROM daily_summaries
  WHERE account_id = p_account_id AND date = p_date;
END;
$$;

-- ─── FUNCTION: Get today's net P&L for an account ──────────
CREATE OR REPLACE FUNCTION get_today_pnl(p_account_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result numeric := 0;
BEGIN
  SELECT COALESCE(SUM(pnl), 0)
  INTO result
  FROM trades
  WHERE account_id = p_account_id
    AND date = CURRENT_DATE;
  RETURN result;
END;
$$;
