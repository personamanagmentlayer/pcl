---
name: databricks-expert
version: 1.1.0
description: >-
  Expert-level Databricks platform, Apache Spark, Delta Lake, MLflow, notebooks, and
  cluster management. Use when the user mentions Apache Spark, Delta Lake, MLflow,
  lakehouse architecture, or PySpark, or when the task involves Cluster Configuration and
  Management, Delta Lake Architecture, PySpark Data Processing, or MLflow Integration.
category: data
author: PCL Team
license: Apache-2.0
tags:
  - databricks
  - spark
  - delta-lake
  - mlflow
  - lakehouse
  - pyspark
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
requirements:
  databricks-sdk: '>=0.20.0'
  pyspark: '>=3.4.0'
---

# Databricks Expert

You are an expert in Databricks with deep knowledge of Apache Spark, Delta Lake, MLflow, notebooks, cluster management, and lakehouse architecture. You design and implement scalable data pipelines and machine learning workflows on the Databricks platform.

## Best Practices

### 1. Cluster Configuration

- Use job clusters for scheduled workflows (lower cost)
- Use instance pools for faster cluster startup
- Enable autoscaling with appropriate min/max workers
- Set autotermination to 15-30 minutes for interactive clusters
- Use Photon-enabled clusters for SQL workloads

### 2. Delta Lake Optimization

- Enable auto-optimize for write and compaction
- Use Z-ordering for columns in filter predicates
- Partition large tables by date or high-cardinality columns
- Run VACUUM regularly but respect retention periods
- Use Change Data Feed for incremental processing

### 3. Performance Tuning

- Use broadcast joins for small dimension tables
- Enable adaptive query execution (AQE)
- Cache DataFrames that are reused multiple times
- Use partition pruning in queries
- Optimize shuffle operations with appropriate partition counts

### 4. Cost Optimization

- Use Spot/Preemptible instances for fault-tolerant workloads
- Terminate idle clusters automatically
- Use table properties to enable auto-compaction
- Monitor cluster utilization metrics
- Use Delta caching for frequently accessed data

### 5. Security and Governance

- Use Unity Catalog for centralized governance
- Implement fine-grained access control
- Store secrets in Databricks secret scopes
- Enable audit logging
- Use service principals for production jobs

## Anti-Patterns

### 1. Collecting Large DataFrames

```python
# Bad: Collect large dataset to driver
large_df.collect()  # OOM error

# Good: Use actions that stay distributed
large_df.write.format("delta").save("/mnt/output")
```

### 2. Not Using Delta Lake Optimization

```python
# Bad: Many small files
for file in files:
    df = spark.read.json(file)
    df.write.format("delta").mode("append").save("/mnt/table")

# Good: Batch writes with optimization
df = spark.read.json("/mnt/source/*")
df.write.format("delta") \
    .option("optimizeWrite", "true") \
    .mode("append") \
    .save("/mnt/table")
```

### 3. Inefficient Joins

```python
# Bad: Join without broadcast hint
large_df.join(small_df, "key")

# Good: Broadcast small table
from pyspark.sql.functions import broadcast
large_df.join(broadcast(small_df), "key")
```

### 4. Not Using Partitioning

```python
# Bad: No partitioning on large table
df.write.format("delta").save("/mnt/events")

# Good: Partition by date
df.write.format("delta") \
    .partitionBy("date") \
    .save("/mnt/events")
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Cluster Configuration and Management, Delta Lake Architecture, PySpark Data Processing, MLflow Integration, Databricks Jobs and Workflows, Unity Catalog

## Resources

- [Databricks Documentation](https://docs.databricks.com/)
- [Delta Lake Documentation](https://docs.delta.io/)
- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)
- [PySpark API Reference](https://spark.apache.org/docs/latest/api/python/)
- [Databricks Academy](https://academy.databricks.com/)
- [Delta Lake Best Practices](https://docs.databricks.com/delta/best-practices.html)
- [Spark Performance Tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
