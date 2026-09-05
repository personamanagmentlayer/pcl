# MySQL Expert — Operations

Reference material for the `mysql-expert` skill. See [SKILL.md](../SKILL.md).

## Configuration That Matters

Most `my.cnf` tuning guides are noise. These settings account for the majority of
the difference between a healthy and an unhealthy server.

```ini
[mysqld]
# Memory - the single most important setting
innodb_buffer_pool_size        = 12G      # ~70% of RAM on a dedicated host
innodb_buffer_pool_instances   = 8        # 1 per GB up to 8, reduces contention

# Durability - relax only with a written decision
innodb_flush_log_at_trx_commit = 1        # 1 = ACID; 2 = lose ≤1s on OS crash
sync_binlog                    = 1        # 1 = binlog durable with the commit
innodb_flush_method            = O_DIRECT # avoid double buffering

# Redo log - too small causes constant checkpoint flushing
innodb_redo_log_capacity       = 4G       # 8.0.30+; else innodb_log_file_size

# Correctness
sql_mode = STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION,ONLY_FULL_GROUP_BY
character_set_server           = utf8mb4
collation_server               = utf8mb4_0900_ai_ci
default_time_zone              = '+00:00'

# Connections
max_connections                = 500      # pool in the app; MySQL is not a pool
wait_timeout                   = 600
```

The buffer pool holds data and index pages. If it is much smaller than the
working set, the server reads from disk constantly and no query tuning will
compensate.

```sql
-- Is the buffer pool big enough?
SELECT
  ROUND(100 * (1 - variable_value /
    (SELECT variable_value FROM performance_schema.global_status
     WHERE variable_name = 'Innodb_buffer_pool_read_requests')), 2) AS hit_ratio_pct
FROM performance_schema.global_status
WHERE variable_name = 'Innodb_buffer_pool_reads';
```

Below roughly 99 % on an OLTP workload, add memory before doing anything else.

## Backup

### Logical, with `mysqldump`

```bash
mysqldump --single-transaction --routines --triggers --events \
          --set-gtid-purged=ON --hex-blob \
          --databases shop | zstd -T0 > shop-$(date +%F).sql.zst
```

`--single-transaction` gives a consistent snapshot without locking, **for InnoDB
tables only**. A single MyISAM table in the dump silently breaks that guarantee —
check first:

```sql
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE engine <> 'InnoDB' AND table_schema NOT IN ('mysql','sys','performance_schema');
```

Logical dumps are portable and slow to restore. Above a few hundred gigabytes
they stop being practical.

### Physical, with Percona XtraBackup

```bash
xtrabackup --backup --target-dir=/backup/full --parallel=4 --compress
xtrabackup --prepare --target-dir=/backup/full
# Incremental against the full
xtrabackup --backup --target-dir=/backup/inc1 --incremental-basedir=/backup/full
```

Physical backups restore far faster and support incrementals. They are
version- and platform-specific.

### Point-in-time recovery

Full backup plus binary logs. Test the whole path, not just the backup step:

```bash
# Restore the full backup, then replay to just before the incident
mysqlbinlog --start-position=4 --stop-datetime="2026-09-04 14:22:00" \
            binlog.000431 binlog.000432 | mysql
```

Keep binary logs for longer than your longest plausible detection delay:

```ini
binlog_expire_logs_seconds = 1209600     # 14 days
```

A backup that has never been restored is a hypothesis. Restore to a scratch host
on a schedule and record the time it took — that number is your actual recovery
objective.

## Replication Topologies

| Topology                           | Fits                                    | Cost                                        |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- |
| Primary + replicas                 | Read scaling, backups off the primary   | Async lag; manual failover                  |
| Semi-synchronous                   | Cannot afford to lose a committed write | Latency on every commit                     |
| Group Replication / InnoDB Cluster | Automatic failover, single-primary      | Operational complexity, network sensitivity |
| Multi-source                       | Consolidating shards for reporting      | Conflicts are yours to prevent              |

### Setting up a replica with GTID

```sql
-- On the replica
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='primary.internal', SOURCE_PORT=3306,
  SOURCE_USER='repl', SOURCE_PASSWORD_FILE='/etc/mysql/repl.pw',
  SOURCE_AUTO_POSITION=1, SOURCE_SSL=1;
START REPLICA;
```

`SOURCE_AUTO_POSITION=1` is the point of GTID: the replica negotiates what it is
missing instead of you tracking file and offset by hand.

### Diagnosing lag

```sql
SHOW REPLICA STATUS\G
```

Read three fields together. `Seconds_Behind_Source` alone is misleading — it
reports zero when the replica is idle _and_ when it has stopped.

| Symptom                      | Cause                            | Action                                                                        |
| ---------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| Lag grows, IO thread fine    | Single-threaded apply            | `replica_parallel_workers`, `binlog_transaction_dependency_tracking=WRITESET` |
| Lag spikes on batch jobs     | Large transactions               | Chunk the writes                                                              |
| Lag with low CPU             | Missing index **on the replica** | Replicas need the same indexes                                                |
| `Seconds_Behind_Source` NULL | Replication stopped              | `Last_Error`, then reconcile                                                  |

```ini
replica_parallel_workers = 8
replica_parallel_type    = LOGICAL_CLOCK
binlog_transaction_dependency_tracking = WRITESET
```

`WRITESET` is what makes parallel replication effective on workloads that do not
naturally group into large commit batches.

### Failover checklist

1. Stop writes to the old primary — fence it, do not trust it to be down.
2. Confirm the chosen replica has applied all retrieved GTIDs.
3. Promote: `STOP REPLICA; RESET REPLICA ALL;` then make it writable.
4. Repoint the remaining replicas at the new primary.
5. Move the application's write endpoint (proxy or DNS), not its configuration.
6. Rebuild the old primary from a backup — never rejoin it without verifying
   its GTID set is a subset of the new primary's.

Split brain comes from step 1. A network partition is not evidence that the old
primary stopped accepting writes.

## Monitoring

The signals worth alerting on:

```sql
-- Connection saturation
SELECT variable_value AS threads_connected FROM performance_schema.global_status
WHERE variable_name = 'Threads_connected';

-- Threads actually running: the best single load indicator
SHOW GLOBAL STATUS LIKE 'Threads_running';

-- Long transactions holding undo history
SELECT trx_id, trx_started, TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_s,
       trx_rows_modified, LEFT(trx_query, 80) AS query
FROM information_schema.innodb_trx
WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 60
ORDER BY age_s DESC;

-- Table sizes and index bloat
SELECT table_name,
       ROUND(data_length/1024/1024) AS data_mb,
       ROUND(index_length/1024/1024) AS index_mb,
       ROUND(data_free/1024/1024) AS free_mb
FROM information_schema.tables
WHERE table_schema = DATABASE()
ORDER BY data_length + index_length DESC LIMIT 20;

-- Indexes that are never used
SELECT object_schema, object_name, index_name
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL AND count_star = 0
  AND object_schema NOT IN ('mysql','performance_schema','sys')
ORDER BY object_schema, object_name;
```

Alert on `Threads_running` rather than `Threads_connected`: connections idle in a
pool are harmless, running threads above the core count are queueing.

## Capacity Signals

- **Buffer pool hit ratio below 99 %** on OLTP — add memory.
- **`Innodb_row_lock_waits` rising** — contention; look at transaction length.
- **`data_free` large** on a table — fragmentation after mass deletes; rebuild
  with `OPTIMIZE TABLE` during a quiet window, aware that it copies the table.
- **Replica lag trending upward** — the write rate exceeds single-primary apply
  capacity. Parallel apply first, sharding much later.
- **Auto-increment approaching the type maximum** — check before it happens:

```sql
SELECT table_name, auto_increment,
       ROUND(100 * auto_increment / 18446744073709551615, 6) AS pct_of_bigint
FROM information_schema.tables
WHERE table_schema = DATABASE() AND auto_increment IS NOT NULL
ORDER BY auto_increment DESC;
```

An `INT UNSIGNED` primary key exhausts at 4.29 billion, and the failure mode is a
hard write outage. Migrate to `BIGINT` long before that.

## Security

```sql
CREATE USER 'app'@'10.0.%' IDENTIFIED BY ? REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop.* TO 'app'@'10.0.%';
-- No DDL, no FILE, no SUPER, no wildcard host
```

- Separate accounts per application, per environment, with distinct privileges.
- Require TLS for every non-local connection.
- Never grant `FILE`, `SUPER`, `PROCESS` or `GRANT OPTION` to an application user.
- Encrypt tablespaces at rest where the threat model requires it
  (`innodb_encrypt_tables`), and keep the keyring outside the data directory.
- Audit privileged access; `mysql.general_log` is not an audit trail — use the
  audit plugin.
