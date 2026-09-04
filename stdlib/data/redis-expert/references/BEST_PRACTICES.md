# Redis Expert — Best Practices

Reference material for the `redis-expert` skill. See [SKILL.md](../SKILL.md).

## Best Practices

### Memory Management

- Set maxmemory limit
- Choose appropriate eviction policy:
  - `allkeys-lru`: Remove least recently used keys
  - `allkeys-lfu`: Remove least frequently used keys
  - `volatile-lru`: Remove LRU keys with expire set
  - `volatile-ttl`: Remove keys with shortest TTL
- Monitor memory usage: `INFO memory`
- Use memory-efficient data structures

### Key Naming

```typescript
// Good: hierarchical, descriptive
'user:1000:profile';
'session:abc123';
'cache:api:users:page:1';
'ratelimit:ip:192.168.1.1:2024-01-19';

// Use consistent separators
const key = ['user', userId, 'profile'].join(':');
```

### Expiration

- Always set TTL for cache keys
- Use appropriate TTL based on data freshness
- Monitor keys without expiration: `redis-cli --bigkeys`

### Persistence

- Use AOF for durability (appendonly yes)
- Use RDB for backups (save snapshots)
- Test restore procedures

### Monitoring

```bash
# Monitor commands in real-time
redis-cli MONITOR

# Stats
redis-cli INFO

# Slow queries
redis-cli SLOWLOG GET 10

# Memory analysis
redis-cli --bigkeys

# Latency
redis-cli --latency
```
