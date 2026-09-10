-- Storefront billing schema and the nightly settlement jobs.
--
-- The same schema as `lint_bad.sql`, written the way the money model requires.
-- money_lint.py must report zero findings here.
--
-- Money model: an amount is an exact integer count of minor units (M4) beside
-- an ISO 4217 code on the same row, so no query can add euros to yen (M6).
-- Postings are append-only: a correction is a reversing entry that cites the
-- original, never an UPDATE (M3). No table stores a balance -- the balance is
-- a view over the postings, which is what makes it reconstructible (M1, M17).
-- Time is threefold and the period follows the event, not the booking (M10).

-- ---------------------------------------------------------------------------
-- Chart of accounts
-- ---------------------------------------------------------------------------

CREATE TABLE accounts (
    account_id      BIGSERIAL PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    account_type    TEXT NOT NULL,
    currency        CHAR(3) NOT NULL,
    opened_at       TIMESTAMPTZ NOT NULL,
    CONSTRAINT accounts_type_known
        CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    CONSTRAINT accounts_currency_iso4217
        CHECK (currency ~ '^[A-Z]{3}$')
);

-- ---------------------------------------------------------------------------
-- The journal. Append-only: no UPDATE and no DELETE anywhere below.
-- ---------------------------------------------------------------------------

CREATE TABLE journal_entries (
    entry_id            BIGSERIAL PRIMARY KEY,
    idempotency_key     TEXT NOT NULL,
    external_event_id   TEXT,
    -- M10: when it happened, when we learned of it, and the period it lands
    -- in. The period is derived from event_at, never from booked_at, so a
    -- 31 August event booked on 2 September still belongs to 2026-08.
    event_at            TIMESTAMPTZ NOT NULL,
    booked_at           TIMESTAMPTZ NOT NULL,
    period              CHAR(7) NOT NULL,
    reverses_entry_id   BIGINT REFERENCES journal_entries (entry_id),
    description         TEXT NOT NULL,
    CONSTRAINT journal_entries_booked_after_event CHECK (booked_at >= event_at),
    CONSTRAINT journal_entries_period_shape CHECK (period ~ '^[0-9]{4}-[0-9]{2}$')
);

-- M7: a replayed request finds the entry that already exists instead of
-- posting a second one.
CREATE UNIQUE INDEX journal_entries_idempotency
    ON journal_entries (idempotency_key);

-- M8: one provider event books once, however many times it is delivered.
CREATE UNIQUE INDEX journal_entries_external_event
    ON journal_entries (external_event_id)
 WHERE external_event_id IS NOT NULL;

CREATE TABLE journal_lines (
    line_id         BIGSERIAL PRIMARY KEY,
    entry_id        BIGINT NOT NULL REFERENCES journal_entries (entry_id),
    account_id      BIGINT NOT NULL REFERENCES accounts (account_id),
    direction       CHAR(1) NOT NULL,
    -- M4: exact integer minor units, paired with the currency they are in.
    amount_minor    BIGINT NOT NULL,
    currency        CHAR(3) NOT NULL,
    description     TEXT NOT NULL,
    CONSTRAINT journal_lines_direction CHECK (direction IN ('D', 'C')),
    CONSTRAINT journal_lines_amount_positive CHECK (amount_minor > 0)
);

CREATE INDEX journal_lines_by_entry ON journal_lines (entry_id);
CREATE INDEX journal_lines_by_account ON journal_lines (account_id, currency);

-- Interest accrues below the minor unit, so it is held at a declared scale
-- until the day it is capitalised and rounded once, at a declared point (M5).
CREATE TABLE interest_accruals (
    accrual_id          BIGSERIAL PRIMARY KEY,
    account_id          BIGINT NOT NULL REFERENCES accounts (account_id),
    accrual_date        DATE NOT NULL,
    accrued_amount      NUMERIC(24, 8) NOT NULL,
    currency            CHAR(3) NOT NULL,
    capitalised_entry_id BIGINT REFERENCES journal_entries (entry_id)
);

-- Operational state about a provider settlement file. Not a posting: nothing
-- here is evidence of money moving, so this table is allowed to change.
CREATE TABLE settlement_batches (
    batch_id        BIGSERIAL PRIMARY KEY,
    provider        TEXT NOT NULL,
    currency        CHAR(3) NOT NULL,
    gross_minor     BIGINT NOT NULL,
    fee_minor       BIGINT NOT NULL,
    net_minor       BIGINT NOT NULL,
    reconciled_at   TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Balances are derived, never stored (M1). Rebuilding one is a re-run of this
-- view, and it can be re-derived for any date by bounding event_at.
-- ---------------------------------------------------------------------------

CREATE VIEW account_balances AS
SELECT jl.account_id,
       jl.currency,
       SUM(CASE jl.direction WHEN 'D' THEN jl.amount_minor ELSE -jl.amount_minor END)
           AS balance_minor
  FROM journal_lines jl
 GROUP BY jl.account_id, jl.currency;

-- M2: the trial balance, per currency. Every currency must net to zero.
CREATE VIEW trial_balance AS
SELECT jl.currency,
       SUM(CASE jl.direction WHEN 'D' THEN jl.amount_minor ELSE -jl.amount_minor END)
           AS net_minor
  FROM journal_lines jl
 GROUP BY jl.currency;

-- ---------------------------------------------------------------------------
-- Reporting. A sum of money is meaningless without its currency, so the
-- currency is always in the GROUP BY (M6).
-- ---------------------------------------------------------------------------

SELECT jl.currency,
       je.period,
       SUM(jl.amount_minor) AS revenue_minor
  FROM journal_lines jl
  JOIN journal_entries je ON je.entry_id = jl.entry_id
  JOIN accounts a ON a.account_id = jl.account_id
 WHERE a.account_type = 'INCOME'
   AND jl.direction = 'C'
 GROUP BY jl.currency, je.period
 ORDER BY je.period;

-- Pinning a single currency in the WHERE clause is the other honest way to
-- write it: the number that comes back is stated in one unit.
SELECT sb.provider,
       SUM(sb.fee_minor) AS provider_fees_minor
  FROM settlement_batches sb
 WHERE sb.currency = 'EUR'
 GROUP BY sb.provider;

-- ---------------------------------------------------------------------------
-- Writes. Postings are inserted; nothing rewrites one.
-- ---------------------------------------------------------------------------

INSERT INTO journal_entries
    (idempotency_key, external_event_id, event_at, booked_at, period, description)
VALUES
    ('topup-2026-08-31-user42-01', 'evt_psp_8a31f0',
     TIMESTAMPTZ '2026-08-31 23:40:00+00',
     TIMESTAMPTZ '2026-09-02 07:15:00+00',
     '2026-08',
     'Card top-up EUR 100.00 for user:42');

INSERT INTO journal_lines (entry_id, account_id, direction, amount_minor, currency, description)
SELECT e.entry_id, a.account_id, v.direction, v.amount_minor, a.currency, v.description
  FROM journal_entries e
  CROSS JOIN (
        VALUES ('1000', 'D', 10000::BIGINT, 'Cash held at the PSP'),
               ('2000', 'C', 10000::BIGINT, 'Wallet owed to user:42')
       ) AS v (code, direction, amount_minor, description)
  JOIN accounts a ON a.code = v.code
 WHERE e.idempotency_key = 'topup-2026-08-31-user42-01';

-- M3: the correction is a new entry that cites the original and flips every
-- side. The original row is still there, still saying what it always said.
INSERT INTO journal_entries
    (idempotency_key, external_event_id, event_at, booked_at, period,
     reverses_entry_id, description)
SELECT 'reverse-' || e.idempotency_key,
       'evt_psp_8a31f0_reversal',
       TIMESTAMPTZ '2026-09-03 09:00:00+00',
       TIMESTAMPTZ '2026-09-03 09:00:04+00',
       '2026-09',
       e.entry_id,
       'Reverse the 31 Aug top-up for user:42 - card authorisation was withdrawn'
  FROM journal_entries e
 WHERE e.idempotency_key = 'topup-2026-08-31-user42-01';

INSERT INTO journal_lines (entry_id, account_id, direction, amount_minor, currency, description)
SELECT r.entry_id,
       jl.account_id,
       CASE jl.direction WHEN 'D' THEN 'C' ELSE 'D' END,
       jl.amount_minor,
       jl.currency,
       'Reversal of line ' || jl.line_id
  FROM journal_entries r
  JOIN journal_lines jl ON jl.entry_id = r.reverses_entry_id
 WHERE r.idempotency_key = 'reverse-topup-2026-08-31-user42-01';

-- Allowed, and the reason the distinction is worth drawing: this row is
-- operational state about a file we received, not evidence of a movement.
-- No posting is touched, and no balance is rewritten.
UPDATE settlement_batches
   SET reconciled_at = TIMESTAMPTZ '2026-09-01 04:12:00+00'
 WHERE batch_id = 4471
   AND reconciled_at IS NULL;
