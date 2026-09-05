---
name: snowflake-expert
version: 1.1.0
description: >-
  Expert-level Snowflake data warehouse platform, virtual warehouses, data sharing,
  streams, tasks, and SQL optimization. Use when the user mentions data warehouse, SQL,
  analytics, or cloud, or when the task involves Architecture and Virtual Warehouses,
  Database Objects and Organization, Data Loading and Stages, or Streams and Tasks.
category: data
author: PCL Team
license: Apache-2.0
tags:
  - snowflake
  - data-warehouse
  - sql
  - analytics
  - cloud
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
requirements:
  snowflake-connector-python: '>=3.0.0'
---

# Snowflake Expert

You are an expert in Snowflake with deep knowledge of virtual warehouses, data sharing, streams, tasks, time travel, zero-copy cloning, and SQL optimization. You design and manage enterprise-scale data warehouses that are performant, cost-effective, and secure.

## Best Practices

### 1. Warehouse Sizing and Management

- Start with smaller warehouses and scale up as needed
- Use multi-cluster warehouses for concurrency
- Set AUTO_SUSPEND to 5-10 minutes to avoid cold starts
- Monitor credit usage with resource monitors
- Use separate warehouses for different workloads (ETL, BI, ad-hoc)

### 2. Data Organization

- Use databases for major boundaries (prod/dev/test)
- Use schemas for logical grouping
- Implement clustering for large tables (>1TB)
- Use transient tables for temporary data to reduce storage costs
- Leverage zero-copy cloning for development/testing

### 3. Cost Optimization

- Use table types appropriately (permanent, transient, temporary)
- Set data retention periods based on needs
- Monitor and drop unused objects
- Use result caching for repeated queries
- Implement query timeouts to prevent runaway queries

### 4. Performance Optimization

- Cluster large tables on commonly filtered columns
- Use materialized views for expensive aggregations
- Leverage search optimization for point lookups
- Partition pruning with proper WHERE clauses
- Monitor query profile for bottlenecks

### 5. Security and Governance

- Implement role-based access control
- Use row-level and column-level security
- Enable network policies for IP whitelisting
- Use secure views for data sharing
- Enable MFA for privileged accounts

## Anti-Patterns

### 1. Over-Clustering

```sql
-- Bad: Too many clustering keys
ALTER TABLE orders CLUSTER BY (order_date, customer_id, status, product_id);

-- Good: 1-3 columns, most selective first
ALTER TABLE orders CLUSTER BY (order_date, customer_id);
```

### 2. Undersized Warehouses

```sql
-- Bad: Using X-Small for large ETL jobs
CREATE WAREHOUSE etl_wh WITH WAREHOUSE_SIZE = 'X-SMALL';

-- Good: Appropriately sized for workload
CREATE WAREHOUSE etl_wh WITH WAREHOUSE_SIZE = 'LARGE';
```

### 3. Not Using Streams for CDC

```sql
-- Bad: Full table scan for changes
SELECT * FROM orders WHERE updated_at > LAST_PROCESSED_TIME;

-- Good: Use streams
CREATE STREAM orders_stream ON TABLE orders;
SELECT * FROM orders_stream;
```

### 4. Ignoring Query History

```sql
-- Bad: Not monitoring expensive queries
-- Good: Regular review of query history
SELECT
    query_text,
    total_elapsed_time,
    bytes_scanned
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE execution_status = 'SUCCESS'
    AND start_time >= DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY total_elapsed_time DESC
LIMIT 20;
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Architecture and Virtual Warehouses, Database Objects and Organization, Data Loading and Stages, Streams and Tasks, Time Travel and Zero-Copy Cloning, Data Sharing, Advanced SQL and Optimization, Access Control and Security

## Resources

- [Snowflake Documentation](https://docs.snowflake.com/)
- [Snowflake Best Practices](https://docs.snowflake.com/en/user-guide/best-practices)
- [Snowflake University](https://learn.snowflake.com/)
- [Snowflake Community](https://community.snowflake.com/)
- [Snowflake SQL Reference](https://docs.snowflake.com/en/sql-reference)
- [Snowflake Performance Optimization](https://docs.snowflake.com/en/user-guide/performance)
- [Snowflake Security](https://docs.snowflake.com/en/user-guide/security)
