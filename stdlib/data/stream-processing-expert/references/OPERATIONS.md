# Stream Processing — Operations

Reference material for the `stream-processing-expert` skill. See [SKILL.md](../SKILL.md).

A streaming job is a long-running stateful service. Most incidents come from
state, deployment and backpressure rather than from the transformation logic.

## Deploying a Stateful Job

Never restart a stateful job by killing it and starting it again — that loses or
replays state. Use savepoints.

```bash
# 1. Take a savepoint and stop atomically
flink stop --savepointPath s3://lake/savepoints \
           --drain=false <job-id>
# -> Savepoint stored at s3://lake/savepoints/savepoint-abc123

# 2. Deploy the new artefact from that savepoint
flink run --fromSavepoint s3://lake/savepoints/savepoint-abc123 \
          --allowNonRestoredState \
          -c com.example.RevenueJob revenue-2.1.0.jar
```

`--drain=false` keeps the watermark where it is; `--drain=true` advances it to
maximum, closing every window and emitting final results. Use drain only when
retiring a pipeline permanently — on a routine upgrade it produces a burst of
premature window emissions.

`--allowNonRestoredState` lets a savepoint restore into a job whose operators
changed. It is necessary when removing an operator and dangerous otherwise: it
silently discards state for anything it cannot match. Assign stable operator
UIDs so matching is deterministic:

```python
stream.key_by(lambda e: e["customer_id"]) \
      .process(RevenueAggregator()) \
      .uid("revenue-aggregator-v1") \
      .name("revenue aggregator")
```

Without explicit UIDs, Flink generates them from the job graph, and any topology
change invalidates every savepoint you have.

### Spark equivalent

The checkpoint directory carries state and offsets. Compatible changes restore
automatically; incompatible ones require a new checkpoint location and a planned
reprocessing window.

Safe: changing sink options, adding filters, tuning trigger interval.
Unsafe: changing the aggregation keys, the output mode, or the parsed schema.

## Backpressure

Backpressure means a downstream operator cannot keep up and is throttling
upstream. It is a symptom; the cause is always further down the chain.

```bash
# Flink UI: Job > Backpressure tab, or via REST
curl -s localhost:8081/jobs/<job-id>/vertices/<vertex-id>/backpressure | jq
```

Read the pipeline from the **last** backpressured operator: that is the
bottleneck. Everything upstream of it is backpressured as a consequence.

| Cause                    | Signal                                      | Action                                                             |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------ |
| Slow sink                | Backpressure at the sink; sink latency high | Batch writes, increase sink parallelism, check the target database |
| Data skew                | One subtask at 100 %, others idle           | Re-key, add a salt, pre-aggregate                                  |
| State access             | High RocksDB read latency                   | Tune block cache, move hot state to heap, add TTL                  |
| Insufficient parallelism | All subtasks saturated evenly               | Scale out                                                          |
| GC pressure              | Long GC pauses in the task manager log      | More heap, or move state to RocksDB                                |

### Diagnosing skew

```sql
-- Distribution of the partition key at the source
SELECT customer_id, count(*) AS events
FROM orders_sample
GROUP BY 1 ORDER BY 2 DESC LIMIT 20;
```

If one key holds a large share of traffic, the subtask owning it is the whole
job's throughput. Salt the key for the aggregation, then combine:

```python
# Stage 1: spread the hot key across N partitions
.key_by(lambda e: f"{e['customer_id']}#{hash(e['order_id']) % 16}")
.window(TumblingEventTimeWindows.of(Time.hours(1)))
.reduce(sum_amounts)
# Stage 2: combine the partial results
.key_by(lambda p: p.key.split("#")[0])
.window(TumblingEventTimeWindows.of(Time.hours(1)))
.reduce(sum_amounts)
```

## Scaling

```bash
# Flink reactive/adaptive scheduler, or explicit rescale via savepoint
flink stop --savepointPath s3://lake/savepoints <job-id>
flink run --fromSavepoint <path> --parallelism 24 job.jar
```

Two constraints bound useful parallelism:

- **Source partitions.** Parallelism above the Kafka partition count leaves
  subtasks idle. Repartition the topic first.
- **Max parallelism.** Keyed state is assigned to key groups fixed at job
  creation. Parallelism cannot exceed `maxParallelism`, and changing that value
  invalidates savepoints. Set it deliberately at the start — 128 or 256 is a
  reasonable default that leaves room to grow.

## Monitoring

The metrics that predict incidents, in order of value:

```promql
# 1. Consumer lag - the single most important streaming metric
kafka_consumergroup_lag{group="revenue-agg"} > 100000

# 2. Watermark delay - how far behind event time the job is
(time() * 1000 - flink_taskmanager_job_task_operator_currentOutputWatermark) > 300000

# 3. Checkpoint health
rate(flink_jobmanager_job_numberOfFailedCheckpoints[15m]) > 0
flink_jobmanager_job_lastCheckpointDuration > 120000

# 4. Restart loop
rate(flink_jobmanager_job_numRestarts[1h]) > 3

# 5. State size growth - unbounded state shows here first
deriv(flink_jobmanager_job_lastCheckpointSize[6h]) > 0
```

Watermark delay is more diagnostic than consumer lag: lag can be zero while the
watermark is stalled by an idle partition, and no results are emitting at all.

Failed checkpoints deserve a page. A job that cannot checkpoint cannot recover,
and it will eventually be restarted by something.

## Failure Playbooks

### Job restarting repeatedly

1. Read the **first** exception in the task manager log, not the last — later
   ones are cascade effects.
2. Poison message? Check the deserialiser. Add `ignore-parse-errors` or a
   dead-letter path, then reprocess the bad offsets separately.
3. Out of memory? Compare state size against the configured heap; add a TTL
   before adding memory.
4. Sink unavailable? The job is correctly refusing to lose data. Fix the sink;
   the backlog drains afterwards.

### Checkpoints timing out

```python
config.set_checkpoint_timeout(600_000)
config.set_max_concurrent_checkpoints(1)
env.get_config().set_unaligned_checkpoints_enabled(True)   # helps under backpressure
```

Unaligned checkpoints trade a larger checkpoint for the ability to complete while
backpressured — the right setting when the alternative is no checkpoint at all.
If checkpoint duration grows steadily, state is growing without bound.

### Replication slot lag (CDC)

```sql
SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;
```

An inactive slot retaining tens of gigabytes is minutes away from filling the
primary's disk. Either restart the consumer or drop the slot — and dropping it
means a full re-snapshot, so decide before it becomes an outage.

Set a guard rail:

```sql
ALTER SYSTEM SET max_slot_wal_keep_size = '100GB';
```

The slot is then invalidated rather than the database going down. That is the
right trade: a re-snapshot is recoverable, a full disk on the primary is an
outage for everything.

### Reprocessing history

```bash
# Start a parallel job from the beginning, writing to a shadow sink
flink run -Dscan.startup.mode=earliest-offset \
          -Dsink.table=revenue_by_hour_shadow job.jar
```

Reprocess into a shadow table, compare against the live one, then swap. Never
reprocess into the live sink — a bug in the new logic corrupts good data with no
way back.

## Testing

```python
def test_window_closes_on_watermark():
    harness = KeyedOneInputStreamOperatorTestHarness(operator, key_selector, key_type)
    harness.open()

    harness.process_element(event(customer="c1", amount=100, ts=1_000), 1_000)
    harness.process_element(event(customer="c1", amount=200, ts=2_000), 2_000)
    harness.process_watermark(59_999)
    assert harness.extract_output_streaming_records() == []     # window still open

    harness.process_watermark(3_600_001)                        # past window end
    assert harness.extract_output_streaming_records() == [result(customer="c1", total=300)]
```

Test harnesses let you control the watermark, which is the only way to test
window behaviour deterministically. Cover: on-time events, late events within
allowed lateness, events beyond it, an idle partition, and a restore from
savepoint.

Integration-test with `testcontainers` running a real Kafka, and assert on the
output topic rather than on internal state.
