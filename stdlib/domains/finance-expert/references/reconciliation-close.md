# Reconciliation and close

Reconciliation is the control that converts a belief into a fact. Your ledger says you hold
1,204,331.18 EUR of customer money; the bank says something else; the PSP says a third thing. Exactly
one of those is the money. Reconciliation finds, explains, owns and closes every difference between
what you recorded and what the world recorded (M9); the close freezes a period once every difference
is explained (M10). Engineers under-build both because they look like batch jobs. They are controls —
with named owners, an evidence trail an auditor will read (M14), a separation-of-duties requirement
(M11), and an SLA measured in aged money. The matching code is maybe 20% of the work.

## 1. What reconciliation is, and what it is not

**Three-way reconciliation** — `internal ledger ↔ processor/settlement report ↔ bank statement` — is
the baseline for any business that takes card money. Two-way is not enough: ledger↔PSP proves you
booked what the processor processed and says nothing about whether the money landed; PSP↔bank proves
the payout arrived and says nothing about whether your books know. All three legs, always, because
breaks live in the leg you skipped. The same machinery reconciles anything where two records must
agree:

| Reconciliation            | Left side                                  | Right side                                 | Answers                                              |
| ------------------------- | ------------------------------------------ | ------------------------------------------ | ---------------------------------------------------- |
| Bank / cash               | Cash GL account per bank account           | camt.053 / MT940 closing balance and lines | Does our cash exist?                                 |
| Processor / settlement    | Charge, refund, fee, chargeback sub-ledger | PSP settlement + payout report             | Did the PSP do what we think, for the fees we think? |
| Payout / disbursement     | Payout instructions and their postings     | Bank debits + rail returns                 | Did each payee get paid, once?                       |
| Sub-ledger → GL           | Σ sub-ledger postings per control account  | GL control account balance                 | Is the summary the detail?                           |
| Customer balance / wallet | Σ per-customer balances                    | Ledger liability control account           | Do we owe what we think we owe?                      |
| Position / custody        | Internal position and cash per instrument  | Custodian/broker statement                 | Do we hold what we think? (`markets-trading.md`)     |
| Intercompany              | Entity A receivable from B                 | Entity B payable to A                      | Does consolidation eliminate cleanly?                |
| Suspense / clearing       | Every clearing account                     | Zero, or an explained aged list            | Is anything stuck? (`ledger.md`)                     |

**What reconciliation is not.** _Comparing totals_: `SUM(ours) == SUM(theirs)` is a smoke test, not a
control — two offsetting errors of 4,000 net to zero, and a total match with 340 unmatched items is a
failed reconciliation reporting green. Reconciliation is _item-level_: every line on each side is
either matched to a specific line on the other side, or it is a break with an owner. _A dashboard_: a
"match rate" chart nobody must act on is telemetry; a reconciliation produces a signed statement plus
a list of exceptions with owners. _A reason to edit history_: corrections are reversing entries and new
entries (M3). _Optional for internal money_: wallet balances, points and credits are liabilities; they
reconcile to a control account or they drift.

**The rule.** _Your database is never the authority for money that moved._ For money that moved on a
rail you do not operate, the authority is the rail's record. Your ledger is the authority for _your
accounting of it_ — a different claim. When they disagree you do not "fix the data"; you book the
difference to a break account and investigate (M9, M16).

**Completeness before accuracy.** Most teams build amount comparison first. Wrong order: the dangerous
break is the item on _neither_ side because you never ingested it — the failed download, the day with
no statement, the currency you don't handle. Assert completeness first: sequence continuity, opening
balance = prior closing balance, header control totals, expected file count per day per account.

## 2. Sources and their formats

| Source                                                              | Grain                                                                          | Key identifiers                                                                                      | Traps that cost you a week                                                                                                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PSP settlement report (Stripe/Adyen/Braintree balance transactions) | One row per balance movement: charge, refund, fee, dispute, payout, adjustment | `charge_id`, `balance_transaction_id`, `payout_id`                                                   | Gross vs net payout: some PSPs pay net of fees with no fee line; fee lines can be separate rows _or_ embedded fields; the report timezone is the PSP's; reports are regenerated and change |
| Acquirer/scheme raw files (VISA TC33/VSS, Mastercard IPM/T112)      | Transaction and interchange detail                                             | ARN, RRN, auth code, scheme reference                                                                | Interchange and scheme fees arrive on a different cycle from the funds; transaction, billing and settlement currency all differ; fixed-width EBCDIC in places                              |
| camt.053 (ISO 20022 statement, end-of-day)                          | Entries with entry details, per account per day                                | `<MsgId>`, `<Stmt><Id>`, `<LglSeqNb>`/`<ElctrncSeqNb>`, `<NtryRef>`, `<AcctSvcrRef>`, `<EndToEndId>` | Booking date vs value date; `BOOK` vs `PDNG`; batch entries carrying many `TxDtls`; per-country truncation of remittance info                                                              |
| camt.054 (debit/credit notification) / camt.052 (intraday report)   | Individual advices / provisional entries                                       | `<NtryRef>`, `<EndToEndId>`, `<UETR>`                                                                | Notifications and intraday entries are _not_ authoritative and may never be superseded by a matching camt.053 line; duplicates on redelivery; never post from camt.052                     |
| MT940 / MT942                                                       | Statement lines with free text                                                 | `:20:` ref, `:28C:` statement/sequence no, `:61:` line ref, `:86:` detail                            | `:86:` is a free-text swamp; 34-char reference truncation; `NONREF` everywhere; per-bank dialects (statement semantics in `banking-open-finance.md`)                                       |
| BAI2 (US)                                                           | Statement with type codes                                                      | Type 16 detail, customer reference                                                                   | Type codes vary by bank; lumped lockbox totals                                                                                                                                             |
| Bank CSV export                                                     | Whatever the portal emits today                                                | None reliable                                                                                        | No schema, no sequence number, no gap detection, locale decimal separators, Excel eating leading zeros and turning references into scientific notation. Last resort; expect drift          |
| ACH/SEPA return files (NACHA, pain.002, camt.029)                   | Returned/rejected items                                                        | Original `EndToEndId`, return reason code                                                            | Returns arrive days or weeks later; reason codes drive the accounting treatment                                                                                                            |
| Card scheme dispute files                                           | Chargebacks, representments, arbitration                                       | Case id, ARN                                                                                         | Lifecycle spans months; provisioning differs from realisation (`payments.md`)                                                                                                              |
| Payout/rail confirmations                                           | Per payout                                                                     | Payout id, rail reference                                                                            | "Sent" ≠ "settled"; a wire can be returned                                                                                                                                                 |
| Custodian/broker statements                                         | Positions and cash                                                             | Account, ISIN/CUSIP, dates                                                                           | Trade date vs settlement date; corporate actions restated (`markets-trading.md`)                                                                                                           |

Cross-cutting traps, each of which has caused a restatement somewhere:

| Trap                                       | What happens                                                                                                              | Discipline                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Timezone of the booking date               | PSP books in UTC, the bank in local, you close in the entity's zone; a 23:40 charge lands on a different day on each side | Store the source's raw date string _and_ a tz-aware timestamp; declare per source which field determines the period (M10) |
| Gross vs net payout                        | You expect 100,000; 97,600 arrives; the 2,400 is fees you never booked                                                    | Fees are separate postings (M16); reconcile the payout to `Σ items − Σ fees` and prove all three                          |
| Fee lines as separate rows                 | Double counting when you sum all rows as revenue                                                                          | Classify every row by type before matching; never sum an unclassified file                                                |
| Settlement currency ≠ transaction currency | A JPY charge settles in EUR at the PSP's rate; the difference is FX spread, not a break                                   | Record both amounts and the implied rate; book the spread (M6, M16)                                                       |
| File redelivery and restatement            | The same file arrives twice, or a corrected version under the same name                                                   | Hash the content, version the file, never overwrite (§3)                                                                  |
| The file's own cutoff                      | A "daily" file covers 00:00–00:00 in _their_ window, overlapping two of your days                                         | Model the declared coverage window as data, not as an assumption                                                          |
| Missing days                               | Weekend/holiday: no file, or a file with zero entries — both valid; no file on a business day is an incident              | An expected-file calendar per source per account                                                                          |

## 3. Ingestion discipline

Ingestion is where reconciliation becomes trustworthy or does not. Four rules.

**1. Idempotent file ingestion (M7).** A file's natural idempotency key is the SHA-256 of its bytes
plus the source and declared statement identity. Re-ingesting identical bytes is a no-op returning the
original ingestion id. Re-ingesting _different_ bytes under the same statement identity is a
restatement — an event, not an overwrite.

**2. Immutable raw storage (M3, M14).** Persist the original bytes to object storage before parsing,
with retrieval metadata (source, account, fetched-at, path, hash, size, credential identity — never
the credential, M15). Every downstream row references the raw object, so "show me the bank statement
supporting this line" produces the original file, not your parse of it.

**3. Parse then normalise, as separate stages.** Parsing yields source-shaped records with the source's
own field names and raw strings; normalisation maps them to the canonical external-line model with
typed amounts (M4), tz-aware timestamps, classified line types and extracted references. Separate, so
a normalisation fix re-runs over stored parses without re-fetching and a parser change is diffable
against golden files.

**4. Detect gaps and drift, loudly**, at ingest rather than at close.

```sql
-- Ingestion tables. Append-only; nothing here is ever UPDATEd or DELETEd (M3).
CREATE TABLE recon_source_file (
    id              BIGSERIAL PRIMARY KEY,
    source_code     TEXT NOT NULL,                -- 'ADYEN_SETTLEMENT', 'BANK_DE_CAMT053'
    account_ref     TEXT NOT NULL,                -- IBAN, merchant account, PSP account
    content_sha256  BYTEA NOT NULL,
    object_uri      TEXT NOT NULL,                -- immutable blob location
    stmt_identity   TEXT,                         -- camt <Stmt><Id>, MT940 :28C:, report id
    stmt_seq_no     BIGINT,                       -- legal/electronic sequence number
    coverage_from   TIMESTAMPTZ NOT NULL, coverage_to TIMESTAMPTZ NOT NULL,
    currency        CHAR(3) NOT NULL,
    opening_balance NUMERIC(38,8), closing_balance NUMERIC(38,8),
    declared_count  INTEGER, declared_sum NUMERIC(38,8),   -- control totals from the header
    supersedes_id   BIGINT REFERENCES recon_source_file(id),   -- restatement chain
    superseded_by   BIGINT REFERENCES recon_source_file(id),
    parser_version  TEXT NOT NULL,
    status          TEXT NOT NULL,                -- INGESTED | QUARANTINED | SUPERSEDED
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_code, account_ref, content_sha256)
);
-- Exactly one live version per declared statement identity.
CREATE UNIQUE INDEX recon_stmt_identity_live ON recon_source_file
    (source_code, account_ref, stmt_identity)
    WHERE stmt_identity IS NOT NULL AND superseded_by IS NULL;

CREATE TABLE recon_external_line (
    id           BIGSERIAL PRIMARY KEY,
    file_id      BIGINT NOT NULL REFERENCES recon_source_file(id), line_no INTEGER NOT NULL,
    external_id  TEXT,                            -- NtryRef, balance_transaction_id
    line_type    TEXT NOT NULL,                   -- CHARGE|REFUND|FEE|PAYOUT|DISPUTE|ADJ|UNKNOWN
    amount_minor BIGINT NOT NULL, currency CHAR(3) NOT NULL,      -- signed minor units (M4)
    txn_amount_minor BIGINT, txn_currency CHAR(3),-- original currency when settlement differs (M6)
    booking_date DATE NOT NULL, value_date DATE,  -- booking date in the source's own timezone
    event_time   TIMESTAMPTZ,                     -- when it happened, if the source says (M10)
    counterparty TEXT,
    refs         JSONB NOT NULL DEFAULT '{}',     -- extracted candidate references
    raw          JSONB NOT NULL,                  -- the parsed source record, verbatim
    UNIQUE (file_id, line_no)
);
CREATE INDEX ON recon_external_line (currency, booking_date, amount_minor);   -- blocking key
CREATE INDEX ON recon_external_line USING GIN (refs jsonb_path_ops);
```

Continuity checks, each of which pages someone on failure:

| Check                | Assertion                                                      | Failure means                                         |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| Sequence continuity  | `stmt_seq_no` = previous + 1 per source+account                | A statement was never fetched. Do not close.          |
| Balance chaining     | `opening_balance` = previous `closing_balance`                 | A file or a line is missing, or the bank restated     |
| Control totals       | `count(lines)` = `declared_count`, `Σ amount` = `declared_sum` | Parse loss or truncation                              |
| Internal consistency | `opening + Σ lines = closing`                                  | The parser dropped or duplicated entries              |
| Expected calendar    | A file exists for every expected business day                  | Fetch failure — silent until close, then a fire drill |
| Schema drift         | Unknown column/tag/record type, or a known one missing         | The source changed. Quarantine; do not guess.         |

**Schema drift detection** is a hard fail with quarantine, not a warning. Fingerprint each file
structurally (sorted column names for CSV, sorted XPaths for XML, record type codes for fixed-width)
and compare against the registered fingerprint for that source+parser version. Unrecognised structure
→ store the file, mark the ingestion `QUARANTINED`, normalise nothing, let a human decide. A parser
that silently ignores an unknown column will silently ignore a new fee type, and you find out in the
P&L.

**Restatement handling.** When a source re-issues a corrected file, never overwrite: insert a new
`recon_source_file` with `supersedes_id` set, normalise its lines, re-run matching for the affected
window. The old version's lines are marked superseded, not deleted; matches referencing them are
invalidated and re-proposed; ledger postings already made from them are corrected by reversal (M3).
Keep both versions forever — "why did the number change between Tuesday and Wednesday" only has a
factual answer if you did.

## 4. The matching engine

### 4.1 The reference-propagation problem

Matching is trivial when both sides carry the same identifier and impossible when they do not. The
engineering work is upstream: **get your identifier into the rail's reference field and make sure it
comes back.**

| Rail                        | Field you control                      | Practical width               | Comes back in                                                      |
| --------------------------- | -------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| SEPA credit transfer        | `EndToEndId`                           | 35 chars, alphanumeric        | camt.053 entry details, pain.002                                   |
| SEPA direct debit           | `EndToEndId`, mandate id               | 35                            | camt.053, camt.054, return files                                   |
| SWIFT / wire                | `:20:` sender ref, UETR                | 16 (`:20:`); UETR is a UUID   | MT940 `:61:`/`:86:` — often truncated or mangled by intermediaries |
| Card (via PSP)              | `metadata` / `reference` on the charge | PSP-defined, usually generous | The PSP settlement report, not the bank statement                  |
| ACH                         | Individual ID / addenda                | 15 / 80                       | NACHA return and settlement files                                  |
| Faster Payments / RTP / Pix | Reference / txid                       | Rail-defined                  | Rail statement                                                     |

Design rules: the reference is an opaque, collision-free, checksummed id you generated (not a customer
name, not a reusable invoice number); **uppercase alphanumeric only**, because intermediaries mangle
punctuation and case; it fits the _narrowest_ field on the path; it is stored on the internal record
before you instruct the rail (M7 — the same key that makes the instruction idempotent); and you assume
it will sometimes be absent, truncated to 16 characters, or wrapped in the counterparty's own text, so
you match on checksum-validated extraction rather than equality alone. For inbound money you do not
control, you propagate the reference by _publishing_ it (invoice, payment instructions, portal) and
accept that 5–20% of humans will not use it — hence the heuristic passes.

### 4.2 Pass architecture

Matching is an ordered pipeline of passes, strongest evidence first. Each pass consumes only
still-unmatched items; each match records the pass, the rule and the evidence (M14). Never run
heuristics before deterministic passes: a fuzzy pass that consumes an item a later exact rule would
have matched is a data-corruption bug wearing the costume of a break.

| #   | Pass                   | Rule                                                     | Cardinality | Confidence            |
| --- | ---------------------- | -------------------------------------------------------- | ----------- | --------------------- |
| 1   | External id            | `external_id` = stored provider id on our record         | 1:1         | 1.00, auto            |
| 2   | Propagated reference   | Extracted `EndToEndId`/reference = our payment ref       | 1:1         | 1.00, auto            |
| 3   | Batch/payout expansion | Payout id → the items the PSP says compose it            | 1:N         | 1.00, auto            |
| 4   | Composite exact        | (amount, currency, counterparty account, date ±0)        | 1:1         | 0.95, auto            |
| 5   | Amount + window        | (amount, currency) within ±D days, unique on both sides  | 1:1         | 0.90, auto if unique  |
| 6   | Sum-to-one             | Σ of our items = one of their lines within the window    | N:1         | 0.85, auto with a cap |
| 7   | Net settlement         | Σ ours (gross − fees − refunds) = Σ theirs over a window | N:M         | 0.70, review          |
| 8   | Fuzzy counterparty     | Normalised name/IBAN similarity + amount tolerance       | 1:1         | ≤0.60, review         |
| 9   | Learned                | Historical operator decisions on similar features        | 1:1         | ≤0.60, suggest-only   |

Auto-match thresholds are policy: declared in configuration, versioned, owned by finance — not
constants in code. A rule that auto-matches at 0.60 books wrong money quietly.

### 4.3 Cardinality

**1:1** is the ideal — one charge, one statement line. **1:N / N:1** — a payout batching many charges,
a bank credit covering ten invoices — is modelled as a _group_: a match holds a set of internal lines
and a set of external lines and must satisfy `Σ internal = Σ external` per currency, with any
deliberate difference (fees, spread) an explicit member of the group rather than a residual you
tolerate away (M16). **N:M** — net settlement, where a PSP nets charges, refunds, fees, chargebacks and
reserve movements into one payout — is never solved by free-form search: that is combinatorially
hopeless and manufactures coincidental matches. Use the _provider's own grouping_ (the payout id on
each balance transaction) to build the group deterministically, then verify the arithmetic. If the
provider gives no grouping, reconcile at aggregate level with a documented reconciling-items statement
rather than pretending you matched line by line.

### 4.4 Tolerance

A tolerance is legitimate only when it corresponds to a _known physical cause_ with a bounded
magnitude, and the difference is **booked** somewhere (M5, M16):

| Tolerance            | Legitimate when                                                         | Book the difference to      |
| -------------------- | ----------------------------------------------------------------------- | --------------------------- |
| ±1 minor unit        | Rounding of an allocation or a converted amount (`money-arithmetic.md`) | Rounding difference account |
| ±N minor units on FX | Rate applied at a slightly different timestamp/precision                | FX gain/loss (realised)     |
| ±D days              | Rail settlement lag between event and bank booking                      | Nothing — timing, not value |
| Fee-shaped delta     | The known fee schedule reproduces the delta exactly                     | Fee expense                 |

A tolerance is a bug in disguise when the delta has no explanation you can compute from the fee
schedule or the rate; when it is _always the same sign_ (you are systematically losing or gaining);
when it scales with volume (a percentage error, not a rounding error); or when it had to be widened to
make yesterday's run go green. **Widening a tolerance needs the same approval as a write-off**, because
that is what it is — an automated write-off with no ceiling. Record tolerance consumption in money, per
rule, per day, and alert on the trend: a tolerance eating 40 EUR/day eats 14,600 EUR/year.

### 4.5 Explainability and storage

Store _why_, not just _that_: the pass, rule id, rule version, the evidence (which fields matched, with
which values), the confidence, the tolerance consumed, and who confirmed it. Six months later an
auditor asks how you know a particular 220,000 EUR credit belongs to a particular payout batch; "the
algorithm matched it" is not an answer.

```sql
CREATE TABLE recon_match (
    id              BIGSERIAL PRIMARY KEY,
    run_id          BIGINT NOT NULL REFERENCES recon_run(id),
    rule_id         TEXT NOT NULL, rule_version TEXT NOT NULL, pass_no SMALLINT NOT NULL,
    confidence      NUMERIC(4,3) NOT NULL,
    mode            TEXT NOT NULL,             -- AUTO | PROPOSED | CONFIRMED | REJECTED
    evidence        JSONB NOT NULL,            -- {"on":["ref","amount"],"reference":"PMT7QK…"}
    tolerance_minor BIGINT NOT NULL DEFAULT 0, tolerance_ccy CHAR(3),
    decided_by      TEXT,                      -- NULL for AUTO; never an automation identity (M11)
    decided_at      TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE recon_match_member (
    match_id BIGINT NOT NULL REFERENCES recon_match(id),
    side     TEXT   NOT NULL,                  -- INTERNAL | EXTERNAL
    line_id  BIGINT NOT NULL,
    PRIMARY KEY (match_id, side, line_id)
);
-- One live match per line; unmatching writes a new row, it never edits one (M3).
CREATE UNIQUE INDEX ON recon_match_member (side, line_id)
    WHERE match_id IN (SELECT id FROM recon_match WHERE mode IN ('AUTO','CONFIRMED'));
```

### 4.6 Performance at scale

At 10M lines a day, `O(n²)` candidate generation is not a slow implementation, it is the wrong
algorithm. **Blocking keys**: a few hash keys per line (`(currency, amount_minor)`, `(currency,
amount_minor, booking_date)`, `(normalised_ref)`, `(counterparty_hash, amount_minor)`); candidates are
only lines sharing a block; join in the database or in one hashed in-memory pass, never nested loops
over the day. **Incremental windows**: a run covers `[T−lag, T]` where `lag` is the longest rail
settlement delay plus margin (ACH returns 60 days; disputes reconcile on their own cycle, not the
daily cash one), matched lines excluded by index rather than scan, plus a separate "aged unmatched"
pool that every run re-attempts so a 40-day-old item still matches today without re-scanning 40 days.
**Deterministic, idempotent runs**: a run is keyed by its inputs — the file _versions_ it saw and the
rule-set version — which is what makes replaying a fixed matcher over history possible at all (§14).

### 4.7 Reference implementation sketch

```python
"""Matching engine core. Python 3.11+. Integer minor units only (M4); no floats anywhere."""
from __future__ import annotations
from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Literal, Protocol

Side = Literal["INTERNAL", "EXTERNAL"]

@dataclass(frozen=True, slots=True)
class Line:
    line_id: int; side: Side
    amount_minor: int                        # signed minor units
    currency: str                            # ISO 4217 (M4, M6)
    booking_date: date
    refs: frozenset[str] = frozenset()       # normalised candidate references

@dataclass(frozen=True, slots=True)
class Match:
    rule_id: str; rule_version: str; pass_no: int
    internal: tuple[int, ...]; external: tuple[int, ...]   # groups, so 1:N is native
    confidence: float
    evidence: dict[str, object]              # why, not merely that (§4.5)
    tolerance_minor: int = 0

class Rule(Protocol):                        # every pass implements exactly this
    rule_id: str; rule_version: str; confidence: float; auto: bool
    def propose(self, pool: "Pool") -> Iterator[Match]: ...

class Pool:
    """Unmatched lines plus blocking indexes; a consumed line is never revisited."""
    def __init__(self, lines: Iterable[Line]) -> None:
        self._lines = {l.line_id: l for l in lines}; self._consumed: set[int] = set()

    def alive(self, side: Side) -> list[Line]:
        return [l for l in self._lines.values()
                if l.side == side and l.line_id not in self._consumed]

    def block(self, side: Side) -> dict[tuple[str, int], list[Line]]:
        idx: dict[tuple[str, int], list[Line]] = {}      # the blocking key of §4.6
        for l in self.alive(side): idx.setdefault((l.currency, l.amount_minor), []).append(l)
        return idx

    def consume(self, m: Match) -> bool:
        ids = set(m.internal) | set(m.external)
        if ids & self._consumed: return False            # a stronger pass already took a member
        self._consumed |= ids
        return True

class ReferenceRule:
    """Pass 2: propagated reference equality. Ambiguity is a break, not a coin flip."""
    rule_id, rule_version, confidence, auto = "REF_EXACT", "3", 1.0, True

    def propose(self, pool: Pool) -> Iterator[Match]:
        by_ref: dict[str, list[Line]] = {}
        for l in pool.alive("EXTERNAL"):
            for r in l.refs: by_ref.setdefault(r, []).append(l)
        for ours in pool.alive("INTERNAL"):
            cands = {c.line_id: c for r in ours.refs for c in by_ref.get(r, [])}
            if len(cands) != 1: continue
            theirs = next(iter(cands.values()))
            if theirs.currency != ours.currency: continue           # M6, never net across ccy
            if theirs.amount_minor != ours.amount_minor: continue   # amount delta → break
            yield Match(self.rule_id, self.rule_version, 2,
                        (ours.line_id,), (theirs.line_id,), self.confidence,
                        {"on": ["reference", "amount", "currency"],
                         "reference": sorted(ours.refs & theirs.refs)})

@dataclass(slots=True)
class AmountWindowRule:
    """Pass 5: amount+currency inside a date window, only when unique on BOTH sides."""
    window_days: int = 3
    rule_id: str = "AMT_WINDOW"; rule_version: str = "2"
    confidence: float = 0.90; auto: bool = True

    def propose(self, pool: Pool) -> Iterator[Match]:
        blocks, hits, staged = pool.block("EXTERNAL"), {}, []
        for ours in pool.alive("INTERNAL"):
            lo = ours.booking_date - timedelta(days=self.window_days)
            hi = ours.booking_date + timedelta(days=self.window_days)
            cands = [t for t in blocks.get((ours.currency, ours.amount_minor), [])
                     if lo <= t.booking_date <= hi]
            if len(cands) != 1: continue                  # ambiguity → leave it for a human
            hits[cands[0].line_id] = hits.get(cands[0].line_id, 0) + 1
            staged.append(Match(self.rule_id, self.rule_version, 5,
                                (ours.line_id,), (cands[0].line_id,), self.confidence,
                                {"on": ["amount", "currency", "date_window"],
                                 "day_delta": (cands[0].booking_date - ours.booking_date).days}))
        yield from (m for m in staged if hits[m.external[0]] == 1)   # unique the other way too

# Pass 3 (N:1) has the same shape: take the provider's own grouping {payout_line: [our_lines]},
# refuse it unless the members share one currency (M6) and Σ members == −payout exactly, then
# yield one Match whose `internal` tuple is the whole group. A residual is a break, never a plug.

@dataclass(slots=True)
class RunResult:
    matches: list[Match] = field(default_factory=list)
    proposals: list[Match] = field(default_factory=list)     # need a human (M11)
    unmatched: list[Line] = field(default_factory=list)      # become break objects (§6)

def run_passes(lines: Sequence[Line], rules: Sequence[Rule],
               auto_threshold: float = 0.90) -> RunResult:
    """Ordered passes, strongest evidence first. Deterministic: no wall clock, stable order."""
    pool, out = Pool(lines), RunResult()
    for rule in rules:
        for m in list(rule.propose(pool)):               # materialise before consuming
            if not (rule.auto and m.confidence >= auto_threshold):
                out.proposals.append(m)
            elif pool.consume(m):
                out.matches.append(m)
    out.unmatched = pool.alive("INTERNAL") + pool.alive("EXTERNAL")
    return out
```

Nothing in `proposals` or `unmatched` may be silently dropped, and nothing posts to the ledger without
the confirmation step: automation proposes, a person approves (M11).

## 5. Break taxonomy

Classify every break — an unclassified break is an unowned break, and unowned breaks age into
write-offs. The correcting entry is always a new entry or a reversal, never an edit (M3).

| Break type                            | Definition                                                     | Likely cause                                                                                                      | Correcting entry                                                                                                                               | Accounting or engineering?                                                                 |
| ------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Timing / in-transit**               | On both sides, in different periods                            | Rail settlement lag; file cutoff window; timezone                                                                 | None at item level; carry an in-transit clearing balance (`Dr Cash in transit / Cr PSP receivable` at instruction, cleared on the bank credit) | Neither — expected. A bug once the in-transit balance stops clearing within the rail's SLA |
| **Missing in ours**                   | On the statement, not in our ledger                            | Webhook lost or never sent (M8); event dropped; a rail movement we never initiated (bank fee, interest, reversal) | Book it from the external evidence — `Dr Cash / Cr <the right income or liability>` — in the open period, referencing the event date (M10)     | Both: book it, then fix the ingestion gap                                                  |
| **Missing in theirs**                 | We booked it, no statement line                                | Instruction never actually sent; silently rejected; wrong account; still in flight                                | If genuinely not sent: reverse the original entry (M3) and re-instruct under a new idempotency key. If in flight: reclassify as timing         | Usually an engineering bug — a failed side effect booked as if it succeeded                |
| **Amount mismatch**                   | Matched item, different amount                                 | Fee netted into the principal; partial capture; FX applied; partial refund                                        | Book the delta to its true account — fee expense, FX gain/loss, a receivable — never plug the principal (M16)                                  | Fees are accounting; a systematically wrong amount is a bug                                |
| **Duplicate**                         | One economic event booked twice on one side                    | Retry without an idempotency key (M7); webhook redelivery not deduped (M8); file ingested twice                   | Reverse the duplicate in full, citing the original (M3)                                                                                        | Engineering bug, always. Escalate: duplicates usually mean a customer was charged twice    |
| **FX difference**                     | Agrees in transaction currency, differs in settlement currency | Rate timestamp differs; provider spread; triangulation                                                            | `Dr/Cr FX gain or loss` for the realised difference; spread to its own account (M6, M16)                                                       | Accounting, unless the rate source or timestamp policy is wrong                            |
| **Fee not booked**                    | The statement shows a fee your ledger does not                 | Fee schedule change; new fee type; netted payout                                                                  | `Dr Payment processing fees / Cr Cash or PSP receivable`                                                                                       | Both: book it, then model the fee type (M16)                                               |
| **Rounding residue**                  | Sub-minor-unit differences accumulating                        | Allocation rounding; per-item vs per-batch rounding; FX precision                                                 | `Dr/Cr Rounding difference` — a real account with a real owner (M5, M16)                                                                       | Accounting while bounded; a bug once it grows with volume                                  |
| **Wrong account**                     | Money landed in or left the wrong account                      | Misconfigured mapping; customer paid the wrong IBAN; mis-keyed payout                                             | Reclassification entry between the two accounts, both legs explicit                                                                            | Engineering/config bug; externally, an operational return                                  |
| **Chargeback / return not reflected** | Statement debit for a dispute or ACH return we have not booked | Dispute lifecycle not integrated; return file not ingested                                                        | `Dr Chargeback expense or Customer receivable / Cr Cash`, plus reversal of any provision (`payments.md`)                                       | Both: book it, then integrate the feed                                                     |
| **Unidentified receipt**              | Money arrived; we cannot say whose                             | Missing or mangled reference                                                                                      | `Dr Cash / Cr Unapplied receipts (liability)` — never revenue — and work the identification queue                                              | Accounting placeholder; the fix is reference propagation (§4.1)                            |
| **Provider adjustment**               | A correction line with no counterpart                          | Scheme adjustment, interchange restatement, chargeback reversal                                                   | Book to the account the adjustment description names; if unidentifiable, suspense with an owner and an age                                     | Accounting, until it recurs                                                                |

Two rules finance insists on and engineers resist. **The correcting entry is never a plug to the
principal account** — you do not "adjust revenue" to make cash agree, you find the account the
difference belongs to (M16). And **breaks are booked, not merely tracked**: a break past the
materiality threshold that has not been posted to a break or suspense account is a real difference
sitting outside the books, so the trial balance is describing a world you already know is wrong.

## 6. Break management as an operational object

A break is a first-class record with a lifecycle (M9, M14), not a row in someone's spreadsheet.

```sql
CREATE TABLE recon_break (
    id               BIGSERIAL PRIMARY KEY, run_id BIGINT NOT NULL,
    reconciliation   TEXT NOT NULL,     -- 'BANK_DE', 'PSP_ADYEN', 'SUBLEDGER_GL_CASH'
    break_type       TEXT NOT NULL,     -- taxonomy in §5
    side             TEXT NOT NULL,     -- INTERNAL | EXTERNAL | BOTH
    amount_minor     BIGINT NOT NULL, currency CHAR(3) NOT NULL,
    detected_on      DATE NOT NULL,
    source_event_date DATE,             -- the date the underlying item claims (M10)
    owner            TEXT NOT NULL,     -- a named person or rota, never 'system'
    status           TEXT NOT NULL,     -- OPEN|INVESTIGATING|PENDING_EXTERNAL|RESOLVED|WRITTEN_OFF
    materiality      TEXT NOT NULL,     -- LOW | MEDIUM | HIGH | REPORTABLE
    resolution_entry BIGINT,            -- the journal entry that closed it (M3)
    root_cause       TEXT, closed_at TIMESTAMPTZ, closed_by TEXT,
    CONSTRAINT closed_needs_evidence CHECK (status NOT IN ('RESOLVED','WRITTEN_OFF')
      OR (resolution_entry IS NOT NULL AND closed_by IS NOT NULL AND root_cause IS NOT NULL))
);
CREATE INDEX ON recon_break (status, reconciliation, currency, detected_on);
```

The aging report is the operational artifact, produced daily rather than at close. Report **gross**
exposure (`Σ|amount|`): netting is how a +50,000 and a −50,000 break become a clean report while a
customer is missing 50,000.

```sql
SELECT reconciliation, currency,
       width_bucket(CURRENT_DATE - detected_on, ARRAY[3,8,31,91]) AS bucket, -- 0-2/3-7/8-30/31-90/90+
       count(*)                        AS n,
       sum(abs(amount_minor))          AS gross_exposure_minor,
       max(CURRENT_DATE - detected_on) AS oldest_days,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY CURRENT_DATE - detected_on) AS age_p95
FROM recon_break WHERE status NOT IN ('RESOLVED','WRITTEN_OFF')
GROUP BY 1,2,3 ORDER BY 1,2,3;
```

| Age bucket | Expectation                                      | Escalation                                                                   |
| ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 0–2 days   | Normal working inventory; timing breaks dominate | Owner works the queue                                                        |
| 3–7 days   | Classified, and either resolved or explained     | Daily standup on the list; team lead informed                                |
| 8–30 days  | Written root cause and a target close date       | Finance manager owns it; goes on the close blockers list                     |
| 31–90 days | Systemic — a missing feed or an unfixed bug      | Controller plus an engineering owner; remediation ticket mandatory           |
| 90+ days   | Presumed unexplainable                           | Write-off proposal, or a documented reason it stays open; disclosed at close |

**Materiality** is set by finance, per reconciliation, in absolute currency and as a percentage of the
account balance, and it drives investigation _depth_, never whether the break exists. A 3 EUR break is
still a break; it may be batch-resolved to the rounding account under a standing written policy that
caps total batch-resolved value per period.

**Write-offs** book a real loss or gain, so: the investigator proposes and a named approver at the
right threshold approves — automation may propose, never approve (M11); thresholds are tiered (say
<100 team lead, <5,000 finance manager, <50,000 controller, above that CFO), declared in configuration
and enforced by the system rather than by convention (M12); the entry carries the break id in its
narrative and posts to a designated write-off account, never buried in revenue or cost (M16); and
write-off volume is a reported metric — growth means the reconciliation is failing and the write-off
is concealing it.

**A growing suspense account is an incident.** A suspense/clearing account holds value in transit for a
short declared period; its balance should oscillate around zero and clear within the rail's settlement
window. Monotonic growth means you are systematically receiving or paying money you cannot explain.
Alert on absolute balance, on the count of items older than the clearing SLA, and on growth over N
consecutive days, and treat it with the severity of an availability incident — it is a correctness
incident with a regulator attached. Clearing-account design is in `ledger.md`.

## 7. Controls and evidence

Reconciliation is a control, and a control that leaves no evidence did not happen.

| Control                        | Concretely                                                                                           | Invariant |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | --------- |
| Preparer / reviewer separation | Whoever runs the reconciliation cannot sign it off; whoever proposes a write-off cannot approve it   | M11       |
| Completeness of inputs         | Sequence and balance-chain assertions passed for every source in scope, evidenced by the run record  | M9        |
| Item-level matching            | Unmatched inventory reported with count and gross value, not a totals comparison                     | M9        |
| Break ownership                | Every open break has a named owner and an age                                                        | M9        |
| Correcting entries             | Corrections are reversals or new entries, each traceable to a break id                               | M3        |
| Manual journal approval        | Every manual JE has a preparer, an approver, supporting evidence, and cannot be self-approved        | M11       |
| Access control                 | Who may run, confirm a match, approve a write-off, post to the GL — object-level, reviewed quarterly | M11       |
| Change control                 | Matching rules, tolerances and account mappings are versioned artifacts with a reviewed history      | M14       |
| Evidence retention             | Raw files, run records, match evidence, break history and sign-offs retained and queryable           | M14       |

**The sign-off artifact.** At the end of each reconciliation period, generate an immutable document and
store it, hashed, with the run: reconciliation name and period; opening and closing balance per side;
reconciling items with amounts and ages; matched value and count; unmatched gross value and count;
breaks created, resolved and written off; the journal entries produced; preparer, reviewer and both
timestamps. This is the first artifact an auditor asks for, and generating it from the system rather
than assembling it from screenshots is the difference between a clean audit and a sampling exercise.

**The control matrix** an auditor will request, per reconciliation: control id and description
("CASH-01: daily three-way reconciliation of EUR acquiring"); frequency; named owner and reviewer;
population and completeness evidence (which sources, which files, sequence proof); materiality and
tolerance thresholds in force with their approval reference; evidence produced (sign-off artifact id,
run id, break list); exceptions in the period with count, value and resolution status; and which steps
are system-enforced rather than manual — because those steps are ITGC-dependent.

**SOX ITGC** applies to the systems producing the numbers, not only to the numbers. Where the
reconciliation is automated, the auditor tests general controls over the automating system: change
management (who deploys a matching-rule change, with what review), logical access (who can post
journals or alter tolerances, with evidence of periodic review), and operations (scheduling, failure
detection, backup/restore, evidence a failed run was noticed and re-run). A perfect matching engine
behind a `main` branch anyone can push to is a control deficiency regardless of correctness. Regimes
and evidence in `compliance-regulatory.md`; deployment and access mechanics in `architecture-ops.md`.

## 8. Cutoff and periods

Three times, always distinguished (M10):

| Time                  | Meaning                                                                              | Source                                     | Used for                                                |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------- |
| **Event time**        | When the economic event occurred (card authorised, service delivered, wire released) | The originating system or the rail         | Revenue recognition, cutoff, customer-facing statements |
| **Booking time**      | When your ledger recorded it                                                         | Your clock at posting                      | Audit trail, "as of" reproducibility of a report        |
| **Accounting period** | The period the entry belongs to                                                      | Derived from event time by the cutoff rule | The financial statements                                |

**The cutoff rule, precisely.** An entry belongs to period _P_ if its **event time**, converted to the
**entity's accounting timezone**, falls within _P_'s boundaries, and _P_ is open at booking time. If
_P_ is closed, the entry posts to the earliest open period with an explicit reference to the original
event date and an out-of-period flag. Booking time never determines the period. That paragraph,
written down and enforced in code, prevents most cutoff arguments.

**Timezone policy for a global business.** Declare, per legal entity, the accounting timezone (usually
the entity's local zone; some groups standardise the sub-ledger on UTC and translate at consolidation).
Store every timestamp tz-aware in UTC plus its originating zone and derive the period by explicit
conversion, never a naive date cast — a 23:55 UTC transaction in a UTC−8 entity is the previous day,
and `date(created_at)` gets a slice of every day's volume wrong. Sources emitting _dates_ with no time
or zone (most bank statements) get a per-source declaration that their booking date _is_ the
period-determining field; record that decision instead of inferring it.

**Late-arriving items** are normal: a settlement file after cutoff, a fee reported a week late, a
chargeback for a Q1 charge landing in Q3.

| Situation                              | Treatment                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relates to the open period             | Post normally                                                                                                                                     |
| Relates to a closed period, immaterial | Post to the current open period referencing the original date; disclose in the close pack once aggregate out-of-period value passes the threshold |
| Relates to a closed period, material   | A restatement question — escalate to the finance owner; do not decide it in code                                                                  |
| Was accrued for                        | Post the actual; the accrual reversal already handled the period (§10)                                                                            |

**Nothing posts to a closed period, ever (M10).** Enforce it in the ledger, not the application: a
period status table, a check constraint or trigger on posting, and separate authorization to reopen a
soft-closed period as a logged, approved event rather than a config flag. If the ledger accepts a
backdated posting, someone will make one at 23:00 on the last day of the audit.

| Close state        | Who can post                                         | Purpose                                          |
| ------------------ | ---------------------------------------------------- | ------------------------------------------------ |
| OPEN               | Automation and humans                                | Normal operation                                 |
| SOFT_CLOSED        | Approved adjusting entries only, by finance          | Review window; reports provisional but published |
| CLOSED             | Nobody; reopening needs named approval and is logged | Reports final for internal use                   |
| PERMANENTLY_CLOSED | Nobody, no reopen path                               | Post-audit / post-filing                         |

**Soft close vs hard close.** Soft close (D+2 to D+3) freezes the sub-ledgers and produces provisional
management numbers with a declared basis (M20) — good enough to run the business, marked provisional.
Hard close (D+5 to D+8) completes accruals, reconciliations, FX revaluation, intercompany and review,
then locks. Publishing a soft-close number without the "provisional" label is how a board deck ends up
contradicting the statutory accounts.

**Subsequent events.** Between period end and issue of the accounts, information arrives. An event
giving evidence about a condition that _existed_ at period end is **adjusting** — a customer becoming
insolvent the following week, confirming a receivable was already impaired; a chargeback confirming a
provision was insufficient. An event about a _new_ condition is **non-adjusting**: disclosed, not
booked. Engineers matter here because the data feed's cutoff decides what evidence finance ever sees —
if disputes are ingested weekly, adjusting information is invisible until it is too late.

## 9. The close

### 9.1 Close calendar (D0 = last calendar day of the period)

| Day     | Activity                                                                                                                                                                      | Owner                | Exit criterion                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| **D0**  | Freeze operational cutoff; final ingests; snapshot sub-ledger balances; run the period-end job set                                                                            | Engineering          | Every source for the period ingested; sequence and balance chains intact    |
| **D+1** | Final-day reconciliations; cash reconciled per bank account; PSP settlement reconciled; break inventory refreshed and triaged                                                 | Recon team           | Unmatched gross value per reconciliation below threshold, or explained      |
| **D+2** | Sub-ledger → GL agreement per control account; accruals; FX revaluation; intercompany matching. **Soft close**: provisional P&L and balance sheet, labelled provisional (M20) | Accounting           | Every control account agrees or has a documented reconciling item           |
| **D+3** | Revenue recognition run and review; deferred revenue rollforward; provisions (chargeback, credit loss); payroll and accruals; manual JEs prepared                             | Revenue + accounting | The waterfall ties: opening + billings − recognised ± adjustments = closing |
| **D+4** | Flux/variance analysis vs prior period and budget with explanations above threshold; reviewer sign-off per reconciliation; manual JE approval                                 | Controller           | Every reconciliation signed by a reviewer who is not the preparer (M11)     |
| **D+5** | **Hard close**: period locked; reporting pack generated from the ledger (M19); close metrics recorded; blockers retrospective                                                 | Controller           | Period status CLOSED; trial balance reproduced from postings and archived   |

Compress this calendar by pushing work earlier — continuous daily reconciliation, accruals computed
daily, revenue recognised on a rolling basis — never by skipping steps. A five-day close is a
_consequence_ of clean daily reconciliation, not of working faster in the last week.

### 9.2 Checklist by area

| Area                  | Checks                                                                                                                               | Typical entries                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| **Cash**              | Every bank account reconciled to statement; in-transit balances aged; unidentified receipts queue worked                             | Bank fees, interest, unapplied receipts reclassification |
| **Revenue**           | Billings tie to the sub-ledger; recognition run complete; deferred revenue rollforward ties; credits and refunds in the right period | Deferred revenue release, refund and credit notes        |
| **Payments/PSP**      | Settlement reconciled; fees booked by type; chargeback provision updated; reserves and holdbacks reflected                           | Processing fees, dispute expense, provision movement     |
| **Receivables**       | Aging reviewed; expected credit loss updated (IFRS 9 — `risk-fraud-aml.md`); write-offs approved                                     | ECL provision movement, bad-debt write-off               |
| **Payables**          | Goods/services received not invoiced accrued; vendor statement reconciliation; invoice-date cutoff                                   | Accrued expenses                                         |
| **Payroll**           | Accrue earned-but-unpaid salary, bonus, holiday, employer taxes; reconcile the payroll provider to GL                                | Payroll accruals                                         |
| **Accruals/prepaids** | Recurring accruals recalculated, not copied; prepaid amortisation run                                                                | Accrual and reversal, prepaid release                    |
| **FX**                | Monetary balances revalued at closing rate; realised/unrealised split correct; CTA computed (§12)                                    | Revaluation entries                                      |
| **Intercompany**      | Both sides match by amount and currency; eliminations prepared                                                                       | IC settlement, IC FX                                     |
| **Tax**               | VAT/GST returns reconcile to the ledger; corporate tax provision                                                                     | Tax accruals                                             |
| **Other recurring**   | Depreciation, lease amortisation, share-based compensation                                                                           | Depreciation, lease interest, SBC expense                |

### 9.3 Journal entries: automated vs manual

| Kind                 | Source                                                                | Control                                                                                                                      |
| -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Automated (system)   | Sub-ledger postings from business events, per the posting-rules table | Tested (M18), replayable, no per-entry approval — the _rule_ was approved once                                               |
| Recurring calculated | Accruals, depreciation, revenue recognition, FX revaluation           | Calculation reviewed; entry generated by the system; the reviewer confirms the inputs                                        |
| Manual (adjusting)   | A human decides an entry is needed                                    | Preparer ≠ approver (M11), threshold-based approval, mandatory narrative and evidence, no posting without an approval record |

**Manual journal entries are the highest-risk object in the close** — they bypass every business rule
in the sub-ledger. Instrument them: count and value per period per preparer, which accounts they hit,
how many touch revenue or cash, how many are prepared and approved inside one team. A rising manual JE
count is the leading indicator that a feed broke and people are compensating by hand. Never let an
automation identity approve one (M11).

**Close blockers.** Keep an explicit list, refreshed daily during close: what is blocking, which step,
who owns it, target time. A blocker is a missing file, an unreconciled account, an unapproved JE, an
unresolved material break or a system failure. That list is the close's critical path; without it, the
close finishes when someone feels finished.

### 9.4 Metrics

| Metric                    | Definition                                                 | Target shape                                             |
| ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Days to close             | Business days from D0 to period lock                       | Flat or falling; a spike has a named cause               |
| % auto-matched            | Auto-matched ÷ total, by count _and_ by value              | >98% by value for card; 99% by count can be 60% by value |
| Unmatched value           | Gross `Σ\|amount\|` unmatched at close, per reconciliation | Trending to zero; reported gross, never net              |
| Break age p95             | 95th percentile age of open breaks                         | Below the SLA of the slowest legitimate rail             |
| Breaks created / resolved | Flow, not stock                                            | Resolution rate ≥ creation rate                          |
| Write-off value           | Per period, per approver tier                              | Small and explainable; growth is a failing control       |
| Manual JE count and value | Per period, per preparer                                   | Falling; each traceable to a cause                       |
| Tolerance consumption     | `Σ` tolerance applied, per rule                            | Bounded and stable; growth is a hidden loss              |
| Suspense balance and age  | Per clearing account                                       | Oscillating near zero; monotonic growth is an incident   |
| Post-close adjustments    | Entries made after soft close                              | Few; many means the soft close is fiction                |
| Recon run success rate    | On schedule, without manual intervention                   | An alertable SLO (`architecture-ops.md`)                 |

## 10. Accruals and deferrals

The pattern: at period end, book what economically belongs to the period but has not yet flowed through
the normal transaction path; on day 1 of the next period, **reverse the accrual**, so the real item
posts normally when it arrives without double counting. Automatic reversal is what makes accruals safe
— a non-reversing accrual plus the actual invoice is a doubled expense, the most common close error
there is.

| Accrual                                   | Why a payments business needs it                                      | Period-end entry                                                                                        | Reversal / settlement                                             |
| ----------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Unsettled transactions (funds in transit) | Money captured but not yet paid out at period end is an asset you own | `Dr PSP receivable / Cr Cash clearing` (or recognise the receivable at capture)                         | Cleared when the payout lands and reconciles                      |
| PSP / interchange fees                    | Fees on period transactions are invoiced or netted later              | `Dr Payment processing fees / Cr Accrued liabilities`                                                   | Auto-reverse D+1; the actual fee posts from the settlement file   |
| Chargeback provision                      | Disputes on this period's transactions arrive later                   | `Dr Chargeback expense / Cr Chargeback provision`, estimated from the historical dispute rate by cohort | Actual chargebacks consume the provision; re-estimate each period |
| Expected credit loss                      | Receivables that will not be collected (IFRS 9)                       | `Dr Impairment loss / Cr Loss allowance`                                                                | Write-offs consume the allowance                                  |
| Interest earned or owed                   | Deposits, credit lines, customer balances                             | `Dr Interest receivable / Cr Interest income`, or the mirror                                            | Reverse; actual interest settles on the bank statement            |
| Unbilled usage revenue                    | Usage in the period billed next month                                 | `Dr Unbilled receivable (contract asset) / Cr Revenue`                                                  | Reverse and bill, or reclassify to receivable at invoicing        |
| Goods/services received not invoiced      | Vendor delivered, invoice not received                                | `Dr Expense / Cr Accrued liabilities`                                                                   | Auto-reverse; the invoice posts normally                          |
| Payroll, bonus, holiday                   | Earned in the period, paid later                                      | `Dr Personnel expense / Cr Accrued payroll`                                                             | Reverse; the payroll run posts normally                           |
| Rebates / volume discounts                | Earned by the counterparty in the period                              | `Dr Revenue (contra) / Cr Rebate accrual`                                                               | Settled or reversed                                               |

**Prepaid/deferred cost** is the mirror: cash out now, expense later — `Dr Prepaid expenses / Cr Cash`
at payment, then `Dr Expense / Cr Prepaid expenses` monthly on a schedule. Both accruals and prepaids
must be _calculated from data_ (open POs, contract terms, dispute cohorts) and generated by the system
from reviewed inputs, never typed from last month's file with the number changed.

## 11. Revenue recognition (IFRS 15 / ASC 606)

The standards are converged enough that the five-step model is the same. Engineers build the machinery;
the _policy_ belongs to the finance owner and the auditor (SKILL.md §11 — a recognition treatment is
not decided in a code review).

| Step                                | Question                                                                                                                                       | What it means in your system                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1. Identify the contract            | An enforceable agreement, commercial substance, probable collection?                                                                           | A contract object, not a subscription row: term, parties, and the version in force on a date                   |
| 2. Identify performance obligations | Which distinct goods/services did you promise?                                                                                                 | A line-item model — platform access, onboarding, support tier, hardware, overage — each a PO if distinct       |
| 3. Determine the transaction price  | Total consideration including variable amounts (discounts, rebates, refunds, penalties), constrained to what is highly probable not to reverse | Variable consideration needs an estimate with a documented method, revisited each period                       |
| 4. Allocate the price to POs        | On relative **standalone selling price (SSP)**                                                                                                 | An SSP table per product per period, from actual sales or a documented cost-plus/residual approach — versioned |
| 5. Recognise as POs are satisfied   | Point in time or over time                                                                                                                     | A schedule per PO, and a nightly job that recognises what is due                                               |

The output is a **recognition schedule** per performance obligation — contract, PO, amount, currency,
start, end, method (straight-line by day, by usage, on delivery, on milestone), recognised to date.
Everything else — deferred revenue, the waterfall, ARR and its bridges (`corporate-finance.md`) —
derives from it plus the ledger (M1, M19).

### 11.1 The four business shapes

| Business                | POs                                                                                                   | Timing                                                                                                    | Contract balance                                                                                           | Traps                                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SaaS, annual prepay** | Platform access (over time); onboarding (usually not distinct → bundled); premium support (over time) | Straight-line over the term, by day not by month                                                          | Cash on day 1 → contract liability, released daily                                                         | A free or discounted first period spreads across the term, it is not given away in month 1; mid-term upgrades are modifications (§11.4); non-refundable setup fees are usually deferred                                           |
| **Usage-based**         | The service, satisfied as consumed                                                                    | As usage occurs (the "right to invoice" expedient applies only where the invoice matches value delivered) | Unbilled receivable (contract asset) between usage and invoicing; prepaid credits are a contract liability | Recognising at invoice date rather than usage date shifts periods; prepaid-credit breakage needs a documented policy                                                                                                              |
| **Marketplace**         | Facilitating the transaction (point in time) — or the underlying good, if principal                   | On transaction, or on delivery if principal                                                               | Amounts due to sellers are a **liability**, never revenue (`ledger.md`)                                    | Principal vs agent (§11.5) decides whether GMV or take rate is revenue; coupons you fund are a discount, seller-funded ones are not                                                                                               |
| **Payments business**   | Processing (point in time, per transaction); platform fee (over time); FX conversion (point in time)  | On transaction                                                                                            | Minimal deferral; volume-tier rebates are variable consideration                                           | Interchange and scheme fees: gross or net turns on principal/agent for the _processing service_ — most PSPs report processing revenue gross with interchange in cost of revenue, and that is a documented policy, not an accident |

### 11.2 Worked example and postings

A SaaS contract: 12,000 EUR annual prepaid on 2026-04-01 covering 2026-04-01 → 2027-03-31, plus a
2,000 EUR onboarding fee. Finance has determined onboarding is _not_ distinct, so the 14,000 EUR
transaction price is one performance obligation over 365 days. Daily rate 14,000.00 ÷ 365 =
38.356164…, recognised to the cent at the declared rounding mode, residual to the final period so the
schedule sums exactly to 14,000.00 (M5).

| Date       | Event                              | Entry                                                                                         |
| ---------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| 2026-04-01 | Invoice issued                     | `Dr Accounts receivable 14,000.00 / Cr Contract liability 14,000.00`                          |
| 2026-04-03 | Cash received                      | `Dr Cash 14,000.00 / Cr Accounts receivable 14,000.00`                                        |
| 2026-04-30 | Recognition, 30 days               | `Dr Contract liability 1,150.68 / Cr Revenue 1,150.68`                                        |
| 2026-05-31 | Recognition, 31 days               | `Dr Contract liability 1,189.04 / Cr Revenue 1,189.04`                                        |
| …          | monthly                            | …                                                                                             |
| 2027-03-31 | Final period, absorbs the residual | `Dr Contract liability (remaining balance) / Cr Revenue` — the liability is then exactly zero |

Never let the residue drift: assert `Σ schedule = transaction price`, exactly, per contract, in a test
(M5, M18). If that customer cancels on 2026-09-30 with a contractual 3,000.00 refund, the remaining
liability splits — `Dr Contract liability 3,000.00 / Cr Refund payable 3,000.00` for the obligation to
return cash, and `Dr Contract liability (remainder) / Cr Revenue (remainder)` for the portion earned.
Refunds reduce revenue (a reversal of the transaction price), never an expense; a refund sitting in
cost of goods sold overstates revenue permanently. Service-failure credits are also revenue reductions
(variable consideration) while marketing credits may be an expense — encode the distinction in the
credit _type_, do not leave it to whoever books it.

### 11.3 The revenue waterfall / rollforward

The rollforward proves the deferred balance and the revenue line come from the same system (M19), and
must tie exactly every period: `opening contract liability + new billings deferred − revenue recognised
− refunds and credits released ± contract modifications = closing contract liability`, equal to the GL
account balance, per currency.

**There is no FX term, and adding one is the error.** A contract liability is non-monetary, so it is
not retranslated (§12): within a single currency there is nothing to revalue, and a non-zero FX line in
this rollforward means something is revaluing a balance it must leave at its historical rate.
Translating the closing balance into the _presentation_ currency for consolidation is a separate,
later step — average rate for the revenue line, closing rate for the balance sheet, difference to CTA
in OCI (§12) — and it belongs to the consolidation pack, not to this rollforward.

```sql
-- Rollforward from the recognition sub-ledger, tied to the GL (M19), per currency (M6).
-- No FX_REVAL movement kind exists: a contract liability is non-monetary and is not retranslated (§12).
WITH m AS (SELECT currency,
       sum(amount_minor) FILTER (WHERE kind='DEFERRAL')     AS deferred,
       sum(amount_minor) FILTER (WHERE kind='RECOGNITION')  AS recognised,
       sum(amount_minor) FILTER (WHERE kind='REFUND')       AS refunded,
       sum(amount_minor) FILTER (WHERE kind='MODIFICATION') AS modified
    FROM rev_schedule_movement WHERE period='2026-09' GROUP BY currency)
SELECT o.currency, o.balance_minor AS opening, m.*, g.balance_minor AS gl_closing,
       o.balance_minor + m.deferred - m.recognised - m.refunded + m.modified
         - g.balance_minor AS difference       -- must be 0, or the close is blocked (M2, M6)
FROM rev_balance_opening o JOIN m USING (currency)
JOIN gl_account_balance g ON g.account='2400-CONTRACT-LIABILITY'
                         AND g.currency=o.currency AND g.period='2026-09';
```

### 11.4 Contract modifications

| Modification                                   | Treatment                                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Adds distinct goods/services at their SSP      | A separate contract — account for it independently                                                  |
| Adds distinct goods/services at a discount     | Terminate the old contract; create a new one prospectively with remaining consideration reallocated |
| Changes goods/services that are _not_ distinct | Cumulative catch-up adjustment to revenue in the modification period                                |

A subscription "upgrade" is therefore not an `UPDATE` on a row. It is a contract event with an
effective date, a new schedule and a reallocation. Model contracts as versioned with effective-dated
amendments, or the schedule cannot be rebuilt and nobody can see what was promised when.

### 11.5 Principal vs agent — the decisive marketplace question

You are the **principal** (revenue **gross**, the underlying as cost of revenue) if you control the
good or service before it transfers to the customer. Indicators of control:

| Indicator                             | Principal                                               | Agent                                                 |
| ------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Primary responsibility for fulfilment | Yours — the service being acceptable is your obligation | The seller's; you facilitate                          |
| Inventory risk                        | You hold it before sale, or on return                   | You never hold it                                     |
| Pricing discretion                    | You set the price the customer pays                     | The seller sets it; you set only your fee             |
| Credit risk                           | You bear it                                             | The seller bears it (you may still guarantee payment) |

The effect is enormous, and it is the number most often disputed in diligence or an IPO. A marketplace
with 100M GMV and a 15% take rate reports **100M revenue / 85M cost of revenue / 15% gross margin** as
principal, or **15M revenue / no cost of revenue / 100% gross margin** as agent. Same cash, same
profit, a 6.7× difference in the top line. Postings for one 100.00 EUR order with a 15.00 EUR take rate
and a 2.50 EUR PSP fee:

```
# AGENT (net) — the seller's share never touches revenue
Dr Cash                    100.00
    Cr Payable to seller             85.00   # liability, not revenue
    Cr Commission revenue            15.00
Dr Payment processing fees   2.50
    Cr Cash                           2.50   # fees are their own postings (M16)

# PRINCIPAL (gross) — same cash, different top line
Dr Cash                    100.00
    Cr Revenue                      100.00
Dr Cost of revenue          85.00
    Cr Payable to supplier           85.00
Dr Payment processing fees   2.50
    Cr Cash                           2.50
```

Two engineering obligations follow. **The seller payable is a liability from the moment you collect** —
never revenue, never "cash we happen to hold", and in many jurisdictions it is safeguarded client money
with its own regulatory treatment (SKILL.md §11, `compliance-regulatory.md`). And **build both views
from the same postings**: keep gross transaction value, take rate, seller share and each fee in
separate accounts (M16), so a change in the principal/agent conclusion is a presentation mapping change
rather than a data migration. Teams that book only the net figure cannot produce a gross view later
without re-deriving it from operational tables, which contradicts M19.

## 12. FX at close

Every entity has a **functional currency**; balances and transactions in other currencies are
translated, and the rule differs by item type (M6 — every conversion is a recorded event with rate,
source and timestamp).

| Item                                                                                      | Rate used                                                      | Difference goes to                                                                                             |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Transaction on initial recognition                                                        | Spot rate at transaction date                                  | — (this is the booking rate)                                                                                   |
| **Monetary** items at period end (cash, receivables, payables, loans, accruals)           | **Closing rate**                                               | P&L: FX gain/loss, unrealised until settled                                                                    |
| **Non-monetary** at historical cost (fixed assets, prepaid expenses, inventory, goodwill) | **Historical rate** — not retranslated                         | —                                                                                                              |
| Non-monetary at fair value                                                                | Rate at the date fair value was determined                     | Wherever the fair-value gain goes                                                                              |
| Contract liability (deferred revenue)                                                     | Generally non-monetary → **historical rate**, not retranslated | — (retranslating it is a common, consequential error; it is also why the §11.3 rollforward carries no FX term) |
| Income statement of a foreign subsidiary                                                  | **Average rate** for the period                                | —                                                                                                              |
| Balance sheet of a foreign subsidiary                                                     | **Closing rate**                                               | Equity: **cumulative translation adjustment (CTA)** in OCI                                                     |

**Realised vs unrealised.** Unrealised FX comes from revaluing an open monetary balance at the closing
rate; realised FX comes from settling at a rate different from the booking rate. Both usually hit the
same P&L line but must stay separately identifiable — treasury needs to know how much of that line is
economic settlement and how much is a mark that will unwind. A 100,000 USD receivable booked at 0.9200
and closing at 0.9350, functional currency EUR:

```
booked 100,000 × 0.9200 = 92,000.00 EUR;   closing 100,000 × 0.9350 = 93,500.00 EUR
Dr Accounts receivable (FX revaluation)   1,500.00 EUR
    Cr Unrealised FX gain                          1,500.00 EUR
```

Settling at 0.9310 gives a realised gain of 1,100.00 EUR against the original booking, of which
1,500.00 was already recognised — so settlement books a 400.00 EUR loss unwinding part of the mark.
That only works if the revaluation is stored per balance with its rate and date, not as a lump
adjustment to an account total.

**Engineering rules.** Rates come from a declared source with a declared timestamp convention (which
fixing, which time, which side of the spread), are stored immutably, and the rate used is recorded on
the posting (M6). Revaluation is a _generated, reversible_ entry — reversing it on day 1 of the next
period and re-revaluing keeps the arithmetic simple and makes the realised/unrealised split mechanical.
Never revalue a non-monetary balance because it happens to sit in a foreign-currency sub-ledger:
classify accounts monetary/non-monetary in the chart of accounts (`ledger.md`) so revaluation is driven
by data rather than by an annual argument.

## 13. GL export and ERP integration

The sub-ledger keeps the detail; the GL takes summaries (M19). A GL with 30 million lines a month is
unusable, unauditable in practice and expensive in every ERP that prices by transaction. The rule:
**summarise into the GL, retain the detail in the sub-ledger, and make every GL line drillable back to
the postings that composed it** — an auditor sampling one GL line must reach the underlying items in
one query.

**Journal batch format** — the batch is the unit of idempotency and of rejection: `batch_id`
(deterministic, from source system + period + account set + run — this is the idempotency key, M7);
`period` (must be open in the ERP); `entity`; `posting_date` and `event_date`, both (M10); `lines[]`
each carrying account, dimensions (cost centre, product, region), debit or credit, amount in minor
units and currency (M4) and a narrative, balancing per currency (M2, M6); `source_reference`, the
sub-ledger summary id that enables drill-back; `hash`, for change detection and evidence; and
`reversal_of` for reversing accruals.

**Account mapping is a versioned artifact.** The table from (sub-ledger event type, product, currency,
entity) → (GL account, dimensions) lives in version control with a review requirement and an effective
date; it is _not_ a table someone edits in production. Changing a mapping mid-period splits the
period's postings across two accounts and is a close blocker if undeclared. Validate every mapping
against the ERP's live chart of accounts at batch build time, so a batch referencing a closed or
non-existent account fails before it is submitted.

| Concern                  | Approach                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate submission     | External id on the journal (NetSuite `externalId`, SAP reference fields, Xero idempotency). Pre-check by external id; treat "already exists" as success |
| Partial batch acceptance | Prefer all-or-nothing; where the ERP accepts partial batches, record per-line status and never blindly re-post the whole batch                          |
| Rejections               | Store the rejection and its reason, alert, require a human decision. Auto-retrying a rejected journal makes duplicates where duplicates cost most       |
| Timeouts                 | Request times out, the journal may or may not exist: never blind-retry — query by external id first, then decide                                        |
| Period closed in the ERP | Fail loudly; the item goes to the open period per the cutoff rule (§8), never forced in                                                                 |
| Reversing accruals       | Post the accrual with its reversal date, then verify the reversal appeared — a missing reversal is a doubled expense next period                        |
| Intercompany             | Generate both entities' entries together, matched by an IC reference, reconciled before consolidation                                                   |
| FX in the ERP            | Decide whether the ERP or your system translates. Both doing it produces two answers                                                                    |

Keep a **posting register**: one row per attempted batch with its hash, external id, submission time,
response, ERP document number and status. It is your idempotency store, your evidence, and your answer
to "did that journal actually land?" — a question you will be asked at 22:00 on D+4.

## 14. Building the reconciliation system

**Architecture.** Stages, each independently replayable, each writing immutable output:

```
fetch ─→ ingest ─→ parse ─→ normalise ─→ match ─→ break ─→ post ─→ sign-off
  │        │         │          │          │        │        └ GL export (§13)
  │        │         │          │          │        └ break lifecycle (§6)
  │        │         │          │          └ match + evidence (§4.5)
  │        │         │          └ canonical external_line
  │        │         └ source-shaped records, versioned parser
  │        └ raw bytes, hashed; file registry; sequence and balance-chain checks (§3)
  └ scheduled against an expected-file calendar, with fetch-failure alerts
```

| Property                            | Why                                                            | How                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Replayable**                      | Rules change, parsers get fixed, history must be re-derivable  | Every stage is a pure function of stored inputs plus a versioned rule set; the version is stored with the output; re-running a run id needs no re-fetch |
| **Rebuildable derived state (M17)** | The match table, break inventory and balances are all derived  | A "rebuild from raw" path exists and is exercised — in CI on fixtures, periodically against production data in a shadow environment                     |
| **Append-only**                     | It is evidence (M3, M14)                                       | Un-matching writes a new row; re-running writes a new run; nothing is updated in place except modelled status fields with their own audit rows          |
| **Deterministic**                   | Same inputs must give the same matches, or it cannot be tested | No wall clock in matching logic (pass the run date in), stable sort orders, no set-iteration-order dependence, never seeded randomness                  |
| **Idempotent end-to-end (M7)**      | Re-runs are normal                                             | Run key = (reconciliation, window, input file versions, rule-set version)                                                                               |

**Testing (M18).**

| Test              | Content                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Golden files      | Recorded _real_ files from every source, scrubbed of PII/PAN (M15), with expected parse and expected matches; every parser change diffs against them              |
| Parser fuzzing    | Truncation, wrong encoding, BOM, CRLF, locale decimals, an unexpected column, an empty statement                                                                  |
| Property tests    | No overlapping matches; `Σ` per match balances per currency; members unmatched before and matched after; re-running is a no-op                                    |
| Cardinality cases | 1:1; a payout batching 5,000 charges; net settlement with fees and refunds; a partial refund; a reversal of a reversal                                            |
| Break generation  | Each taxonomy row in §5 has a fixture producing exactly that classification and exactly that correcting entry                                                     |
| Cutoff cases      | 23:59:59 local on the last day of the period in each entity timezone; a late item for a closed period; a restated file spanning a closed period                   |
| Idempotency       | Ingest the same file twice; re-run the same window; post the same GL batch twice — each a no-op                                                                   |
| End-to-end        | A synthetic month (charges, refunds, fees, disputes, payouts, a bank statement, a close) asserting trial balance, waterfall tie-out and a zeroed clearing account |

Use recorded real files, never hand-written ones. Every source has quirks nobody documents — the
weekend file with a zero-line statement, the fee row with a negative amount and a positive sign field,
the reference the bank pads with spaces — and only real files carry them. Keep them in the repo,
scrubbed, with the scrubbing itself tested.

**Observability (M17).** Alert on the control failing, not on job duration:

| Signal                               | Alert condition                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Expected file missing                | No file for a source+account past its SLA time                                       |
| Sequence gap or broken balance chain | Any occurrence — page                                                                |
| Schema drift / quarantine            | Any occurrence                                                                       |
| Auto-match rate by value             | Below the declared floor for that reconciliation                                     |
| Unmatched gross value                | Above threshold, or growing N days running                                           |
| Break age p95                        | Above the SLA bucket                                                                 |
| Suspense/clearing balance            | Above threshold, or monotonically increasing over N days                             |
| Tolerance consumption                | Above the daily cap, or trending up                                                  |
| Derived-vs-recomputed divergence     | Cached balances or the match index disagree with a recomputation from postings (M17) |
| GL batch rejected or unconfirmed     | Any batch without an ERP document number past its SLA                                |
| Manual JE volume                     | Above the rolling baseline                                                           |

Dashboards are for humans investigating; alerts are for the control failing. The final check that the
whole machine works is **a scheduled job that recomputes the trial balance from raw postings and
compares it with the reported balances** (M1, M2, M17). If that ever disagrees, nothing downstream — no
reconciliation, no close, no report — can be trusted until it is explained.

## Review questions

1. For each account that holds money, name the external record that is authoritative for it, the
   reconciliation frequency, and the named owner of its breaks. Which accounts have no answer?
2. Show me an item that matched. What evidence is stored for _why_ it matched, which rule and rule
   version produced it, and who — if anyone — confirmed it?
3. What happens when a settlement file is redelivered with different content under the same statement
   identity? Trace the effect on postings already made from the superseded version.
4. What is the total tolerance consumed per rule over the last 90 days, in money? Which account is it
   booked to, and who approved the tolerance being that wide?
5. Take the oldest open break: how old, how much, whose, what classification, and what correcting entry
   will close it? If it is over 90 days, why is it still open?
6. Is your suspense/clearing balance oscillating around zero or trending up? Show the last 90 days.
7. An event occurred at 23:58 local time on the last day of the period, in an entity whose accounting
   timezone is not UTC, and was booked three days later. Which period does it land in, and what in the
   code enforces that?
8. Try to post a journal entry into a closed period. What stops you — the application, or the ledger?
   Who can reopen a period, and where is that logged?
9. For your largest revenue stream: what are the performance obligations, what is the recognition
   method, and does the deferred revenue rollforward tie exactly to the GL account this period?
10. If the marketplace principal-vs-agent conclusion flipped tomorrow, is that a presentation mapping
    change or a data migration? What in the posting model decides the answer?
