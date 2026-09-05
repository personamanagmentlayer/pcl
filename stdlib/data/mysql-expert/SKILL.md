---
name: mysql-expert
version: 1.0.0
description: >-
  MySQL and MariaDB administration and development: InnoDB internals, indexing, query
  tuning, replication, and online schema change. Use when the user mentions MySQL, MariaDB,
  InnoDB, `my.cnf`, slow queries, `EXPLAIN`, binlog or replication lag, gtid, Percona or
  pt-online-schema-change, or when the task involves designing a MySQL schema, diagnosing
  lock contention, or migrating a large table without downtime.
category: data
tags:
  [
    mysql,
    mariadb,
    innodb,
    sql,
    indexing,
    replication,
    query-optimisation,
    schema-migration,
    database,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(mysql:*, mysqldump:*, mysqladmin:*, docker:*, pt-online-schema-change:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: advanced
---

# MySQL Expert

MySQL differs from PostgreSQL in ways that matter for design, not just syntax:
the clustered primary key, the storage-engine boundary, and a replication model
built on the binary log.

## Core Concepts

### InnoDB Is the Database

Everything below assumes InnoDB. Rows are stored **inside the primary key index**
— the table _is_ the primary key B-tree. Three consequences drive most design
decisions:

1. The primary key is present in every secondary index, so a wide primary key
   inflates every index on the table.
2. A secondary index lookup costs two traversals: the index, then the primary
   key. Unless the index covers the query.
3. Inserts in primary key order are cheap; random primary keys cause page splits
   and fragmentation.

This is why a `BIGINT AUTO_INCREMENT` or a time-ordered UUID (UUIDv7) beats a
random UUIDv4 primary key by a wide margin on large tables.

### Character Sets

Use `utf8mb4` and nothing else. MySQL's `utf8` is a three-byte subset that cannot
store emoji or some CJK characters, and it fails by truncating or erroring at
insert time.

```sql
CREATE TABLE orders (…) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

Collation determines comparison and sorting. `utf8mb4_0900_ai_ci` is
accent-insensitive and case-insensitive; use `utf8mb4_0900_as_cs` or `_bin` when
you need exact matching, for example on tokens or hashes.

### Isolation and Locking

The default is `REPEATABLE READ`, which is stricter than PostgreSQL's default and
uses gap locks that surprise people migrating across.

```sql
SELECT @@transaction_isolation;
SET SESSION transaction_isolation = 'READ-COMMITTED';   -- often the better default
```

`READ COMMITTED` reduces gap locking and deadlocks for typical OLTP workloads.
Change it deliberately and test — it also changes replication semantics for
statement-based binlog formats.

## Schema Design

```sql
CREATE TABLE orders (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id     BINARY(16) NOT NULL,                    -- UUID stored compactly
  customer_id   BIGINT UNSIGNED NOT NULL,
  status        ENUM('pending','paid','shipped','cancelled') NOT NULL,
  total_minor   BIGINT NOT NULL,                        -- money as integer minor units
  currency      CHAR(3) NOT NULL,
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_orders_public_id (public_id),
  KEY idx_orders_customer_created (customer_id, created_at),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Decisions worth defending:

- **Surrogate `BIGINT` primary key**, with the externally visible identifier as a
  separate unique column. Keeps the clustered index narrow and sequential.
- **`BINARY(16)` for UUIDs**, not `CHAR(36)`: a quarter of the size, and it
  propagates into every secondary index.
- **Money as integer minor units.** `DECIMAL` is acceptable; `FLOAT` and `DOUBLE`
  are not, ever.
- **`TIMESTAMP` in UTC**, with fractional seconds where ordering matters.
  `DATETIME` does not carry a time zone conversion; be deliberate about which you
  want.
- **Explicit `NOT NULL`.** MySQL is permissive by default; strict mode and
  `NOT NULL` catch problems at write time.

Verify strict mode is on — without it, MySQL silently truncates data:

```sql
SELECT @@sql_mode;  -- must include STRICT_TRANS_TABLES and NO_ENGINE_SUBSTITUTION
```

## Indexing

The leftmost-prefix rule governs composite indexes: an index on `(a, b, c)`
serves `a`, `(a, b)` and `(a, b, c)`, but not `b` alone.

```sql
-- Covering index: the query never touches the table
ALTER TABLE orders ADD KEY idx_cover (customer_id, created_at, status, total_minor);

EXPLAIN SELECT status, total_minor FROM orders
WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;
-- Extra: Using index    <- no lookup to the clustered index
```

Order composite index columns by: equality predicates first, then the range or
sort column, then columns needed only for covering.

Things that silently disable an index:

```sql
WHERE DATE(created_at) = '2026-01-31'       -- function on the column
WHERE customer_id = '42'                    -- string compared to an integer column
WHERE name LIKE '%dupont'                   -- leading wildcard
WHERE status != 'paid'                      -- low selectivity negation
```

Rewrite the first as a range: `created_at >= '2026-01-31' AND created_at < '2026-02-01'`.

Read plans with `EXPLAIN ANALYZE` (MySQL 8.0.18+), which reports actual rows and
time rather than estimates:

```sql
EXPLAIN ANALYZE SELECT … ;
EXPLAIN FORMAT=JSON SELECT … ;    -- cost details, used keys, filtering ratios
```

## Finding Slow Queries

```sql
-- Enable capture
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.5;
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- Or query performance_schema, which needs no log parsing
SELECT DIGEST_TEXT,
       COUNT_STAR                              AS calls,
       ROUND(SUM_TIMER_WAIT/1e12, 2)           AS total_s,
       ROUND(AVG_TIMER_WAIT/1e9, 2)            AS avg_ms,
       SUM_ROWS_EXAMINED / NULLIF(SUM_ROWS_SENT, 0) AS examined_per_row
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

`examined_per_row` is the most useful single number: a high ratio means the query
is scanning to produce few rows, which is an index problem.

## Locking and Deadlocks

```sql
SHOW ENGINE INNODB STATUS\G          -- LATEST DETECTED DEADLOCK section

SELECT r.trx_id, r.trx_mysql_thread_id, r.trx_query AS waiting_query,
       b.trx_id AS blocking_trx, b.trx_query AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_engine_transaction_id
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_engine_transaction_id;
```

Deadlocks are normal under concurrency; the application must retry them. Reduce
their frequency by acquiring locks in a consistent order, keeping transactions
short, and avoiding a `SELECT … FOR UPDATE` that scans more rows than it needs.

## Online Schema Change

`ALTER TABLE` on a large table can block writes for a long time. Check the
algorithm before running it in production.

```sql
ALTER TABLE orders ADD COLUMN note VARCHAR(255),
  ALGORITHM=INPLACE, LOCK=NONE;      -- fails loudly if it cannot be online
```

Specifying `ALGORITHM` and `LOCK` explicitly is the safety mechanism: MySQL
refuses rather than silently falling back to a blocking copy.

For operations MySQL cannot do online, use a copy tool:

```bash
pt-online-schema-change \
  --alter "MODIFY COLUMN total_minor BIGINT NOT NULL" \
  --max-lag 2 --critical-load Threads_running=64 \
  --chunk-time 0.5 --execute \
  D=shop,t=orders
```

These tools create a shadow table, copy in chunks with triggers keeping it
current, then swap. Always run with `--dry-run` first, and confirm foreign keys
are handled the way you expect.

## Replication

```sql
SHOW REPLICA STATUS\G
-- Seconds_Behind_Source, Replica_IO_Running, Replica_SQL_Running, Last_Error
```

Use **GTID** replication and row-based binary logging: together they make
failover and position tracking tractable.

```ini
[mysqld]
gtid_mode                = ON
enforce_gtid_consistency = ON
binlog_format            = ROW
binlog_row_image         = MINIMAL
sync_binlog              = 1
innodb_flush_log_at_trx_commit = 1
```

The last two are the durability pair. Relaxing them improves write throughput and
means a crash can lose committed transactions — a deliberate trade-off, never a
default.

Replicas are asynchronous by default: a read immediately after a write may not
see it. Route read-after-write to the primary, or use semi-synchronous
replication when the application cannot tolerate the lag.

## Best Practices

- **Enable strict mode.** Silent truncation is worse than an error.
- **`utf8mb4` everywhere** — table, column, connection.
- **Narrow, monotonic primary keys.** Random UUIDs as clustered keys fragment
  large tables badly.
- **Read the plan before adding an index**, and drop unused indexes; each one
  taxes every write.
- **Keep transactions short.** Long transactions hold undo history and bloat the
  tablespace.
- **Retry deadlocks** in the application with backoff.
- **Test backups by restoring them.** An untested backup is a hypothesis.
- **Pin the SQL mode and time zone** in configuration, not per session.

## Anti-Patterns

- **`utf8` instead of `utf8mb4`** — the classic emoji-truncation bug.
- **`FLOAT` or `DOUBLE` for money.**
- **UUIDv4 as clustered primary key** on a large, write-heavy table.
- **`SELECT *`** — defeats covering indexes and breaks on schema change.
- **Functions on indexed columns** in predicates.
- **`ORDER BY RAND()`** — sorts the whole result set.
- **Offset pagination at depth** — `LIMIT 20 OFFSET 100000` scans 100 020 rows.
  Use keyset pagination.
- **Blocking `ALTER` in production** without checking the algorithm.

## Reference Documentation

- [Operations](references/OPERATIONS.md) — configuration, backup and recovery,
  replication topologies, failover, monitoring queries and capacity signals

## Resources

- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)
- [MariaDB Knowledge Base](https://mariadb.com/kb/en/)
- [Percona Toolkit](https://docs.percona.com/percona-toolkit/)
- Baron Schwartz et al., _High Performance MySQL_ (4th ed.)
- [Use The Index, Luke](https://use-the-index-luke.com/)
