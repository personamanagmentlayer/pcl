# PCL Registry Usage Guide

Complete guide to using the PCL Registry System for managing AI personas, teams, workflows, and skills.

## Quick Start

### Installation

```bash
npm install @pcl/registry
```

### Basic Usage

```typescript
import { RegistryManager, MemoryBackend } from '@pcl/registry';

// Create backend
const backend = new MemoryBackend();
await backend.connect();

// Create registry manager
const registry = new RegistryManager({ backend });

// Create an artifact
const result = await registry.create({
  type: 'persona',
  metadata: {
    name: 'Code Reviewer',
    version: '1.0.0',
    tags: ['code-quality', 'review'],
  },
  source: 'persona CODE_REVIEWER { ... }',
  stats: { downloads: 0, stars: 0, views: 0 },
  published: false,
  deleted: false,
});

if (result.ok) {
  console.log('Created artifact:', result.value.id);
}
```

## Choosing a Backend

### 1. MemoryBackend (Development & Testing)

**Best for**: Unit tests, development, temporary storage

```typescript
import { MemoryBackend } from '@pcl/registry';

const backend = new MemoryBackend();
await backend.connect();
```

**Pros**:
- Zero configuration
- Fast (in-memory)
- Perfect for testing

**Cons**:
- Data lost on restart
- No persistence

### 2. SQLiteBackend (Local & Embedded)

**Best for**: Desktop apps, local development, single-server deployments

```typescript
import { SQLiteBackend } from '@pcl/registry';

const backend = new SQLiteBackend({
  filename: './pcl-registry.db',
  wal: true, // Better concurrency
});

await backend.connect();
```

**Pros**:
- File-based persistence
- No server required
- FTS5 full-text search
- Handles 10k-1M artifacts

**Cons**:
- Single-writer limitation
- Not suitable for high concurrency

### 3. PostgreSQLBackend (Production)

**Best for**: Production deployments, high-concurrency, enterprise applications

```typescript
import { PostgreSQLBackend } from '@pcl/registry';

const backend = new PostgreSQLBackend({
  host: 'localhost',
  port: 5432,
  database: 'pcl_registry',
  user: 'pcl_user',
  password: process.env.DB_PASSWORD,
  max: 20, // Connection pool size
  ssl: true,
});

await backend.connect();
```

**Pros**:
- Production-grade reliability
- Connection pooling
- Advanced search (trigram)
- Handles millions of artifacts
- ACID transactions

**Cons**:
- Requires PostgreSQL server
- More complex setup

## Complete Examples

### Example 1: Create and Publish a Persona

```typescript
import { RegistryManager, SQLiteBackend, ArtifactType } from '@pcl/registry';

const backend = new SQLiteBackend({ filename: './registry.db' });
await backend.connect();

const registry = new RegistryManager({
  backend,
  autoGenerateSlugs: true,
  validateArtifacts: true,
});

// Create persona
const createResult = await registry.create({
  type: ArtifactType.PERSONA,
  metadata: {
    name: 'Python Expert',
    description: 'Expert Python developer with PEP 8 knowledge',
    version: '1.0.0',
    author: 'John Doe',
    authorEmail: 'john@example.com',
    tags: ['python', 'programming', 'expert'],
    skills: ['python', 'pep8', 'typing'],
    license: 'MIT',
  },
  source: `
    persona PYTHON_EXPERT {
      name: "Python Expert"
      model: "claude-sonnet-4"
      temperature: 0.3

      prompts: {
        system: """
        You are an expert Python developer.
        Follow PEP 8 guidelines strictly.
        """
      }
    }
  `,
  stats: { downloads: 0, stars: 0, views: 0 },
  published: false,
  deleted: false,
});

if (!createResult.ok) {
  console.error('Failed to create:', createResult.error);
  process.exit(1);
}

const persona = createResult.value;
console.log('Created persona:', persona.id);
console.log('Slug:', persona.metadata.slug); // Auto-generated: "python-expert"

// Publish the persona
await registry.publish(persona.id, persona.metadata.version);
console.log('Published!');
```

### Example 2: Search and Filter

```typescript
// Find all Python personas
const pythonResult = await registry.find({
  filter: {
    type: ArtifactType.PERSONA,
    tags: ['python'],
    published: true,
  },
  sort: { field: 'downloads', order: 'desc' },
  pagination: { offset: 0, limit: 10 },
});

if (pythonResult.ok) {
  console.log(`Found ${pythonResult.value.length} Python personas`);
  for (const persona of pythonResult.value) {
    console.log(`- ${persona.metadata.name} (${persona.stats.downloads} downloads)`);
  }
}

// Full-text search
const searchResult = await registry.search({
  query: 'code review security',
  fields: ['name', 'description', 'tags'],
  pagination: { offset: 0, limit: 5 },
});

if (searchResult.ok) {
  for (const result of searchResult.value) {
    console.log(`${result.artifact.metadata.name} (score: ${result.score})`);
  }
}
```

### Example 3: Version Management

```typescript
// Create initial version
const personaResult = await registry.create({
  type: ArtifactType.PERSONA,
  metadata: {
    name: 'Code Reviewer',
    version: '1.0.0',
    tags: ['review'],
  },
  source: 'persona CODE_REVIEWER_V1 { ... }',
  stats: { downloads: 0, stars: 0, views: 0 },
  published: true,
  deleted: false,
});

if (!personaResult.ok) throw new Error('Failed');
const persona = personaResult.value;

// Update to new version
await registry.update(persona.id, {
  metadata: { ...persona.metadata, version: '2.0.0' },
  source: 'persona CODE_REVIEWER_V2 { ... }',
});

// List all versions
const versionsResult = await registry.listVersions(persona.id);
if (versionsResult.ok) {
  console.log('Versions:', versionsResult.value.map(v => v.version));
  // Output: ['2.0.0', '1.0.0']
}

// Get specific version
const v1Result = await registry.getVersion(persona.id, '1.0.0');
if (v1Result.ok && v1Result.value) {
  console.log('V1 source:', v1Result.value.source);
}
```

### Example 4: With Caching (Redis)

```typescript
import { RegistryManager, PostgreSQLBackend } from '@pcl/registry';
import Redis from 'ioredis';

// Simple Redis cache implementation
class RedisCache implements ICache {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<Result<T | null>> {
    const value = await this.redis.get(key);
    return Ok(value ? JSON.parse(value) : null);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<Result<void>> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
    return Ok(undefined);
  }

  async delete(key: string): Promise<Result<void>> {
    await this.redis.del(key);
    return Ok(undefined);
  }

  async invalidate(pattern: string): Promise<Result<number>> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    return Ok(keys.length);
  }

  async clear(): Promise<Result<void>> {
    await this.redis.flushdb();
    return Ok(undefined);
  }

  async stats(): Promise<Result<CacheStats>> {
    // Implement cache statistics
    return Ok({ hits: 0, misses: 0, hitRate: 0, entries: 0 });
  }
}

// Use with registry
const backend = new PostgreSQLBackend({ /* config */ });
const cache = new RedisCache(new Redis());

const registry = new RegistryManager({
  backend,
  cache,
  cacheTTL: 3600, // 1 hour
});

// First read: hits backend
const result1 = await registry.read(artifactId); // Slow (DB query)

// Second read: hits cache
const result2 = await registry.read(artifactId); // Fast (Redis)
```

### Example 5: Error Handling

```typescript
import { isRegistryError } from '@pcl/registry';

const result = await registry.create(artifact);

if (!result.ok) {
  const error = result.error;

  // Check error type
  if (error.code === 'VALIDATION_ERROR') {
    console.error('Validation failed:', error.message);
    // Show user-friendly error
  } else if (error.code === 'DUPLICATE') {
    console.error('Artifact already exists');
    // Suggest alternative slug
  } else if (error.code === 'CONNECTION_ERROR') {
    console.error('Database connection failed');
    // Retry or show maintenance message
  } else {
    console.error('Unexpected error:', error);
    // Log to error tracking service
  }
}
```

### Example 6: Transaction Support

```typescript
const txResult = await backend.beginTransaction();
if (!txResult.ok) throw new Error('Failed to start transaction');

const tx = txResult.value;

try {
  // Multiple operations in transaction
  const persona1 = await backend.create({ /* ... */ });
  const persona2 = await backend.create({ /* ... */ });
  const team = await backend.create({
    type: ArtifactType.TEAM,
    metadata: {
      name: 'Expert Team',
      version: '1.0.0',
      tags: [],
    },
    source: `team EXPERT_TEAM { members: [PERSONA1, PERSONA2] }`,
    stats: { downloads: 0, stars: 0, views: 0 },
    published: false,
    deleted: false,
  });

  // Commit if all succeeded
  await tx.commit();
  console.log('Transaction committed');

} catch (error) {
  // Rollback on error
  await tx.rollback();
  console.error('Transaction rolled back:', error);
}
```

### Example 7: Batch Operations

```typescript
// Create multiple personas efficiently
const personas = [
  { name: 'Python Expert', tags: ['python'] },
  { name: 'TypeScript Expert', tags: ['typescript'] },
  { name: 'Rust Expert', tags: ['rust'] },
];

const results = await Promise.all(
  personas.map((p) =>
    registry.create({
      type: ArtifactType.PERSONA,
      metadata: {
        name: p.name,
        version: '1.0.0',
        tags: p.tags,
      },
      source: `persona ${p.name.toUpperCase().replace(' ', '_')} {}`,
      stats: { downloads: 0, stars: 0, views: 0 },
      published: false,
      deleted: false,
    })
  )
);

const succeeded = results.filter((r) => r.ok).length;
console.log(`Created ${succeeded}/${personas.length} personas`);
```

### Example 8: Registry Statistics

```typescript
const statsResult = await registry.stats();

if (statsResult.ok) {
  const stats = statsResult.value;

  console.log('Registry Statistics:');
  console.log(`Total artifacts: ${stats.total}`);
  console.log(`Personas: ${stats.byType.persona}`);
  console.log(`Teams: ${stats.byType.team}`);
  console.log(`Workflows: ${stats.byType.workflow}`);
  console.log(`Skills: ${stats.byType.skill}`);
  console.log(`Total downloads: ${stats.totalDownloads}`);
  console.log(`Total stars: ${stats.totalStars}`);

  if (stats.cache) {
    console.log(`Cache hit rate: ${(stats.cache.hitRate * 100).toFixed(2)}%`);
  }
}
```

## Best Practices

### 1. Always Validate

```typescript
const registry = new RegistryManager({
  backend,
  validateArtifacts: true, // Enable validation
  autoGenerateSlugs: true, // Auto-generate slugs
});
```

### 2. Use Semantic Versioning

```typescript
// Good
version: '1.0.0'      // Initial release
version: '1.1.0'      // New features, backward compatible
version: '2.0.0'      // Breaking changes

// Bad
version: 'v1'
version: 'latest'
```

### 3. Handle Errors Properly

```typescript
const result = await registry.create(artifact);

if (!result.ok) {
  // Log error with context
  logger.error('Failed to create artifact', {
    error: result.error,
    artifact: artifact.metadata.name,
  });

  // Return user-friendly message
  throw new Error(`Failed to create ${artifact.metadata.name}`);
}
```

### 4. Use Caching for Read-Heavy Workloads

```typescript
const registry = new RegistryManager({
  backend,
  cache: redisCache,
  cacheTTL: 3600, // Cache for 1 hour
});
```

### 5. Clean Up Resources

```typescript
try {
  // Use registry
  await registry.create(artifact);
} finally {
  // Always disconnect
  await backend.disconnect();
}
```

## Advanced Topics

### Custom Validation

```typescript
class CustomRegistryManager extends RegistryManager {
  async create(artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<Artifact>> {
    // Custom validation
    if (artifact.type === ArtifactType.PERSONA) {
      if (!artifact.metadata.skills || artifact.metadata.skills.length === 0) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: 'Personas must have at least one skill',
          span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
        });
      }
    }

    // Call parent implementation
    return super.create(artifact);
  }
}
```

### Migration Between Backends

```typescript
// Export from old backend
const oldBackend = new SQLiteBackend({ filename: './old.db' });
await oldBackend.connect();

const artifacts = await oldBackend.find({});
if (!artifacts.ok) throw new Error('Failed to read');

// Import to new backend
const newBackend = new PostgreSQLBackend({ /* config */ });
await newBackend.connect();

for (const artifact of artifacts.value) {
  const { id, createdAt, updatedAt, ...data } = artifact;
  await newBackend.create(data);
}

console.log(`Migrated ${artifacts.value.length} artifacts`);
```

## Troubleshooting

### Database Connection Issues

```typescript
try {
  await backend.connect();
} catch (error) {
  console.error('Connection failed:', error);

  // Check connection string
  // Verify database exists
  // Check network connectivity
  // Verify credentials
}
```

### Slug Conflicts

```typescript
const result = await registry.create(artifact);

if (!result.ok && result.error.code === 'DUPLICATE') {
  // Add timestamp to make unique
  const uniqueSlug = `${artifact.metadata.slug}-${Date.now()}`;

  artifact.metadata.slug = uniqueSlug;
  const retryResult = await registry.create(artifact);
}
```

### Performance Issues

```typescript
// Enable caching
const cache = new RedisCache(redis);
const registry = new RegistryManager({ backend, cache });

// Use pagination for large result sets
const result = await registry.find({
  pagination: { offset: 0, limit: 100 },
});

// Create indexes (PostgreSQL)
// See migrations/postgresql/001_initial_schema.sql
```

## Next Steps

- Read [REGISTRY-SYSTEM.md](../api/REGISTRY-SYSTEM.md) for architecture details
- Check [examples/](../../examples/) for complete applications
- See [migrations/](../../migrations/) for database schemas
- Review [tests/registry/](../../tests/registry/) for usage patterns

## Support

- Issues: https://github.com/personamanagmentlayer/pcl-lite/issues
- Documentation: https://docs.pcl-lang.org
- Email: support@pcl-lang.org
