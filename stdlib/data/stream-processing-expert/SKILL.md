---
name: stream-processing-expert
version: 1.0.0
description: >-
  Build continuous data pipelines over event streams: windowing, watermarks, exactly-once
  semantics, stateful processing and change data capture. Use when the user mentions stream
  processing, Flink, Spark Structured Streaming, CDC or Debezium, event time versus
  processing time, watermarks, tumbling or sliding windows, late-arriving data, or when the
  task involves replicating a database into a stream or computing continuous aggregates.
category: data
tags:
  [
    streaming,
    flink,
    spark-streaming,
    cdc,
    debezium,
    watermarks,
    windowing,
    exactly-once,
    event-time,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(python:*, python3:*, pip:*, docker:*, kafka-topics:*, flink:*, spark-submit:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: advanced
---

# Stream Processing Expert

Continuous computation over unbounded data. The hard parts are not throughput —
they are time, state and what happens when something is retried. Complements
`kafka-expert` (the transport) and `airflow-expert` (batch orchestration).

## Core Concepts

### Event Time, Not Processing Time

Every event carries the time it _happened_. The stream processor sees it later,
out of order, sometimes much later. Windowing on arrival time produces results
that change if you replay the same data — which makes them untestable and
unreproducible.

| Time            | Meaning                            | Use                                   |
| --------------- | ---------------------------------- | ------------------------------------- |
| Event time      | When it happened, from the payload | Correctness; all business aggregation |
| Ingestion time  | When the broker received it        | Rough operational metrics             |
| Processing time | When the operator ran              | Latency monitoring only               |

If the source has no reliable event timestamp, that is a defect in the producer.
Fix it there.

### Watermarks

A watermark is the processor's assertion that no event older than time _T_ will
arrive. It is how an unbounded stream produces a finite answer: when the
watermark passes the end of a window, the window closes and emits.

The watermark is a bet on lateness. Too tight and correct data is dropped; too
loose and every result waits.

```python
# Flink: allow 30 seconds of out-of-orderness
watermark_strategy = (
    WatermarkStrategy
    .for_bounded_out_of_orderness(Duration.of_seconds(30))
    .with_timestamp_assigner(lambda event, _: event["occurred_at_ms"])
    .with_idleness(Duration.of_minutes(1))     # an idle partition must not stall time
)
```

`with_idleness` matters in production: a partition with no traffic holds the
watermark back for the whole job, and every window stops emitting. This is a
frequent and confusing outage.

### Windows

| Window           | Shape                  | Use                                    |
| ---------------- | ---------------------- | -------------------------------------- |
| Tumbling         | Fixed, non-overlapping | Hourly totals, daily counts            |
| Sliding          | Fixed, overlapping     | "Last 5 minutes, updated every minute" |
| Session          | Gap-defined            | User activity bursts                   |
| Global + trigger | Custom                 | Anything the above cannot express      |

Sliding windows multiply state: a 1-hour window sliding every minute keeps each
event in 60 windows. Check the cost before choosing the slide.

### Delivery Semantics

- **At most once** — losses on failure. Rarely acceptable.
- **At least once** — duplicates on retry. Acceptable when the sink is idempotent.
- **Exactly once** — no loss, no duplicates, _within the system's boundaries_.
  Achieved by checkpointed state plus a transactional or idempotent sink. It is
  not magic: a sink that cannot participate in a transaction cannot give it to
  you.

The pragmatic default: at-least-once processing with an idempotent sink keyed on
a business identifier. It is simpler, cheaper and survives more failure modes
than end-to-end transactions.

## Flink

```python
from pyflink.table import EnvironmentSettings, TableEnvironment

t_env = TableEnvironment.create(EnvironmentSettings.in_streaming_mode())

t_env.execute_sql("""
CREATE TABLE orders (
    order_id     STRING,
    customer_id  STRING,
    amount_minor BIGINT,
    occurred_at  TIMESTAMP_LTZ(3),
    WATERMARK FOR occurred_at AS occurred_at - INTERVAL '30' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'orders',
    'properties.bootstrap.servers' = 'kafka:9092',
    'properties.group.id' = 'revenue-agg',
    'scan.startup.mode' = 'group-offsets',
    'format' = 'json',
    'json.ignore-parse-errors' = 'true'
)""")

t_env.execute_sql("""
INSERT INTO revenue_by_hour
SELECT window_start, window_end, customer_id,
       SUM(amount_minor) AS revenue_minor,
       COUNT(*)          AS order_count
FROM TABLE(TUMBLE(TABLE orders, DESCRIPTOR(occurred_at), INTERVAL '1' HOUR))
GROUP BY window_start, window_end, customer_id
""")
```

Checkpointing is what makes state recoverable:

```python
env.enable_checkpointing(60_000)                       # every 60s
config = env.get_checkpoint_config()
config.set_checkpointing_mode(CheckpointingMode.EXACTLY_ONCE)
config.set_min_pause_between_checkpoints(30_000)
config.set_checkpoint_timeout(600_000)
config.enable_externalized_checkpoints(
    ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION)
```

Retaining checkpoints on cancellation is essential — without it, stopping a job
discards the state you need to resume.

## Spark Structured Streaming

Micro-batch rather than true streaming; simpler to operate if you already run
Spark, at the cost of latency measured in seconds.

```python
events = (spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "kafka:9092")
    .option("subscribe", "orders")
    .option("startingOffsets", "earliest")
    .option("maxOffsetsPerTrigger", 500_000)          # bound each batch
    .load()
    .select(from_json(col("value").cast("string"), SCHEMA).alias("e"))
    .select("e.*")
    .withWatermark("occurred_at", "30 seconds"))

agg = (events
    .groupBy(window("occurred_at", "1 hour"), "customer_id")
    .agg(sum("amount_minor").alias("revenue_minor")))

query = (agg.writeStream
    .outputMode("update")
    .format("delta")
    .option("checkpointLocation", "s3://lake/_checkpoints/revenue")
    .trigger(processingTime="1 minute")
    .start())
```

The checkpoint location is the job's identity. Changing it restarts from scratch;
deleting it loses exactly-once guarantees. Never point two jobs at one checkpoint.

Output modes: `append` (only finalised rows, needs a watermark), `update` (rows
that changed), `complete` (the whole result table — only for bounded aggregates).

## Change Data Capture

CDC turns a database's write-ahead log into a stream, without polling and without
touching application code.

```json
{
  "name": "orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres.internal",
    "database.dbname": "shop",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_orders",
    "publication.autocreate.mode": "filtered",
    "table.include.list": "public.orders,public.order_lines",
    "topic.prefix": "shop",
    "snapshot.mode": "initial",
    "tombstones.on.delete": "true",
    "decimal.handling.mode": "string",
    "time.precision.mode": "connect"
  }
}
```

Operational facts that catch teams out:

- **A replication slot retains WAL** until consumed. A stopped connector fills the
  primary's disk. Monitor slot lag and alert well before the disk does.
- **`decimal.handling.mode`** defaults to base64-encoded bytes. Set it to
  `string` unless you enjoy debugging silently wrong money.
- **The initial snapshot** can be long and heavy. Plan it; consider
  `snapshot.mode=never` plus a separate bulk load for very large tables.
- **Schema changes propagate.** Consumers must tolerate new columns; use a schema
  registry with compatibility rules.
- **Deletes emit a tombstone** — a null value with a key. Consumers that ignore
  nulls silently miss deletions.

## State Management

State is what makes streaming hard to operate. It grows, it must be checkpointed,
and it must be restorable.

- **Bound it.** Every keyed state needs a TTL, or the job grows until it dies.
- **Choose the backend by size.** Heap state is fast and bounded by memory;
  RocksDB spills to disk and supports far larger state with more latency.
- **Take savepoints before every deploy.** Savepoints are the mechanism for
  upgrading a stateful job without losing its accumulated state.
- **Version your state schema.** Adding a field to a stored object breaks
  restoration unless the serialiser supports evolution.

```python
state_descriptor.enable_time_to_live(
    StateTtlConfig.new_builder(Time.days(7))
        .set_update_type(StateTtlConfig.UpdateType.OnCreateAndWrite)
        .cleanup_in_rocksdb_compact_filter(1000)
        .build()
)
```

## Late and Out-of-Order Data

```sql
-- Flink: keep windows open past the watermark for stragglers
SELECT window_start, SUM(amount_minor)
FROM TABLE(TUMBLE(TABLE orders, DESCRIPTOR(occurred_at), INTERVAL '1' HOUR))
GROUP BY window_start
-- with table.exec.emit.allow-lateness = 1h in configuration
```

Route data later than your allowed lateness to a side output rather than dropping
it silently. Counting what you discard is how you discover the watermark is
wrong.

The general answer for correctness over long horizons is a **batch reconciliation
job**: the stream gives low latency, a nightly batch recomputes the same
aggregate from the source of truth, and any divergence is an alert. Streaming
alone should not be the system of record for financial figures.

## Best Practices

- **Key by a business identifier** so partitioning is stable and rebalances do
  not reorder related events.
- **Make sinks idempotent** — upsert on a natural key rather than insert.
- **Bound every batch** (`maxOffsetsPerTrigger`, `scan.parallelism`) so a backlog
  does not produce one enormous batch that fails repeatedly.
- **Monitor lag, not throughput.** Consumer lag and watermark delay are the
  signals that matter.
- **Replay-test.** Reprocess a day of historical data and compare against batch
  output; if they disagree, the pipeline is not deterministic.
- **Handle poison messages** with a dead-letter topic and a parse-error policy;
  one malformed event must not stop the job forever.
- **Deploy with savepoints**, always.

## Anti-Patterns

- **Windowing on processing time** for business aggregates — results change on
  replay.
- **Unbounded state** with no TTL — a slow, certain outage.
- **Ignoring an idle partition** — the watermark stalls and nothing emits.
- **Assuming exactly-once from configuration alone** — the sink must participate.
- **CDC without monitoring replication slot lag** — fills the primary's disk.
- **Sharing a checkpoint directory** between jobs.
- **Streaming as the ledger** with no batch reconciliation.
- **Reaching for streaming when a five-minute batch would do** — the operational
  cost is an order of magnitude higher.

## Reference Documentation

- [Operations](references/OPERATIONS.md) — deployment, savepoint upgrades,
  backpressure diagnosis, scaling, monitoring and failure playbooks

## Resources

- [Apache Flink documentation](https://nightlies.apache.org/flink/flink-docs-stable/)
- [Spark Structured Streaming guide](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html)
- [Debezium documentation](https://debezium.io/documentation/)
- Tyler Akidau et al., _Streaming Systems_
- Martin Kleppmann, _Designing Data-Intensive Applications_, chapter 11
