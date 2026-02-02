/**
 * Snapshot Manager Unit Tests
 *
 * Focused unit tests to increase coverage from 77.54% to 85%+
 * Covers error paths, edge cases, and option combinations
 */

import {
  createSnapshotManager,
  createRestoreManager,
  type RuntimeSnapshot,
} from '../../src/runtime/snapshot';
import type {
  PersonaState,
  TeamState,
  WorkflowState,
} from '../../src/runtime/runtime-types';

describe('SnapshotManager - Unit Tests', () => {
  let snapshotManager: ReturnType<typeof createSnapshotManager>;

  beforeEach(() => {
    snapshotManager = createSnapshotManager();
  });

  describe('Snapshot Creation Options', () => {
    it('should create snapshot with personas only', () => {
      const personas = new Map<string, PersonaState>();
      personas.set('test-persona', createMockPersonaState('test-persona'));

      const result = snapshotManager.createSnapshot(
        personas,
        new Map(),
        new Map(),
        { includePersonas: true, includeTeams: false, includeWorkflows: false }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.personas.length).toBe(1);
        expect(result.value.teams.length).toBe(0);
        expect(result.value.workflows.length).toBe(0);
      }
    });

    it('should create snapshot with teams only', () => {
      const teams = new Map<string, TeamState>();
      teams.set('test-team', createMockTeamState('test-team'));

      const result = snapshotManager.createSnapshot(
        new Map(),
        teams,
        new Map(),
        { includePersonas: false, includeTeams: true, includeWorkflows: false }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.personas.length).toBe(0);
        expect(result.value.teams.length).toBe(1);
        expect(result.value.workflows.length).toBe(0);
      }
    });

    it('should create snapshot with workflows only', () => {
      const workflows = new Map<string, WorkflowState>();
      workflows.set('test-workflow', createMockWorkflowState('test-workflow'));

      const result = snapshotManager.createSnapshot(
        new Map(),
        new Map(),
        workflows,
        { includePersonas: false, includeTeams: false, includeWorkflows: true }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.personas.length).toBe(0);
        expect(result.value.teams.length).toBe(0);
        expect(result.value.workflows.length).toBe(1);
      }
    });

    it('should exclude memory when includeMemory is false', () => {
      const personas = new Map<string, PersonaState>();
      const personaState = createMockPersonaState('test');
      personaState.memory.shortTerm.push(createMockMessage('test message'));
      personas.set('test', personaState);

      const result = snapshotManager.createSnapshot(
        personas,
        new Map(),
        new Map(),
        { includeMemory: false }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.personas[0].shortTermMemory.length).toBe(0);
        expect(Object.keys(result.value.personas[0].contextData).length).toBe(
          0
        );
        expect(Object.keys(result.value.personas[0].factsData).length).toBe(0);
      }
    });

    it('should include custom metadata', () => {
      const metadata = {
        createdBy: 'test-user',
        description: 'Test snapshot',
        tags: ['test', 'unit'],
      };

      const result = snapshotManager.createSnapshot(
        new Map(),
        new Map(),
        new Map(),
        { metadata }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.metadata.createdBy).toBe('test-user');
        expect(result.value.metadata.description).toBe('Test snapshot');
        expect(result.value.metadata.tags).toEqual(['test', 'unit']);
      }
    });

    it('should handle compress option', () => {
      const result = snapshotManager.createSnapshot(
        new Map(),
        new Map(),
        new Map(),
        { compress: true }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.metadata.compressed).toBe(true);
      }
    });
  });

  describe('Empty State Handling', () => {
    it('should create snapshot with all empty maps', () => {
      const result = snapshotManager.createSnapshot(
        new Map(),
        new Map(),
        new Map()
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.personas.length).toBe(0);
        expect(result.value.teams.length).toBe(0);
        expect(result.value.workflows.length).toBe(0);
        expect(result.value.version).toBeDefined();
        expect(result.value.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should handle empty persona state', () => {
      const personas = new Map<string, PersonaState>();
      personas.set('empty', {
        id: 'empty',
        memory: {
          shortTerm: [],
          context: new Map(),
          facts: new Map(),
        },
      } as PersonaState);

      const result = snapshotManager.createSnapshot(
        personas,
        new Map(),
        new Map()
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.personas.length).toBe(1);
        expect(result.value.personas[0].shortTermMemory.length).toBe(0);
      }
    });
  });

  describe('Snapshot Storage', () => {
    it('should save snapshot', () => {
      const snapshot: RuntimeSnapshot = createMockSnapshot();
      snapshotManager.saveSnapshot('test-id', snapshot);

      const loaded = snapshotManager.loadSnapshot('test-id');
      expect(loaded).toEqual(snapshot);
    });

    it('should return undefined for non-existent snapshot', () => {
      const result = snapshotManager.loadSnapshot('non-existent');
      expect(result).toBeUndefined();
    });

    it('should list all snapshot IDs', () => {
      snapshotManager.saveSnapshot('snap1', createMockSnapshot());
      snapshotManager.saveSnapshot('snap2', createMockSnapshot());

      const ids = snapshotManager.listSnapshots();

      expect(ids).toContain('snap1');
      expect(ids).toContain('snap2');
      expect(ids.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete snapshot', () => {
      snapshotManager.saveSnapshot('to-delete', createMockSnapshot());

      const deleteResult = snapshotManager.deleteSnapshot('to-delete');
      expect(deleteResult).toBe(true);

      const loaded = snapshotManager.loadSnapshot('to-delete');
      expect(loaded).toBeUndefined();
    });

    it('should return false when deleting non-existent snapshot', () => {
      const result = snapshotManager.deleteSnapshot('non-existent');
      expect(result).toBe(false);
    });

    it('should clear all snapshots', () => {
      snapshotManager.saveSnapshot('snap1', createMockSnapshot());
      snapshotManager.saveSnapshot('snap2', createMockSnapshot());

      snapshotManager.clearSnapshots();

      const ids = snapshotManager.listSnapshots();
      expect(ids.length).toBe(0);
    });
  });

  describe('Snapshot Serialization', () => {
    it('should serialize snapshot to JSON', () => {
      const snapshot = createMockSnapshot();

      const result = snapshotManager.serializeSnapshot(snapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.value).toBe('string');
        expect(() => JSON.parse(result.value)).not.toThrow();
      }
    });

    it('should deserialize JSON to snapshot', () => {
      const snapshot = createMockSnapshot();
      const serializeResult = snapshotManager.serializeSnapshot(snapshot);

      expect(serializeResult.ok).toBe(true);
      if (serializeResult.ok) {
        const deserializeResult = snapshotManager.deserializeSnapshot(
          serializeResult.value
        );

        expect(deserializeResult.ok).toBe(true);
        if (deserializeResult.ok) {
          expect(deserializeResult.value.version).toBe(snapshot.version);
          expect(deserializeResult.value.personas.length).toBe(
            snapshot.personas.length
          );
        }
      }
    });

    it('should handle invalid JSON during deserialization', () => {
      const result = snapshotManager.deserializeSnapshot('invalid json');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/parse|JSON/i);
      }
    });

    it('should handle malformed snapshot data', () => {
      const result = snapshotManager.deserializeSnapshot('{"version":"1.0.0"}');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(
          /missing|timestamp|personas|teams|workflows/i
        );
      }
    });

    it('should validate snapshot structure', () => {
      const validSnapshot = createMockSnapshot();
      const result = snapshotManager.validateSnapshot(validSnapshot);

      expect(result.ok).toBe(true);
    });

    it('should reject snapshot with missing version', () => {
      const invalidSnapshot = {
        ...createMockSnapshot(),
        version: undefined as any,
      };
      const result = snapshotManager.validateSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
    });

    it('should reject snapshot with wrong version', () => {
      const invalidSnapshot = { ...createMockSnapshot(), version: '999.0.0' };
      const result = snapshotManager.validateSnapshot(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('version mismatch');
      }
    });
  });
});

describe('RestoreManager - Unit Tests', () => {
  let restoreManager: ReturnType<typeof createRestoreManager>;

  beforeEach(() => {
    restoreManager = createRestoreManager();
  });

  describe('Persona Restoration', () => {
    it('should restore personas from snapshot', () => {
      const snapshot = createMockSnapshotWithPersonas();

      const result = restoreManager.restorePersonas(snapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBeGreaterThan(0);
      }
    });

    it('should skip validation when skipValidation is true', () => {
      const snapshot = createMockSnapshot();

      const result = restoreManager.restorePersonas(snapshot, {
        skipValidation: true,
      });

      expect(result.ok).toBe(true);
    });

    it('should handle invalid personas array', () => {
      const invalidSnapshot = {
        ...createMockSnapshot(),
        personas: 'not an array' as any,
      };

      const result = restoreManager.restorePersonas(invalidSnapshot);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/personas.*array/i);
      }
    });
  });

  describe('Team Restoration', () => {
    it('should restore teams from snapshot', () => {
      const snapshot = createMockSnapshotWithTeams();

      const result = restoreManager.restoreTeams(snapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBeGreaterThan(0);
      }
    });

    it('should handle invalid teams array', () => {
      const invalidSnapshot = {
        ...createMockSnapshot(),
        teams: null as any,
      };

      const result = restoreManager.restoreTeams(invalidSnapshot);

      expect(result.ok).toBe(false);
    });
  });

  describe('Workflow Restoration', () => {
    it('should restore workflows from snapshot', () => {
      const snapshot = createMockSnapshotWithWorkflows();

      const result = restoreManager.restoreWorkflows(snapshot);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBeGreaterThan(0);
      }
    });

    it('should handle invalid workflows array', () => {
      const invalidSnapshot = {
        ...createMockSnapshot(),
        workflows: undefined as any,
      };

      const result = restoreManager.restoreWorkflows(invalidSnapshot);

      expect(result.ok).toBe(false);
    });
  });
});

// Helper functions

function createMockPersonaState(id: string): PersonaState {
  return {
    id,
    memory: {
      shortTerm: [],
      context: new Map(),
      facts: new Map(),
    },
  } as PersonaState;
}

function createMockTeamState(id: string): TeamState {
  return {
    id,
    members: [],
  } as TeamState;
}

function createMockWorkflowState(id: string): WorkflowState {
  return {
    id,
    currentStep: 0,
    context: {},
  } as WorkflowState;
}

function createMockMessage(content: string) {
  return {
    id: crypto.randomUUID(),
    role: 'user' as const,
    content,
    timestamp: new Date(),
  };
}

function createMockSnapshot(): RuntimeSnapshot {
  return {
    version: '1.0.0',
    timestamp: new Date(),
    personas: [],
    teams: [],
    workflows: [],
    metadata: {},
  };
}

function createMockSnapshotWithPersonas(): RuntimeSnapshot {
  return {
    version: '1.0.0',
    timestamp: new Date(),
    personas: [
      {
        state: createMockPersonaState('persona-1'),
        shortTermMemory: [],
        contextData: {},
        factsData: {},
      },
    ],
    teams: [],
    workflows: [],
    metadata: {},
  };
}

function createMockSnapshotWithTeams(): RuntimeSnapshot {
  return {
    version: '1.0.0',
    timestamp: new Date(),
    personas: [],
    teams: [
      {
        state: createMockTeamState('team-1'),
        memberIds: ['persona-1', 'persona-2'],
      },
    ],
    workflows: [],
    metadata: {},
  };
}

function createMockSnapshotWithWorkflows(): RuntimeSnapshot {
  return {
    version: '1.0.0',
    timestamp: new Date(),
    personas: [],
    teams: [],
    workflows: [
      {
        state: createMockWorkflowState('workflow-1'),
        context: {},
      },
    ],
    metadata: {},
  };
}
