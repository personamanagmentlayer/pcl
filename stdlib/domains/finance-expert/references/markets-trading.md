# Markets, positions and portfolio accounting

**Rail, scheme and standards facts verified on 2026-09-10.** These move; confirm against the scheme or regulator before building to a date or a threshold.

This file is about **holding a position and accounting for it correctly**: what the instrument is, how many units you own, at what basis, what it
is worth, what the market did to it overnight, and how that reaches the ledger without inventing or destroying money. Strategy design, signal
research, execution algorithms and backtest engines belong to the sibling skill `trading-expert`. Rule of thumb: **"what should we buy" is not
this file; "what do we own, what is it worth, and does it foot to the custodian" is.** A position is a claim, not a number (M1) — created by an
execution, changed by corporate actions, valued by a mark whose provenance you must state, settled against a counterparty who keeps their own
record you reconcile to (M9).

## 1. Instruments and identifiers

| Identifier          | Scope            | Granularity                                | Stable?                        | Use it for                                   |
| ------------------- | ---------------- | ------------------------------------------ | ------------------------------ | -------------------------------------------- |
| **ISIN**            | Global, 12 chars | Security, not venue                        | Mostly; reused after long gaps | Cross-border reference, regulatory reporting |
| **CUSIP**           | US/CA, 9 chars   | Security                                   | Mostly                         | US settlement, custody                       |
| **SEDOL**           | UK/intl, 7 chars | Security **per market**                    | Yes                            | UK/European settlement, market-level books   |
| **FIGI**            | Global, 12 chars | Composite, share-class **and venue-level** | Yes, never reused              | Internal canonical key; openly licensed      |
| **RIC**             | Vendor (LSEG)    | Instrument on a venue                      | No — vendor-coupled            | Market-data subscription only                |
| **Exchange ticker** | Single venue     | Listing on that venue                      | **No — reused freely**         | Display, human input                         |
| **MIC** (ISO 10383) | Venue            | Market or segment                          | Yes                            | Qualifying a ticker; trade reporting         |
| **LEI** (ISO 17442) | Legal entity     | Counterparty, issuer, fund                 | Yes, with lapse status         | Counterparty and issuer identity             |

### 1.1 A ticker is not an identity

1. **Reuse.** Tickers are recycled after delisting; `FB` today is not Meta. A blotter keyed on the string silently merges two companies'
   histories.
2. **Multiplicity.** One instrument has an ISIN, a SEDOL per market, a FIGI per venue, a RIC per vendor and a ticker per venue — and a London
   line and its US ADR are _different instruments_ (different currency, ratio, corporate-action treatment), not one row with a flag.
3. **Change.** Symbol changes, ISIN changes after reorganisation, share-class splits: an identifier maps to an instrument **for a validity
   interval**, never absolutely.
4. **Class collapse.** `GOOG` and `GOOGL` differ in votes and price; preferred and ordinary shares of one issuer share a name and nothing else.

**Normative:** ledger, positions and lots key on an **internal instrument id you mint and never reuse** (M3 applies to identity too); external
identifiers are attributes with validity intervals. Ticker resolution is a fallible lookup, qualified by venue and as-of date, that must be able
to refuse — and an unmapped identifier on an inbound execution or custodian file goes to a **suspense position** with an owner and an age,
exactly as an unmatched cash item does (M9).

```python
@dataclass(frozen=True)
class IdAssignment:            # one external identifier, valid over an interval
    scheme: str                # ISIN | CUSIP | SEDOL | FIGI | RIC | TICKER | LEI
    value: str
    mic: str | None            # required for TICKER/SEDOL; a bare ticker is not resolvable
    valid_from: date
    valid_to: date | None      # None = open; never delete, always close the interval

@dataclass(frozen=True)
class Instrument:
    instrument_id: str         # internal, minted, never reused
    asset_class: str           # EQUITY | ETF | BOND | FUND | FUTURE | OPTION | FX | CRYPTO
    currency: str              # ISO 4217 of quotation (M4)
    quantity_scale: int; price_scale: int          # decimals allowed on a bookable quantity / price
    contract_multiplier: Decimal = Decimal(1); lot_size: Decimal = Decimal(1)
    tick_size: Decimal = Decimal("0.01"); ids: tuple[IdAssignment, ...] = ()

    def id_as_of(self, scheme: str, on: date) -> str | None:
        return next((a.value for a in self.ids if a.scheme == scheme and a.valid_from <= on
                     and (a.valid_to is None or on < a.valid_to)), None)
```

### 1.2 What changes per instrument class

| Class       | Quantity                       | Price convention                                         | Cash on trade                                                           | Special accounting                                            |
| ----------- | ------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Equity**  | Shares, integer or fractional  | Per share, currency of listing                           | qty × px                                                                | Corporate actions (§8); dividends                             |
| **ETF**     | Units                          | Market price, plus NAV/iNAV                              | qty × px                                                                | Market price ≠ NAV; creation/redemption is not a market trade |
| **Bond**    | **Face/nominal**, not "shares" | **Clean price per 100 nominal**; dirty = clean + accrued | (clean/100 × nominal) **+ accrued interest**                            | Accrued posts separately; premium/discount amortisation       |
| **Fund**    | Units, often 3–5 dp            | NAV per unit at a valuation point                        | Forward-priced: order in **amount or units**, NAV unknown at order time | Dealing on unknown price; unit rounding is contractual        |
| **Future**  | Contracts (integer)            | Index/commodity points                                   | **No principal cash** — initial margin only                             | Daily variation margin settles P&L in cash (§11)              |
| **Option**  | Contracts (integer)            | Premium per unit of underlying                           | Premium × multiplier                                                    | Exercise/assignment/expiry transform the position             |
| **FX pair** | Base-currency amount           | Rate, 4–6 dp                                             | Two cash legs, two currencies                                           | Never one amount (M6)                                         |
| **Crypto**  | Token units, ≤18 dp            | Quote per token                                          | qty × px + network fee                                                  | 24/7, on-chain finality (§13)                                 |

Day-count and accrual mechanics are in `money-arithmetic.md`. What belongs here: bond consideration is **two distinct amounts posting to two
accounts** (M16) — principal to cost, accrued to interest receivable, because the accrued portion is income you are buying back, not basis.

## 2. Quantity and price representation

| Field                                                                  | Type                                                                      | Why                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Bookable quantity                                                      | `Decimal` at the instrument's `quantity_scale`, or integer smallest units | Fractional shares and 18-dp tokens break both `int` shares and `float` (M4) |
| Bookable price                                                         | `Decimal` at `price_scale`                                                | A contract term of the execution, reproduced on confirmations and lots      |
| Consideration, cost basis, realized P&L, book marks                    | Money: exact quantity + ISO 4217 (M4)                                     | It is money and it reaches the ledger                                       |
| Greeks, correlations, optimiser inputs, chart series, intraday risk    | `float` is fine                                                           | Model outputs, not claims; precision loss is far below model error          |
| Anything compared for equality, allocated, or footed to a counterparty | Never `float`                                                             | `0.1 + 0.2` is where breaks come from                                       |

The boundary is crisp: **a float may enter an analytic and may leave it; a float may never be the value a posting, a confirmation, a statement or
a reconciliation is built from.** Cross into the booking path once, at a declared quantisation point with a declared rounding mode (M5), and
record that it happened. A fractional share is a distinct legal position: the broker holds the whole share and allocates a fraction internally,
so it may not survive a broker-to-broker transfer. If you are the broker, the aggregate of rounded fractions is a **house position with real
market risk** — a real position in the ledger, not an unbooked residue (M16).

| Concept                  | Meaning                                                                | Failure if ignored                                                    |
| ------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Lot size / round lot** | Minimum tradable quantity increment                                    | Rejects, or a venue silently rounds and your booked quantity is wrong |
| **Tick size**            | Minimum price increment, often tiered by price band                    | Off-tick prices stored that no venue could have produced              |
| **Quantity precision**   | 0 dp for futures/options, up to 8 for fractional equity, 18 for tokens | Dust nobody can close; a "zero" position that is 1e-12                |
| **Minimum notional**     | Venue floor on order value                                             | Rejects at the end of a rebalance                                     |

```python
def gross_consideration(qty: Decimal, price: Decimal, multiplier: Decimal, minor_exp: int) -> Decimal:
    """Notional = qty * price * multiplier, rounded ONCE to the minor unit (M5). Never round qty or
    price first, never an intermediate. The mode is declared policy: venues and custodians differ."""
    return (qty * price * multiplier).quantize(Decimal(1).scaleb(-minor_exp), rounding=ROUND_HALF_UP)
```

**The counterparty's rounding wins for the cash that actually moves.** If the contract note says 1 234.57 and you compute 1 234.56, book what
settles and post the 0.01 to a declared rounding-difference account (M16); never adjust quantity or price to tie, because those are contract
terms. Multi-leg and multi-currency trades never net (M6).

## 3. Market data

| Shape                            | Content                                             | Note                                                                                                                    |
| -------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Quote (L1)**                   | Best bid/ask and sizes                              | Crossed and locked quotes happen; do not assume bid ≤ ask                                                               |
| **Trade / tick**                 | Price, size, venue, **condition codes**             | Condition codes decide eligibility for last/close/VWAP. Ignoring them is the most common bad-price bug                  |
| **Order book (L2/L3)**           | Aggregated levels, or per-order                     | L3 lets you rebuild the book; L2 does not                                                                               |
| **Official close / auction**     | Exchange-determined                                 | The only price an index, a NAV or an official mark may use                                                              |
| **Reference / corporate action** | Static and event data                               | Separate feed, separate SLA, and the one that breaks month-end                                                          |
| **Consolidated tape**            | Post-trade prints across venues, regulator-mandated | New in Europe and still filling in — see below. A regulated consolidation, not a substitute for your primary venue feed |

**Europe now has consolidated tapes, in pieces.** ESMA selected **Ediphy (fairCT)** as the EU bond CTP in July
2025, **EuroCTP** for shares and ETFs in December 2025, and **Etrading Software** for OTC derivatives in July
2026; each is a five-year appointment and authorisation follows selection, so availability lags the announcement.
In the UK the **bond consolidated tape went live on 22 June 2026** (ETS Connect UK, appointed after a contested
tender), with the equities tape framework finalised but no provider appointed. Treat a tape as a _reference and
compliance_ source — coverage, latency and eligibility rules differ from your venue feeds, so it does not replace
them for marks (§7.1) or for the book (§3.1). And do not build best-execution reporting to the old shape: **MiFID
II RTS 27 and RTS 28 are gone.** The UK removed both in FCA PS21/20 (December 2021). In the EU, RTS 27 venue
execution-quality reports were suspended and then dropped, and the firm top-five-venue report was deleted by the
2024 MiFID II/MiFIR review — ESMA had already told national regulators to de-prioritise RTS 28 supervision in
February 2024. The substantive best-execution obligation is untouched; only the published reports went, and the
consolidated tape is the replacement source of execution-quality evidence.

### 3.1 Sequence numbers and gap recovery

Incremental feeds carry a per-channel sequence: apply increments in order from a snapshot of known sequence, and **detect a gap rather than
tolerate one**. A book that silently missed an increment is arbitrarily wrong, and any mark taken from it is unusable for the books.

```python
class SequencedChannel:
    """On a gap the book is INVALID until re-snapshotted. Never interpolate, never fail open."""
    def __init__(self): self.expected, self.valid, self.buffer = None, False, {}

    def on_snapshot(self, seq: int) -> None:
        self.expected, self.valid = seq + 1, True
        while self.expected in self.buffer:                    # replay increments after the snapshot
            self.apply(self.buffer.pop(self.expected)); self.expected += 1

    def on_increment(self, seq: int, msg) -> str:
        if not self.valid: self.buffer[seq] = msg; return "AWAITING_SNAPSHOT"
        if seq < self.expected: return "DUPLICATE_IGNORED"     # at-least-once transport (M8)
        if seq > self.expected:                                # alert: the book is now untrusted
            self.valid, self.buffer[seq] = False, msg; return "GAP_DETECTED_RESNAPSHOT"
        self.apply(msg); self.expected += 1; return "APPLIED"
```

A mark derived from an invalid book is _labelled_ invalid and must not silently fall back to a stale value (M17, M20).

### 3.2 Timestamp discipline (M10)

| Timestamp                           | Meaning                       | Source of truth for                                    |
| ----------------------------------- | ----------------------------- | ------------------------------------------------------ |
| **Exchange / matching-engine time** | When it occurred at the venue | Sequencing, regulatory reporting, "when did it happen" |
| **Capture time**                    | Gateway receipt               | Latency and feed-health SLOs                           |
| **Ingest time**                     | When persisted                | Replay boundaries, backfill windows                    |
| **Booking time**                    | When posted                   | Audit trail (M14)                                      |
| **Accounting period**               | Which period it belongs to    | Close; a closed period never changes (M10)             |

Store each where it exists, in UTC, timezone-aware, nanosecond where the venue supplies it; never a naive datetime on anything cutoff-sensitive.
**Never derive trade date from a UTC calendar date** — trade date is a venue-calendar concept: a 21:30 UTC US execution is the same trading day
as a 14:30 UTC one, a Sydney open is not. Calendars, half-days and holidays are reference data with an owner.

**In the EU and UK the clock itself is regulated**, and the tier you fall into is set by _how you trade_, not by
how precise you would like to be. Under RTS 25 (Delegated Regulation (EU) 2017/574) business clocks must track UTC
as maintained by the timing centres in the BIPM annual report, within:

| Who / what                                                      | Max divergence from UTC | Timestamp granularity |
| --------------------------------------------------------------- | ----------------------- | --------------------- |
| Venue, gateway-to-gateway latency > 1 ms                        | 1 ms                    | 1 ms or finer         |
| Venue, gateway-to-gateway latency ≤ 1 ms                        | 100 µs                  | 1 µs or finer         |
| Member/participant doing **high-frequency algorithmic trading** | 100 µs                  | 1 µs or finer         |
| Member/participant, any other trading activity                  | 1 ms                    | 1 ms or finer         |
| Voice, manual RFQ, negotiated transactions                      | 1 s                     | 1 s or finer          |

Two practical consequences: the classification is per activity, so one firm can owe 100 µs on one desk and 1 s on
another; and **divergence is a monitored, evidenced property** — you need traceability records, not just an NTP
client, and the drift measurement is itself an artefact a regulator asks for.

### 3.3 Vendors disagree, and history is not what happened

- Two vendors give different closes for the same instrument: different venue consolidation, condition filters, auction and off-book treatment.
  **Pick a primary source per class and per purpose, write it down, store source and timestamp with every mark** (M20).
- **Adjusted history** back-applies splits and optionally dividends: a derived series with a policy, not a fact. It is not comparable to your
  booked trade prices and it changes retroactively on every new action — store **unadjusted** prices plus the action set and derive adjustments
  on demand (M1).
- **Survivorship bias**: a universe of instruments alive today has deleted every delisting, bankruptcy and acquisition, so every statistic on it
  is optimistic. Store point-in-time membership with validity intervals.

### 3.4 "Which price is _the_ price?"

| Candidate                    | Defensible for                                 | Not defensible for                                             |
| ---------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| Last trade                   | Intraday display                               | Marks — may be hours old, an odd lot, or an off-book print     |
| Mid                          | Illiquid marks, cost baselines                 | Anything where the spread matters, without a stated adjustment |
| Bid (long) / ask (short)     | Conservative marks, liquidation views          | Reporting a "value" without saying it is bid-side              |
| **Official close / auction** | The books, NAV, statements, performance        | Intraday risk                                                  |
| VWAP (interval stated)       | Execution quality                              | A balance-sheet mark                                           |
| Evaluated / matrix price     | Level 2 marks on bonds and structured products | Presenting as a traded price                                   |

**The answer is written down per instrument class and per purpose, with a fallback chain and a staleness bound (§7.1).** It is a valuation policy
the finance owner signs, because it produces the numbers in the accounts (M19).

## 4. Orders and execution

Routing, SOR, TWAP/VWAP/IS algorithms, venue selection and transaction-cost analysis are `trading-expert`. What belongs here is the **contract
between the order system and the books**: identity, lifecycle, idempotency, and how an execution becomes a posting.

| Type / TIF        | Semantics                         | Booking consequence                                                                           |
| ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| Market            | Execute at prevailing price       | Unknown consideration until filled; never reserve on an assumed price without a buffer        |
| Limit             | Price bound                       | Reservable exactly (M13)                                                                      |
| Stop / stop-limit | Becomes market / limit on trigger | Reservation must assume slippage; a stop-limit can trigger and never fill                     |
| **IOC**           | Fill now, cancel the rest         | Partial fills are the normal case                                                             |
| **FOK**           | All or nothing, immediately       | Single terminal event                                                                         |
| **DAY**           | Expires at venue close            | Expiry is an event to consume, not infer                                                      |
| **GTC / GTD**     | Persists across sessions          | Survives your restart and your deploy; corporate actions may adjust or cancel it at the venue |

A GTC order living across an ex-date is a classic incident: some venues adjust the limit for the dividend or split, some cancel, some do nothing.
Re-evaluate every open order and its fund reservation on every corporate action (§8).

### 4.1 Lifecycle

```
  new ─► pending ─┬─► rejected (terminal)
                  └─► working ─┬─► partially_filled ─┬─► filled (terminal)
                               │         ▲           └─► cancelled (terminal, cumQty > 0)
                               ├─────────┴─► cancelled / expired (terminal)
                               └─► pending_replace ─► working (new ClOrdID, same OrderID)
```

- **`cum_qty` is monotonically non-decreasing** across an order chain; a message implying a decrease is out of order until proven otherwise.
- **Terminal states are terminal.** A fill after `cancelled` means your cancel never took effect at the venue: the venue's view wins and your
  position is wrong until you accept that.
- **Amend is not an edit.** It can be rejected while the original keeps working, or race with a fill. Model `pending_replace` with both client
  ids live; never assume the amend landed.

### 4.2 The client order id is the idempotency key (M7)

`ClOrdID` is the caller-supplied idempotency key for order placement: derived from the business action (account + intent + attempt), unique per
venue per day, **persisted before sending**, so a resend of the same intent reuses the key and a duplicate never becomes a second order. An order
sent with a random id generated at send time and no pre-write is unbounded exposure — if the process dies between send and ack you cannot tell
whether you have a position.

| Tag / message   | Name                                      | Role                                                                                                                                                                 |
| --------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `35=D`          | NewOrderSingle                            | Place; carries `11=ClOrdID`                                                                                                                                          |
| `35=F` / `35=G` | OrderCancelRequest / CancelReplaceRequest | New `11`, plus `41=OrigClOrdID`                                                                                                                                      |
| `35=8`          | ExecutionReport                           | Every state change: `37=OrderID`, `17=ExecID`, `150=ExecType`, `39=OrdStatus`, `14=CumQty`, `151=LeavesQty`, `6=AvgPx`, `31=LastPx`, `32=LastQty`, `60=TransactTime` |
| `35=9`          | OrderCancelReject                         | Amend/cancel refused; **the original is still working**                                                                                                              |

`37=OrderID` is the venue's identity for the chain; `11=ClOrdID` is yours and changes on every amend; `17=ExecID` identifies the individual
report. **Deduplicate on `ExecID`, sequence on `CumQty`, identify the order by `OrderID`, identify the intent by the `ClOrdID` chain.**

**Which FIX you are actually speaking.** The version story is not a ladder you climb. **FIX 4.2 and 4.4 are still
the workhorses** in production connectivity and remain supported by FIX Trading Community (both migrated to the
Orchestra standard). **FIX 5.0 SP2 went unsupported in November 2020** — implementations persist, but reported
errors will not be fixed — and it was succeeded by **FIX Latest**, which is not a numbered release at all but a
cumulative stream of Extension Packs, each EP superseding the last. Session and application layers were split at
5.0: `8=BeginString` has been `FIXT.1.1` ever since and identifies the _session_ protocol, while the application
version travels in `1128=ApplVerID`. So parse the two independently, pin the counterparty's version per session in
configuration, and expect a venue matrix where the same firm speaks 4.2 to one counterparty and FIX Latest to
another.

### 4.3 Execution reports arrive twice and out of order (M8)

FIX sessions resend on reconnect (`PossDupFlag`), drop-copy feeds duplicate, gateways reorder.

```python
def apply_execution_report(st, exec_id: str, exec_type: str, cum_qty, last_px, avg_px) -> str:
    if exec_id in st.seen_exec_ids:                 # persisted set, not in-memory only
        return "DUPLICATE"                          # dedupe BEFORE posting (M8)
    st.seen_exec_ids.add(exec_id)
    if exec_type == "TRADE" and cum_qty <= st.cum_qty:
        return "STALE_OUT_OF_ORDER"                 # a later report already covered this fill
    delta = cum_qty - st.cum_qty                    # derive from CumQty; never sum LastQty blindly
    st.cum_qty, st.avg_px = cum_qty, avg_px
    book_fill(st.order_id, delta, last_px)          # exactly one posting per accepted increment (M2)
    return "APPLIED"
```

Summing `LastQty` over a stream you may have received twice manufactures positions; deduplicating after posting means reversing an immutable
posting (M3), which is a break and a conversation. **Busts and corrections** are the other side: a venue can cancel or re-price a print
afterwards — a reversing entry plus a new entry, never an update, possibly after you have valued and reported.

### 4.4 Allocations and average price

| Step                     | Rule                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Average price            | Weighted average of fills at full precision, **quantised once** at the declared scale (M5)                                          |
| Quantity allocation      | Pro-rata by the pre-declared instruction; allocated quantities sum **exactly** to the fill, residual assigned by a stated rule (M5) |
| Consideration allocation | Allocate the **money** remainder-preserving; do not recompute `qty_i × avg_px` per account and hope it sums                         |
| Fees                     | Allocated on the same key, as separate postings (M16)                                                                               |
| Timing                   | The allocation instruction is declared **before or at** order entry where the regulator requires it (anti-cherry-picking)           |

Recomputing `qty_i × avg_px` per account and rounding each is the canonical way to end the day four cents short with no account to put it in. Use
the allocation primitives in `money-arithmetic.md`.

## 5. Positions and cash

A position is **derived state** (M1): the authoritative record is the sequence of position movements — executions, corporate actions, transfers —
and the quantity is their sum. A `positions` table with a mutable `quantity` column is the same defect as a mutable `balance` column: no history,
unreconcilable, lost updates, no answer to "why is it 300?".

| Field                                   | Notes                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `account_id`, `instrument_id`           | The legal owner's account; the internal instrument id (§1)              |
| `quantity`                              | Signed `Decimal`; negative = short. Derived from movements              |
| `cost_basis`                            | Money; maintained by the lot engine (§6), never by averaging on the fly |
| `traded_quantity` vs `settled_quantity` | Two distinct numbers (§5.2)                                             |
| `custodian` / safekeeping account       | Where it actually sits; drives reconciliation (§10)                     |
| `restrictions`                          | Pledged, lent, locked, unsettled-and-unsellable                         |

The books are two-dimensional: a **units sub-ledger** (quantity movements per instrument per account) and the **value ledger** (cost, realized
P&L, revaluation, cash). Both append-only, both derived, and the units sub-ledger must foot to the value carried in the GL (`ledger.md`).
Quantities in an ORM row and money in a ledger is two systems of record, and you will spend every close arguing about which is right.

### 5.1 The double-entry view of a trade

Buy 100 @ 10.00 USD, commission 1.00, T+1 — then sell 40 @ 12.00, commission 1.00, FIFO cost relieved 400.00:

| Date              | Account                            | Dr       | Cr       |
| ----------------- | ---------------------------------- | -------- | -------- |
| Trade date (buy)  | Securities owned — INSTR (cost)    | 1 000.00 |          |
| Trade date (buy)  | Commission expense                 | 1.00     |          |
| Trade date (buy)  | Payable to broker (unsettled)      |          | 1 001.00 |
| Settlement date   | Payable to broker (unsettled)      | 1 001.00 |          |
| Settlement date   | Cash — USD                         |          | 1 001.00 |
| Trade date (sell) | Receivable from broker (unsettled) | 479.00   |          |
| Trade date (sell) | Commission expense                 | 1.00     |          |
| Trade date (sell) | Securities owned — INSTR (cost)    |          | 400.00   |
| Trade date (sell) | Realized gain/loss                 |          | 80.00    |

Short sell 100 @ 10.00: Dr Receivable 1 000.00, Cr **Securities sold not yet purchased** 1 000.00. A short is a **liability at market**, not a
negative asset: it revalues upward as the price rises (a loss), proceeds are usually held as collateral by the lender, and borrow fee, rebate,
hard-to-borrow rate and recall risk are contractual terms with their own postings (M16), never netted into P&L.

### 5.2 Trade date vs settlement date

| Basis                          | Meaning                                                                           | Used for                                                    |
| ------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Trade-date accounting**      | Position and P&L at execution; cash sits as a receivable/payable until settlement | IFRS/GAAP default for most portfolios; risk and performance |
| **Settlement-date accounting** | Position recognised when it settles                                               | Some custody and statutory books; cash reporting            |

You need both views regardless of the book basis, because **the cash you can spend today is settled cash, not traded cash**. Presenting traded
cash as available balance and letting a client withdraw it is how a broker funds a settlement failure with someone else's money (funding rails:
`payments.md`; account and interest treatment: `banking-open-finance.md`). US, Canadian and Mexican cash equities moved to **T+1 on 27–28 May
2024**. Europe follows on **Monday 11 October 2027**, and that date is now law rather than an aspiration: **Regulation (EU) 2025/2075**, amending
CSDR Article 5(2), was published in the Official Journal on 14 October 2025 and sets 11 October 2027; the UK and Switzerland have committed to the
same date, the UK through the Accelerated Settlement Taskforce implementation plan and a draft statutory instrument. Scope is equities, ETPs and
most bonds, with **UK gilts outside the mandatory scope**; funds, some fixed income and some emerging markets follow neither cycle. **Settlement
cycle is reference data per instrument per market with a holiday calendar**, never a constant — and T+1 collapses affirmation and FX funding into
the trade day, so automate them same-day or the fail rate rises.

**Fails** are a state, not an error: the position stays open, the receivable/payable ages, and under CSDR the fail attracts **cash penalties**
that are their own postings (M16) — daily, computed by the CSD, charged to the failing party and paid to the non-failing one, and live since
**1 February 2022**. The other half of settlement discipline moved: **mandatory buy-ins were not repealed but demoted to a last resort** under the
CSDR Refit, usable only after cash penalties and penalty-rate adjustments have demonstrably failed, so no firm should be building a buy-in
workflow on the assumption it is imminent. What _is_ imminent is the tightening around T+1: a revised settlement-discipline RTS — a single
end-of-trade-date deadline for written allocations, machine-readable confirmations, and CSDs obliged to offer hold/release and auto-partialling —
was endorsed by the Commission in July 2026 and phases in from **7 December 2026**, ahead of the cycle change itself. Model `pending_settlement`
as first-class with an age, an owner and an alert threshold, reconciled daily (§10), and treat partial settlement as a supported outcome rather
than an exception.

## 6. Lot accounting and cost basis

| Method                      | Rule                                    | Typical use                                       | Engineering note                                                                                                     |
| --------------------------- | --------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **FIFO**                    | Oldest lot first                        | Default in many jurisdictions                     | Simple, deterministic, replayable                                                                                    |
| **LIFO**                    | Newest first                            | Permitted in some regimes; check per jurisdiction | Same machinery, opposite ordering                                                                                    |
| **Average cost**            | One pooled basis per instrument/account | UK s.104 pooling, Canadian ACB, many funds        | The pool must be recomputed forward on any backdated insert — the trap                                               |
| **Specific identification** | Caller names the lots                   | US brokerage, tax optimisation                    | The instruction must be captured **at or before settlement** and stored; retroactive selection is a compliance issue |
| **HIFO / optimisers**       | Highest cost first                      | Crypto, some brokers                              | A SpecID variant; still an explicit recorded election                                                                |

The method is an attribute of the **account** (sometimes account × instrument), declared and versioned. Changing it is an accounting-policy
change with a restatement question attached, not a config toggle.

```python
@dataclass
class Lot:                 # remaining qty; unit_cost at full precision; acquired = trade date
    lot_id: str; qty: Decimal; unit_cost: Decimal; acquired: date

def relieve(lots: deque[Lot], qty: Decimal, method: str,
            chosen: list[str] | None = None) -> list[tuple[str, Decimal, Decimal]]:
    """-> [(lot_id, qty_taken, cost_relieved)]. Deterministic: same lots + order + method => same
    result (M18). Raises rather than going negative; a sell with no lot is a break, not a
    zero-cost sale."""
    order = {"FIFO":   lambda: list(lots),
             "LIFO":   lambda: list(reversed(lots)),
             "HIFO":   lambda: sorted(lots, key=lambda l: -l.unit_cost),
             "SPECID": lambda: [l for c in (chosen or []) for l in lots if l.lot_id == c]}[method]()
    out, remaining = [], qty
    for lot in order:
        if remaining <= 0: break
        take = min(lot.qty, remaining)
        out.append((lot.lot_id, take, take * lot.unit_cost))
        lot.qty -= take; remaining -= take
    if remaining > 0: raise ValueError(f"short by {remaining}")   # never fabricate basis
    while lots and lots[0].qty == 0: lots.popleft()
    return out
```

`cost_relieved` is quantised to the minor unit **once per relief**; realized P&L is `net_proceeds − sum(cost_relieved)`. Quantising `unit_cost`
per lot and multiplying turns a hundredth of a cent per share into a visible break on a million-share position.

### 6.1 Worked example — FIFO across partial sells

Buys: 100 @ 10.00 (L1), 100 @ 12.00 (L2), 100 @ 9.00 (L3). Commissions ignored; §9 decides whether they enter basis.

| #   | Event | Qty | Price | Lots relieved    | Cost relieved | Proceeds | Realized    | Remaining          |
| --- | ----- | --- | ----- | ---------------- | ------------- | -------- | ----------- | ------------------ |
| 1   | Buy   | 100 | 10.00 | —                | —             | —        | —           | 100, cost 1 000.00 |
| 2   | Buy   | 100 | 12.00 | —                | —             | —        | —           | 200, cost 2 200.00 |
| 3   | Buy   | 100 | 9.00  | —                | —             | —        | —           | 300, cost 3 100.00 |
| 4   | Sell  | 60  | 11.00 | L1 × 60          | 600.00        | 660.00   | **+60.00**  | 240, cost 2 500.00 |
| 5   | Sell  | 90  | 8.00  | L1 × 40, L2 × 50 | 1 000.00      | 720.00   | **−280.00** | 150, cost 1 500.00 |
| 6   | Sell  | 120 | 13.00 | L2 × 50, L3 × 70 | 1 230.00      | 1 560.00 | **+330.00** | 30, cost 270.00    |

Cumulative realized +110.00; 30 units of L3 at 9.00 remain, unrealized at a 13.00 mark = **+120.00**. The identities that must hold continuously
and belong in a test (M18):

```
sum(lot.qty)                     == position.quantity
sum(lot.qty * lot.unit_cost)     == position.cost_basis      (at the declared scale)
market_value - cost_basis        == unrealized_pnl
cost_basis + cumulative_realized == net of all considerations, sign-adjusted
```

### 6.2 Postings, shorts and the tax complications you must not improvise

| Event                  | Dr                                                        | Cr                                              |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Acquisition            | Securities owned (cost)                                   | Payable / cash                                  |
| Disposal               | Receivable / cash (+ Dr Realized loss if any)             | Securities owned (cost relieved); Realized gain |
| Period-end mark (§7.4) | Unrealized revaluation (or Dr P&L/OCI per classification) | Contra revaluation account                      |

Realized and unrealized are **different accounts**, and the revaluation is reversed and re-struck each period (or carried cumulatively with only
the delta posted — pick one, write it down); otherwise, on the day a lot is sold you cannot tell which part of the gain was already recognised. A
short position's basis is the **proceeds**, the gain is proceeds − cost to cover, holding-period rules differ, and covering relieves short lots
with the same machinery.

**Wash sales (US)**: a loss is disallowed if substantially identical securities are acquired within 30 days before or after the sale; the
disallowed loss is added to the replacement lot's basis and the holding period tacks. The rule reaches across accounts of the same taxpayer,
including a spouse's and IRAs, so **your system usually cannot see the whole picture**: flag candidates within the data you hold, carry the flag
on the lot, expose it in the tax-lot report, and **delegate the determination** — never silently adjust book basis for tax, never present a tax
figure as final. Equivalent traps exist elsewhere (UK bed-and-breakfasting, s.104 pooling, same-day matching) — `compliance-regulatory.md`.

## 7. Valuation and marks

### 7.1 Source hierarchy and staleness

Declare, per instrument class and per purpose, an ordered fallback chain with a staleness bound at each level, and record which level produced
every stored mark (M20).

| Rank | Source                                            | Typical bound                          | On breach                                                  |
| ---- | ------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| 1    | Official close / auction, primary venue           | Same trading day                       | Fall through                                               |
| 2    | Consolidated last trade, eligible condition codes | Minutes, class-dependent               | Fall through                                               |
| 3    | Mid of a firm two-sided quote                     | Minutes                                | Fall through                                               |
| 4    | Evaluated / matrix price from an approved vendor  | Daily                                  | Fall through                                               |
| 5    | Model or broker quote                             | Per policy                             | **Escalate to the valuation committee; mark Level 3**      |
| —    | Last known good, carried forward                  | **Bounded, declared, visibly flagged** | Past the bound it is a valuation _exception_, not a number |

Carrying a stale mark forward silently is the failure mode: the position stops moving, risk reports zero volatility, and the auditor notices
first. A stale mark must degrade **visibly** (M17, M20).

### 7.2 Fair-value hierarchy in engineering terms

| Level       | IFRS 13 / ASC 820                                    | What it means for your system                                                                                                        |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Level 1** | Quoted prices in active markets for identical assets | A price you _received_ from a venue. Store venue, timestamp, condition codes                                                         |
| **Level 2** | Observable inputs other than Level 1                 | A price you _computed_ from observable inputs (matrix pricing, a curve, comparables). Store inputs and model version                 |
| **Level 3** | Unobservable inputs                                  | A price your model or a committee _produced_. Store assumptions, approver, date. Requires sign-off and disclosure; it is a judgement |

Level classification, transfers between levels and Level 3 rollforwards are disclosed. If the system cannot say which level produced a mark, it
cannot produce the disclosure, and someone will do it in a spreadsheet (M19).

### 7.3 Screen value vs book value

The customer screen is continuous and best-effort, sourced from a fast feed, usually mid or last, possibly delayed, and corrects by refreshing:
label it "indicative, 15-min delayed, mid, USD". The books are struck once per valuation point from the §7.1 source chain at the official close,
and are restated only through a controlled process: label them "valuation as at 2026-08-31 close, USD, official close, trade-date basis" (M20).
**The screen number must never be the source for a statement, a fee calculation, a performance figure or a margin call.**

### 7.4 Revaluation postings (M10)

At each valuation point, revalue open positions to the mark and post the change to unrealized P&L (or OCI where the classification requires — an
accounting decision, not an engineering one). Once a period closes its mark is **frozen**: a vendor's corrected price for a closed period posts
to the open period with a reference to the original date, and if material it is a restatement question, not an update.

## 8. Corporate actions

The only events that change a position without a trade — and they arrive as reference data, late, from a source that is not the one you reconcile
against.

| Action                   | Key dates                                             | Position effect                                                            | Cash effect                                                                                 | History effect                                                         |
| ------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Cash dividend**        | Announcement, **ex-date**, record, pay                | None                                                                       | Dr dividend receivable on ex-date; cash on pay date; withholding as a separate posting (§9) | Price drops on ex-date; total-return series adjusts                    |
| **Stock dividend**       | Announcement, ex, record, pay                         | Quantity ↑                                                                 | None                                                                                        | Basis spreads over the larger quantity                                 |
| **Split (n:1)**          | Announcement, ex/effective                            | Quantity × n                                                               | Only cash-in-lieu of fractions                                                              | **All historical prices ÷ n, quantities × n**                          |
| **Reverse split (1:n)**  | As above                                              | Quantity ÷ n                                                               | Cash-in-lieu for fractions                                                                  | Inverse of the above                                                   |
| **Rights issue**         | Announcement, ex-rights, subscription window, payment | Rights position created; subscription creates shares                       | Cash out on subscription; rights may be sold                                                | Theoretical ex-rights price adjustment                                 |
| **Merger / acquisition** | Announcement, election deadline, effective            | Old position closed; new position and/or cash; may require an **election** | Cash consideration                                                                          | Series ends or continues in the survivor                               |
| **Spin-off**             | Announcement, ex, distribution                        | New position created                                                       | Usually none                                                                                | **Basis allocated between parent and spun entity by a declared ratio** |
| **Symbol / ISIN change** | Effective date                                        | None economically                                                          | None                                                                                        | Close one identifier interval, open another (§1)                       |
| **Delisting**            | Notice, effective                                     | Position remains, becomes unmarkable                                       | None immediately                                                                            | Mark drops to Level 3 or zero by policy; a long tail                   |

### 8.1 The classic bug

**Applying a split to the position but not to the lots, the basis, the open orders or the price history.**

| Omitted                  | Symptom                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Lot quantities           | Lots no longer sum to the position; the next sell fails or fabricates basis              |
| Lot unit cost            | Cost basis doubles or halves; realized P&L is wrong by the split factor                  |
| Open orders              | A GTC limit at the pre-split price fills instantly or never                              |
| Price history            | A phantom −50% crash; every return, volatility and risk number from that series is wrong |
| Average-cost pool        | Pool unit cost is off by the factor for everything afterwards                            |
| Benchmark / index series | Attribution shows phantom alpha                                                          |

```python
def apply_split(position, lots, open_orders, ratio_num: int, ratio_den: int) -> None:
    """n:m split. Quantity scales by n/m, unit cost by m/n; TOTAL COST IS INVARIANT."""
    f = Decimal(ratio_num) / Decimal(ratio_den)
    before = sum(l.qty * l.unit_cost for l in lots)
    for l in lots:
        l.qty, l.unit_cost = l.qty * f, l.unit_cost / f   # full precision; quantise only to report
    position.quantity *= f
    for o in open_orders:                                  # venues differ: adjust, cancel, or ignore
        o.quantity *= f
        if o.limit_price is not None: o.limit_price /= f
    assert sum(l.qty * l.unit_cost for l in lots) == before, "split changed cost basis"
    # Fractional entitlements: pay cash-in-lieu as an explicit posting; never silently truncate.
```

**Corporate actions are events in the same append-only stream as trades** (M1, M3): a split is a position movement with an id, a date and a
source, not a row mutation, so a replay from genesis reproduces today's position exactly. And **the adjusted price series is derived, never
stored as primary** (§3.3), so a late or corrected action restates history instead of leaving six months of silently wrong data. Elections
(cash/stock mergers, DRIP, rights) are **deadlines with defaults**: model the deadline, the default outcome, who may elect, and separation of
duties on electing (M11).

## 9. Fees, commissions and taxes (M16)

Every charge is its own posting to its own account. Netting into the price destroys execution-quality measurement, broker-invoice verification,
tax recovery and cost-of-trading reporting.

| Charge                                  | Levied by            | Typical basis                                | Enters cost basis?                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | -------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Commission**                          | Broker               | Per share, per trade, bps, or zero           | Usually yes (added on buy, deducted from proceeds on sell) — policy and jurisdiction dependent                                                                                                                                                                                                                               |
| **Exchange / venue fee**                | Venue                | Per execution or share; maker/taker          | Usually yes if passed through                                                                                                                                                                                                                                                                                                |
| **Clearing / settlement fee**           | CCP, CSD, custodian  | Per trade or settlement                      | Usually yes                                                                                                                                                                                                                                                                                                                  |
| **Regulatory fee** (SEC §31, FINRA TAF) | Regulator via broker | On sells, bps of value                       | Reduces proceeds                                                                                                                                                                                                                                                                                                             |
| **Stamp duty / FTT**                    | Government           | UK SDRT 0.5% on purchases; FR/IT/ES variants | **Purchases only in the UK** — an asymmetry that surprises symmetric fee models. Since 27 Nov 2025 a **UK listing relief** exempts securities of companies newly listed on a UK regulated market for **3 years from listing**, so SDRT applicability is now a per-instrument, date-bounded lookup, not a flag on "UK equity" |
| **Borrow fee / rebate**                 | Lender               | Rate × value × days                          | No — a financing cost, expensed                                                                                                                                                                                                                                                                                              |
| **Custody / safekeeping**               | Custodian            | bps per annum                                | No — expensed and accrued                                                                                                                                                                                                                                                                                                    |
| **Withholding tax on dividends**        | Source country       | % of gross, treaty-dependent                 | No — reduces income; may be **reclaimable**                                                                                                                                                                                                                                                                                  |
| **Capital gains tax**                   | Residence country    | On realized gain                             | No — computed downstream from basis                                                                                                                                                                                                                                                                                          |

**Withholding is two-sided.** Book the **gross** dividend as income and the withholding as a separate posting; the net is derived (M16). Where a
treaty rate or relief-at-source applies, the gap between the statutory and treaty rate is a **reclaim receivable** with an age, a
jurisdiction-specific deadline and a real chance of never being collected — model it with an expected-recovery haircut, because netting the
dividend to cash received makes it permanently unrecoverable. Whether commissions capitalise into basis or are expensed is a **jurisdiction and
policy** question: store it per account, apply it consistently, label reported basis with the convention that produced it (M20).

## 10. Settlement, custody and client assets

| Concept                | Definition                                            | System consequence                                                                  |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **DVP / RVP**          | Securities and cash move simultaneously or not at all | Removes principal risk; the two legs are one atomic event                           |
| **Free of payment**    | Delivery without simultaneous cash                    | Real principal risk; explicit approval and a control                                |
| **Custodian**          | Holds the assets in safekeeping                       | Your reconciliation counterparty; their record is external truth for positions (M9) |
| **Sub-custodian**      | Local-market agent                                    | Another hop, timezone and break class                                               |
| **Omnibus account**    | Many clients in one account at the custodian          | Standard and cheap; **your books are the only record of who owns what**             |
| **Segregated account** | One client, one account                               | Unambiguous, expensive, sometimes mandatory                                         |

**Client-asset segregation is a licence-level obligation, not a design preference.** Client securities and money are held apart from the firm's
own, cannot fund the firm's positions, and are subject to daily computations and reporting under UK CASS, SEC Rule 15c3-3 and its customer
reserve formula, and MiFID II safeguarding. The US computation cadence has just tightened: carrying broker-dealers with average total credits of
**$500 million or more must compute the customer and PAB reserve formulas daily rather than weekly**, with the compliance date extended once and
landing on **30 June 2026**. Daily reserve computation is an engineering requirement before it is a compliance one — it means the books must close
cleanly every day, not every Friday. Comingling — even briefly, even in a suspense account — is a reportable breach with regulatory and
personal consequences, not a reconciliation item. In an omnibus model the discipline is _sharper_: the custodian cannot tell clients apart, so
your internal record is the entire basis of every client's legal claim and must reconcile to the omnibus total every day (M9, M14) —
**positions** (quantity per instrument per safekeeping account) and **cash** (per currency per account), per custodian and per broker. Matching
keys, break classification, ageing and ownership follow `reconciliation-close.md`; the interpretation is specific here.

| Break                        | Likely causes                                                                               | Severity                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Cash**                     | Unbooked fee, wrong rate, FX difference, dividend net vs gross, cutoff timing               | A value error, sized in money                                                                                                       |
| **Position**                 | Missed or duplicated fill, unapplied corporate action, a fail, a one-sided transfer, a bust | **Higher**: either a client's assets are wrong or you do not know where an asset is. Under CASS-style rules, potentially reportable |
| **Position + matching cash** | A trade booked one side only                                                                | One root cause; fix once, verify both                                                                                               |
| **Position, cash clean**     | Almost always a corporate action or a transfer                                              | Check the action calendar first                                                                                                     |

A position break is also a _future_ cash break: an unapplied dividend or a wrong quantity becomes a cash difference on the next pay or settlement
date. Age position breaks on tighter thresholds than cash breaks of the same monetary size, and escalate rather than accumulate.

## 11. Derivatives, briefly and correctly

Deliberately shallow: this names the mechanics that create postings and stops. Pricing models, greeks computation, volatility surfaces, margin
optimisation and CSA negotiation need a derivatives specialist; hedging and strategy design are `trading-expert`. **Futures carry no principal
cash** — a system that books qty × price × multiplier as a cash payment for a future is wrong from the first trade.

| Flow                 | Mechanics                                     | Postings                                                                                                      |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Initial margin**   | Collateral posted to open                     | Dr Margin receivable (an asset you still own), Cr Cash. **Not an expense**                                    |
| **Variation margin** | Marked and settled in cash **daily**          | Dr/Cr Cash against Realized P&L — daily settlement makes the gain _realized_, not unrealized, in most regimes |
| **Margin call**      | Additional collateral demanded                | A funding obligation with a deadline: a liquidity event, not only an accounting one                           |
| **Close / expiry**   | Offset, cash settlement, or physical delivery | Physical delivery creates a real commodity or security position — model it or refuse deliverable contracts    |

Because variation margin settles daily, a futures position carries **no accumulated unrealized P&L** across days under the standard treatment;
carrying both the VM cash posting and an unrealized mark double-counts.

| Option event                | Position effect                                         | Cash effect                                                                             |
| --------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Buy / write premium         | Long option asset / short option liability              | Cash out / cash in; writing requires margin                                             |
| **Exercise** (you, long)    | Option removed, underlying created at strike            | Cash at strike × qty × multiplier                                                       |
| **Assignment** (you, short) | Option removed, underlying created on the opposite side | Cash at strike — **it happens to you, without your instruction, potentially overnight** |
| **Automatic exercise**      | Clearer exercises in-the-money options by default       | An unexpected underlying position and a cash requirement to fund                        |
| **Expiry worthless**        | Position removed                                        | None; remaining premium is realized                                                     |

Assignment and automatic exercise are the operational risks: positions and cash obligations created without an order, at a time you did not
choose — a system that can only create positions from executions cannot represent them. The greeks, named with what they measure and nothing
more: **delta** — sensitivity of option value to the underlying price; **gamma** — sensitivity of delta to the underlying price; **vega** — to
implied volatility; **theta** — to the passage of time; **rho** — to interest rates. Risk-reporting inputs (float is fine, §2), never inputs to a
posting.

**Swaps and collateral.** OTC derivatives under an ISDA Master with a **Credit Support Annex** exchange collateral against mark-to-market
exposure: periodic valuation, thresholds, minimum transfer amounts, eligible collateral with haircuts, disputes. Whether collateral posted stays
your asset or becomes a receivable, and whether collateral received is recognisable, turns on title transfer versus pledge — determine it, never
assume it. **If your design is deciding how to book collateral, get an accountant and a derivatives-operations specialist in the room** (see
"stop and ask" in SKILL.md); uncleared margin rules and initial-margin models (SIMM) are specialist territory.

## 12. Portfolio measurement

|             | Time-weighted (TWR)                                            | Money-weighted (IRR / MWR)                                        |
| ----------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| Computes    | Geometric linking of sub-period returns, flows removed         | The rate that sets the NPV of flows to zero                       |
| Answers     | "How did the _strategy_ perform?"                              | "What did the _investor_ actually earn?"                          |
| Immune to   | Timing and size of external cash flows                         | Nothing — flows are the point                                     |
| Use for     | Manager and benchmark comparison, composites, fund performance | Client-facing personal returns, private markets, controlled flows |
| Honest when | The manager does not control the flows                         | The investor or manager controls the flows                        |

Reporting one and calling it "your return" without saying which is an M20 failure with a complaints process attached: a client who bought heavily
just before a drawdown has a materially worse money-weighted return than the strategy's time-weighted return, and **both numbers are correct**.
IRR/NPV mechanics are in `corporate-finance.md`.

```python
def twr(subperiods: list[tuple[Decimal, Decimal, Decimal]]) -> Decimal:
    """subperiods: (begin_value, end_value, external_flow_at_period_start). Boundaries must be cut
    AT every external flow; cutting monthly and applying Modified Dietz is an approximation and
    must be labelled as one (M20)."""
    growth = Decimal(1)
    for begin, end, flow in subperiods:
        base = begin + flow
        if base <= 0: raise ValueError("non-positive base: re-cut the period around the flow")
        growth *= end / base
    return growth - Decimal(1)
```

- **Benchmarks** are chosen _ex ante_, with a stated rebalancing and total-return convention, in the portfolio's currency and valuation point.
  Choosing after the fact is a way to be right every quarter.
- **Attribution** decomposes active return into allocation, selection and interaction, plus a currency term. The arithmetic is easy; consistent
  segment mapping, intra-period trading and the residual are not. **A large residual means the inputs disagree — do not distribute it silently.**
- **Composite discipline (GIPS-style)**: every fee-paying discretionary portfolio belongs to at least one composite; composites are defined by
  strategy, not outcome; portfolios cannot be added or removed to flatter the numbers; presentation includes definition, dispersion, portfolio
  count and gross-vs-net of fees. The requirement is **point-in-time composite membership with an audit trail** (M14) — retroactive membership
  change is the fraud.

Every performance output carries period, currency, basis (gross/net, TWR/MWR), valuation source, whether accrued income is included, and whether
it is actual or simulated (M20). A backtested track record labelled as actual is a securities-law problem, not a labelling nitpick.

## 13. Crypto specifics

| Property                                   | Consequence for the books                                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **24/7, no close**                         | No official close and no natural period boundary. _Declare_ a valuation point (e.g. 00:00 UTC) and a source, hold it consistently, accept that the position moves after your cutoff (M10)                                 |
| **Probabilistic finality**                 | A transfer is not final on first inclusion. Declare a confirmation threshold per chain, treat pre-threshold transfers as pending receivables, handle **reorgs** by reversal (M3), never by editing                        |
| **Exchange counterparty risk**             | A balance on an exchange is an unsecured claim on that exchange, not an asset you hold: book it as a receivable and size the concentration as credit exposure (`risk-fraud-aml.md`)                                       |
| **Self-custody**                           | Key management _is_ the custody control: multisig or MPC thresholds, hardware-backed keys, signing quorums implementing separation of duties (M11), a tested recovery procedure. A lost key is an unrecoverable write-off |
| **Network fees**                           | Variable, denominated in token, on every movement — a first-class posting (M16), not a rounding difference                                                                                                                |
| **Token precision**                        | Up to 18 decimals; integer base units are the only safe representation (M4)                                                                                                                                               |
| **Staking rewards**                        | Accrue continuously, received in kind, create a position with a basis. Recognition point (accrual, receipt, unlock) and valuation are accounting determinations — flag and delegate                                       |
| **Forks and airdrops**                     | A position from nothing, with a jurisdiction-specific recognition question. Book the position; **do not improvise the tax treatment**                                                                                     |
| **Wrapped / bridged / staked derivatives** | `stETH` is not `ETH`; a bridged token is a claim on a bridge. Distinct instruments, distinct counterparty risk — never collapsed into one position                                                                        |

For self-custodied assets the chain replaces the custodian statement: reconciliation is proving your books equal on-chain balances at a declared
block height, daily (M9). Two 2026 facts change _who may hold the assets_, which is a design input rather than a compliance footnote. In the EU,
**MiCA's transitional regime for existing VASPs expired on 1 July 2026** — from that date a crypto-asset service provider needs a MiCA CASP
authorisation to serve EU clients at all, so an unlicensed venue in your custody chain is now a continuity risk and not merely a diligence
finding. In the US, the SEC's Division of Trading and Markets stated in **December 2025** that an ordinary broker-dealer may take **possession**
of crypto-asset securities under Rule 15c3-3 if it maintains reasonably designed key-management controls — ending the practical monopoly of the
narrow special-purpose broker-dealer route and making crypto custody a 15c3-3 control question like any other. Neither displaces the rest of this
section: probabilistic finality, reorg handling and confirmation policy are yours regardless of who is licensed. Regulatory perimeter (MiCA, travel
rule, VASP registration) is in `compliance-regulatory.md`; exchange and wallet integration is `fintech-expert`.

## 14. Building and testing

### 14.1 Deterministic replay

The position system should be a **fold over an ordered event stream** — executions, corporate actions, transfers, marks and elections in;
positions, lots and postings out. If replaying from genesis does not reproduce today's state exactly, you have hidden mutable state, a wall-clock
dependency or non-deterministic ordering, and you cannot answer "why is the position 300?" (M1, M17). Make it a test: replay the last N days
nightly and diff against live (event plumbing, outbox and replay tooling: `architecture-ops.md`). Common accidental non-determinism: dict/set
iteration order feeding an allocation, `datetime.now()` inside a computation, float accumulation, "latest price at run time", and lot selection
depending on database row order rather than an explicit sort key.

### 14.2 Golden tests worth writing (M18)

| Area              | Test                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lot accounting    | The §6.1 sequence per method, asserting realized P&L and remaining basis at every step                                                                                                                                                                  |
| Corporate actions | One golden case per action type: total cost invariance across splits, correct basis allocation on spin-offs, correct dividend cash including withholding; and a sell across a split boundary whose realized P&L equals the no-split-equivalent scenario |
| Execution reports | Duplicate, out-of-order, resend-after-restart, bust-and-rebook: exactly one posting per economic fill                                                                                                                                                   |
| Allocation        | Property-based over random block sizes and weights: allocated quantities and money sum **exactly** to the fill                                                                                                                                          |
| Multi-currency    | A position in a non-functional currency across a rate change: no implicit conversion (M6), correct translation postings                                                                                                                                 |
| Settlement        | T+1 across a holiday and a weekend: the settled-vs-traded distinction holds                                                                                                                                                                             |
| Marks             | A mark past its staleness bound produces an exception, not a carried-forward number                                                                                                                                                                     |
| Trial balance     | After any generated scenario, debits equal credits per currency (M2)                                                                                                                                                                                    |

### 14.3 Reconciliation-driven verification (M9, M17)

The strongest test is not a unit test: **positions and cash, derived from the ledger, equal the custodian's and broker's statements, every day,
per instrument, per currency, per account** — with unexplained breaks as a monitored SLO targeting zero and an ageing alert. Derived state (a
position cache, a risk snapshot, a client balance) declares its staleness bound, is continuously recomputed from postings and compared, and
alerts on divergence before a human notices.

### 14.4 Backtesting, and where it stops being this file's problem

| Pitfall                  | What it does                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Look-ahead bias**      | Uses data unavailable at decision time: a restated fundamental, a close applied at 10:00, an action known before announcement |
| **Survivorship bias**    | A universe of today's survivors (§3.3)                                                                                        |
| **Unrealistic fills**    | Fills at the mid, at the close, in unlimited size, with no impact and no queue position                                       |
| **Ignored costs**        | Commission, spread, borrow, financing, taxes, FX — individually small, collectively the entire edge                           |
| **Stale reference data** | Index membership, sector classification and identifier mappings as they are _now_, not as they _were_                         |
| **Overfitting**          | Enough parameters and enough trials produce a strategy from any series                                                        |

Position and cost accuracy is this file's problem: the ledger, lot engine, corporate actions and fee model are what make a backtest's accounting
honest, and they are reusable between backtest and production precisely because they are deterministic (§14.1). **Strategy design, signal
validation, execution simulation, market-impact modelling and the statistics of backtest evaluation belong to `trading-expert`.** Route them
there rather than growing a second, weaker version here.

## Where to check the current text

Everything dated in this file was verified on 2026-09-10 and will drift. These are the primary sources.

| Topic                             | Source                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| EU T+1 and settlement discipline  | Regulation (EU) 2025/2075 on EUR-Lex; https://www.esma.europa.eu/esmas-activities/post-trading/t1  |
| UK T+1                            | https://acceleratedsettlement.co.uk and https://www.fca.org.uk/markets/about-t1-settlement         |
| CSDR penalties, buy-in status     | ESMA CSDR pages; ICMA settlement-discipline resources                                              |
| EU consolidated tape providers    | https://www.esma.europa.eu/esmas-activities/markets-and-infrastructure/consolidated-tape-providers |
| UK consolidated tape              | https://www.fca.org.uk/markets/data-reporting-services-providers                                   |
| Clock synchronisation             | Delegated Regulation (EU) 2017/574 (RTS 25) on EUR-Lex                                             |
| FIX versions and Extension Packs  | https://www.fixtrading.org/supported-versions-of-the-fix-protocol/                                 |
| Broker-dealer reserve and custody | https://www.sec.gov/rules-regulations — Rule 15c3-3 releases and Trading & Markets FAQs            |
| Client assets (UK)                | FCA Handbook CASS — https://www.handbook.fca.org.uk/handbook/CASS                                  |
| Identifiers                       | ISO 10383 MIC list (https://www.iso20022.org/market-identifier-codes); GLEIF for LEIs; OpenFIGI    |
| Fair value                        | IFRS 13 (https://www.ifrs.org) and FASB ASC 820                                                    |
| UK SDRT                           | https://www.gov.uk/government/collections/stamp-duty-reserve-tax                                   |

## Review questions

1. Show me the internal instrument id and the identifier mapping table. What happens when a ticker your system has seen before is reassigned to a
   different issuer, and what happens to trades booked under the old meaning?
2. Where does a `float` cross into a value that reaches a posting, a confirmation or a reconciliation, and at which single declared point is it
   quantised (M4, M5)?
3. Point at the stored position quantity. Is it derived from an append-only movement stream or is it a mutable row — and can you replay from
   genesis and reproduce it exactly (M1, M17)?
4. An execution report arrives twice, and a later one arrives before an earlier one. Show the deduplication key, the ordering key, and prove
   exactly one posting results per economic fill (M8).
5. A 3:1 split occurs overnight on a position with four tax lots and one open GTC limit order. List every artifact that must change, and show the
   test asserting total cost basis is invariant.
6. Which price is _the_ price for each instrument class at month end, what is the fallback chain, what is the staleness bound, and what visibly
   happens when the bound is breached (M20)?
7. A vendor sends a corrected close for a date inside a closed period. What does the system do, and who decides (M10)?
8. Show the postings for a gross dividend with 30% withholding where a 15% treaty rate applies. Where does the reclaim receivable live, how does
   it age, and what is the expected-recovery assumption (M16)?
9. Position reconciliation with the custodian shows a 200-share break with no corresponding cash break. What are the three most likely causes in
   order, and why is this more severe than a cash break of the same monetary size (M9)?
10. For the return figure on the client's screen: time-weighted or money-weighted, gross or net of fees, which valuation source, which period,
    which currency, and does it include accrued income (M20)?
