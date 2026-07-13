# ZenTrade — Experience Blueprint (the reinvention)

> **Locked (2026-07-13):** North star = **a daily discipline ritual; process over P&L.**
> Hero metric = **Discipline Score**, not balance. We reinvent the *experience* (flows,
> surfaces, interactions); we KEEP the engine (rule/drawdown math, RLS, RAG coach, playbook,
> data model). Design language = Quiet Precision × Jade Zen ([DESIGN.md](./DESIGN.md)).
> First build = **the Daily Flow spine.**

---

## 1. The reframe
From **"a journal you fill out"** → **"a ritual that makes you a disciplined trader."**
The app stops being pages you visit and becomes a loop it walks you through:

> **PLAN → EXECUTE → REVIEW → IMPROVE**, every trading day.

Grounded in the coach's own philosophy (Douglas/Tendler): judge the *process*, not the
outcome. Every rival app worships P&L — the exact thing that wrecks traders. ZenTrade makes
**"did I follow my model?"** the thing you chase.

## 2. New information architecture
- **Today** *(new — default landing)* — the daily flow. Adapts to time-of-day + where you are
  in the ritual. This is the app's new center of gravity.
- **Journal** — trade history + the unified trade object + review/replay.
- **Coach** — still here, but also woven *into* Today and trades (ambient).
- **My Model** (playbook) — unchanged role; now drives logging + scoring.
- **Analytics / Accounts / News / Settings** — deeper/secondary surfaces, reachable but not the
  daily driver. Analytics becomes "go deep," Today becomes "the ritual."
- **⌘K command bar** — log / navigate / ask coach from anywhere (a later pillar).

## 3. THE DAILY FLOW (first build — detailed)

A single orchestrating experience with three time-aware phases.

### Phase 1 — PLAN (pre-market)
Sets intention before the session.
- **Today at a glance:** date, your killzones (from playbook) with a live countdown to the next
  one, active account status (balance, drawdown buffer, daily-loss remaining — from the engine).
- **News:** today's high-impact events (existing news feed), surfaced not buried.
- **Coach nudge:** one proactive line from recent leaks/feedback — e.g. "Yesterday: 2 out-of-
  killzone entries. Today, only NY AM." (reuse coach + recent trades/flags).
- **Set intention:** a quick "bias / what I'm watching / my one rule for today" note → saved to
  the day. Then **Start Session.**

### Phase 2 — EXECUTE (during session)
Fast, low-friction, rule-aware.
- **Quick-log:** streamlined logging (v1: trimmed form seeded from a chosen playbook setup;
  later: screenshot→trade). Playbook setup → required confluences become a check-off list.
- **Live rule state:** trades today vs max, daily-loss remaining, "1 loss from your stop rule",
  killzone in/out — all from the existing rule engine + AI Guard.
- **Inline Guard nudges** on save (already exists) surfaced calmly.

### Phase 3 — REVIEW (end of day)
Guided reflection that replaces manual EOD.
- **Walk the day:** step through each trade → "on-playbook? ✓/✗" checklist → one reflection
  prompt each.
- **Discipline Score computed** (below) + streak update.
- **Coach recap:** AI summary of process wins/leaks + one focus for tomorrow (reuse coach API,
  new "recap" prompt).
- **Lock the day** (replaces `finalizeEndOfDay`; reuses `daily_summaries` + `is_locked`).

## 4. Discipline Score (the hero metric)
A 0–100 daily score from **process signals we already capture**, plus a running streak of
"disciplined days." Component sketch (tune later):
- **Playbook adherence** — trades matched a defined setup / met required confluences.
- **Rule adherence** — stayed in killzones, within risk limits, under max trades, honored
  stop-after-N-losses and personal rules (all derivable from playbook + engine + AI Guard flags).
- **Journaling completeness** — logged + reflected on the day.
- **Emotional control** — no revenge/tilt/out-of-session flags.
Stored per day (extend `daily_summaries` with a `discipline_score` + factors, or a new table).
Streaks drive retention; the number you open the app to see.

## 5. The other pillars (roadmap after the spine)
2. **Frictionless logging** — screenshot→trade (AI vision) + playbook-checklist logging.
3. **Ambient coach** — proactive dashboard insights, per-trade auto-take, weekly AI recap.
4. **Command-native ⌘K** — log/navigate/ask from anywhere.
5. **Unified trade object + review/replay** — one connected trade view; flip through trades.
6. **Onboarding** — guided setup (account → playbook via coach → first trade → first "aha").
7. **Wrapped (daily / weekly / monthly)** — a delightful, animated "Spotify Wrapped"-style recap
   of process (discipline score, streak, on-playbook %, killzone adherence, best setup, biggest
   leak + one AI line). **Daily Wrapped = the REVIEW phase of the Daily Flow.** Weekly/Monthly are
   the shareable growth loop — "Powered by ZenTrade" cards = free Discord/social distribution.
   Cheap (existing data + one summary call), on-brand, high marketing value. Build early.
8. **Live Voice Companion ("JARVIS") — FLAGSHIP / PRO, later.** Talk your reasoning out loud; a
   calm voice reflects your playbook back ("is there a sweep? are you in your killzone?"). The
   most ownable feature, best fit for the psychology spine. Caveats: always-on = the most
   expensive feature (continuous STT+LLM+TTS → premium Pro, NOT $0); realtime turn-taking is the
   hard part; web can only listen with the tab open (true background wants a desktop app);
   privacy-sensitive. **De-risk with a scoped v1: push-to-talk voice check-in** (Groq Whisper STT
   → coach → TTS) — ~80% of the value, none of the realtime-turn-taking cost. Fits Execute
   (in-trade check-in) + Review (talk through the day). Prove push-to-talk before always-on.

## 6. Keep vs rebuild
- **KEEP (engine):** data model, RLS, rule/drawdown math, `daily_summaries`, AI Guard, RAG
  coach, playbook, accounts, news feed, tick/PnL math.
- **REBUILD (experience):** navigation & IA, the home surface (→ Today), logging UX, EOD (→
  guided Review), dashboard framing (→ process-first), all visuals (→ Jade Zen), onboarding.

## 7. The cost / Pro-tier note
The magic pillars (screenshot→trade vision, per-trade auto-analysis, weekly recaps, ambient
coach) burn more AI and collide with "$0 forever." This is exactly the **one-Pro-tier** upsell
from `docs/STRATEGY.md`: cheap/deterministic stuff stays free; the expensive AI magic is the
paid hook. Decide consciously as we build pillars 2–3; the Daily Flow spine (this first slice)
runs on existing data and stays ~$0.

## 8. Build sequencing (slices on `dev`)
- **Slice 1 — Daily Flow spine (v1):** the Today surface (Plan/Execute/Review) + Discipline
  Score v1, built on existing data (playbook, accounts, trades, rules, news, coach). Establish
  just-enough Jade Zen primitives as we go (fold in D0 opportunistically). *← we are here.*
- **Slice 2 — Frictionless logging** (screenshot→trade + checklist).
- **Slice 3 — Ambient coach** (proactive insights + weekly recap).
- **Slice 4 — ⌘K + unified trade object + review mode.**
- **Slice 5 — Onboarding + full Jade Zen pass across remaining surfaces.**

## 9. Acceptance for Slice 1
- A new **Today** page is the default landing, adapting Plan/Execute/Review by context.
- Discipline Score computes from real signals and shows a streak.
- The guided Review replaces manual EOD and ends with a coach recap + day lock.
- Built in Jade Zen; no regression to existing journal/coach/playbook.
