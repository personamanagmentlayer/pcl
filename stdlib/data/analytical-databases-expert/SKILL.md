---
name: analytical-databases-expert
version: 1.0.0
description: >-
  Design and query columnar analytical stores: DuckDB, ClickHouse and cloud warehouses,
  including file formats, partitioning, sort keys and cost control. Use when the user
  mentions DuckDB, ClickHouse, Parquet, columnar storage, OLAP, a data warehouse or
  lakehouse, analytical queries over large tables, or when the task involves aggregating
  billions of rows, choosing between a warehouse and an embedded engine, or making a
  reporting query fast enough.
category: data
tags:
  [
    olap,
    duckdb,
    clickhouse,
    parquet,
    columnar,
    analytics,
    data-warehouse,
    lakehouse,
    aggregation,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(python:*, python3:*, pip:*, duckdb:*, clickhouse-client:*, docker:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: advanced
---

# Analytical Databases Expert

Columnar engines answer aggregate questions over large tables. They are not
faster row stores — they trade single-row access for the ability to scan one
column of a billion rows without touching the rest.

## Core Concepts

### Why Columnar Wins

Storing values of one column contiguously means a query reads only the columns
it names, and values of one type compress together far better than mixed rows.
`SELECT avg(amount) FROM events` touches one column; the row store reads every
byte of every row.

The corollary is the cost: fetching one complete row means reassembling it from
every column, and single-row updates are expensive or unsupported. Use a row
store for transactions and a columnar store for analysis. Trying to make one
system do both well is the usual architectural mistake.

### The Data Is Often the Format

With Parquet, storage and engine are separable. Files on object storage, queried
by whatever engine suits: DuckDB locally, Spark for scale, the warehouse for
governed access. Choosing the format well matters more than choosing the engine.

### Selection Is About Deployment, Not Speed

| Engine                | Fits                                                                | Cost                                                    |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| **DuckDB**            | Embedded analytics, notebooks, CI, single-node up to hundreds of GB | Single process; no concurrent writers                   |
| **ClickHouse**        | High-ingest real-time analytics, dashboards over billions of rows   | Operationally demanding; eventual-consistency semantics |
| **Cloud warehouse**   | Governed shared access, elastic scale, SQL for everyone             | Cost grows with carelessness; vendor coupling           |
| **Spark / lakehouse** | Petabyte batch, heavy transformation, ML feature pipelines          | Latency and complexity                                  |

DuckDB is the default worth trying first: most "big data" is under a terabyte,
and a single node handles it.

## DuckDB

Runs in-process. No server, no cluster, and it queries Parquet, CSV and JSON on
local disk or object storage directly.

```python
import duckdb

con = duckdb.connect("analytics.duckdb")

# Query files directly; no load step
con.sql("""
    SELECT date_trunc('month', order_date) AS month,
           region,
           sum(amount_minor) / 100.0 AS revenue,
           count(*)                   AS orders
    FROM read_parquet('s3://bucket/orders/year=*/month=*/*.parquet')
    WHERE order_date >= DATE '2026-01-01'
    GROUP BY ALL
    ORDER BY month, region
""").show()
```

`GROUP BY ALL` groups by every non-aggregated column — a small ergonomic win that
removes a common source of error.

What makes DuckDB useful in practice:

```sql
-- Predicate and projection pushdown into Parquet, including partition pruning
SELECT count(*) FROM read_parquet('data/**/*.parquet', hive_partitioning = true)
WHERE year = 2026 AND region = 'EU';

-- Query Postgres directly, join it to files
INSTALL postgres; LOAD postgres;
ATTACH 'dbname=shop host=db.internal' AS pg (TYPE postgres, READ_ONLY);
SELECT c.segment, sum(o.amount_minor)
FROM read_parquet('s3://bucket/orders/*.parquet') o
JOIN pg.public.customers c ON c.id = o.customer_id
GROUP BY 1;

-- Write partitioned output
COPY (SELECT * FROM events) TO 'out/'
  (FORMAT PARQUET, PARTITION_BY (year, month), COMPRESSION ZSTD);
```

Constraints to respect: one writer process at a time, and memory bounded by the
machine. Set `SET memory_limit='8GB'` and `SET temp_directory='/var/tmp/duckdb'`
so large joins spill instead of failing.

## ClickHouse

Built for high-rate ingest and sub-second aggregation. The table definition
carries most of the performance decisions.

```sql
CREATE TABLE events (
    event_time  DateTime64(3, 'UTC'),
    tenant_id   UInt64,
    user_id     UInt64,
    event_type  LowCardinality(String),
    country     LowCardinality(String),
    amount      Decimal(18, 4),
    properties  Map(String, String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, event_type, event_time)
TTL event_time + INTERVAL 2 YEAR DELETE
SETTINGS index_granularity = 8192;
```

The three decisions that determine everything:

- **`ORDER BY` is the primary index.** Put the columns you filter on first, in
  decreasing selectivity. A query that does not filter on the leading column
  scans the whole partition.
- **`PARTITION BY` is for data management**, not query speed — dropping a month
  is instant. Keep partitions coarse; thousands of small partitions degrade
  merges badly.
- **`LowCardinality(String)`** for columns with few distinct values gives large
  compression and speed gains.

```sql
-- Pre-aggregate what dashboards ask for repeatedly
CREATE MATERIALIZED VIEW events_daily
ENGINE = SummingMergeTree
ORDER BY (tenant_id, day, event_type)
AS SELECT tenant_id, toDate(event_time) AS day, event_type,
          count() AS events, sum(amount) AS amount
FROM events GROUP BY tenant_id, day, event_type;
```

Insert in large batches — thousands to a million rows — never row by row. Each
insert creates a part, and too many parts is the most common way to make a
ClickHouse cluster unhealthy.

Updates and deletes are asynchronous mutations that rewrite parts. Design so you
rarely need them: append events, and correct with a `ReplacingMergeTree` or a
sign column rather than `ALTER TABLE … UPDATE`.

## File Formats

| Format      | Use                                                    | Avoid when                                |
| ----------- | ------------------------------------------------------ | ----------------------------------------- |
| **Parquet** | The default for analytics: columnar, compressed, typed | Row-by-row appends                        |
| **ORC**     | Hive ecosystem parity                                  | Outside that ecosystem                    |
| **Avro**    | Row-oriented streaming, schema evolution               | Analytical scans                          |
| **CSV**     | Interchange with humans and legacy systems             | Anything at scale — untyped, uncompressed |
| **JSON**    | Semi-structured landing zone                           | Repeated querying without conversion      |

Parquet layout decisions that matter:

- **File size 128 MB – 1 GB.** Thousands of small files make listing and planning
  dominate query time; a single huge file prevents parallelism.
- **Partition on what you filter**, usually date, and keep cardinality low.
  Partitioning by user id creates millions of directories.
- **Sort within files** by the column you filter on, so row-group statistics
  allow skipping.
- **ZSTD compression** — better ratio than Snappy at comparable speed for
  analytics.

## Query Patterns

```sql
-- Aggregate first, then join. Never join large-to-large and then aggregate.
WITH monthly AS (
  SELECT customer_id, date_trunc('month', order_date) AS month,
         sum(amount_minor) AS revenue
  FROM orders WHERE order_date >= DATE '2026-01-01'
  GROUP BY 1, 2
)
SELECT c.segment, m.month, sum(m.revenue) / 100.0 AS revenue
FROM monthly m JOIN customers c ON c.id = m.customer_id
GROUP BY 1, 2;

-- Approximate counting is orders of magnitude cheaper and usually adequate
SELECT approx_count_distinct(user_id) FROM events WHERE day >= today() - 30;
```

Read the plan rather than guessing:

```sql
EXPLAIN ANALYZE SELECT …;                       -- DuckDB
EXPLAIN indexes = 1 SELECT …;                   -- ClickHouse: parts and granules read
```

The number to watch is bytes scanned. In a warehouse it is also the bill.

## Cost Control

For metered warehouses, cost is a function of bytes scanned and compute time:

- **Always filter the partition column.** A missing date predicate scans history.
- **Never `SELECT *`** — you pay per column read.
- **Materialise repeated aggregations** rather than recomputing per dashboard load.
- **Set query and per-user limits**, and alert on the top spenders.
- **Auto-suspend idle warehouses**; separate ELT compute from BI compute so a
  heavy transform does not block analysts.
- **Sample during development.** `TABLESAMPLE` or a `LIMIT`-ed CTE while
  iterating on a query.

## Best Practices

- **Model for the questions.** Star schemas remain right: a fact table plus
  conformed dimensions, denormalised enough to avoid deep join chains.
- **Types are compression.** Integers over strings, `LowCardinality` or
  dictionary encoding for enums, dates as dates.
- **Money as integer minor units or `Decimal`**, never floating point.
- **Ingest idempotently** with a natural key or a batch id, so a replayed load
  does not double-count.
- **Keep raw data.** Storage is cheap; a reprocessable landing zone lets you fix
  transformation bugs retroactively.
- **Test transformations** with fixed inputs and expected outputs, like any code.

## Anti-Patterns

- **Using an OLAP engine as an OLTP store** — single-row updates and point reads
  are what it is worst at.
- **Small-file proliferation** — compact on a schedule.
- **Over-partitioning** — one partition per user id or per hour at low volume.
- **`SELECT *` in a metered warehouse.**
- **Row-by-row inserts into ClickHouse** — the fastest route to an unhealthy
  cluster.
- **`ORDER BY` columns nobody filters on** — the index earns nothing.
- **Unbounded retention** — define a TTL at table creation, not after the bill.

## Reference Documentation

- [Modelling and Pipelines](references/MODELLING.md) — dimensional modelling,
  incremental loads, slowly changing dimensions, data quality tests, and moving
  between engines

## Resources

- [DuckDB documentation](https://duckdb.org/docs/)
- [ClickHouse documentation](https://clickhouse.com/docs)
- [Apache Parquet format](https://parquet.apache.org/docs/)
- Ralph Kimball, _The Data Warehouse Toolkit_ (3rd ed.)
- [dbt documentation](https://docs.getdbt.com/) — see also the `dbt-expert` skill
