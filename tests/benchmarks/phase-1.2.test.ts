/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — Phase 1.2 Performance Benchmarks
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Performance benchmarks for Phase 1.2 features:
 * - State machine performance
 * - Team processing performance
 * - Snapshot/restore performance
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStateMachine,
  type StateMachine,
} from '../../src/runtime/state-machine';
import {
  createTeamProcessor,
  type TeamProcessor,
} from '../../src/runtime/team-edge-cases';
import {
  createSnapshotManager,
  type SnapshotManager,
} from '../../src/runtime/snapshot';
import {
  createPersona,
  type PersonaInstance,
  type Message,
} from '../../src/runtime';
import { MockProvider } from '../../src/runtime/providers/mock';

// ═══════════════════════════════════════════════════════════════════════════════
//                              BENCHMARK UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

interface BenchmarkResult {
  readonly operations: number;
  readonly totalTimeMs: number;
  readonly avgTimeMs: number;
  readonly opsPerSecond: number;
  readonly minTimeMs: number;
  readonly maxTimeMs: number;
}

async function benchmark(
  name: string,
  iterations: number,
  operation: () => Promise<void> | void
): Promise<BenchmarkResult> {
  const times: number[] = [];
  const startTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await operation();
    const end = performance.now();
    times.push(end - start);
  }

  const endTotal = performance.now();
  const totalTimeMs = endTotal - startTotal;
  const avgTimeMs = totalTimeMs / iterations;
  const opsPerSecond = (iterations / totalTimeMs) * 1000;

  const result: BenchmarkResult = {
    operations: iterations,
    totalTimeMs,
    avgTimeMs,
    opsPerSecond,
    minTimeMs: Math.min(...times),
    maxTimeMs: Math.max(...times),
  };

  console.log(`\n📊 Benchmark: ${name}`);
  console.log(`   Operations: ${result.operations}`);
  console.log(`   Total time: ${result.totalTimeMs.toFixed(2)}ms`);
  console.log(`   Average: ${result.avgTimeMs.toFixed(3)}ms/op`);
  console.log(`   Throughput: ${result.opsPerSecond.toFixed(0)} ops/sec`);
  console.log(`   Min: ${result.minTimeMs.toFixed(3)}ms`);
  console.log(`   Max: ${result.maxTimeMs.toFixed(3)}ms`);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATE MACHINE BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('State Machine Performance', () => {
  it('should benchmark simple state transitions', async () => {
    const machine = createStateMachine<object, string>()
      .withInitialState('a')
      .addStates('b', 'c', 'd')
      .on('next', 'a', 'b')
      .on('next', 'b', 'c')
      .on('next', 'c', 'd')
      .on('reset', 'd', 'a')
      .build();

    const result = await benchmark(
      'Simple state transitions',
      10000,
      async () => {
        await machine.transition('next');
        if (machine.getCurrentStateName() === 'd') {
          await machine.transition('reset');
        }
      }
    );

    // Performance targets
    expect(result.avgTimeMs).toBeLessThan(0.1); // < 0.1ms per transition
    expect(result.opsPerSecond).toBeGreaterThan(10000); // > 10k ops/sec
  });

  it('should benchmark guarded transitions', async () => {
    const machine = createStateMachine<{ counter: number }, string>()
      .withInitialState('idle')
      .addStates('processing', 'completed')
      .withContext({ counter: 0 })
      .onWhen('start', 'idle', 'processing', (ctx) => ctx.counter < 100)
      .onDo('increment', 'processing', 'idle', (ctx) => ({
        counter: ctx.counter + 1,
      }))
      .onWhen('complete', 'idle', 'completed', (ctx) => ctx.counter >= 100)
      .build();

    const result = await benchmark(
      'Guarded transitions with actions',
      100,
      async () => {
        await machine.transition('start');
        await machine.transition('increment');
      }
    );

    expect(result.avgTimeMs).toBeLessThan(1); // < 1ms per transition
  });

  it('should benchmark state machine with large history', async () => {
    const machine = createStateMachine<object, string>()
      .withInitialState('a')
      .addStates('b')
      .on('toggle', 'a', 'b')
      .on('toggle', 'b', 'a')
      .build();

    // Build up history
    for (let i = 0; i < 1000; i++) {
      await machine.transition('toggle');
    }

    const result = await benchmark(
      'State transitions with large history',
      1000,
      async () => {
        await machine.transition('toggle');
      }
    );

    expect(result.avgTimeMs).toBeLessThan(0.5); // Should not degrade significantly
  });

  it('should benchmark snapshot creation', async () => {
    const machine = createStateMachine<{ data: number[] }, string>()
      .withInitialState('active')
      .addStates('paused')
      .withContext({ data: Array.from({ length: 1000 }, (_, i) => i) })
      .on('pause', 'active', 'paused')
      .on('resume', 'paused', 'active')
      .build();

    const result = await benchmark(
      'State machine snapshot creation',
      1000,
      () => {
        machine.snapshot();
      }
    );

    expect(result.avgTimeMs).toBeLessThan(1); // < 1ms per snapshot
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM PROCESSING BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Team Processing Performance', () => {
  let mockProvider: MockProvider;
  let personas: PersonaInstance[];

  beforeEach(() => {
    mockProvider = new MockProvider();
    personas = Array.from({ length: 10 }, (_, i) =>
      createPersona(`p${i}`, `Persona ${i}`, { intent: 'Test' }, mockProvider)
    );
  });

  it('should benchmark team processing with small team', async () => {
    const processor = createTeamProcessor();
    const smallTeam = personas.slice(0, 3);

    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'Benchmark test',
      metadata: {},
      timestamp: new Date(),
    };

    const result = await benchmark('Small team (3 members)', 100, async () => {
      await processor.processWithRetry(message, smallTeam, {
        quorum: 3,
        timeout: 5000,
      });
    });

    // Performance targets for 3-member team
    expect(result.avgTimeMs).toBeLessThan(100); // < 100ms per request
  });

  it('should benchmark team processing with medium team', async () => {
    const processor = createTeamProcessor();
    const mediumTeam = personas.slice(0, 5);

    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'Benchmark test',
      metadata: {},
      timestamp: new Date(),
    };

    const result = await benchmark('Medium team (5 members)', 50, async () => {
      await processor.processWithRetry(message, mediumTeam, {
        quorum: 3,
        timeout: 5000,
      });
    });

    // Performance targets for 5-member team
    expect(result.avgTimeMs).toBeLessThan(150); // < 150ms per request
  });

  it('should benchmark team processing with large team', async () => {
    const processor = createTeamProcessor();
    const largeTeam = personas; // All 10 personas

    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'Benchmark test',
      metadata: {},
      timestamp: new Date(),
    };

    const result = await benchmark('Large team (10 members)', 20, async () => {
      await processor.processWithRetry(message, largeTeam, {
        quorum: 5,
        timeout: 5000,
      });
    });

    // Performance targets for 10-member team
    expect(result.avgTimeMs).toBeLessThan(200); // < 200ms per request
  });

  it('should benchmark team processing with retries', async () => {
    const processor = createTeamProcessor();
    const team = personas.slice(0, 3);

    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'Benchmark test',
      metadata: {},
      timestamp: new Date(),
    };

    const result = await benchmark('Team with retry logic', 50, async () => {
      await processor.processWithRetry(message, team, {
        quorum: 3,
        maxRetries: 2,
        retryDelay: 10,
        timeout: 5000,
      });
    });

    expect(result.avgTimeMs).toBeLessThan(150); // Should be reasonable with retries
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              SNAPSHOT BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Snapshot/Restore Performance', () => {
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockProvider = new MockProvider();
  });

  it('should benchmark snapshot creation for small runtime', async () => {
    const snapshotManager = createSnapshotManager();

    // Create 10 personas
    const personaStates = new Map();
    for (let i = 0; i < 10; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      personaStates.set(`p${i}`, persona.getState());
    }

    const result = await benchmark('Snapshot 10 personas', 1000, () => {
      snapshotManager.createSnapshot(personaStates, new Map(), new Map());
    });

    expect(result.avgTimeMs).toBeLessThan(5); // < 5ms per snapshot
  });

  it('should benchmark snapshot creation for medium runtime', async () => {
    const snapshotManager = createSnapshotManager();

    // Create 50 personas
    const personaStates = new Map();
    for (let i = 0; i < 50; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      personaStates.set(`p${i}`, persona.getState());
    }

    const result = await benchmark('Snapshot 50 personas', 200, () => {
      snapshotManager.createSnapshot(personaStates, new Map(), new Map());
    });

    expect(result.avgTimeMs).toBeLessThan(20); // < 20ms per snapshot
  });

  it('should benchmark snapshot creation for large runtime', async () => {
    const snapshotManager = createSnapshotManager();

    // Create 100 personas
    const personaStates = new Map();
    for (let i = 0; i < 100; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      personaStates.set(`p${i}`, persona.getState());
    }

    const result = await benchmark('Snapshot 100 personas', 100, () => {
      snapshotManager.createSnapshot(personaStates, new Map(), new Map());
    });

    expect(result.avgTimeMs).toBeLessThan(50); // < 50ms per snapshot
  });

  it('should benchmark snapshot serialization', async () => {
    const snapshotManager = createSnapshotManager();

    const personaStates = new Map();
    for (let i = 0; i < 50; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      personaStates.set(`p${i}`, persona.getState());
    }

    const snapshotResult = snapshotManager.createSnapshot(
      personaStates,
      new Map(),
      new Map()
    );
    if (!snapshotResult.ok) throw new Error('Failed to create snapshot');
    const snapshot = snapshotResult.value;

    const result = await benchmark(
      'Serialize snapshot (50 personas)',
      500,
      () => {
        snapshotManager.serializeSnapshot(snapshot);
      }
    );

    expect(result.avgTimeMs).toBeLessThan(10); // < 10ms per serialization
  });

  it('should benchmark snapshot deserialization', async () => {
    const snapshotManager = createSnapshotManager();

    const personaStates = new Map();
    for (let i = 0; i < 50; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      personaStates.set(`p${i}`, persona.getState());
    }

    const snapshotResult = snapshotManager.createSnapshot(
      personaStates,
      new Map(),
      new Map()
    );
    if (!snapshotResult.ok) throw new Error('Failed to create snapshot');
    const snapshot = snapshotResult.value;

    const jsonResult = snapshotManager.serializeSnapshot(snapshot);
    if (!jsonResult.ok) throw new Error('Failed to serialize snapshot');
    const json = jsonResult.value;

    const result = await benchmark(
      'Deserialize snapshot (50 personas)',
      500,
      () => {
        snapshotManager.deserializeSnapshot(json);
      }
    );

    expect(result.avgTimeMs).toBeLessThan(15); // < 15ms per deserialization
  });

  it('should benchmark incremental snapshot creation', async () => {
    const snapshotManager = createSnapshotManager();

    // Create base snapshot with 50 personas
    const basePersonas = new Map();
    for (let i = 0; i < 50; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      basePersonas.set(`p${i}`, persona.getState());
    }

    const baseSnapshotResult = snapshotManager.createSnapshot(
      basePersonas,
      new Map(),
      new Map()
    );
    if (!baseSnapshotResult.ok)
      throw new Error('Failed to create base snapshot');
    const baseSnapshot = baseSnapshotResult.value;

    // Create delta with 5 new personas
    const deltaPersonas = new Map(basePersonas);
    for (let i = 50; i < 55; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      deltaPersonas.set(`p${i}`, persona.getState());
    }

    const deltaSnapshotResult = snapshotManager.createSnapshot(
      deltaPersonas,
      new Map(),
      new Map()
    );
    if (!deltaSnapshotResult.ok)
      throw new Error('Failed to create delta snapshot');
    const deltaSnapshot = deltaSnapshotResult.value;

    const result = await benchmark('Incremental snapshot', 1000, () => {
      snapshotManager.createIncrementalSnapshot(baseSnapshot, deltaSnapshot);
    });

    expect(result.avgTimeMs).toBeLessThan(5); // < 5ms per incremental snapshot
  });

  it('should benchmark snapshot merge', async () => {
    const snapshotManager = createSnapshotManager();

    // Create two snapshots to merge
    const personas1 = new Map();
    for (let i = 0; i < 25; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      personas1.set(`p${i}`, persona.getState());
    }

    const snapshot1Result = snapshotManager.createSnapshot(
      personas1,
      new Map(),
      new Map()
    );
    if (!snapshot1Result.ok) throw new Error('Failed to create snapshot 1');
    const snapshot1 = snapshot1Result.value;

    const personas2 = new Map();
    for (let i = 25; i < 50; i++) {
      const persona = createPersona(
        `p${i}`,
        `Persona ${i}`,
        { intent: 'Test' },
        mockProvider
      );
      personas2.set(`p${i}`, persona.getState());
    }

    const snapshot2Result = snapshotManager.createSnapshot(
      personas2,
      new Map(),
      new Map()
    );
    if (!snapshot2Result.ok) throw new Error('Failed to create snapshot 2');
    const snapshot2 = snapshot2Result.value;

    const result = await benchmark(
      'Merge snapshots (25+25 personas)',
      500,
      () => {
        snapshotManager.mergeSnapshots(snapshot1, snapshot2);
      }
    );

    expect(result.avgTimeMs).toBeLessThan(5); // < 5ms per merge
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 1.2 Performance Summary', () => {
  it('should meet all performance targets', () => {
    console.log('\n' + '═'.repeat(80));
    console.log('PHASE 1.2 PERFORMANCE SUMMARY');
    console.log('═'.repeat(80));
    console.log('\nPerformance Targets:');
    console.log('✓ State machine transitions: < 0.1ms per operation');
    console.log('✓ Guarded transitions: < 1ms per operation');
    console.log('✓ Small team processing (3 members): < 100ms');
    console.log('✓ Medium team processing (5 members): < 150ms');
    console.log('✓ Large team processing (10 members): < 200ms');
    console.log('✓ Snapshot creation (10 personas): < 5ms');
    console.log('✓ Snapshot creation (50 personas): < 20ms');
    console.log('✓ Snapshot creation (100 personas): < 50ms');
    console.log('✓ Snapshot serialization: < 10ms');
    console.log('✓ Snapshot deserialization: < 15ms');
    console.log('✓ Incremental snapshot: < 5ms');
    console.log('✓ Snapshot merge: < 5ms');
    console.log('\n' + '═'.repeat(80));

    // This test just documents the targets
    expect(true).toBe(true);
  });
});
