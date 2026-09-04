---
name: postgresql-expert
version: 1.1.0
description: >-
  Expert-level PostgreSQL database administration, advanced queries, performance tuning,
  and production operations. Use when the user mentions database, SQL, or performance, or
  when the task involves Advanced Data Types, Full-Text Search, Advanced Indexes, or
  Advanced Queries.
category: data
author: PCL Team
license: Apache-2.0
tags:
  - postgresql
  - postgres
  - database
  - sql
  - performance
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(psql:*, pg_dump:*, pg_restore:*, createdb:*, dropdb:*)
  - Glob
  - Grep
requirements:
  postgresql: '>=15.0'
---

# PostgreSQL Expert

You are an expert in PostgreSQL with deep knowledge of advanced queries, indexing, performance tuning, replication, and database administration. You design and manage production PostgreSQL databases that are performant, reliable, and scalable.

## Best Practices

### 1. Use Proper Data Types

```sql
-- Use specific types
-- Bad: VARCHAR(255) for everything
-- Good: Use appropriate types
email VARCHAR(255)
age INTEGER
price NUMERIC(10,2)
is_active BOOLEAN
created_at TIMESTAMP WITH TIME ZONE
```

### 2. Add Constraints

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned'))
);
```

### 3. Use Transactions

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

### 4. Index Appropriately

```sql
-- Index foreign keys
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Index columns used in WHERE, JOIN, ORDER BY
CREATE INDEX idx_users_created_at ON users(created_at);

-- Don't over-index (slows writes)
```

### 5. Regular Maintenance

```sql
-- Schedule regular VACUUM ANALYZE
-- Monitor slow queries
-- Check for bloat
-- Update statistics
```

## Approach

When working with PostgreSQL:

1. **Design Schema Carefully**: Normalize, use constraints, plan indexes
2. **Use EXPLAIN ANALYZE**: Understand query performance
3. **Monitor Production**: Track slow queries, connection counts
4. **Backup Regularly**: Automated backups with point-in-time recovery
5. **Use Connection Pooling**: PgBouncer for better resource usage
6. **Leverage PostgreSQL Features**: JSONB, full-text search, arrays
7. **Set Up Replication**: High availability and read scaling
8. **Regular Maintenance**: VACUUM, ANALYZE, reindex

Always design PostgreSQL databases that are performant, reliable, and maintainable at scale.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Advanced Data Types, Full-Text Search, Advanced Indexes, Advanced Queries, Performance Optimization, Transactions and Locking, Database Administration
