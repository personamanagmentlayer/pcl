# Analytical Databases — Modelling and Pipelines

Reference material for the `analytical-databases-expert` skill. See [SKILL.md](../SKILL.md).

## Dimensional Modelling

The star schema survives because it matches how people ask questions: a fact
table of measurements, surrounded by dimensions that describe them.

```sql
-- Fact: one row per business event, mostly foreign keys and numbers
CREATE TABLE fact_orders (
    order_key       BIGINT,
    date_key        INTEGER      NOT NULL,   -- YYYYMMDD
    customer_key    BIGINT       NOT NULL,
    product_key     BIGINT       NOT NULL,
    store_key       INTEGER      NOT NULL,
    quantity        INTEGER      NOT NULL,
    amount_minor    BIGINT       NOT NULL,   -- additive
    discount_minor  BIGINT       NOT NULL,   -- additive
    margin_pct      DECIMAL(5,2)             -- NOT additive: never SUM this
);

-- Dimension: wide, denormalised, descriptive
CREATE TABLE dim_customer (
    customer_key    BIGINT PRIMARY KEY,      -- surrogate
    customer_id     VARCHAR(64) NOT NULL,    -- natural key from the source
    name            VARCHAR(255),
    segment         VARCHAR(50),
    country         CHAR(2),
    valid_from      DATE NOT NULL,
    valid_to        DATE,
    is_current      BOOLEAN NOT NULL
);
```

Rules that prevent the common failures:

- **Declare the grain first**, in a sentence: "one row per order line per
  shipment". Every column must be true at that grain. Most broken warehouses have
  a fact table whose grain nobody can state.
- **Classify each measure**: additive (sum over any dimension), semi-additive
  (balances — sum over everything except time), non-additive (ratios, percentages
  — recompute from components, never sum).
- **Denormalise dimensions.** A snowflake saves storage nobody is short of and
  costs a join on every query.
- **Use surrogate keys** so a source system reusing an identifier cannot corrupt
  history.
- **Keep a date dimension.** Fiscal periods, holidays and week numbering do not
  belong in query logic.

## Slowly Changing Dimensions

What happens when a customer moves from the "SMB" segment to "Enterprise"?

**Type 1 — overwrite.** History is lost; last year's report changes. Correct for
fixing errors, wrong for tracking change.

**Type 2 — new row per version.** The default for anything a report is grouped
by.

```sql
-- Close the current row
UPDATE dim_customer
SET valid_to = CURRENT_DATE - 1, is_current = FALSE
WHERE customer_id = 'C-1042' AND is_current;

-- Open the new version with a new surrogate key
INSERT INTO dim_customer (customer_key, customer_id, segment, valid_from, valid_to, is_current)
VALUES (nextval('dim_customer_seq'), 'C-1042', 'Enterprise', CURRENT_DATE, NULL, TRUE);
```

Facts reference the surrogate key that was current when the event occurred, so
last year's orders stay attributed to "SMB". That is the whole point.

**Type 3 — previous value column.** Only when exactly one prior value is needed.

Decide the type per attribute, not per dimension: `segment` is usually type 2,
`email` usually type 1.

## Incremental Loading

Full reloads stop being viable early. Incremental loading must be **idempotent** —
running it twice must not double-count.

### Merge on a natural key

```sql
MERGE INTO fact_orders AS target
USING staging_orders AS source
  ON target.order_key = source.order_key
WHEN MATCHED AND source.updated_at > target.updated_at THEN UPDATE SET …
WHEN NOT MATCHED THEN INSERT …;
```

### Delete-and-insert by partition

Simpler and usually faster on columnar engines, which dislike row-level updates:

```sql
BEGIN;
DELETE FROM fact_orders WHERE date_key BETWEEN 20260901 AND 20260904;
INSERT INTO fact_orders SELECT * FROM staging_orders
WHERE date_key BETWEEN 20260901 AND 20260904;
COMMIT;
```

Reprocess a trailing window, not just yesterday. Late-arriving data is normal:

```sql
WHERE date_key >= to_char(current_date - INTERVAL '3 days', 'YYYYMMDD')::int
```

### Watermarks

```sql
CREATE TABLE etl_watermark (
    table_name    VARCHAR(128) PRIMARY KEY,
    last_value    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL DEFAULT now()
);
```

Advance the watermark **only after** the load commits. Advancing first turns a
transient failure into permanent data loss, and it is the single most common
pipeline bug.

Use a source column that is monotonic and reliable. `updated_at` maintained by an
application is often neither — a backfill that does not touch it leaves rows
invisible to the pipeline forever.

## Data Quality Tests

Run these as part of the pipeline, and fail the run rather than publishing bad
data.

```sql
-- Grain: the declared key must be unique
SELECT order_key, count(*) FROM fact_orders GROUP BY 1 HAVING count(*) > 1;

-- Referential integrity, which columnar stores do not enforce
SELECT f.customer_key FROM fact_orders f
LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
WHERE d.customer_key IS NULL LIMIT 10;

-- Exactly one current row per natural key
SELECT customer_id, count(*) FROM dim_customer WHERE is_current
GROUP BY 1 HAVING count(*) <> 1;

-- Volume anomaly: today against the trailing median
WITH daily AS (
  SELECT date_key, count(*) AS n FROM fact_orders
  WHERE date_key >= 20260801 GROUP BY 1
)
SELECT date_key, n,
       median(n) OVER (ORDER BY date_key ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS baseline
FROM daily QUALIFY n < 0.5 * baseline OR n > 2.0 * baseline;

-- Reconciliation against the source of truth
SELECT (SELECT sum(amount_minor) FROM fact_orders WHERE date_key = 20260904)
     - (SELECT sum(amount_minor) FROM source.orders WHERE order_date = DATE '2026-09-04')
       AS difference_minor;
```

The reconciliation query is the one that matters. Everything else checks
internal consistency; only this checks that the warehouse agrees with reality.
Run it daily and alert on any non-zero difference.

## Moving Between Engines

Parquet on object storage is the portable substrate. Keep transformations in SQL
and the storage in an open format, and the engine becomes replaceable.

```python
import duckdb

con = duckdb.connect()
con.sql("""
    COPY (SELECT * FROM postgres_scan('host=db dbname=shop', 'public', 'orders'))
    TO 's3://lake/orders/' (FORMAT PARQUET, PARTITION_BY (year, month), COMPRESSION ZSTD)
""")
```

Then the same files serve DuckDB for ad hoc work, ClickHouse via `s3()` table
functions, Spark for heavy transformation, and the warehouse through an external
table. Migrating engines becomes a query-rewrite exercise rather than a data
migration.

Portability limits worth knowing before relying on them: date and timestamp
semantics differ across engines, `DECIMAL` precision limits differ, nested types
are supported unevenly, and every engine has SQL dialect quirks. Test the
round-trip for your types rather than assuming.

## Table Formats

Plain Parquet has no transactions, no schema evolution guarantees and no time
travel. Table formats add a metadata layer:

| Format             | Strength                                                    | Consider                   |
| ------------------ | ----------------------------------------------------------- | -------------------------- |
| **Apache Iceberg** | Broad engine support, hidden partitioning, schema evolution | Catalogue to operate       |
| **Delta Lake**     | Mature, strong Spark and Databricks integration             | Best inside that ecosystem |
| **Apache Hudi**    | Upsert-heavy and streaming ingest                           | More operational surface   |

Adopt one when you need concurrent writers, row-level updates, or the ability to
query the table as it stood at a point in time. Until then, partitioned Parquet
plus a naming convention is less to run.

## Orchestration

Whatever the scheduler, the properties that make a pipeline operable:

- **Idempotent tasks.** Re-running any task for any window must be safe.
- **Explicit dependencies**, so a failed upstream stops downstream rather than
  publishing stale output.
- **Backfill by parameter**, not by editing code.
- **Freshness monitoring** on the output table, not on the job — a job that
  succeeds while producing nothing is the failure that goes unnoticed.
- **Alert on data checks**, not only on exceptions.

See the `airflow-expert` and `dbt-expert` skills for the tooling.
