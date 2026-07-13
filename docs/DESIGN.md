# ZenTrade — Design System: "Quiet Precision" × Jade Zen

> **Direction locked (2026-07-13):** philosophy = *Quiet Precision*; palette mood = **Jade Zen**.
> A calm, focused, premium dark instrument — the opposite of neon trading terminals. Leans
> into the "Zen" brand as a deliberate differentiator.

---

## Philosophy — Quiet Precision (6 pillars)
1. **Data legibility is sacred** — tabular numerals, real contrast, nothing translucent over data.
2. **Depth without blur** — layered opaque surfaces + hairline borders + soft shadows for
   elevation. Glass (`backdrop-filter`) ONLY on floating layers (modals, dropdowns, ⌘K palette).
3. **One accent, muted semantics** — a single jade accent used sparingly; desaturated P&L colors.
4. **Typographic discipline** — tight scale, 8px spacing rhythm, 1–2 weights, generous whitespace.
5. **Purposeful motion** — 150–250ms eased transitions on state change only; honor
   `prefers-reduced-motion`.
6. **A real component system** — Card / Stat / Badge / Button / Meter / Modal primitives replace
   ad-hoc inline styles (fixes today's `--bg-card` drift).

## Anti-"slop" checklist (things we explicitly reject)
- ❌ purple→blue gradient headings ❌ glassmorphism everywhere ❌ neon glows
- ❌ default untouched shadcn palette ❌ emoji as icons ❌ inconsistent border-radii
- ❌ system font w/ no character ❌ over-animation
- ✅ owned palette · consistent line icons (one stroke) · one radius scale (8/12/16) ·
  chosen typeface + tabular figures · restraint

## Jade Zen tokens
```
/* Base / surfaces (deep green-ink, layered) */
--bg-base      #0B0F0E
--bg-surface   #121917
--bg-elevated  #1A2321
--bg-overlay   #232D2A
--border       rgba(255,255,255,.06)
--border-strong rgba(255,255,255,.10)

/* Accent (muted jade — used sparingly) */
--accent       #45B3A0
--accent-hover #3CA290
--accent-glow  rgba(69,179,160,.14)

/* Text (off-white, never pure white) */
--text-primary   #E6EAE8
--text-secondary #97A29E
--text-muted     #5C6663

/* Semantic P&L (desaturated — calm even in drawdown) */
--green  #6FBF9A
--red    #E0806B
--yellow #D9B872
```
> Migration note: `--bg-card` is referenced by 7 components but undefined today — map it to
> `--bg-surface` (or `--bg-elevated`) as part of D0 and stop the transparent-fallback bug.

## Typography
- Characterful-but-readable sans (candidates: General Sans / Satoshi / Geist). One display-ish
  weight for headings, one for body.
- **Tabular numerals** (`font-variant-numeric: tabular-nums`) on every money/stat/figure.
- Tight scale; letter-spacing slightly negative on large headings.

## Atmosphere (the "immersive/soothing" layer — subtle, never neon)
- A barely-there **ambient radial glow** (jade, very low alpha) behind hero / dashboard.
- A **~1–2% film-grain/noise** overlay for a tactile, premium surface.
- Soft focus rings in accent; hover states that feel tactile, not flashy.

## Charts (dataviz)
- Re-theme all Recharts surfaces via a shared theme config (batch, not per-file).
- Calm categorical palette derived from the accent + neutrals; muted P&L green/red; tabular
  axis/tooltip numerals. Use the `dataviz` skill.

## Phasing
- **D0 — Foundation (do first).** Consolidate tokens to Jade Zen + fix `--bg-card`; type &
  spacing scales; build core primitives + a glass modal/dropdown overlay style; atmosphere
  utilities (glow, grain). No mass page rewrite yet. New surfaces built on this from birth.
- **D1 — High-traffic pages.** Dashboard, Journal (`/trades`), Coach, Playbook (`/playbook`).
  Re-theme charts. Biggest perceived-quality lift.
- **D2 — Remaining surfaces.** Analytics, Accounts, Settings, News, auth pages, landing.
  Opportunistic ("touch it → upgrade it").
- **D3 — Delight.** ⌘K command palette, refined empty/loading/skeleton states, micro-interactions.

## Acceptance
- Single source of truth for tokens; zero references to undefined CSS vars.
- All figures tabular; contrast passes WCAG AA on data surfaces.
- Glass only on floating layers; no `backdrop-filter` under charts/tables.
- New surfaces ship already in the system (no retrofit).
