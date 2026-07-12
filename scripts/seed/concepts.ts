// ============================================================
// Seed corpus: ICT/SMC concept notes.
//
// IP-safe: every note below is an ORIGINAL paraphrase written to
// explain a publicly-known trading concept. No verbatim transcript
// or copyrighted text is stored. `source` is an internal provenance
// label only.
//
// `category` mirrors the app's tag taxonomy so retrieval aligns with
// how users tag trades:
//   entry_model | pd_array | dol | entry_confluence |
//   market_condition | session | psychology
//
// Phase 1 seed set (~14 highest-use concepts). Grows to 40–80 via
// the Phase 3 ingestion pipeline (scripts/ingest-kb.ts).
// ============================================================

export interface SeedConcept {
  concept: string
  category: string
  content: string
  source?: string
}

export const SEED_CONCEPTS: SeedConcept[] = [
  {
    concept: 'Fair Value Gap (FVG)',
    category: 'pd_array',
    content: `A Fair Value Gap is a three-candle imbalance where price moves so aggressively that the wicks of the first and third candle do not overlap, leaving an untraded gap on the body of the middle candle. It represents an inefficiency — one side of the market (buyers or sellers) dominated so hard that fair two-sided auction never happened in that range. Traders treat the gap as a magnet: price often returns to "rebalance" the inefficiency before continuing. In a bullish move the FVG sits below price and acts as support on the retrace; in a bearish move it sits above price and acts as resistance. Identification: mark the space between candle-1's wick and candle-3's wick. Quality varies — the strongest FVGs form on displacement (a decisive, expansive move) and sit in line with the higher-timeframe bias, not against it. Common mistakes: trading every tiny gap regardless of context, entering the moment price touches the gap instead of waiting for a reaction, and ignoring whether the gap aligns with the draw on liquidity. An FVG is a location for a decision, not a signal by itself.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Order Block',
    category: 'pd_array',
    content: `An Order Block is the last opposing candle before a strong, displacing move — the last down-candle before an up-move (bullish OB), or the last up-candle before a down-move (bearish OB). The idea is that significant orders were positioned there, so when price returns to that zone it often reacts. A valid order block should precede a move that breaks structure or creates displacement; a candle followed by a weak drift is not a meaningful block. Traders mark the open-to-close body (or the full range including the wick, depending on their model) and watch for a reaction on the retest. The highest-probability blocks are those that also overlap another PD array (an FVG inside the block, or a block sitting at a premium/discount extreme) and that align with the higher-timeframe draw on liquidity. Common mistakes: labelling any candle before a move as an order block, using blocks that form against the dominant bias, and holding a "the block must hold" belief instead of reading the actual reaction. Blocks are zones of interest, not guarantees.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Breaker Block',
    category: 'pd_array',
    content: `A Breaker Block is a failed order block that flips polarity after price breaks structure through it. Sequence: an order block forms, price sweeps beyond it (taking the liquidity resting there), then reverses and breaks market structure in the opposite direction. The original block, now violated, becomes a breaker: a former bearish order block that gets broken to the upside becomes bullish support on a retest, and vice versa. Breakers are powerful because they combine a liquidity sweep, a structure shift, and a clear zone in one event — the traders who were trapped at the failed block become fuel for the new direction. Identification: find the swing that got its liquidity taken, confirm a market-structure shift, then mark the origin candles of the failed move as the breaker. Common mistakes: confusing a breaker with a plain order block (a breaker requires the prior liquidity sweep and structure break), and entering before the structure shift is confirmed.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Liquidity (Buy-side & Sell-side)',
    category: 'dol',
    content: `Liquidity is the pool of resting orders the market seeks out. Buy-side liquidity (BSL) sits above old highs and consists largely of buy-stops — short-sellers' stop losses and breakout buyers' entries. Sell-side liquidity (SSL) sits below old lows and consists of sell-stops — longs' stop losses and breakdown sellers' entries. Price is drawn to these pools because large participants need resting orders to fill size. This is why obvious highs and lows get "swept": the market runs stops to source liquidity, then frequently reverses. Practical use: identify where retail stops are clustered (equal highs/lows, trendline touches, session highs/lows) and treat those as targets (a draw on liquidity) rather than as safe breakout entries. Common mistakes: buying a clean break of highs that is actually a liquidity grab, and placing stops directly at the most obvious swing where everyone else's stops sit. Think of liquidity as the market's fuel and destination, not as levels that simply "hold" or "break."`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Draw on Liquidity (DOL)',
    category: 'dol',
    content: `Draw on Liquidity is the concept that price has a magnetic target — the most probable pool of liquidity it is currently being pulled toward. Before entering, a trader asks: "Where is price most likely trying to go?" The answer is usually the nearest significant buy-side or sell-side liquidity that aligns with the higher-timeframe bias — an old high, an old low, equal highs/lows, or an unfilled imbalance. Defining the DOL first gives every entry a thesis and a logical target, and prevents taking trades against the dominant pull. If the higher-timeframe DOL is a sell-side pool below, counter-trend longs into it are low quality. Identification: map higher-timeframe highs/lows and imbalances, decide which pool is the current objective, then trade in that direction using lower-timeframe PD arrays for entry. Common mistakes: entering with no defined target, and flipping bias every time a lower-timeframe candle looks strong instead of respecting the established draw.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'SMT Divergence',
    category: 'entry_confluence',
    content: `Smart Money Technique (SMT) Divergence is a discrepancy between two correlated instruments that should move together — for example NQ and ES, or EURUSD and GBPUSD. When one makes a higher high while the other fails to (or one makes a lower low while the other holds), the divergence hints that the move lacks broad participation and may be a liquidity grab rather than a genuine breakout. Bearish SMT: one index takes its high but the correlated index does not — a warning that the high is a raid. Bullish SMT: one index takes its low but the other refuses — a warning that the low is being swept before a reversal. SMT is used as a confluence, not a standalone trigger: it confirms that a sweep at a key level is likely a reversal. Common mistakes: comparing instruments that aren't reliably correlated, forcing divergence readings on noise, and acting on SMT without a level or structure shift to support it.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Killzones (London & New York)',
    category: 'session',
    content: `Killzones are the specific intraday windows when volatility and institutional activity concentrate, making high-probability setups more likely. The commonly used windows (in New York time) are the London killzone in the early morning, the New York AM killzone around the equities open, and a later New York PM window. The premise: liquidity and displacement cluster in these periods, while the hours between them tend to be low-quality, choppy, or consolidative. Trading inside a killzone raises the odds that a sweep-and-reversal or a clean expansion actually follows. Practical use: define your killzones, only hunt A+ setups within them, and treat out-of-session signals with suspicion. Common mistakes: trading all day and taking marginal setups in dead hours, chasing moves that already ran during the killzone, and ignoring that the same setup has very different odds at 10:00 versus 13:30. Session timing is itself an edge filter.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Premium and Discount (Equilibrium)',
    category: 'pd_array',
    content: `Premium and Discount describe where price sits within a defined range relative to its 50% midpoint (equilibrium). Draw a range from a significant swing low to swing high: the upper half is premium (relatively expensive), the lower half is discount (relatively cheap). The disciplined approach is to buy from discount and sell from premium, in the direction of the higher-timeframe bias — you want to enter where price offers favorable value, not chase into the expensive end of the range. Equilibrium (the 50% level) itself often acts as a decision point. Practical use: after identifying the dealing range and the draw on liquidity, wait for price to retrace into the opposite quadrant before entering — longs from discount toward buy-side liquidity, shorts from premium toward sell-side. Common mistakes: buying in premium simply because momentum looks strong, mislabelling the range by choosing arbitrary swing points, and ignoring bias so you "buy discount" in a market that is actually being drawn lower.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Displacement',
    category: 'market_condition',
    content: `Displacement is a strong, decisive, one-directional move that signals intent — the market repricing quickly rather than drifting. It typically appears as a run of expansive candles that break structure and leave imbalances (FVGs) behind. Displacement matters because it distinguishes a meaningful move from noise: order blocks and gaps created by displacement are far more reliable than those formed in slow chop. It often follows a liquidity sweep — stops are taken, then price displaces in the true direction, confirming the reversal or continuation. Practical use: require displacement as evidence that a level actually produced a reaction before trusting the PD arrays it created; a sweep with no displacement afterward is weak. Identification: look for the sharp expansion that breaks a recent swing and leaves a gap. Common mistakes: treating slow, overlapping candles as displacement, and entering on the displacement candle itself at a poor price instead of waiting for the retrace into the imbalance it created.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Optimal Trade Entry (OTE)',
    category: 'entry_model',
    content: `Optimal Trade Entry is a retracement-based entry model that seeks a favorable price within a displacement leg, typically the deep retracement zone (often framed around the 62%–79% pullback of the impulse). After price displaces in the direction of the bias and breaks structure, the trader waits for a pullback into this discount (for longs) or premium (for shorts) zone, ideally where the retracement overlaps a PD array such as an FVG or order block. The goal is a tight stop and a high reward-to-risk entry in line with the draw on liquidity. Practical use: mark the impulse leg, project the retracement zone, and look for a reaction where it confluences with an imbalance or block, then enter on a lower-timeframe confirmation. Common mistakes: forcing an OTE against the higher-timeframe bias, entering the zone blindly without any reaction or confirmation, and moving the fib anchors to make a losing idea "fit" the model.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Judas Swing',
    category: 'market_condition',
    content: `The Judas Swing is a false move early in a session designed to trap breakout traders before the real move. Named for betrayal, it is an initial push in one direction — often taking an obvious high or low and pulling in retail — that then sharply reverses into the genuine intraday direction. It commonly appears around session opens (London or New York), where an early spike grabs liquidity and sets the day's extreme before price travels the other way toward the true draw on liquidity. Practical use: be skeptical of the first aggressive move after an open; instead of chasing it, watch for it to sweep a level and fail, then trade the reversal in line with bias. Common mistakes: entering the Judas move as if it were the trend, and not defining beforehand which liquidity the swing is likely raiding. Recognizing the Judas Swing turns a trap into a high-quality reversal entry.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Turtle Soup',
    category: 'entry_model',
    content: `Turtle Soup is a reversal model that fades false breakouts of prior highs or lows. The name mocks the classic Turtle breakout strategy: instead of buying new highs or selling new lows, Turtle Soup waits for price to poke just beyond an obvious swing — sweeping the resting liquidity — and then fail and snap back inside the range. That failed breakout traps breakout traders whose stops and entries become fuel for the reversal. A clean setup: price takes out equal highs (or a prominent swing high), shows immediate rejection, and shifts structure back down, offering a short with a stop above the sweep. Practical use: identify obvious liquidity resting beyond a level, wait for the raid-and-reject rather than the break-and-go, and enter on the reclaim. Common mistakes: front-running the sweep before rejection is confirmed, and applying it in a strongly trending market where the "false" break is actually real continuation. Best odds come at range extremes and key session levels inside a killzone.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Market Structure Shift (MSS) / Break of Structure (BOS)',
    category: 'market_condition',
    content: `Market structure is read through swing highs and lows. A Break of Structure (BOS) is continuation: in an uptrend, price makes a higher high beyond the prior swing high, confirming the trend persists; in a downtrend, a lower low. A Market Structure Shift (MSS), sometimes called a change of character, is the early signal of reversal: after a liquidity sweep, price breaks the most recent counter-swing in the opposite direction — for example, sweeping a high then breaking the prior short-term low, hinting the up-move is done. The distinction matters: BOS says "keep going with the trend," MSS says "the trend may be turning." The highest-quality MSS is caused by displacement immediately after a sweep, not a slow marginal break. Practical use: use MSS to time reversals at key levels and BOS to stay with a trend, always in the context of the higher-timeframe draw. Common mistakes: calling every minor break a reversal, ignoring whether liquidity was taken first, and mislabelling internal (minor) structure as swing (major) structure.`,
    source: 'internal-paraphrase',
  },
  {
    concept: 'Liquidity Sweep / Stop Run',
    category: 'market_condition',
    content: `A liquidity sweep (stop run) is a deliberate push through an obvious high or low to trigger the resting stop orders there, followed by a reversal. It is the mechanism behind many reversals: the market needs orders to fill large positions, so it runs the clustered stops above equal highs or below equal lows to source that liquidity, then moves in the intended direction. A sweep is distinguished from a genuine breakout by what happens next — a sweep is quickly rejected and often accompanied by a market-structure shift and displacement, whereas a real breakout holds and continues. Practical use: instead of trading the break of an obvious level, anticipate the sweep, and enter on the rejection plus structure shift back inside. Combine with SMT divergence or a PD array at the swept level for confluence. Common mistakes: treating the sweep candle as a breakout and getting trapped, and calling every wick a sweep without requiring the reversal and structure confirmation that give it meaning.`,
    source: 'internal-paraphrase',
  },
]
