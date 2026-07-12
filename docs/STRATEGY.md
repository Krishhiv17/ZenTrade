# ZenTrade — Revival Strategy & Restructure Roadmap

> **Decisions locked (2026-07-11):**
> Heavy refactor · One paid tier + generous free · Stripe billing · Strategy-first.
>
> This document is the map. We align here before writing feature code.

---

## 1. Positioning & Vision

**What ZenTrade is:** the psychology-aware trading journal + prop-firm rule engine for
futures and forex traders. Deterministic risk enforcement is the moat; AI is the upsell.

**The pivot:** the product is currently *architected and marketed as "100% free — no
subscriptions, no paywalls."* That copy directly blocks monetization and must go. The new
positioning:

> **Free forever for journaling. Pro unlocks the AI that thinks with you.**

This keeps the Discord/community growth engine (generous free tier = big top of funnel)
while charging for the one thing with a real marginal cost and a premium feel: the LLM.

### The free/paid line (single paid tier)

The split is drawn on **marginal cost + "wow" perception**, not on withholding core value.
Everything deterministic stays free — it costs us nothing per user and builds the habit that
makes the tool sticky.

| Capability | Free | **Pro** |
|---|:---:|:---:|
| Unlimited manual trade logging | ✅ | ✅ |
| Multiple prop accounts | ✅ | ✅ |
| Full rule engine (drawdown types, DLL, max trades, lockout) | ✅ | ✅ |
| **AI Guard** (heuristic alerts — no LLM cost) | ✅ | ✅ |
| Analytics dashboard, calendar, equity curves | ✅ | ✅ |
| Economic news feed, world clock, CSV export | ✅ | ✅ |
| Screenshot storage | 3 / trade | unlimited |
| **AI Psychology Coach** (Llama 3.3, mini-RAG) | — | ✅ |
| **AI weekly recap** (emailed performance + psychology digest) | — | ✅ |
| **AI-generated trade insights** (auto-tagged leaks, pattern callouts) | — | ✅ |
| Priority support / early features | — | ✅ |

**Recommended price:** **$14/mo or $110/yr** (~35% annual discount). One SKU, monthly +
annual. Rationale: prop traders pay $150–300 per evaluation; $14 to protect that is trivial,
and a single tier removes decision friction. Revisit after 100 paying users.

> Note: this supersedes the 3-tier `tier_plans.png`. We collapse Plus/Pro into one Pro tier
> and make AI Guard + analytics free (they're cheap and drive retention).

---

## 2. Architecture Refactor (the "heavy" part)

The current code works but mixes concerns: server actions parse forms, run business math,
call Supabase, run the guard, and revalidate — all in one function ([actions/trades.ts](../actions/trades.ts)
is 566 lines). We restructure into clean layers so the SaaS logic (entitlements, billing,
integrity) has somewhere to live and so the risk math becomes testable.

### Target layering

```
app/            → routes & UI (thin; forms + server-component data fetch)
actions/        → thin controllers: authn, parse input, call a service, revalidate
lib/
  domain/       → PURE functions, zero I/O, 100% unit-tested
                  pnl.ts, risk.ts, drawdown.ts, guard.ts, entitlements.ts
  services/     → orchestration over Supabase (trades, accounts, eod, billing)
  supabase/     → clients, generated types
  billing/      → Stripe SDK wrappers, webhook handlers
supabase/
  migrations/   → schema + Postgres functions (source of truth)
  functions/    → transactional RPCs (see §2.2)
```

### 2.1 Fix the trust boundary

Today PnL is computed on the client, passed in `FormData`, and largely trusted server-side
([actions/trades.ts:142](../actions/trades.ts#L142) — `pnl` is read from the form). A user
can POST an arbitrary PnL and move their balance.

**Fix:** the server recomputes PnL, risk, and R-multiple from raw inputs (entry/sl/tp/size/
ticker/result) using `lib/domain/pnl.ts` + `lib/domain/risk.ts`. Client values become UI
previews only, never persisted authority. Manual-mode PnL (screenshot-only logging) is the
one explicit exception and is clearly flagged as user-asserted.

### 2.2 Fix transactional integrity

Right now: insert trade → *then* call `update_account_balance` RPC → *then* upsert summary,
each independently. If the balance RPC fails it's logged and swallowed
([actions/trades.ts:315](../actions/trades.ts#L315)), leaving the account balance wrong. The
same non-atomic pattern exists in edit and delete.

**Fix:** a single Postgres function `record_trade(...)` that inserts the trade, updates the
balance, and upserts the daily summary **in one transaction**. Same for `revise_trade` and
`remove_trade`. The DB becomes the integrity boundary; the app can't leave it half-written.

### 2.3 Fix EOD (currently a "temporary fix")

`finalizeEndOfDay` ([actions/eod.ts](../actions/eod.ts)) has honest TODO comments admitting
the drawdown check is a placeholder (`current_balance <= max_drawdown` compares a balance to
a limit magnitude). Peak-balance logic lives separately in `getAccounts`
([actions/accounts.ts:37](../actions/accounts.ts#L37)) and isn't reconciled with EOD.

**Fix:** consolidate all drawdown math into `lib/domain/drawdown.ts` — one function that,
given account config + ordered trades, returns `{ currentDrawdown, peakBalance,
breached, remainingBuffer }` for static/EOD/intraday/trailing. Both the dashboard and EOD
finalization call the same function. Unit-test each drawdown type against known prop-firm
scenarios (Apex trailing, Topstep EOD, etc.).

### 2.4 Testing

Introduce **Vitest**. Non-negotiable coverage for `lib/domain/*` — this is money math.
Golden-case tests per instrument (tick values) and per drawdown type. Add a thin integration
test for the `record_trade` RPC against a local Supabase. CI on push (GitHub Actions).

### 2.5 Design system

Extract the inline-styled landing/dashboard into a real component system. Tokens already
exist in [globals.css](../app/globals.css) — build `Card`, `Stat`, `Button`, `Badge`,
`Meter` primitives on top of them and delete the ad-hoc `style={{…}}` blocks
([app/page.tsx](../app/page.tsx) is entirely inline styles). Use the **dataviz** skill when
reworking charts so light/dark and color semantics are consistent.

---

## 3. Data Model Additions

```sql
-- profiles: entitlement + billing linkage
ALTER TABLE profiles ADD COLUMN plan text NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free','pro'));
ALTER TABLE profiles ADD COLUMN stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN plan_status text;          -- active/past_due/canceled
ALTER TABLE profiles ADD COLUMN plan_renews_at timestamptz;

-- subscriptions: mirror of Stripe state (webhook-driven source of truth)
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status text,                    -- trialing/active/past_due/canceled/unpaid
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscriptions" ON subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- writes happen ONLY via service-role in the webhook handler.

-- ai_usage: cost visibility + fair-use caps on the LLM
CREATE TABLE ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature text NOT NULL,          -- 'coach' | 'recap' | 'insights'
  tokens_in int, tokens_out int,
  created_at timestamptz DEFAULT now()
);
```

**Entitlement check** (`lib/domain/entitlements.ts`, pure): `canUseCoach(profile)`,
`screenshotLimit(profile)`, etc. Enforced in **both** the server action (hard gate) and the
UI (soft gate — show upgrade prompt, never a raw error). Never trust the client.

---

## 4. Billing (Stripe)

- **Products:** one Product "ZenTrade Pro", two Prices (monthly, annual).
- **Checkout:** Stripe Checkout Session (hosted) — fastest, PCI-offloaded. Customer Portal
  for cancel/update card.
- **Webhooks:** `/api/stripe/webhook` (service-role Supabase, signature-verified) handles
  `checkout.session.completed`, `customer.subscription.updated|deleted`,
  `invoice.payment_failed`. Webhook is the **only** writer of `plan`/`subscriptions`.
- **Tax:** enable Stripe Tax for automatic VAT/sales-tax (you're the merchant of record on
  Stripe, so this is your compliance surface — worth the add-on).
- **Failure UX:** `past_due` → in-app banner + retain access through a grace window, then
  soft-downgrade to free (data preserved, AI locked).

---

## 5. Growth & Retention

A journal dies without a daily-return loop. Build these in order of leverage:

1. **Onboarding funnel** — first-run wizard: create account → log first trade → see first
   insight. The activation moment is "the app told me something about my trading I didn't
   know." Instrument it.
2. **Transactional + lifecycle email** (Resend) — welcome, weekly recap (Pro hook via a
   teaser for free users), win-back on inactivity, dunning for failed payments.
3. **Streaks & discipline score** — you already compute per-day scores; surface a visible
   journaling streak. Cheap, powerful retention.
4. **Community loop** — Discord is already live; add shareable (image) weekly-recap cards
   that drive referral. "Powered by ZenTrade" watermark = free acquisition.
5. **SEO surface** — public marketing pages for "prop firm rules explained", drawdown
   calculators (free tools) → organic funnel into signup.

---

## 6. Legal / Trust (blocking for paid launch)

- **"Not financial advice"** disclaimer on every AI surface and in ToS.
- **Terms of Service** + **Privacy Policy** (data retention, deletion on request — GDPR/CCPA).
- **Refund policy** (Stripe requires a stated policy; recommend 7-day no-questions).
- **Data export & delete** self-serve (you have CSV export; add full account delete).
- Secrets audit: confirm `.env.local` is git-ignored and no service-role key is client-side.

---

## 7. Cost Model (why the free/paid line holds)

| Service | Free-tier ceiling | Break point | Plan |
|---|---|---|---|
| Vercel Hobby | non-commercial | **now** (this is commercial) | → Pro $20/mo at launch |
| Supabase Free | 500MB DB / 1GB storage | ~ hundreds of active users | → Pro $25/mo before it bites |
| Groq | shared free tier, rate-limited | first real AI load | → paid Groq, **gated to Pro only** |
| Resend | 3k emails/mo free | thousands of users | fine for a while |

The AI cost is the only usage-scaling cost, and it's fenced behind Pro + `ai_usage` caps.
That's the whole reason the free tier can stay generous: **free users cost ~$0 in marginal
compute.**

---

## 8. Phased Roadmap

### Phase 0 — Foundation refactor (no user-visible change)
- [ ] Add Vitest + CI; extract `lib/domain/{pnl,risk,drawdown,guard}.ts` with tests.
- [ ] Server-side recompute of PnL/risk/R (close the trust hole).
- [ ] `record_trade` / `revise_trade` / `remove_trade` transactional RPCs.
- [ ] Reconcile EOD + peak-balance into one `drawdown.ts`; retire the temporary fix.
- [ ] Generate Supabase types from schema; kill `as any` in the coach route.

### Phase 1 — SaaS spine
- [ ] Migrations: `plan` columns, `subscriptions`, `ai_usage`.
- [ ] `lib/domain/entitlements.ts` + gate the AI Coach (server + UI).
- [ ] Stripe: products/prices, Checkout, Customer Portal, webhook handler.
- [ ] Billing/settings page: plan status, upgrade, manage subscription.

### Phase 2 — Positioning & polish
- [ ] Rewrite landing + new **/pricing** page (kill "100% free / no paywalls" copy).
- [ ] Design-system primitives; de-inline `page.tsx` and dashboard.
- [ ] ToS / Privacy / refund / disclaimer pages + AI disclaimers.
- [ ] Onboarding wizard + activation instrumentation (analytics events).

### Phase 3 — Retention & AI upsell surface
- [ ] Resend lifecycle emails; weekly AI recap (Pro) with free-tier teaser.
- [ ] Journaling streak + discipline score surfaced on dashboard.
- [ ] AI-generated trade insights (auto leak detection) as the second Pro hook.
- [ ] Shareable recap cards (referral loop).

### Phase 4 — Scale hardening
- [ ] Move off Hobby tiers; add error monitoring (Sentry) + rate limiting.
- [ ] `ai_usage` fair-use caps + cost dashboard.
- [ ] SEO tool pages (drawdown calculator, rule explainers).

---

## 9. Sequencing / First Sprint

Do **Phase 0 → Phase 1** before any marketing work. Revenue is blocked on the SaaS spine,
and the spine is safe to build only on top of the integrity fixes (you don't want to charge
people while balances can silently corrupt). Recommended first sprint:

1. Vitest + `lib/domain` extraction with tests (unblocks everything, catches money bugs).
2. `record_trade` transactional RPC (integrity before billing).
3. `plan`/`subscriptions` schema + entitlements + gate the Coach.
4. Stripe Checkout + webhook end-to-end in test mode.

That sprint turns ZenTrade from a free tool into a chargeable product with correct money
math. Everything after is growth optimization.

---

## 10. Open Questions (revisit later, don't block on)
- Final Pro price ($14 vs $12 vs $19) — validate against first cohort.
- Annual-only launch to reduce churn accounting? (recommend offering both.)
- Team/prop-firm B2B tier as a future SKU (firms buying seats for funded traders).
- Do we keep the 3-screenshot free limit, or make storage fully free and gate elsewhere?
