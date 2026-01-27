/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — Phase 1.2 Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive integration tests for Phase 1.2 features:
 * - State machine implementation
 * - Team edge case handling
 * - Snapshot/restore functionality
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createStateMachine,
  type StateMachineSnapshot,
} from '../src/runtime/state-machine';
import {
  createTeamProcessor,
  createTeamValidator,
  type TeamProcessingOptions,
} from '../src/runtime/team-edge-cases';
import {
  createSnapshotManager,
  createRestoreManager,
  type RuntimeSnapshot,
} from '../src/runtime/snapshot';
import {
  createRuntime,
  createPersona,
  createTeam,
  type PersonaConfig,
  type Message,
} from '../src/runtime/index';
import { MockProvider } from '../src/runtime/providers/mock';

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATE MACHINE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('State Machine Integration', () => {
  it('should create and execute a simple state machine', async () => {
    const machine = createStateMachine<{ count: number }, string>()
      .withInitialState('idle')
      .addStates('processing', 'completed', 'failed')
      .withContext({ count: 0 })
      .on('start', 'idle', 'processing')
      .on('complete', 'processing', 'completed')
      .on('fail', 'processing', 'failed')
      .build();

    expect(machine.getCurrentStateName()).toBe('idle');
    expect(machine.canTransition('start')).toBe(true);

    const result1 = await machine.transition('start');
    expect(result1.ok).toBe(true);
    expect(machine.getCurrentStateName()).toBe('processing');

    const result2 = await machine.transition('complete');
    expect(result2.ok).toBe(true);
    expect(machine.getCurrentStateName()).toBe('completed');
  });

  it('should handle guarded transitions', async () => {
    const machine = createStateMachine<{ attempts: number }, string>()
      .withInitialState('ready')
      .addStates('processing', 'retry', 'failed')
      .withContext({ attempts: 0 })
      .onWhen('start', 'ready', 'processing', (ctx) => ctx.attempts < 3)
      .onWhen('retry', 'processing', 'retry', (ctx) => ctx.attempts < 3)
      .onWhen('fail', 'processing', 'failed', (ctx) => ctx.attempts >= 3)
      .build();

    // Should allow transition with attempts < 3
    expect(machine.canTransition('start')).toBe(true);
    await machine.transition('start');

    // Should not allow retry when attempts >= 3
    const context = machine.getContext();
    context.attempts = 3;
    expect(machine.canTransition('retry')).toBe(false);
  });

  it('should execute actions on transitions', async () => {
    let actionExecuted = false;

    const machine = createStateMachine<{ value: number }, string>()
      .withInitialState('idle')
      .addStates('processing')
      .withContext({ value: 0 })
      .onDo('start', 'idle', 'processing', (ctx) => {
        actionExecuted = true;
        return { value: ctx.value + 1 };
      })
      .build();

    await machine.transition('start');

    expect(actionExecuted).toBe(true);
    expect(machine.getContext().value).toBe(1);
  });

  it('should track state history', async () => {
    const machine = createStateMachine<object, string>()
      .withInitialState('a')
      .addStates('b', 'c')
      .on('next', 'a', 'b')
      .on('next', 'b', 'c')
      .build();

    await machine.transition('next');
    await machine.transition('next');

    const history = machine.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].from).toBe('a');
    expect(history[0].to).toBe('b');
    expect(history[1].from).toBe('b');
    expect(history[1].to).toBe('c');
  });

  it('should snapshot and restore state machine', async () => {
    const machine = createStateMachine<{ count: number }, string>()
      .withInitialState('idle')
      .addStates('processing', 'completed')
      .withContext({ count: 0 })
      .on('start', 'idle', 'processing')
      .on('complete', 'processing', 'completed')
      .build();

    // Transition to processing
    await machine.transition('start');
    const contextBefore = machine.getContext();
    contextBefore.count = 42;

    // Create snapshot
    const snapshot = machine.snapshot();
    expect(snapshot.currentState).toBe('processing');
    expect(snapshot.context.count).toBe(42);

    // Transition to completed
    await machine.transition('complete');
    expect(machine.getCurrentStateName()).toBe('completed');

    // Restore snapshot
    const restoreResult = machine.restore(snapshot);
    expect(restoreResult.ok).toBe(true);
    expect(machine.getCurrentStateName()).toBe('processing');
    expect(machine.getContext().count).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM EDGE CASES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Team Edge Case Handling', () => {
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockProvider = new MockProvider();
  });

  it('should handle empty team', async () => {
    const processor = createTeamProcessor();
    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'test',
      metadata: {},
      timestamp: new Date(),
    };

    const result = await processor.processWithRetry(message, [], {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('no members');
    }
  });

  it('should handle timeout gracefully', async () => {
    const processor = createTeamProcessor();

    // Create a persona that takes too long
    const slowPersona = createPersona(
      'slow',
      'Slow Persona',
      { intent: 'Be very slow' },
      mockProvider
    );

    // Mock the process method to be slow
    vi.spyOn(slowPersona, 'process').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                id: '1',
                personaId: 'slow',
                content: 'Too late!',
                confidence: 0.5,
                metadata: {},
                timestamp: new Date(),
              }),
            2000 // 2 seconds
          );
        })
    );

    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'test',
      metadata: {},
      timestamp: new Date(),
    };

    const result = await processor.processWithRetry(message, [slowPersona], {
      timeout: 100, // 100ms timeout
      quorum: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Quorum not met');
    }
  });

  it('should meet quorum with partial responses', async () => {
    const processor = createTeamProcessor();

    const persona1 = createPersona(
      'p1',
      'Persona 1',
      { intent: 'Test' },
      mockProvider
    );
    const persona2 = createPersona(
      'p2',
      'Persona 2',
      { intent: 'Test' },
      mockProvider
    );
    const persona3 = createPersona(
      'p3',
      'Persona 3',
      { intent: 'Test' },
      mockProvider
    );

    // Make persona3 fail
    vi.spyOn(persona3, 'process').mockRejectedValue(
      new Error('Simulated failure')
    );

    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'test',
      metadata: {},
      timestamp: new Date(),
    };

    const result = await processor.processWithRetry(
      message,
      [persona1, persona2, persona3],
      {
        quorum: 2, // Only need 2 out of 3
        timeout: 5000,
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.quorumMet).toBe(true);
      expect(result.value.responses.length).toBe(2);
      expect(result.value.failures.length).toBe(1);
    }
  });

  it('should retry on failure', async () => {
    const processor = createTeamProcessor();

    const persona = createPersona(
      'p1',
      'Persona 1',
      { intent: 'Test' },
      mockProvider
    );

    let attempts = 0;
    vi.spyOn(persona, 'process').mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Temporary failure'));
      }
      return Promise.resolve({
        id: '1',
        personaId: 'p1',
        content: 'Success after retries!',
        confidence: 0.9,
        metadata: {},
        timestamp: new Date(),
      });
    });

    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'test',
      metadata: {},
      timestamp: new Date(),
    };

    const result = await processor.processWithRetry(message, [persona], {
      maxRetries: 3,
      retryDelay: 10,
      timeout: 5000,
    });

    expect(result.ok).toBe(true);
    expect(attempts).toBe(3);
    if (result.ok) {
      expect(result.value.responses.length).toBe(1);
      expect(result.value.responses[0].content).toBe('Success after retries!');
    }
  });

  it('should validate team members', () => {
    const validator = createTeamValidator();

    // Empty members
    const result1 = validator.validateMembers([]);
    expect(result1.ok).toBe(false);

    // Duplicate member IDs
    const persona1 = createPersona('p1', 'Persona 1', {}, mockProvider);
    const persona2 = createPersona(
      'p1',
      'Persona 1 Duplicate',
      {},
      mockProvider
    ); // Same ID

    const result2 = validator.validateMembers([persona1, persona2]);
    expect(result2.ok).toBe(false);
  });

  it('should validate processing options', () => {
    const validator = createTeamValidator();

    // Invalid timeout
    const result1 = validator.validateOptions({ timeout: -1 }, 3);
    expect(result1.ok).toBe(false);

    // Invalid quorum (too high)
    const result2 = validator.validateOptions({ quorum: 5 }, 3);
    expect(result2.ok).toBe(false);

    // Invalid quorum (too low)
    const result3 = validator.validateOptions({ quorum: 0 }, 3);
    expect(result3.ok).toBe(false);

    // Valid options
    const result4 = validator.validateOptions({ quorum: 2, timeout: 1000 }, 3);
    expect(result4.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              SNAPSHOT/RESTORE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Snapshot and Restore', () => {
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockProvider = new MockProvider();
  });

  it('should create and restore runtime snapshot', () => {
    const snapshotManager = createSnapshotManager();

    // Create mock state
    const personaStates = new Map();
    personaStates.set('p1', {
      id: 'p1',
      name: 'Persona 1',
      active: true,
      config: {
        intent: 'Test',
        tone: 'formal',
        depth: 'standard',
        verbosity: 'normal',
        outputFormat: 'prose',
        maxTokens: 4096,
        temperature: 0.7,
        skills: [],
        constraints: [],
        tags: [],
      },
      memory: {
        shortTerm: [],
        context: new Map(),
        facts: new Map(),
      },
      stats: {
        messagesProcessed: 0,
        tokensUsed: 0,
        activationCount: 0,
        lastActive: null,
        averageResponseTime: 0,
      },
    });

    const teamStates = new Map();
    const workflowStates = new Map();

    const snapshotResult = snapshotManager.createSnapshot(
      personaStates,
      teamStates,
      workflowStates
    );

    expect(snapshotResult.ok).toBe(true);
    if (snapshotResult.ok) {
      const snapshot = snapshotResult.value;
      expect(snapshot.personas.length).toBe(1);
      expect(snapshot.personas[0].state.id).toBe('p1');
      expect(snapshot.teams.length).toBe(0);
      expect(snapshot.workflows.length).toBe(0);
    }
  });

  it('should serialize and deserialize snapshots', () => {
    const snapshotManager = createSnapshotManager();

    const personaStates = new Map();
    personaStates.set('p1', {
      id: 'p1',
      name: 'Test',
      active: true,
      config: {
        intent: 'Test',
        tone: 'formal',
        depth: 'standard',
        verbosity: 'normal',
        outputFormat: 'prose',
        maxTokens: 4096,
        temperature: 0.7,
        skills: [],
        constraints: [],
        tags: [],
      },
      memory: {
        shortTerm: [],
        context: new Map(),
        facts: new Map(),
      },
      stats: {
        messagesProcessed: 0,
        tokensUsed: 0,
        activationCount: 0,
        lastActive: null,
        averageResponseTime: 0,
      },
    });

    const snapshotResult = snapshotManager.createSnapshot(
      personaStates,
      new Map(),
      new Map()
    );

    expect(snapshotResult.ok).toBe(true);
    if (!snapshotResult.ok) return;

    const snapshot = snapshotResult.value;

    // Serialize
    const jsonResult = snapshotManager.serializeSnapshot(snapshot);
    expect(jsonResult.ok).toBe(true);
    if (!jsonResult.ok) return;

    const json = jsonResult.value;
    expect(typeof json).toBe('string');

    // Deserialize
    const deserializeResult = snapshotManager.deserializeSnapshot(json);
    expect(deserializeResult.ok).toBe(true);
    if (!deserializeResult.ok) return;

    const restored = deserializeResult.value;
    expect(restored.personas.length).toBe(1);
    expect(restored.personas[0].state.id).toBe('p1');
  });

  it('should create incremental snapshots', () => {
    const snapshotManager = createSnapshotManager();

    // Create base snapshot
    const personas1 = new Map();
    personas1.set('p1', {
      id: 'p1',
      name: 'Persona 1',
      active: true,
      config: {
        intent: '',
        tone: 'formal',
        depth: 'standard',
        verbosity: 'normal',
        outputFormat: 'prose',
        maxTokens: 4096,
        temperature: 0.7,
        skills: [],
        constraints: [],
        tags: [],
      },
      memory: {
        shortTerm: [],
        context: new Map(),
        facts: new Map(),
      },
      stats: {
        messagesProcessed: 0,
        tokensUsed: 0,
        activationCount: 0,
        lastActive: null,
        averageResponseTime: 0,
      },
    });

    const snapshot1Result = snapshotManager.createSnapshot(
      personas1,
      new Map(),
      new Map()
    );
    expect(snapshot1Result.ok).toBe(true);
    if (!snapshot1Result.ok) return;
    const snapshot1 = snapshot1Result.value;

    // Create new snapshot with additional persona
    const personas2 = new Map(personas1);
    personas2.set('p2', {
      id: 'p2',
      name: 'Persona 2',
      active: true,
      config: {
        intent: '',
        tone: 'formal',
        depth: 'standard',
        verbosity: 'normal',
        outputFormat: 'prose',
        maxTokens: 4096,
        temperature: 0.7,
        skills: [],
        constraints: [],
        tags: [],
      },
      memory: {
        shortTerm: [],
        context: new Map(),
        facts: new Map(),
      },
      stats: {
        messagesProcessed: 0,
        tokensUsed: 0,
        activationCount: 0,
        lastActive: null,
        averageResponseTime: 0,
      },
    });

    const snapshot2Result = snapshotManager.createSnapshot(
      personas2,
      new Map(),
      new Map()
    );
    expect(snapshot2Result.ok).toBe(true);
    if (!snapshot2Result.ok) return;
    const snapshot2 = snapshot2Result.value;

    // Create incremental
    const incremental = snapshotManager.createIncrementalSnapshot(
      snapshot1,
      snapshot2
    );

    expect(incremental.personas.length).toBe(1); // Only p2 is new
    expect(incremental.personas[0].state.id).toBe('p2');
  });

  it('should merge snapshots', () => {
    const snapshotManager = createSnapshotManager();

    const personas1 = new Map();
    personas1.set('p1', {
      id: 'p1',
      name: 'Persona 1',
      active: true,
      config: {
        intent: '',
        tone: 'formal',
        depth: 'standard',
        verbosity: 'normal',
        outputFormat: 'prose',
        maxTokens: 4096,
        temperature: 0.7,
        skills: [],
        constraints: [],
        tags: [],
      },
      memory: {
        shortTerm: [],
        context: new Map(),
        facts: new Map(),
      },
      stats: {
        messagesProcessed: 0,
        tokensUsed: 0,
        activationCount: 0,
        lastActive: null,
        averageResponseTime: 0,
      },
    });

    const snapshot1Result = snapshotManager.createSnapshot(
      personas1,
      new Map(),
      new Map()
    );
    expect(snapshot1Result.ok).toBe(true);
    if (!snapshot1Result.ok) return;
    const snapshot1 = snapshot1Result.value;

    const personas2 = new Map();
    personas2.set('p2', {
      id: 'p2',
      name: 'Persona 2',
      active: true,
      config: {
        intent: '',
        tone: 'formal',
        depth: 'standard',
        verbosity: 'normal',
        outputFormat: 'prose',
        maxTokens: 4096,
        temperature: 0.7,
        skills: [],
        constraints: [],
        tags: [],
      },
      memory: {
        shortTerm: [],
        context: new Map(),
        facts: new Map(),
      },
      stats: {
        messagesProcessed: 0,
        tokensUsed: 0,
        activationCount: 0,
        lastActive: null,
        averageResponseTime: 0,
      },
    });

    const snapshot2Result = snapshotManager.createSnapshot(
      personas2,
      new Map(),
      new Map()
    );
    expect(snapshot2Result.ok).toBe(true);
    if (!snapshot2Result.ok) return;
    const snapshot2 = snapshot2Result.value;

    // Merge
    const merged = snapshotManager.mergeSnapshots(snapshot1, snapshot2);

    expect(merged.personas.length).toBe(2); // Both personas
    expect(merged.personas.some((p) => p.state.id === 'p1')).toBe(true);
    expect(merged.personas.some((p) => p.state.id === 'p2')).toBe(true);
  });

  it('should restore personas from snapshot', () => {
    const restoreManager = createRestoreManager();

    const snapshot: RuntimeSnapshot = {
      version: '1.0.0',
      timestamp: new Date(),
      personas: [
        {
          state: {
            id: 'p1',
            name: 'Persona 1',
            active: true,
            config: {
              intent: '',
              tone: 'formal',
              depth: 'standard',
              verbosity: 'normal',
              outputFormat: 'prose',
              maxTokens: 4096,
              temperature: 0.7,
              skills: [],
              constraints: [],
              tags: [],
            },
            memory: {
              shortTerm: [],
              context: new Map(),
              facts: new Map(),
            },
            stats: {
              messagesProcessed: 0,
              tokensUsed: 0,
              activationCount: 0,
              lastActive: null,
              averageResponseTime: 0,
            },
          },
          shortTermMemory: [],
          contextData: {},
          factsData: {},
        },
      ],
      teams: [],
      workflows: [],
      metadata: {},
    };

    const result = restoreManager.restorePersonas(snapshot);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const personas = result.value;
      expect(personas.size).toBe(1);
      expect(personas.has('p1')).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              END-TO-END TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 1.2 End-to-End Integration', () => {
  it('should integrate all Phase 1.2 features', async () => {
    // 1. Create state machine for workflow control
    const workflowStateMachine = createStateMachine<{ step: number }, string>()
      .withInitialState('init')
      .addStates('processing', 'completed')
      .withContext({ step: 0 })
      .on('start', 'init', 'processing')
      .on('complete', 'processing', 'completed')
      .build();

    // 2. Create team with edge case handling
    const mockProvider = new MockProvider();
    const persona1 = createPersona(
      'p1',
      'Persona 1',
      { intent: 'Test' },
      mockProvider
    );
    const persona2 = createPersona(
      'p2',
      'Persona 2',
      { intent: 'Test' },
      mockProvider
    );

    const processor = createTeamProcessor();
    const message: Message = {
      id: '1',
      from: null,
      to: null,
      content: 'Test message',
      metadata: {},
      timestamp: new Date(),
    };

    // 3. Process with team
    await workflowStateMachine.transition('start');
    expect(workflowStateMachine.getCurrentStateName()).toBe('processing');

    const teamResult = await processor.processWithRetry(
      message,
      [persona1, persona2],
      {
        quorum: 2,
        timeout: 5000,
      }
    );

    expect(teamResult.ok).toBe(true);
    if (!teamResult.ok) return;
    expect(teamResult.value.quorumMet).toBe(true);

    await workflowStateMachine.transition('complete');
    expect(workflowStateMachine.getCurrentStateName()).toBe('completed');

    // 4. Create snapshot of final state
    const snapshotManager = createSnapshotManager();
    const personaStates = new Map();
    personaStates.set('p1', persona1.getState());
    personaStates.set('p2', persona2.getState());

    const snapshotResult = snapshotManager.createSnapshot(
      personaStates,
      new Map(),
      new Map()
    );

    expect(snapshotResult.ok).toBe(true);
    if (!snapshotResult.ok) return;

    const snapshot = snapshotResult.value;
    expect(snapshot.personas.length).toBe(2);

    // 5. Serialize and verify
    const jsonResult = snapshotManager.serializeSnapshot(snapshot);
    expect(jsonResult.ok).toBe(true);
  });
});
