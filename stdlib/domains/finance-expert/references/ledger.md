# The ledger

The ledger is the only part of a money system whose correctness cannot be recovered after the fact. A
wrong report is regenerated, a wrong response retried, a wrong cache flushed — a wrong or missing
posting is gone unless the event and the rule that produced it both still exist. Design the ledger as
what everything else derives from (M1), so that illegal states cannot be written down. Amount
arithmetic — scale, rounding, allocation, FX, day counts — is in `money-arithmetic.md`.

## 1. The model in engineering terms

| Concept                    | What it is                                                           | Cardinality          | Mutability                       |
| -------------------------- | -------------------------------------------------------------------- | -------------------- | -------------------------------- |
| **Account**                | A named bucket of value with a type, a normal balance and a currency | Small, finance-owned | Metadata mutable; identity never |
| **Journal entry**          | One economic event, atomically booked                                | One per event        | Immutable (M3)                   |
| **Journal line** (posting) | One account debited or credited within an entry                      | ≥ 2 per entry        | Immutable (M3)                   |

Everything else — balances, statements, trial balance, P&L, the number in the app header — is a query
over lines. If you cannot drop the balance table and rebuild it from lines, you have a database with
accounting-shaped names, not a ledger.

### 1.1 Account types and normal balances

`Assets + Expenses = Liabilities + Equity + Income` as positive magnitudes; `Σ debits = Σ credits` per
entry and per currency (M2).

| Type      | Normal balance | Debit     | Credit    | Statement     | Closes at year end         |
| --------- | -------------- | --------- | --------- | ------------- | -------------------------- |
| Asset     | Debit          | increases | decreases | Balance sheet | No — carries forward       |
| Liability | Credit         | decreases | increases | Balance sheet | No — carries forward       |
| Equity    | Credit         | decreases | increases | Balance sheet | No — carries forward       |
| Income    | Credit         | decreases | increases | P&L           | Yes — to retained earnings |
| Expense   | Debit          | increases | decreases | P&L           | Yes — to retained earnings |

```python
NORMAL_DEBIT = {"ASSET", "EXPENSE"}                 # stored signed amount > 0 is an increase
NORMAL_CREDIT = {"LIABILITY", "EQUITY", "INCOME"}   # stored signed amount < 0 is an increase

def display_balance(account_type: str, signed_minor: int) -> int:   # debit-positive storage
    return signed_minor if account_type in NORMAL_DEBIT else -signed_minor
```

That is the whole of "debits and credits are confusing". Store one signed integer, present it with the
sign the account type implies, and never let the presentation convention reach storage.

### 1.2 Your users' money is your liability

A customer wallet, a merchant payable, an unspent gift-card balance, a deposit: all liabilities. You
hold the cash (asset, at bank or PSP) and owe it to someone. Not a modelling preference — it is what
the money legally is, and why "the user's balance" and "our cash" are two accounts that must be
reconciled against each other and against the bank (M9).

| Observation                              | Meaning                             | Action                                                                                      |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| User wallet has a **debit** balance      | You lent money you never underwrote | It is a receivable, not a wallet: reclassify, provision, find the control that failed (M12) |
| Merchant payable has a **debit** balance | You paid more than you owed         | Overpayment or double payout; recover, check idempotency (M7)                               |
| Σ user liabilities > cash + in-transit   | You cannot honour withdrawals today | Solvency/safeguarding incident, not a bug ticket                                            |

A wallet with no constraint against a debit balance on the user liability account is a credit product
built by accident, discovered when the first user exploits the race in §7.3.

### 1.3 Worked example

EUR, integer minor units. `1000` Cash — PSP (A) · `1010` Cash — bank (A) · `1500` Settlement in transit
(A) · `2000` User wallets (L, control) · `2100` VAT payable (L) · `2200` Merchant payable (L, control) ·
`4000` Platform fee income (I) · `5000` PSP processing cost (E) · `6000` Bank charges (E).

| #   | Event                                           | Debit                                 | Credit                                                                            |
| --- | ----------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| E1  | Top-up €100.00 by card                          | 1000 Cash — PSP 10 000                | 2000 User wallets `user:42` 10 000                                                |
| E2  | PSP fee, borne by platform                      | 5000 PSP cost 200                     | 1000 Cash — PSP 200                                                               |
| E3  | Purchase €30.00, commission €3.00 incl. 20% VAT | 2000 User wallets `user:42` 3 000     | 2200 Merchant payable `merch:7` 2 700 · 4000 Fee income 250 · 2100 VAT payable 50 |
| E4  | PSP settles €98.00 (initiated)                  | 1500 Settlement in transit 9 800      | 1000 Cash — PSP 9 800                                                             |
| E5  | Settlement lands on the statement               | 1010 Cash — bank 9 800                | 1500 Settlement in transit 9 800                                                  |
| E6  | Payout €27.00 to merchant                       | 2200 Merchant payable `merch:7` 2 700 | 1010 Cash — bank 2 700                                                            |
| E7  | Bank charge on the payout                       | 6000 Bank charges 20                  | 1010 Cash — bank 20                                                               |

Trial balance: `1010` DR 7 080 · `5000` DR 200 · `6000` DR 20 · `2000` CR 7 000 · `2100` CR 50 · `4000`
CR 250. Totals 7 300 = 7 300. You hold €70.80, owe €70.50, and the €0.30 difference is profit — all
queries, not stored fields. Fee, tax and PSP cost are separate lines: netting them into E3 makes "what
did payments cost this month?" unanswerable (M16). E4/E5 exist because between them the €98 is in
neither the PSP account nor the bank — without `1500` you lose sight of it, or book the bank credit
before it happened (§10).

## 2. Chart of accounts

| Range     | Class                                | Typical blocks                                                                                            |
| --------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1000–1999 | Assets                               | 10xx cash · 12xx receivables · 15xx clearing/in-transit · 19xx suspense                                   |
| 2000–2999 | Liabilities                          | 20xx customer funds · 21xx tax · 22xx payables · 29xx FX position                                         |
| 3000–3999 | Equity                               | retained earnings, current-year result, opening-balance equity                                            |
| 4000–4999 | Income                               | fee income, FX spread, realized/unrealized FX gain                                                        |
| 5000–6999 | Expense                              | cost of payments, bank charges, rounding residue (M5), write-offs                                         |
| 9000–9999 | **Memo** — outside the trial balance | Off-balance-sheet pairs that net to zero: card authorisations outstanding and their offset (§8, option C) |

| Rule                                                                     | Why                                                                                                         |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Only leaves are postable** (`postable BOOLEAN`)                        | A parent (`2000`) exists for rollups; postings go to `2000.10`                                              |
| **Codes are permanent identifiers, not labels**                          | Reusing or repointing a code silently misclassifies history and every comparative report                    |
| **The chart may be statutory** (France PCG, Spain PGC, Germany SKR03/04) | Then you map to it; you do not design one. Check before inventing                                           |
| **The chart is finance's artifact**                                      | Engineering owns the mechanism; a PR adding an account without the finance owner is a control failure (M11) |

### 2.1 The central decision: account per user, or control account plus dimension

|                     | **One ledger account per user**            | **Control account + `dimension` on the line**        |
| ------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Rows in `accounts`  | O(users)                                   | O(1) per concept                                     |
| Chart of accounts   | Unreadable, unownable by finance           | ~200 lines, human-reviewable                         |
| Per-subject balance | Index on `account_code`                    | Composite index on `(account, subject, currency)`    |
| Control total       | Sum over millions of accounts, or a rollup | One `SUM` on one account                             |
| New reporting axis  | New account tree + migration               | New dimension key, no schema change                  |
| Locking granularity | Natural: lock the user's account row       | Needs a balance row per `(account, subject)` to lock |
| Statutory export    | Must summarise to control accounts anyway  | Already at the right grain                           |

| Scale                                                                        | Recommendation                                                                                                                                      |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~10 accounts (internal books)                                                | Account per concept; dimensions are overhead you will not use                                                                                       |
| ~10⁶ accounts (wallets, marketplace sellers)                                 | **Control account + dimension.** The chart stays finance-readable and the sub-ledger becomes a partitioned-index problem, which Postgres is good at |
| ~10⁹ accounts (per-device, per-order, per-instrument — `markets-trading.md`) | Control + dimension, **plus sharding on `hash(subject)`** and a per-shard balance table. The constraint is the hot index, not the model             |

The hybrid survives: **the general ledger holds control accounts, the sub-ledger holds per-subject
detail, and the sub-ledger total must equal the control balance as an asserted, alerted invariant**
(M17). A dimension is a typed reference (`subject_type`, `subject_id`) with a foreign key or a documented
external identity — free text becomes unjoinable within a year. Other reporting axes (entity, region,
product, cost centre) go in `tags JSONB` under a declared, versioned key set.

Account names are for humans: never parse them, never key on them. Use `effective_from`/`effective_to`,
never `DELETE` — a closed account still has history. Runtime account creation is allowed only from a
declared template that is part of the reviewed chart. Keep the chart in version control
(`assets/CHART-OF-ACCOUNTS.template.yaml`) and load it by migration; a chart living only in a production
table has no review history and no diff.

## 3. Data model

### 3.1 Debit/credit columns or a signed amount

|                              | Two non-negative columns                   | One signed `amount_minor` (debit positive) |
| ---------------------------- | ------------------------------------------ | ------------------------------------------ |
| Balance check                | `SUM(debit) = SUM(credit)`                 | `SUM(amount) = 0`                          |
| Account balance              | `SUM(debit) - SUM(credit)`                 | `SUM(amount)`                              |
| Illegal states representable | Both populated; both zero; either negative | Only zero (excluded by CHECK)              |
| CHECKs needed                | 3–4                                        | 1                                          |
| In a window function         | Two expressions everywhere                 | One                                        |

**Use the signed amount.** `SUM(amount_minor) = 0 GROUP BY entry_id, currency` is all of M2 in one
expression, it composes into every window function and materialised view without a `CASE`, and it deletes
the "filled in the wrong column" bug class. Give humans a generated `direction` column and an export view
that splits it back into two. The sign **is** the direction: a debit is never negative, so a reversal
flips the sign rather than negating a flag.

### 3.2 DDL

```sql
CREATE TYPE account_type AS ENUM ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE','MEMO');
-- MEMO: the 9xxx off-balance-sheet pairs of §8 option C; excluded from every statement by type,
-- never by a code range a report writer has to remember
-- currencies(code text PK, minor_unit SMALLINT) seeded from ISO 4217 (M4), plus one
-- sentinel row ('multi', NULL) so a control account can declare itself multi-currency (§9.1)

CREATE TABLE accounts (
  code            text PRIMARY KEY,                     -- '2000.10', permanent (§2.1)
  name            text NOT NULL, type account_type NOT NULL,
  currency        text NOT NULL REFERENCES currencies(code),     -- ISO code, or 'multi' (§9.1)
  parent_code     text REFERENCES accounts(code),
  postable        boolean NOT NULL DEFAULT true,        -- only leaves are postable
  requires_dim    boolean NOT NULL DEFAULT false,       -- control accounts: dimension mandatory
  allow_debit_bal boolean NOT NULL DEFAULT true,        -- false on customer wallets (§1.2)
  effective_from  date NOT NULL, effective_to date);

CREATE TABLE journal_entries (
  entry_id        uuid PRIMARY KEY,
  entry_seq       bigint GENERATED ALWAYS AS IDENTITY,  -- see §7.4 for its limits
  event_time      timestamptz NOT NULL,                 -- when it happened    (M10)
  booked_at       timestamptz NOT NULL DEFAULT now(),   -- when we recorded it (M10)
  period          char(7) NOT NULL,                     -- '2026-08'           (M10)
  rule_set_version text NOT NULL,                       -- §4
  source_event_id text, idempotency_key text,           -- dedupe keys      (M8, M7)
  actor           text NOT NULL, description text NOT NULL,   -- who booked it (M14)
  reverses_entry  uuid REFERENCES journal_entries(entry_id),  -- §5
  UNIQUE (idempotency_key), UNIQUE (source_event_id));

CREATE TABLE journal_lines (
  line_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_id      uuid NOT NULL REFERENCES journal_entries(entry_id),
  line_no       smallint NOT NULL,
  account_code  text NOT NULL REFERENCES accounts(code),
  subject_type  text, subject_id text,                       -- the dimension (§2.1)
  amount_minor  bigint NOT NULL CHECK (amount_minor <> 0),   -- debit positive (M4)
  currency      char(3) NOT NULL REFERENCES currencies(code),   -- never 'multi' (M4, §9.1)
  tags          jsonb NOT NULL DEFAULT '{}',
  direction     char(2) GENERATED ALWAYS AS
                  (CASE WHEN amount_minor > 0 THEN 'DR' ELSE 'CR' END) STORED,
  UNIQUE (entry_id, line_no));

CREATE INDEX ON journal_lines (account_code, subject_id, currency, line_id);
```

Note what is absent: no `status`, no `is_deleted`, no `updated_at`, no `balance` — each is a lie waiting
to be told. `tags` carries reporting dimensions only: never a PAN, a token or a credential (M15), because
ledger rows are the most widely exported, longest-retained data you own.

### 3.3 Balance enforced at commit, per currency (M2)

A row-level CHECK cannot see the whole entry. A deferred constraint trigger keeps multi-statement
inserts legal while making an unbalanced entry impossible to commit:

```sql
CREATE FUNCTION assert_entry_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bad record; n int;
BEGIN
  SELECT currency, SUM(amount_minor) AS delta INTO bad FROM journal_lines
   WHERE entry_id = NEW.entry_id GROUP BY currency HAVING SUM(amount_minor) <> 0 LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'M2: entry % unbalanced in %: net % minor units',
    NEW.entry_id, bad.currency, bad.delta; END IF;
  SELECT COUNT(*) INTO n FROM journal_lines WHERE entry_id = NEW.entry_id;
  IF n < 2 THEN RAISE EXCEPTION 'M2: entry % has fewer than two lines', NEW.entry_id; END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER trg_entry_balanced AFTER INSERT ON journal_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_entry_balanced();
```

Post entries through **one function** taking the lines as an array and inserting them in a single
statement; the deferred trigger is then a second line of defence and no code path can insert an orphan
line. Enforce the rest of the account policy there too: `requires_dim` ⇒ `subject_id IS NOT NULL`;
`accounts.currency <> 'multi'` ⇒ `line.currency = accounts.currency` (§9.1 — a cross-table condition, so
it belongs here rather than in a table `CHECK`); and `allow_debit_bal = false` ⇒ post-check that the
resulting `(account, subject)` balance is not a debit (§7 makes that safe under concurrency).

### 3.4 Making immutability real (M3)

```sql
CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'M3: % on % forbidden; correct with a reversing entry', TG_OP, TG_TABLE_NAME;
END $$;

CREATE TRIGGER trg_lines_immutable BEFORE UPDATE OR DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
ALTER TABLE journal_lines ENABLE ALWAYS TRIGGER trg_lines_immutable;  -- also under replication role

REVOKE UPDATE, DELETE, TRUNCATE ON journal_lines, journal_entries FROM ledger_app;
GRANT  INSERT, SELECT ON journal_lines, journal_entries TO ledger_app;
```

Do **not** use `CREATE RULE … DO INSTEAD NOTHING`: it silently discards the write, so a buggy `UPDATE`
reports success and changes nothing — you get neither the mutation nor the alarm. Raise instead.

Three further layers, in decreasing order of how often teams bother: revoke DDL rights from the app role
(it must not drop its own triggers); keep WAL archiving/PITR for the statutory retention period (M14,
`compliance-regulatory.md`);
hash-chain the entries (`prev_hash`, `row_hash`) so a direct-to-database edit by a DBA is detectable —
worth it when the regulator asks "how do you know nobody edited this?" and "we revoked the grant" is not
a satisfying answer. Partition `journal_lines` by period past a few hundred million rows and
detach-and-archive closed periods rather than deleting (M14).

## 4. Posting rules as data

The failing design: `handle_payment_succeeded()` inserts two rows, `handle_refund()` elsewhere inserts
three, a fee calculation lives in a third service. Nobody can answer "what does the book do when a
partial refund of a discounted foreign-currency order is disputed?" without reading four repositories,
and finance can review none of it. The fix is **one reviewable artifact mapping event → entry**,
versioned, loaded as data by a single posting engine — skeleton in `assets/POSTING-RULES.template.md`.

| Event                    | Condition              | Debit                       | Credit                                                     | Amount                     | Dimension       | Period from            |
| ------------------------ | ---------------------- | --------------------------- | ---------------------------------------------------------- | -------------------------- | --------------- | ---------------------- |
| `wallet.topup.succeeded` | —                      | 1000 Cash — PSP             | 2000.10 User wallets                                       | `gross`, never net (M16)   | `user:{id}`     | `event_time`           |
| `psp.fee.charged`        | —                      | 5000 PSP cost               | 1000 Cash — PSP                                            | `fee`                      | —               | `event_time`           |
| `order.captured`         | `tax > 0`              | 2000.10 User wallets        | 2200 Merchant payable / 4000 Fee income / 2100 VAT payable | `net` / `comm_net` / `tax` | `user`, `merch` | `event_time`           |
| `refund.succeeded`       | original period open   | reverse of `order.captured` |                                                            | original                   | original        | original               |
| `refund.succeeded`       | original period closed | 2200 Merchant payable       | 2000.10 User wallets                                       | `amount`                   | original        | **current open** (M10) |
| `fx.convert`             | —                      | two legs (§9.2)             |                                                            | rate-derived               | `user`          | `event_time`           |

```python
@dataclass(frozen=True)
class RuleSet:
    version: str                 # 'v7', immutable once released; stamped on every entry it produces
    effective_from: datetime
    rules: tuple[Rule, ...]

def replay(events: Iterable[Event], rules: RuleSet) -> list[Entry]:   # pure: no clock, no IO (§12)
    return [entry for e in events for entry in rules.apply(e)]
```

Every entry stores the `rule_set_version` that produced it; without it, replay is guesswork. A rule
change **never** rewrites past entries (M3) — it has an effective date and the past keeps its version;
if the past treatment was wrong that is a correction (§5), possibly a restatement. **Replay is the
acceptance test for a rule change**: run a period's event log through version _n_ and _n+1_ and diff the
resulting trial balances per account; a diff nobody inspected is an unreviewed change to the financial
statements. The engine must be the _only_ writer of `journal_lines` — one role, one service. Every
"quick manual insert" becomes an unexplained line in a close.

## 5. Immutability and corrections (M3)

| Correction            | When                                                     | Mechanic                                                 | Effect on totals     |
| --------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------- |
| **Reversal**          | The entry should not exist as booked                     | New entry, every line sign-flipped, `reverses_entry` set | Nets to zero         |
| **Reversal + rebook** | Wrong account, direction, dimension or currency          | Reversal, then a fresh correct entry citing both         | Replaces             |
| **Adjustment**        | Right accounts, wrong magnitude, partial reads tolerable | Delta entry for the difference                           | Moves by the delta   |
| **Reclassification**  | Right total, wrong account                               | Entry moving between two accounts                        | Unchanged            |
| **Late item**         | Correct entry, closed period                             | Book in the open period with `original_event_time`       | Current period moves |

Default to **reversal + rebook**. The delta adjustment is smaller but leaves an entry that is not
self-describing: a reader who finds the original cannot tell it was superseded unless they also find the
adjustment. A reversal produces a pair that is visibly complete.

### 5.1 Void versus cancel

|            | **Void**                                              | **Cancel**                                 |
| ---------- | ----------------------------------------------------- | ------------------------------------------ |
| Meaning    | The entry was a mistake; the economics never happened | The economics happened, then were undone   |
| Date       | Original date if the period is open                   | The date of the cancellation               |
| P&L effect | None — the original is erased net                     | Two events: recognition, then its reversal |
| Example    | Duplicate webhook booked twice (M8 failure)           | Customer cancels after capture             |

Conflating them corrupts revenue: voids must not appear as trading activity, and cancels must not vanish
from the period in which they were recognised. An expiring authorisation is a cancel of a _reservation_
— and if you followed §8 it never touched the economic books at all: nothing under option B, a memo
reversal under option C.

### 5.2 Correcting each kind of wrongness

| Wrong               | Example                                                 | Treatment                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amount              | €300.00 booked for E3 instead of €30.00                 | Reverse in full, rebook; both entries carry a `correction_reason` from a closed list and the approver (M11). Post a €270.00 delta only when an external system already acted on the original amount, and say so in the reason |
| Account             | Fee income booked to `4100 FX spread` instead of `4000` | Reclassification DR `4100` / CR `4000`, same period if open. Do not reverse the whole entry: the cash and wallet legs were right, and reversing them churns balances others already reconciled                                |
| Date, period open   | Booked to 2026-08-02, happened 2026-07-31               | Reverse and rebook with the correct `event_time` and period                                                                                                                                                                   |
| Date, period closed | Original sits in `2026-07`, hard-closed 2026-08-05      | You may not touch it. Post the correction in the open period with `event_time` = the original economic date and a link to the original (M10). July as published stays as published; September carries the correction          |

That last row is what an auditor expects, and what the restatement process exists to override when the
amount is material. Alongside it they expect a corrections report per period: entry id, original entry
id, date, accounts, amount, reason code, initiator, approver, and whether the approver differs from the
initiator (M11) — plus count and value trend, because rising corrections are a control finding whatever
the merits of each one. Evidence packaging is in `reconciliation-close.md`.

### 5.3 Soft delete is not immutability

```sql
ALTER TABLE journal_lines ADD COLUMN is_deleted boolean DEFAULT false;   -- the failing design
UPDATE journal_lines SET is_deleted = true WHERE entry_id = '…';         -- "we didn't delete it!"
```

Every query that forgets `AND NOT is_deleted` returns a different answer, and the balance job, the report
and the export will not all remember. It is an `UPDATE` on a posting, so the audit story becomes "we can
change rows but promise to change only this column", which is not a story. And point-in-time
reproducibility is gone: last Tuesday's balance is unknowable because a row's visibility changed without
a timestamp. If you want a soft-delete-shaped API, expose one — implemented as a reversing entry.

## 6. Balances

```sql
-- One subject on one control account, as the books stood at a point in time
-- (M20: the number is labelled with the time basis it used)
SELECT l.currency, SUM(l.amount_minor) FROM journal_lines l JOIN journal_entries e USING (entry_id)
 WHERE l.account_code = $1 AND l.subject_id = $2
   AND e.booked_at <= $3    -- what we knew at $3; use event_time for "economically as of"
 GROUP BY l.currency;

-- Trial balance for a period: must return zero rows (M2, M18)
SELECT currency, SUM(amount_minor) AS net FROM journal_lines l JOIN journal_entries e USING (entry_id)
 WHERE e.period = $1 GROUP BY currency HAVING SUM(amount_minor) <> 0;
```

`booked_at` and `event_time` give different answers and both are correct for different questions; any
balance shown to a human states which it used (M20). Every financial report is built on these shapes of
query and never on operational tables (M19); what gets published is in `corporate-finance.md`.

| Balance type          | Definition                                         | Who sees it                                  |
| --------------------- | -------------------------------------------------- | -------------------------------------------- |
| **Posted**            | Σ lines on the account                             | Finance, support, the ledger API             |
| **Pending**           | Authorised or instructed, not yet posted           | User (as "pending"), support                 |
| **Available**         | Posted − active holds − minimum balance            | The user — this gates spending (M13)         |
| **Cleared / settled** | Final at the bank, past the rail's reversal window | Treasury, the payouts engine                 |
| **Value-dated**       | Posted with effect from a future date              | Banking products (`banking-open-finance.md`) |

Never show a user one number labelled "balance". Show available, with pending as a separate explained
line. Most "your app said I had money" complaints are a UI that showed posted.

### 6.1 Materialised balances (M1, M17)

```sql
CREATE TABLE account_balances (
  account_code   text NOT NULL REFERENCES accounts(code),
  subject_id     text NOT NULL DEFAULT '', currency char(3) NOT NULL,
  posted_minor   bigint NOT NULL,
  reserved_minor bigint NOT NULL DEFAULT 0 CHECK (reserved_minor >= 0),   -- §8
  as_of_line_id  bigint NOT NULL,     -- last line folded in
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_code, subject_id, currency));
```

`as_of_line_id` is load-bearing: it turns "is the cache right?" into a bounded, incremental question and
makes the recompute resumable. Declare per account which update strategy applies.

|             | **Synchronous** (same transaction as the posting)      | **Asynchronous** (a follower folds new lines)   |
| ----------- | ------------------------------------------------------ | ----------------------------------------------- |
| Consistency | Strong; available balance is authoritative             | Eventual, with a declared staleness bound (M17) |
| Contention  | The row serialises all postings to that account (§7.1) | None on the write path                          |
| Use for     | Customer wallets, anything gating spending             | Income, expense, hot control accounts           |

```sql
-- Verification job: on a schedule and after every incident
WITH recomputed AS (
  SELECT account_code, COALESCE(subject_id,'') AS subject_id, currency,
         SUM(amount_minor) AS posted_minor FROM journal_lines GROUP BY 1,2,3)
SELECT r.*, b.posted_minor AS cached, r.posted_minor - b.posted_minor AS drift_minor
  FROM recomputed r LEFT JOIN account_balances b USING (account_code, subject_id, currency)
 WHERE b.posted_minor IS DISTINCT FROM r.posted_minor;
```

Any row returned is a page, not a ticket: either the cache is broken or something wrote lines outside the
posting engine. Assert two more identities on the same schedule — Σ over subjects on `2000.10` equals the
control account's own total, and Σ customer liabilities ≤ cash + in-transit.

## 7. Concurrency and ordering

### 7.1 The hot account problem

Every posting touches a few shared accounts: cash, income, VAT, the FX position. A synchronous
materialised balance on those makes one row a global write lock, and ledger throughput becomes one row's
update rate — a few thousand per second at best, much less with synchronous replication.

| Fix                            | How                                                                      | Cost                                                     |
| ------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| Don't materialise hot accounts | Derive on demand; finance reads them, the request path does not          | Slow ad-hoc queries; mitigate with a per-period snapshot |
| Striped counters               | `N` rows per account keyed by `hash(entry_id) % N`; balance is their sum | Reads fan out; `N` needs tuning; restriping is awkward   |
| Single-writer aggregation      | A background process folds new lines in batches                          | Eventual; must declare the bound (M17)                   |
| Purpose-built engine           | §13                                                                      | Operational novelty in the money path                    |

Customer wallets are not hot: contention is per user, and those spends genuinely need to serialise.

### 7.2 Serialisation and lock ordering

Pessimistic per-account locking is the right default for accounts that gate spending; optimistic
versioning (`UPDATE … WHERE version = $expected`) is better under low contention and becomes a retry
storm on a truly hot row. Deadlock avoidance is not optional: an entry touches ≥ 2 accounts, and two
concurrent transfers in opposite directions between the same pair deadlock unless locks are taken in a
canonical order.

```python
def lock_accounts(cur, keys: list[tuple[str, str]]) -> None:
    """keys = [(account_code, subject_id), ...]; lock in a total order, one statement each."""
    for account_code, subject_id in sorted(set(keys)):
        cur.execute("SELECT 1 FROM account_balances "
                    "WHERE account_code = %s AND subject_id = %s FOR UPDATE", (account_code, subject_id))
```

Do not collapse that into `… WHERE (account_code, subject_id) IN (…) ORDER BY 1,2 FOR UPDATE` and assume
the `ORDER BY` orders the locking: Postgres locks rows as the scan produces them, possibly before the
sort, so the order you get is the plan's, not yours. Issue one statement per key in sorted order, or take
`pg_advisory_xact_lock(hashtext(key))` in sorted order — which also works for accounts with no balance
row yet.

### 7.3 The anomaly, spelled out

Account holds €100.00. Two concurrent €60.00 spends, `READ COMMITTED`, no locks, balance derived:

| T1                              | T2                              | State                  |
| ------------------------------- | ------------------------------- | ---------------------- |
| `SELECT SUM(amount) …` → 10 000 |                                 |                        |
|                                 | `SELECT SUM(amount) …` → 10 000 | Both see €100          |
| check 10 000 ≥ 6 000 passes     | check 10 000 ≥ 6 000 passes     |                        |
| `INSERT` lines (−6 000)         | `INSERT` lines (−6 000)         | Inserts never conflict |
| `COMMIT`                        | `COMMIT`                        | Balance = **−2 000**   |

No error and no lost update in the classic sense: two `INSERT`s do not conflict, so read-committed has
nothing to detect. This is why "we use transactions" is not an answer.

| Approach                                              | Result                                                                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SERIALIZABLE`                                        | The `SUM` takes a predicate lock; the second commit fails with `40001`. Correct, but every caller retries and SIRead tracking costs memory on hot tables                       |
| `SELECT … FOR UPDATE` on the balance row, then insert | Correct, cheap, deterministic — and the reason `account_balances` exists even for accounts you otherwise derive                                                                |
| One conditional statement                             | `UPDATE account_balances SET posted_minor = posted_minor - 6000 WHERE … AND posted_minor - reserved_minor >= 6000 RETURNING …`; zero rows = refused (M12: refuse, never clamp) |

### 7.4 Ordering and sequences

You do **not** need a global total order of postings: double entry requires balance per entry, and
spending decisions require order only _within_ an account. A global sequence buys a nicer export and
costs a serialisation point. `GENERATED … AS IDENTITY` is monotonic in _assignment_, not in _commit_ —
transaction 500 can commit before 499, so a reader polling `WHERE line_id > last_seen` skips 499 forever
— and rollbacks leave permanent gaps, so this column is not the gapless sequence auditors ask about.

| Need                                                 | Mechanism                                                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Incremental readers (balance folder, exports)        | Read only to a safe watermark: `min(xmin)` of in-flight transactions, or a `ledger_head` row advanced by a single serialised committer |
| Statement line numbering per account                 | `account_sequence` assigned under the account's row lock at post time — gapless, ordered, contended only per account                   |
| Legal gapless document numbering (DE/IT/ES invoices) | A dedicated allocator with its own transaction and a documented gap-explanation procedure, not the ledger's identity column            |

### 7.5 Idempotent posting (M7)

Key on the **business action** — `refund:{payment_id}:{request_id}` — not a UUID the client regenerates
on each retry. `journal_entries.idempotency_key` is `UNIQUE`, so the duplicate insert fails with `23505`
and the handler returns the original entry.

```python
def post(conn, key: str, fingerprint: str, build: Callable[[], Entry]) -> Entry:
    try:
        with conn.transaction():
            entry = build()
            insert_entry(conn, entry, key=key, fingerprint=fingerprint)
            return entry
    except UniqueViolation:
        prior = load_by_key(conn, key)
        if prior.fingerprint != fingerprint:
            raise IdempotencyConflict(key)      # same key, different request -> 409, never post
        return prior                            # replay: original outcome, no second effect
```

The fingerprint is a hash of the semantically significant fields; a key reused with different content is
rejected, because silently returning the old result for a different request is worse than an error.
Declare the retention window — at least the longest rail reversal window on the path, in practice 30–90
days — and make expiry explicit, because after expiry a retry posts again.

## 8. Holds, authorisations and pending money (M13)

Lifecycle `reserve → capture (full | partial) → release`, with `expire` as an automatic release. Partial
capture releases the remainder; capturing more than reserved is not a thing — that is a new
authorisation.

|                                   | **A. Hold as a posting** (DR wallet / CR "funds reserved") | **B. Hold as a non-posted reservation**                             | **C. Off-balance-sheet memo posting** (DR `9000` / CR `9010`)                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Available balance                 | The wallet's posted balance — one read                     | `posted − Σ active holds` — a join or a counter                     | `posted − Σ active holds`, as B: memo lines never touch the wallet                                                                                                             |
| Ledger contains                   | Non-economic events (an auth is not a transaction)         | Only economic events                                                | Only economic events _in the trial balance proper_; authorisations sit in a memo pair outside it                                                                               |
| Entry volume                      | 2–3× (reserve, capture, release)                           | 1×                                                                  | 2–3×, same as A — all of it in memo accounts                                                                                                                                   |
| Expiry                            | A reversing entry per expired hold, forever                | A status update, cheap                                              | A reversing memo entry per expiry, forever                                                                                                                                     |
| Auditor's reaction                | "Why is there an entry for something that never happened?" | Clean                                                               | "Show me outstanding authorisations at 30 June" — answerable from the books                                                                                                    |
| Ring-fence visible on a statement | Yes                                                        | Only if the statement joins holds                                   | No — an auth is not the customer's money and must not read as if it were                                                                                                       |
| Risk                              | None inherent                                              | Two sources of truth for availability; needs its own reconciliation | B's availability risk, **plus** memo accounts that must be excluded from every statement and P&L by construction — by account type, not by a `WHERE` clause somebody remembers |

C is A's mechanism pointed at a pair of accounts that are not part of the economic books: `9000 Memo —
card authorisations outstanding` against `9010 Memo — card authorisation offset`. The entry balances (M2),
the pair nets to zero at every instant, and because both legs are `MEMO` accounts (§3.2) neither reaches
the balance sheet or the P&L — so it buys A's evidence without A's distortion. What it does not buy is A's
cheapness: the entry volume and the reversal-per-expiry are exactly A's, and the offset account is
meaningless on its own. What it buys instead is that "how much is authorised and unsettled right now?"
becomes a `SUM` over `9000` rather than a query against an operational holds table — a number you can age,
trend, and reconcile against the acquirer's outstanding-authorisation report (`payments.md` §2,
`reconciliation-close.md`).

**Use C for card-style authorisations whose outstanding total must be evidenced** — where an auditor,
a regulator or the acquirer reconciliation asks what was outstanding on a date, and "our holds table
says" is not an answer that survives the question "and what did it say on 30 June?". **Use B where the
total need not be evidenced**: an auth is a promise, not an economic event, most expire, and a
reservation with a good sweeper is the cheapest correct thing. **Use A when the hold is a legal
ring-fence** of customer funds (escrow, margin, regulated safeguarding, a court-ordered freeze) that must
show as a distinct balance in the trial balance and on statements. The criterion across all three is what
the number has to survive: nothing (B), an audit of the outstanding total (C), or a claim on the funds
themselves (A). Mixed estates are normal — escrow uses A, checkout auths C, low-value in-app holds B.
`payments.md` §2 prescribes C for card authorisations and `assets/POSTING-RULES.template.md` carries the
memo entry per authorisation and per expiry.

```sql
-- The failing design: read then write (the §7.3 anomaly, with money in it)
SELECT posted_minor - reserved_minor FROM account_balances WHERE …;    -- compared in the app
UPDATE account_balances SET reserved_minor = reserved_minor + 5000 WHERE …;

-- The fix: one statement, condition inside it
WITH reserved AS (
  UPDATE account_balances SET reserved_minor = reserved_minor + $3, updated_at = now()
   WHERE account_code = $1 AND subject_id = $2 AND currency = $4
     AND posted_minor - reserved_minor >= $3         -- M12: refuse, do not clamp
  RETURNING posted_minor)
INSERT INTO holds (hold_id, account_code, subject_id, currency, amount_minor,
                   state, expires_at, idempotency_key)
SELECT $5, $1, $2, $4, $3, 'ACTIVE', now() + $6::interval, $7 FROM reserved RETURNING hold_id;
```

Zero rows returned means insufficient available balance: return a specific error naming the limit and the
shortfall; never partially reserve (limit design and velocity rules: `risk-fraud-aml.md`). Capture posts the real entry and decrements `reserved_minor` in the
same transaction; release decrements it and closes the hold. Every hold carries an `expires_at` derived
from the rail (card auth windows are in `payments.md`) and a sweeper releases expired ones. Two things go
wrong, and both are SLOs rather than tickets:

| Metric                   | Definition                                                  | Objective                                                      |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------- |
| **Hold leakage**         | Value of `ACTIVE` holds past `expires_at`                   | < 0.1% of held value; alert on any hold > 2× its window        |
| **Orphan captures**      | Captures against a released or expired hold                 | 0 — each is a sweeper bug or a rail behaviour you mis-modelled |
| **Reserved/posted skew** | `Σ holds WHERE ACTIVE` vs `account_balances.reserved_minor` | Exactly 0, verified by the §6.1 job                            |

Leaked holds are invisible to finance (no postings) and extremely visible to customers, whose money is
stuck. Alert on the metric, not on the complaint.

## 9. Multi-currency books

| Currency         | Meaning                                                        | Where it lives                 |
| ---------------- | -------------------------------------------------------------- | ------------------------------ |
| **Transaction**  | What the event was denominated in                              | `journal_lines.currency` (M4)  |
| **Functional**   | The entity's primary economic environment; the books' currency | `entities.functional_currency` |
| **Presentation** | What consolidated statements are shown in                      | Report configuration (M20)     |

Under IAS 21 / ASC 830 these are distinct decisions with legal consequences. Do not hardcode one and call
it "base".

### 9.1 Per-currency leaves, or a multi-currency control account

`accounts.currency` is `NOT NULL` either way, and the test that decides which value it takes is
**reconcilability against an external statement**. An account whose balance is compared, line by line, to
a document somebody else produces in one currency — a bank account, a PSP settlement account, a
safeguarding account, a custodian position — gets **its own leaf per currency**: `1010.EUR`, `1010.USD`.
There is a counterparty statement per currency, so there must be a balance per currency to match it
against; a single blended number would be unmatchable, could not be revalued without decomposing anyway,
and would invite the cross-currency `SUM` that M6 exists to prevent.

An account with no external statement behind it — a **control** account for customer wallets, merchant
payables, the FX position — is declared `currency = 'multi'`, and the currency lives on the line (M4). It
is one concept, not _n_, and splitting it per currency multiplies the chart by the currency count and
duplicates every rollup and every posting rule for no reconciliation gain. What it gives up is a single
number: **a `multi` account has no balance, only a balance per currency**, and that is the contract.
Every balance query on it groups by currency (§6), every report states the currency (M20), and any code
path that reduces it to one figure without a conversion — with a rate, a source and a timestamp — is the
M6 bug this rule exists to make visible. That is why `journal_lines.currency` stays `NOT NULL` on every
line, `multi` or not: the line always knows what it is denominated in even when the account does not.

The consistency check then applies only where it means something: for an account whose `currency` is not
`'multi'`, the line's currency must equal it, enforced in the posting function (§3.3) because the
condition spans two tables. `assets/CHART-OF-ACCOUNTS.template.yaml` ships the split already made, and it
is the reason §9.2 can debit and credit `2000.10` and `2900` in two currencies inside one conversion: both
are control accounts, so the currency is on the line.

### 9.2 Conversion is two legs and a position account (M6, M16)

One entry cannot cross currencies without violating M2 in one of them. A conversion is a pair of
per-currency-balanced legs joined by an **FX position** account, plus the recorded rate. User converts
100.00 USD to EUR; mid 0.9200, customer rate 0.9108 (1% spread):

| Leg | Debit                                 | Credit                                                          |
| --- | ------------------------------------- | --------------------------------------------------------------- |
| USD | 2000.10 User wallets `user:42` 10 000 | 2900 FX position 10 000                                         |
| EUR | 2900 FX position 9 200                | 2000.10 User wallets `user:42` 9 108 · 4100 FX spread income 92 |

Each leg balances in its own currency (M2) and the spread is its own posting, so "what did we earn on FX
this month?" is a query (M16). The entry carries `fx_rate`, `rate_source`, `rate_timestamp` and
`rate_type` (mid / customer); without them the conversion is unauditable and unreproducible (M6). Rate
acquisition, triangulation and the inverse-rate trap are in `money-arithmetic.md`. Translate `2900` at
mid and it is flat — 100.00 USD credit ≡ 92.00 EUR debit — and **that is the invariant to monitor**: a
position account not flat at market is an open FX exposure, intended on a treasury desk and a bug
everywhere else.

### 9.3 Revaluation, realized and unrealized

Functional currency EUR. You hold 100 000.00 USD booked at 0.9200 → carrying 92 000.00 EUR; the closing
rate is 0.9350. Do **not** post EUR onto the USD account — that would change its USD quantity. Attach a
functional-currency **revaluation shadow account** to each foreign-currency account:

| #   | Debit                                                  | Credit                          |
| --- | ------------------------------------------------------ | ------------------------------- |
| R1  | 1010.USD.REVAL FX revaluation — Cash USD (EUR) 150 000 | 4910 Unrealized FX gain 150 000 |

Reported EUR carrying value of cash = (USD balance × historic rate) + revaluation account = 92 000.00 +
1 500.00 = 93 500.00, while the USD account still says exactly 100 000.00 USD. Next month, sell the USD
at 0.9400: reverse the unrealized, then book the trade.

| #   | Leg | Debit                           | Credit                        |
| --- | --- | ------------------------------- | ----------------------------- |
| R2  | EUR | 4910 Unrealized FX gain 150 000 | 1010.USD.REVAL 150 000        |
| S1  | USD | 2900 FX position 10 000 000     | 1010.USD Cash 10 000 000      |
| S2  | EUR | 1010.EUR Cash 9 400 000         | 2900 FX position 9 400 000    |
| S3  | EUR | 2900 FX position 200 000        | 4900 Realized FX gain 200 000 |

After S1/S2 the position holds 100 000.00 USD debit and 94 000.00 EUR credit; at the carrying rate 0.9200
the USD leg is worth 92 000.00 EUR, so the account carries a 2 000.00 EUR gain. S3 clears it to P&L and
leaves the position flat. **Unrealized versus realized is entirely a question of when you clear the
position account**: at period end against `4910`, at settlement against `4900`. Consequences: revaluation
runs as part of close, on a declared account list, at a declared rate source and timestamp, and either
reverses on day one of the next period or is a standing balance you overwrite — pick one and document it.
Only monetary items are revalued; prepayments, fixed assets and equity are not. The rate is stored on the
entry: "we used the ECB rate" is not evidence, the rate value and its timestamp are.

## 10. Clearing and suspense accounts

|                 | **Clearing / in-transit**                              | **Suspense**                                  |
| --------------- | ------------------------------------------------------ | --------------------------------------------- |
| Meaning         | We know exactly what this is; it is between two places | Money we received or lost and cannot classify |
| Expected life   | Known (T+1 card settlement, T+2 SEPA)                  | Unbounded — that is the problem               |
| Returns to zero | Every cycle                                            | Only by investigation                         |
| Owner           | The team owning the rail                               | A named human in finance/ops                  |

Canonical uses: `1500` settlement in transit (E4/E5 in §1.3); `1510` payout in flight — "we know it left
our bank, we have no confirmation it landed"; `1900` unidentified receipts — an inbound transfer with an
unparseable reference. The rule that separates a healthy suspense account from a slush fund:

> **Inbound money you cannot refuse may land in suspense. Outbound money and internal postings may not.**
> An unmapped event in the posting engine must fail the posting and page someone.

The failing design is `except UnknownEventType: post_to_suspense()`, which converts a loud, fixable
mapping gap into a silently growing balance finance discovers at year end.

```sql
-- Aging: run daily, publish into the break inventory (reconciliation-close.md)
SELECT l.account_code, l.currency, l.subject_id, SUM(l.amount_minor) AS open_minor,
       MIN(e.event_time) AS oldest, now() - MIN(e.event_time) AS age
  FROM journal_lines l JOIN journal_entries e USING (entry_id)
 WHERE l.account_code LIKE '15%' OR l.account_code LIKE '19%'
 GROUP BY 1,2,3 HAVING SUM(l.amount_minor) <> 0 ORDER BY MIN(e.event_time);
```

| Age of an open item               | Treatment                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Within the rail's expected window | Normal, no action                                                                                                 |
| Past the window                   | A break: owner, classification, target date (M9)                                                                  |
| > 30 days                         | Escalate — a lost payment or a broken mapping                                                                     |
| > 90 days                         | Write off with approval, as its own posting to a named write-off account; never by adjusting the clearing balance |

**A suspense account whose balance only grows is an incident, not a backlog.** Alert on its trajectory —
balance and oldest-item age — not just its absolute value.

## 11. Periods and closing (M10)

```sql
CREATE TYPE period_status AS ENUM ('FUTURE','OPEN','SOFT_CLOSED','HARD_CLOSED');
CREATE TABLE accounting_periods (
  period char(7) PRIMARY KEY, starts_on date NOT NULL, ends_on date NOT NULL,
  status period_status NOT NULL DEFAULT 'FUTURE', closed_at timestamptz, closed_by text);

CREATE FUNCTION assert_period_open() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st period_status;
BEGIN
  SELECT status INTO st FROM accounting_periods WHERE period = NEW.period;
  IF st IS NULL OR st IN ('FUTURE','HARD_CLOSED') THEN
    RAISE EXCEPTION 'M10: period % is % — post to the open period citing the original date',
      NEW.period, COALESCE(st::text,'undefined'); END IF;
  IF st = 'SOFT_CLOSED'
     AND NOT COALESCE(current_setting('app.adjusting_entry', true)::boolean, false) THEN
    RAISE EXCEPTION 'M10: period % is soft-closed; adjusting entries need approval', NEW.period; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_period_open BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION assert_period_open();
```

The `COALESCE` is the control, not decoration: with `missing_ok = true`, `current_setting()` returns
`NULL` when nobody set the GUC, `NULL::boolean` is `NULL`, `NOT NULL` is `NULL`, `… AND NULL` is `NULL`,
and plpgsql skips an `IF` whose condition is `NULL` — so the unguarded version waves through exactly the
postings it exists to stop, the ones where nobody claimed an approval. Test it in that state:

- **Integration test:** post an ordinary entry into a `SOFT_CLOSED` period with `app.adjusting_entry`
  unset, and assert the exception. Without `COALESCE` the trigger passes every test that sets the flag
  either way and fails only in production (§12).

| Status        | Who may post                                                          | Typical duration            |
| ------------- | --------------------------------------------------------------------- | --------------------------- |
| `FUTURE`      | Nobody                                                                | Until the period starts     |
| `OPEN`        | The posting engine, plus approved manual entries                      | The period, plus a few days |
| `SOFT_CLOSED` | Only approved adjusting entries, by finance, under dual control (M11) | Days 1–5 after period end   |
| `HARD_CLOSED` | **Nobody, ever** (M10)                                                | Forever                     |

Enforce it in the database, not a service — services get bypassed by a migration script at 2 a.m.
**Cutoff** is the rule mapping `event_time` → `period`: the period derives from `event_time` in the
entity's reporting timezone unless that period is closed, in which case the entry goes to the earliest
open period carrying `original_event_time`. An event at 23:30 UTC on 31 August is a September event for
an entity reporting at UTC+2; a naive datetime on a cutoff-sensitive field is a defect.

**Year-end roll.** Income and expense accounts close to retained earnings; balance-sheet accounts carry
forward. Computing that at report time by filtering on period is enough for a purely internal ledger, but
post the explicit closing entry (DR each income account for its credit balance, CR each expense account for
its debit balance, net to `3100 Retained earnings`) when the books are statutory or exported to an ERP, so
a new year's trial balance is self-contained. **Opening balances** for a migrated ledger are one dated entry
against `3900 Opening balance equity` citing the signed statement they came from — the boundary of your
reproducibility, everything after which is derivable and nothing before which is. Say so in the spec.

## 12. Testing (M18)

| Test                       | Asserts                                              | Where                                 |
| -------------------------- | ---------------------------------------------------- | ------------------------------------- |
| **Golden ledger** per flow | Fixture event(s) → exact expected lines              | Unit, per rule set version            |
| **Trial balance property** | Any set of postings sums to zero per currency        | Property test + CI query on an export |
| **Round-trip correction**  | Entry + its reversal returns the prior trial balance | Property test                         |
| **Sub-ledger identity**    | Σ subjects = control account balance                 | Integration + production job (§6.1)   |
| **Replay determinism**     | Same events + same rule version → identical entries  | CI on every rule change (§4)          |
| **Immutability**           | `UPDATE`/`DELETE` on lines raises                    | Integration, against real Postgres    |
| **Closed-period refusal**  | Posting into `HARD_CLOSED` raises                    | Integration                           |
| **No-float scan**          | No float arithmetic on amounts                       | `scripts/money_lint.py` in CI         |

Golden tests catch the real regressions: they encode the finance owner's intent in a form finance reads.

```python
def test_purchase_with_commission_and_vat(ledger, clock):
    clock.set("2026-08-14T10:00:00Z")
    entry = ledger.post_event(load_fixture("order_captured_30eur.json"))
    assert lines_of(entry) == [
        Line("2000.10", "user:42", +3_000, "EUR"), Line("2200", "merch:7", -2_700, "EUR"),
        Line("4000", None, -250, "EUR"),           Line("2100", None, -50, "EUR")]
    assert entry.period == "2026-08" and entry.rule_set_version == "v7"

@given(st.lists(posting_strategy(), min_size=1, max_size=50))
def test_book_always_balances(postings):
    book = Ledger(rules=RULES_V7)
    for p in postings:
        book.post(p)                          # refusal is a valid outcome
    for currency, net in book.trial_balance().items():
        assert net == 0, f"M2 violated in {currency}: {net}"
```

Determinism is a prerequisite: inject the clock, the id generator and the sequence. A test calling
`datetime.now()` or `uuid4()` cannot be a golden test, and a posting engine reading the wall clock
internally cannot be replayed (§4). The CI gate that matters runs against a real export of a real period —
`python3 scripts/audit_ledger.py export-2026-08.csv --period 2026-08 --fail-on warn` — checking per-entry
balance, currency consistency, duplicate idempotency and event ids, sequence gaps, closed-period postings
and suspense aging. A build that cannot show a balanced book does not deploy. Replay harnesses, shadow
ledgers and outbox chaos testing are in `architecture-ops.md`.

## 13. Build or buy

| Option                                   | Realistic throughput                                           | Latency  | Double entry native                         | Close/report features                              | Ops burden                                       | Fit                                                      |
| ---------------------------------------- | -------------------------------------------------------------- | -------- | ------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| **Postgres, this schema**                | 10²–10³ entries/s single writer; 10⁴/s batched and partitioned | 1–10 ms  | You build it (§3)                           | You build it                                       | Low — you already run Postgres                   | Almost everyone up to ~10⁷ postings/day                  |
| **TigerBeetle**                          | 10⁵–10⁶ transfers/s batched; its entire design goal            | sub-ms   | Yes, two-phase transfers and holds built in | None — an accounting engine, not a reporting stack | Medium: new datastore, new failure modes, no SQL | Exchanges, wallets at national scale                     |
| **Formance / ledger-as-a-service**       | 10²–10³/s                                                      | 10–50 ms | Yes                                         | Partial                                            | Medium: a dependency in the money path           | Teams wanting the ledger contract without building §3–§8 |
| **ERP sub-ledger** (NetSuite, SAP, Xero) | 10⁰–10²/s, batch-oriented                                      | seconds  | Yes                                         | Excellent — it _is_ the close                      | Low code, high process                           | The GL of record; feed it summarised journals            |
| **"The PSP dashboard is our ledger"**    | n/a                                                            | n/a      | No                                          | No                                                 | Zero until the first dispute                     | Never — one counterparty's view of your money            |

| Criterion                                 | Chooses                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Is there already a GL of record (Rule 0)? | Then you are building a **sub-ledger** that exports to it; do not rebuild the GL                                                |
| Postings per day                          | < 10⁷ → Postgres; > 10⁸ → TigerBeetle, or sharded Postgres feeding a summarising GL                                             |
| Hold decision latency budget              | < 1 ms at high concurrency → purpose-built engine; otherwise Postgres                                                           |
| Who must read the ledger                  | Auditors and analysts need SQL and exports — that pushes to Postgres or the ERP                                                 |
| Regulator/auditor familiarity             | Ask before choosing. "Postgres, append-only postings" is boringly acceptable; anything exotic invites questions you must answer |

**Default recommendation:** build on Postgres with the schema in §3, treat it as the sub-ledger of record
for your product, and export summarised journals to whatever GL finance already closes in. That keeps the
data where every auditor and analyst can query it and defers the specialised engine until you have a
measured throughput problem rather than an anticipated one. Move to TigerBeetle when §7.1 contention is
your measured bottleneck after batching — and keep a Postgres ledger as the reporting and audit surface
either way.

## Review questions

1. Show the query that rebuilds every balance from postings alone, and its last production run against the
   cached balances. What was the drift?
2. Point at the artifact — one file, reviewed by the finance owner — mapping each business event to its
   journal entry, and the version stamped on entries it produced.
3. Run `UPDATE journal_lines SET amount_minor = 1 WHERE line_id = …` as the app role. Does it raise?
4. Which account holds a customer's spendable money, what is its type, and what stops it going into a debit
   balance? Show the constraint or the conditional `UPDATE`.
5. Two concurrent spends of the full available balance: what stops both succeeding, and where is the test?
6. What is the value and oldest-item age of every clearing and suspense account, and who owns each?
7. Attempt a posting into last month's closed period. What error comes back, and where does a genuinely late
   item for that month land instead?
8. For the last FX conversion, show the rate, its source, its timestamp and the spread's account. Then show
   the FX position account translated at mid — is it flat?
9. Show a correction from the last 90 days: the original entry, the reversal citing it, the reason code, and
   evidence that the approver is not the initiator.
10. Run the trial balance for the whole book, per currency. Is it exactly zero, and is that assertion in CI?
