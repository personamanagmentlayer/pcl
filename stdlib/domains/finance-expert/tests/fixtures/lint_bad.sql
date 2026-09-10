-- Storefront billing schema and the nightly settlement jobs.
--
-- Fixture for money_lint.py. Every defect is deliberate and the comment above
-- it names the check it is meant to trip.
--
-- Expected: C01 C05 C06 C11 C12

-- C01 -- three amounts held as binary floating point.
-- C05 -- and the table never says which currency any of them is in.
CREATE TABLE invoices (
    invoice_id      BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL,
    subtotal        DOUBLE PRECISION NOT NULL,
    tax_amount      FLOAT NOT NULL,
    total_amount    MONEY NOT NULL,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Correct by comparison: exact minor units plus an ISO 4217 code.
-- money_lint must stay silent on this one.
CREATE TABLE payments (
    payment_id      BIGSERIAL PRIMARY KEY,
    invoice_id      BIGINT NOT NULL REFERENCES invoices (invoice_id),
    amount_minor    BIGINT NOT NULL,
    currency        CHAR(3) NOT NULL,
    booked_at       TIMESTAMPTZ NOT NULL
);

-- C06 -- the revenue report adds euros to yen and reports the total.
SELECT customer_id,
       SUM(total_amount) AS revenue
  FROM invoices
 GROUP BY customer_id
 ORDER BY revenue DESC;

-- Correct by comparison: one row per currency, so the number means something.
SELECT currency,
       SUM(amount_minor) AS revenue_minor
  FROM payments
 GROUP BY currency;

-- C11 -- the wallet balance is rewritten in place; nothing records why, and
-- two concurrent writers lose an update.
UPDATE wallet_accounts
   SET balance = balance - 1250,
       updated_at = now()
 WHERE account_id = 42;

-- C12 -- a posting amended after the fact; the audit trail is now fiction.
UPDATE journal_lines
   SET amount_minor = 990
 WHERE journal_line_id = 8817;

-- C12 -- and old postings deleted outright to keep the table small.
DELETE FROM ledger_entries
 WHERE booked_at < now() - INTERVAL '2 years';
