# Redis Expert — Node.js Client (ioredis)

Reference material for the `redis-expert` skill. See [SKILL.md](../SKILL.md).

## Node.js Client (ioredis)

### Basic Operations

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Strings
await redis.set('user:1000:name', 'Alice');
await redis.set('counter', 42);
await redis.get('user:1000:name'); // 'Alice'

// Expiration (TTL)
await redis.setex('session:abc123', 3600, JSON.stringify({ userId: 1000 }));
await redis.expire('user:1000:name', 300); // 5 minutes
await redis.ttl('user:1000:name'); // Returns remaining seconds

// Atomic operations
await redis.incr('page:views'); // 1
await redis.incr('page:views'); // 2
await redis.incrby('score', 10); // Increment by 10
await redis.decr('inventory:item123');

// Hashes (objects)
await redis.hset('user:1000', {
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
});

await redis.hget('user:1000', 'name'); // 'Alice'
await redis.hgetall('user:1000'); // { name: 'Alice', email: '...', age: '30' }
await redis.hincrby('user:1000', 'loginCount', 1);

// Lists (queues, stacks)
await redis.lpush('queue:jobs', 'job1', 'job2', 'job3'); // Push to left
await redis.rpush('queue:jobs', 'job4'); // Push to right
await redis.lpop('queue:jobs'); // Pop from left (FIFO)
await redis.rpop('queue:jobs'); // Pop from right (LIFO)
await redis.lrange('queue:jobs', 0, -1); // Get all items

// Sets (unique values)
await redis.sadd('tags:post:1', 'javascript', 'nodejs', 'redis');
await redis.smembers('tags:post:1'); // ['javascript', 'nodejs', 'redis']
await redis.sismember('tags:post:1', 'nodejs'); // 1 (true)
await redis.scard('tags:post:1'); // 3 (count)

// Set operations
await redis.sadd('tags:post:2', 'nodejs', 'typescript', 'docker');
await redis.sinter('tags:post:1', 'tags:post:2'); // ['nodejs'] (intersection)
await redis.sunion('tags:post:1', 'tags:post:2'); // All unique tags
await redis.sdiff('tags:post:1', 'tags:post:2'); // ['javascript', 'redis']

// Sorted Sets (leaderboards)
await redis.zadd(
  'leaderboard',
  1000,
  'player1',
  1500,
  'player2',
  800,
  'player3'
);
await redis.zrange('leaderboard', 0, -1, 'WITHSCORES'); // Ascending
await redis.zrevrange('leaderboard', 0, 9); // Top 10 (descending)
await redis.zincrby('leaderboard', 50, 'player1'); // Add to score
await redis.zrank('leaderboard', 'player1'); // Get rank (0-indexed)
await redis.zscore('leaderboard', 'player1'); // Get score
```

### Advanced Patterns

#### Caching with JSON

```typescript
// Cache helper
class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const fresh = await factory();
    await this.set(key, fresh, ttl);
    return fresh;
  }
}

// Usage
const cache = new CacheService(redis);

const user = await cache.getOrSet(
  'user:1000',
  async () => await db.user.findById(1000),
  3600
);
```

#### Rate Limiting

```typescript
class RateLimiter {
  constructor(private redis: Redis) {}

  async checkRateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, window);
    }

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  }
}

// Usage: 100 requests per hour per IP
const limiter = new RateLimiter(redis);
const result = await limiter.checkRateLimit(`ratelimit:${ip}`, 100, 3600);

if (!result.allowed) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

#### Sliding Window Rate Limiting

```typescript
async function slidingWindowRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  window: number
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - window * 1000;

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count requests in window
  const count = await redis.zcard(key);

  if (count < limit) {
    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, window);
    return true;
  }

  return false;
}
```

#### Distributed Locking

```typescript
class RedisLock {
  constructor(private redis: Redis) {}

  async acquire(
    resource: string,
    ttl: number = 10000,
    retryDelay: number = 50,
    retryCount: number = 100
  ): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockValue = crypto.randomUUID();

    for (let i = 0; i < retryCount; i++) {
      const acquired = await this.redis.set(
        lockKey,
        lockValue,
        'PX',
        ttl,
        'NX'
      );

      if (acquired === 'OK') {
        return lockValue;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    return null;
  }

  async release(resource: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;

    // Use Lua script to ensure atomicity
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, lockValue);
    return result === 1;
  }

  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    ttl: number = 10000
  ): Promise<T> {
    const lockValue = await this.acquire(resource, ttl);
    if (!lockValue) {
      throw new Error('Failed to acquire lock');
    }

    try {
      return await fn();
    } finally {
      await this.release(resource, lockValue);
    }
  }
}

// Usage
const lock = new RedisLock(redis);

await lock.withLock('resource:123', async () => {
  // Critical section - only one process can execute this
  const data = await fetchData();
  await processData(data);
});
```

### Pub/Sub

```typescript
// Publisher
const publisher = new Redis();

await publisher.publish(
  'notifications',
  JSON.stringify({
    type: 'new_message',
    userId: 1000,
    message: 'Hello!',
  })
);

// Subscriber
const subscriber = new Redis();

subscriber.subscribe('notifications', (err, count) => {
  console.log(`Subscribed to ${count} channels`);
});

subscriber.on('message', (channel, message) => {
  const data = JSON.parse(message);
  console.log(`Received from ${channel}:`, data);
});

// Pattern subscription
subscriber.psubscribe('user:*:notifications', (err, count) => {
  console.log(`Subscribed to ${count} patterns`);
});

subscriber.on('pmessage', (pattern, channel, message) => {
  console.log(`Pattern ${pattern} matched ${channel}:`, message);
});

// Unsubscribe
await subscriber.unsubscribe('notifications');
await subscriber.punsubscribe('user:*:notifications');
```

### Redis Streams

```typescript
// Add to stream
await redis.xadd(
  'events',
  '*', // Auto-generate ID
  'type',
  'user_registered',
  'userId',
  '1000',
  'email',
  'alice@example.com'
);

// Read from stream
const messages = await redis.xread('COUNT', 10, 'STREAMS', 'events', '0');
/*
[
  ['events', [
    ['1609459200000-0', ['type', 'user_registered', 'userId', '1000']],
    ['1609459201000-0', ['type', 'order_placed', 'orderId', '500']]
  ]]
]
*/

// Consumer Groups
await redis.xgroup('CREATE', 'events', 'worker-group', '0', 'MKSTREAM');

// Read as consumer
const messages = await redis.xreadgroup(
  'GROUP',
  'worker-group',
  'consumer-1',
  'COUNT',
  10,
  'STREAMS',
  'events',
  '>'
);

// Acknowledge message
await redis.xack('events', 'worker-group', '1609459200000-0');

// Pending messages
const pending = await redis.xpending('events', 'worker-group');
```

### Transactions

```typescript
// Multi/Exec (transaction)
const pipeline = redis.multi();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.incr('counter');
const results = await pipeline.exec();

// Watch (optimistic locking)
await redis.watch('balance:1000');
const balance = parseInt((await redis.get('balance:1000')) || '0');

if (balance >= amount) {
  const multi = redis.multi();
  multi.decrby('balance:1000', amount);
  multi.incrby('balance:2000', amount);
  await multi.exec(); // Executes only if balance:1000 wasn't modified
} else {
  await redis.unwatch();
}
```

### Pipelining

```typescript
// Pipeline multiple commands
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.get('key1');
pipeline.get('key2');
const results = await pipeline.exec();
// [[null, 'OK'], [null, 'OK'], [null, 'value1'], [null, 'value2']]

// Batch operations
async function batchSet(items: Record<string, string>) {
  const pipeline = redis.pipeline();
  for (const [key, value] of Object.entries(items)) {
    pipeline.set(key, value);
  }
  await pipeline.exec();
}
```

### Lua Scripts

```typescript
// Atomic increment with max
const script = `
  local current = redis.call('GET', KEYS[1])
  local max = tonumber(ARGV[1])

  if current and tonumber(current) >= max then
    return tonumber(current)
  else
    return redis.call('INCR', KEYS[1])
  end
`;

const result = await redis.eval(script, 1, 'counter', 100);

// Load script once, execute many times
const sha = await redis.script('LOAD', script);
const result = await redis.evalsha(sha, 1, 'counter', 100);
```
