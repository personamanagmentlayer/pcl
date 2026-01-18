/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Registry Backend Performance Benchmarks (Phase 1.3)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Performance benchmarks for all registry backends.
 * Measures throughput, latency, and resource usage.
 *
 * Run with: npm test -- tests/registry/benchmarks.test.ts
 *
 * @packageDocumentation
 * @module tests/registry/benchmarks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { MemoryBackend } from '../../src/registry/backends/memory';
import { JSONFileBackend } from '../../src/registry/backends/json-file';
import { ArtifactType } from '../../src/registry/interfaces';
import type { IBackend, Artifact } from '../../src/registry/interfaces';

// ═══════════════════════════════════════════════════════════════════════════════
//                              BENCHMARK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = join(tmpdir(), 'pcl-bench-backends');
const ENABLE_BENCHMARKS = process.env.ENABLE_BENCHMARKS === 'true';

// Benchmark sizes
const SMALL_DATASET = 10;
const MEDIUM_DATASET = 100;
const LARGE_DATASET = 1000;

// ═══════════════════════════════════════════════════════════════════════════════
//                              BENCHMARK HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createTestArtifact(
  index: number,
  overrides?: Partial<Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>>
): Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: ArtifactType.PERSONA,
    metadata: {
      name: `Benchmark Persona ${index}`,
      slug: `benchmark-persona-${index}-${randomUUID().slice(0, 8)}`,
      description: `Test persona for benchmarking purposes (ID: ${index})`,
      version: '1.0.0',
      author: `Author ${index % 10}`,
      tags: [`tag${index % 5}`, `category${index % 3}`],
      skills: ['typescript', 'testing', `skill${index % 7}`],
    },
    source: `persona BENCH_${index} { name: "Benchmark ${index}" }`,
    stats: {
      downloads: index,
      stars: index % 10,
      views: index * 2,
    },
    published: index % 2 === 0,
    deleted: false,
    ...overrides,
  };
}

interface BenchmarkResult {
  backend: string;
  operation: string;
  dataset: number;
  duration: number; // milliseconds
  throughput: number; // operations per second
  avgLatency: number; // milliseconds per operation
}

async function measureOperation(
  name: string,
  fn: () => Promise<void>,
  count: number = 1
): Promise<{ duration: number; throughput: number; avgLatency: number }> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  const duration = end - start;
  const throughput = (count / duration) * 1000; // ops/sec
  const avgLatency = duration / count;

  return { duration, throughput, avgLatency };
}

function formatBenchmarkResults(results: BenchmarkResult[]): string {
  const lines = [
    '\n═══════════════════════════════════════════════════════════════════════════════',
    '                           BENCHMARK RESULTS',
    '═══════════════════════════════════════════════════════════════════════════════\n',
  ];

  // Group by operation
  const byOperation = results.reduce(
    (acc, r) => {
      if (!acc[r.operation]) {
        acc[r.operation] = [];
      }
      acc[r.operation].push(r);
      return acc;
    },
    {} as Record<string, BenchmarkResult[]>
  );

  for (const [operation, opResults] of Object.entries(byOperation)) {
    lines.push(`\n${operation}:`);
    lines.push('─'.repeat(80));

    // Group by dataset size
    const byDataset = opResults.reduce(
      (acc, r) => {
        if (!acc[r.dataset]) {
          acc[r.dataset] = [];
        }
        acc[r.dataset].push(r);
        return acc;
      },
      {} as Record<number, BenchmarkResult[]>
    );

    for (const [dataset, datasetResults] of Object.entries(byDataset)) {
      lines.push(`\nDataset: ${dataset} artifacts`);
      datasetResults.forEach((r) => {
        lines.push(
          `  ${r.backend.padEnd(15)} | ${r.duration.toFixed(2)}ms | ${r.throughput.toFixed(0)} ops/s | ${r.avgLatency.toFixed(3)}ms/op`
        );
      });
    }
  }

  lines.push(
    '\n═══════════════════════════════════════════════════════════════════════════════\n'
  );
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              MEMORY BACKEND BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

describe.skipIf(!ENABLE_BENCHMARKS)('MemoryBackend Benchmarks', () => {
  let backend: MemoryBackend;
  const results: BenchmarkResult[] = [];

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
  });

  afterEach(async () => {
    if (backend.isConnected()) {
      await backend.disconnect();
    }
  });

  it('should benchmark bulk create (small dataset)', async () => {
    const metrics = await measureOperation(
      'bulk create',
      async () => {
        for (let i = 0; i < SMALL_DATASET; i++) {
          await backend.create(createTestArtifact(i));
        }
      },
      SMALL_DATASET
    );

    results.push({
      backend: 'Memory',
      operation: 'Bulk Create',
      dataset: SMALL_DATASET,
      ...metrics,
    });

    expect(metrics.duration).toBeLessThan(1000); // Should complete in less than 1 second
  });

  it('should benchmark bulk create (medium dataset)', async () => {
    const metrics = await measureOperation(
      'bulk create',
      async () => {
        for (let i = 0; i < MEDIUM_DATASET; i++) {
          await backend.create(createTestArtifact(i));
        }
      },
      MEDIUM_DATASET
    );

    results.push({
      backend: 'Memory',
      operation: 'Bulk Create',
      dataset: MEDIUM_DATASET,
      ...metrics,
    });

    expect(metrics.duration).toBeLessThan(5000); // Should complete in less than 5 seconds
  });

  it('should benchmark random reads', async () => {
    // Setup: Create artifacts
    const ids: string[] = [];
    for (let i = 0; i < MEDIUM_DATASET; i++) {
      const result = await backend.create(createTestArtifact(i));
      if (result.ok) {
        ids.push(result.value.id);
      }
    }

    // Benchmark
    const metrics = await measureOperation(
      'random reads',
      async () => {
        for (let i = 0; i < SMALL_DATASET; i++) {
          const randomId = ids[Math.floor(Math.random() * ids.length)];
          await backend.read(randomId);
        }
      },
      SMALL_DATASET
    );

    results.push({
      backend: 'Memory',
      operation: 'Random Reads',
      dataset: MEDIUM_DATASET,
      ...metrics,
    });

    expect(metrics.avgLatency).toBeLessThan(10); // Average latency should be less than 10ms
  });

  it('should benchmark bulk updates', async () => {
    // Setup: Create artifacts
    const ids: string[] = [];
    for (let i = 0; i < SMALL_DATASET; i++) {
      const result = await backend.create(createTestArtifact(i));
      if (result.ok) {
        ids.push(result.value.id);
      }
    }

    // Benchmark
    const metrics = await measureOperation(
      'bulk updates',
      async () => {
        for (const id of ids) {
          await backend.update(id, {
            metadata: {
              name: 'Updated Name',
              version: '2.0.0',
            } as any,
          });
        }
      },
      ids.length
    );

    results.push({
      backend: 'Memory',
      operation: 'Bulk Updates',
      dataset: SMALL_DATASET,
      ...metrics,
    });
  });

  it('should benchmark queries with filters', async () => {
    // Setup: Create diverse dataset
    for (let i = 0; i < MEDIUM_DATASET; i++) {
      await backend.create(
        createTestArtifact(i, {
          type:
            i % 3 === 0
              ? ArtifactType.PERSONA
              : i % 3 === 1
                ? ArtifactType.TEAM
                : ArtifactType.WORKFLOW,
        })
      );
    }

    // Benchmark
    const metrics = await measureOperation(
      'filtered queries',
      async () => {
        await backend.find({ filter: { type: ArtifactType.PERSONA } });
        await backend.find({ filter: { tags: ['tag1'] } });
        await backend.find({ filter: { author: 'Author 5' } });
      },
      3
    );

    results.push({
      backend: 'Memory',
      operation: 'Filtered Queries',
      dataset: MEDIUM_DATASET,
      ...metrics,
    });
  });

  it('should print benchmark results', () => {
    console.log(formatBenchmarkResults(results));
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              JSON FILE BACKEND BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

describe.skipIf(!ENABLE_BENCHMARKS)('JSONFileBackend Benchmarks', () => {
  let backend: JSONFileBackend;
  let testFile: string;
  const results: BenchmarkResult[] = [];

  beforeEach(async () => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }

    testFile = join(TEST_DIR, `registry-bench-${randomUUID()}.json`);
    backend = new JSONFileBackend({
      filePath: testFile,
      pretty: false,
      autoSave: true,
    });
    await backend.connect();
  });

  afterEach(async () => {
    if (backend.isConnected()) {
      await backend.disconnect();
    }
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should benchmark bulk create (small dataset)', async () => {
    const metrics = await measureOperation(
      'bulk create',
      async () => {
        for (let i = 0; i < SMALL_DATASET; i++) {
          await backend.create(createTestArtifact(i));
        }
      },
      SMALL_DATASET
    );

    results.push({
      backend: 'JSONFile',
      operation: 'Bulk Create',
      dataset: SMALL_DATASET,
      ...metrics,
    });

    expect(metrics.duration).toBeLessThan(2000); // File I/O is slower
  });

  it('should benchmark bulk create (medium dataset)', async () => {
    const metrics = await measureOperation(
      'bulk create',
      async () => {
        for (let i = 0; i < MEDIUM_DATASET; i++) {
          await backend.create(createTestArtifact(i));
        }
      },
      MEDIUM_DATASET
    );

    results.push({
      backend: 'JSONFile',
      operation: 'Bulk Create',
      dataset: MEDIUM_DATASET,
      ...metrics,
    });

    expect(metrics.duration).toBeLessThan(20000); // 20 seconds for 100 items
  });

  it('should benchmark random reads', async () => {
    // Setup: Create artifacts
    const ids: string[] = [];
    for (let i = 0; i < MEDIUM_DATASET; i++) {
      const result = await backend.create(createTestArtifact(i));
      if (result.ok) {
        ids.push(result.value.id);
      }
    }

    // Benchmark
    const metrics = await measureOperation(
      'random reads',
      async () => {
        for (let i = 0; i < SMALL_DATASET; i++) {
          const randomId = ids[Math.floor(Math.random() * ids.length)];
          await backend.read(randomId);
        }
      },
      SMALL_DATASET
    );

    results.push({
      backend: 'JSONFile',
      operation: 'Random Reads',
      dataset: MEDIUM_DATASET,
      ...metrics,
    });
  });

  it('should benchmark queries with filters', async () => {
    // Setup: Create diverse dataset
    for (let i = 0; i < SMALL_DATASET; i++) {
      await backend.create(
        createTestArtifact(i, {
          type:
            i % 3 === 0
              ? ArtifactType.PERSONA
              : i % 3 === 1
                ? ArtifactType.TEAM
                : ArtifactType.WORKFLOW,
        })
      );
    }

    // Benchmark
    const metrics = await measureOperation(
      'filtered queries',
      async () => {
        await backend.find({ filter: { type: ArtifactType.PERSONA } });
        await backend.find({ filter: { tags: ['tag1'] } });
        await backend.find({ filter: { author: 'Author 5' } });
      },
      3
    );

    results.push({
      backend: 'JSONFile',
      operation: 'Filtered Queries',
      dataset: SMALL_DATASET,
      ...metrics,
    });
  });

  it('should print benchmark results', () => {
    console.log(formatBenchmarkResults(results));
    expect(results.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              COMPARISON SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

describe.skipIf(!ENABLE_BENCHMARKS)('Backend Comparison', () => {
  it('should show performance recommendations', () => {
    console.log(
      '\n═══════════════════════════════════════════════════════════════════════════════'
    );
    console.log('                        PERFORMANCE RECOMMENDATIONS');
    console.log(
      '═══════════════════════════════════════════════════════════════════════════════\n'
    );
    console.log('MemoryBackend:');
    console.log('  ✅ Best for: Testing, temporary data, <10,000 artifacts');
    console.log('  ✅ Throughput: Very high (1000+ ops/sec)');
    console.log('  ✅ Latency: Very low (<1ms)');
    console.log('  ❌ Persistence: None');
    console.log('');
    console.log('JSONFileBackend:');
    console.log(
      '  ✅ Best for: Local development, <1,000 artifacts, git workflows'
    );
    console.log('  ✅ Throughput: Medium (10-100 ops/sec)');
    console.log('  ✅ Latency: Low (1-10ms)');
    console.log('  ✅ Persistence: Yes (human-readable)');
    console.log('  ⚠️  Performance degrades with frequent writes');
    console.log('');
    console.log('SQLiteBackend:');
    console.log('  ✅ Best for: Production, <100,000 artifacts, embedded apps');
    console.log('  ✅ Throughput: High (100-1000 ops/sec)');
    console.log('  ✅ Latency: Low (1-5ms)');
    console.log('  ✅ Persistence: Yes (binary, efficient)');
    console.log('');
    console.log('PostgreSQLBackend:');
    console.log('  ✅ Best for: Enterprise, unlimited artifacts, multi-user');
    console.log('  ✅ Throughput: Very high (1000+ ops/sec)');
    console.log('  ✅ Latency: Medium (5-20ms, network overhead)');
    console.log('  ✅ Persistence: Yes (ACID-compliant)');
    console.log('  ✅ Full-text search, advanced queries');
    console.log(
      '\n═══════════════════════════════════════════════════════════════════════════════\n'
    );
  });
});

// Note: Run benchmarks with: ENABLE_BENCHMARKS=true npm test -- tests/registry/benchmarks.test.ts
if (!ENABLE_BENCHMARKS) {
  describe('Benchmarks Skipped', () => {
    it('should show how to enable benchmarks', () => {
      console.log(
        '\n💡 To run benchmarks, use: ENABLE_BENCHMARKS=true npm test -- tests/registry/benchmarks.test.ts\n'
      );
    });
  });
}
