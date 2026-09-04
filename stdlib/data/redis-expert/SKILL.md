---
name: redis-expert
version: 1.1.0
description: >-
  Expert-level Redis for caching, pub/sub, data structures, and high-performance
  applications. Use when the user mentions cache, pub/sub, in-memory stores, key-value
  stores, or NoSQL, or when the task involves Data Structures, Basic Operations, Advanced
  Patterns, or Redis Streams.
category: data
tags: [redis, cache, pubsub, inmemory, keyvalue, nosql]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(redis-cli:*, docker:*)
---

# Redis Expert

Expert guidance for Redis - the in-memory data structure store used as cache, message broker, and database with microsecond latency.

## Core Concepts

### Data Structures

- Strings (binary-safe, up to 512MB)
- Lists (linked lists)
- Sets (unordered unique strings)
- Sorted Sets (sets ordered by score)
- Hashes (field-value pairs)
- Streams (append-only log)
- Bitmaps and HyperLogLog
- Geospatial indexes

### Key Features

- In-memory storage with persistence
- Pub/Sub messaging
- Transactions
- Lua scripting
- Pipelining
- Master-Replica replication
- Redis Sentinel (high availability)
- Redis Cluster (horizontal scaling)

### Use Cases

- Caching layer
- Session storage
- Real-time analytics
- Message queues
- Rate limiting
- Leaderboards
- Geospatial queries

## Installation and Configuration

### Docker Setup

```bash
# Development
docker run --name redis -p 6379:6379 -d redis:7-alpine

# Production with persistence
docker run --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  -d redis:7-alpine \
  redis-server --appendonly yes --requirepass strongpassword

# Redis with config file
docker run --name redis \
  -p 6379:6379 \
  -v ./redis.conf:/usr/local/etc/redis/redis.conf \
  -d redis:7-alpine \
  redis-server /usr/local/etc/redis/redis.conf
```

### Configuration (redis.conf)

```conf
# Network
bind 0.0.0.0
port 6379
protected-mode yes

# Security
requirepass strongpassword

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1      # Save after 900s if 1 key changed
save 300 10     # Save after 300s if 10 keys changed
save 60 10000   # Save after 60s if 10000 keys changed

appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Replication
replica-read-only yes
repl-diskless-sync yes

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

## Redis Cluster

### Setup

```bash
# Create 6 nodes (3 masters, 3 replicas)
for port in {7000..7005}; do
  mkdir -p cluster/${port}
  cat > cluster/${port}/redis.conf <<EOF
port ${port}
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
EOF
  redis-server cluster/${port}/redis.conf &
done

# Create cluster
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

### Cluster Client

```typescript
import Redis from 'ioredis';

const cluster = new Redis.Cluster([
  { host: '127.0.0.1', port: 7000 },
  { host: '127.0.0.1', port: 7001 },
  { host: '127.0.0.1', port: 7002 },
]);

// Operations work transparently
await cluster.set('key', 'value');
await cluster.get('key');
```

## Performance Optimization

### Connection Pooling

```typescript
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});
```

### Avoid KEYS Command

```typescript
// ❌ Bad: Blocks entire server
const keys = await redis.keys('user:*');

// ✅ Good: Use SCAN for large datasets
async function* scanKeys(pattern: string) {
  let cursor = '0';
  do {
    const [newCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100
    );
    cursor = newCursor;
    yield* keys;
  } while (cursor !== '0');
}

for await (const key of scanKeys('user:*')) {
  console.log(key);
}
```

### Optimize Data Structures

```typescript
// Use hashes for objects instead of multiple keys
// ❌ Bad: 3 keys
await redis.set('user:1000:name', 'Alice');
await redis.set('user:1000:email', 'alice@example.com');
await redis.set('user:1000:age', '30');

// ✅ Good: 1 key
await redis.hset('user:1000', {
  name: 'Alice',
  email: 'alice@example.com',
  age: '30',
});
```

## Anti-Patterns to Avoid

❌ **Using Redis as primary database**: Use for caching/sessions
❌ **Not setting TTL on cache keys**: Causes memory bloat
❌ **Using KEYS in production**: Use SCAN instead
❌ **Large values in keys**: Keep values small (<1MB)
❌ **No monitoring**: Track memory, latency, hit rate
❌ **Synchronous blocking operations**: Use async operations
❌ **Not handling connection failures**: Implement retry logic
❌ **Storing large collections in single key**: Split into multiple keys

## Common Use Cases

### Session Store (Express)

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';

app.use(
  session({
    store: new RedisStore({ client: redis }),
    // Session signing secret - from the environment, never a literal.
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);
```

### Job Queue (BullMQ)

```typescript
import { Queue, Worker } from 'bullmq';

const queue = new Queue('emails', { connection: redis });

// Add job
await queue.add('send-email', {
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!',
});

// Process jobs
const worker = new Worker(
  'emails',
  async (job) => {
    await sendEmail(job.data);
  },
  { connection: redis }
);
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Best Practices](references/BEST_PRACTICES.md) — Memory Management, Key Naming, Expiration, Persistence, Monitoring
- [Node.js Client (ioredis)](references/NODE_JS_CLIENT_IOREDIS.md) — Basic Operations, Advanced Patterns, Pub/Sub, Redis Streams, Transactions, Pipelining, Lua Scripts

## Resources

- Redis Documentation: https://redis.io/docs/
- ioredis: https://github.com/redis/ioredis
- Redis University: https://university.redis.com/
- BullMQ: https://docs.bullmq.io/
