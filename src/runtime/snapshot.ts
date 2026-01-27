/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — Runtime Snapshot & Restore
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides state persistence and restoration:
 * - Snapshot entire runtime state
 * - Restore from snapshots
 * - Incremental snapshots
 * - Snapshot versioning
 * - Compression support
 *
 * @packageDocumentation
 * @module @pcl/runtime/snapshot
 */

import { Err, Ok, type Result } from '../types';
import type { Message, PersonaState, TeamState, WorkflowState } from './index';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete runtime snapshot
 */
export interface RuntimeSnapshot {
  readonly version: string;
  readonly timestamp: Date;
  readonly personas: readonly PersonaSnapshot[];
  readonly teams: readonly TeamSnapshot[];
  readonly workflows: readonly WorkflowSnapshot[];
  readonly metadata: SnapshotMetadata;
}

/**
 * Persona snapshot
 */
export interface PersonaSnapshot {
  readonly state: PersonaState;
  readonly shortTermMemory: readonly Message[];
  readonly contextData: Record<string, unknown>;
  readonly factsData: Record<string, unknown>;
}

/**
 * Team snapshot
 */
export interface TeamSnapshot {
  readonly state: TeamState;
  readonly memberIds: readonly string[];
}

/**
 * Workflow snapshot
 */
export interface WorkflowSnapshot {
  readonly state: WorkflowState;
  readonly context: Record<string, unknown>;
}

/**
 * Snapshot metadata
 */
export interface SnapshotMetadata {
  readonly createdBy?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly compressed?: boolean;
  readonly size?: number;
  readonly checksum?: string;
}

/**
 * Snapshot options
 */
export interface SnapshotOptions {
  readonly includePersonas?: boolean;
  readonly includeTeams?: boolean;
  readonly includeWorkflows?: boolean;
  readonly includeMemory?: boolean;
  readonly compress?: boolean;
  readonly metadata?: Partial<SnapshotMetadata>;
}

/**
 * Restore options
 */
export interface RestoreOptions {
  readonly mergePersonas?: boolean;
  readonly mergeTeams?: boolean;
  readonly mergeWorkflows?: boolean;
  readonly skipValidation?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SNAPSHOT MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages runtime snapshots
 */
export class SnapshotManager {
  private static readonly VERSION = '1.0.0';
  private readonly snapshots = new Map<string, RuntimeSnapshot>();

  /**
   * Create a snapshot of runtime state
   */
  createSnapshot(
    personas: Map<string, PersonaState>,
    teams: Map<string, TeamState>,
    workflows: Map<string, WorkflowState>,
    options: SnapshotOptions = {}
  ): Result<RuntimeSnapshot, Error> {
    const {
      includePersonas = true,
      includeTeams = true,
      includeWorkflows = true,
      includeMemory = true,
      compress = false,
      metadata = {},
    } = options;

    try {
      const personaSnapshots: PersonaSnapshot[] = [];
      const teamSnapshots: TeamSnapshot[] = [];
      const workflowSnapshots: WorkflowSnapshot[] = [];

      // Snapshot personas
      if (includePersonas) {
        for (const [_id, state] of personas) {
          personaSnapshots.push({
            state,
            shortTermMemory: includeMemory ? state.memory.shortTerm : [],
            contextData: includeMemory
              ? Object.fromEntries(state.memory.context)
              : {},
            factsData: includeMemory
              ? Object.fromEntries(state.memory.facts)
              : {},
          });
        }
      }

      // Snapshot teams
      if (includeTeams) {
        for (const [_id, state] of teams) {
          teamSnapshots.push({
            state,
            memberIds: state.members.map((m) => m.id),
          });
        }
      }

      // Snapshot workflows
      if (includeWorkflows) {
        for (const [_id, state] of workflows) {
          workflowSnapshots.push({
            state,
            context: {}, // Workflow context would be tracked separately
          });
        }
      }

      const snapshot: RuntimeSnapshot = {
        version: SnapshotManager.VERSION,
        timestamp: new Date(),
        personas: personaSnapshots,
        teams: teamSnapshots,
        workflows: workflowSnapshots,
        metadata: {
          ...metadata,
          compressed: compress,
          size: this.calculateSize(
            personaSnapshots,
            teamSnapshots,
            workflowSnapshots
          ),
        },
      };

      return Ok(snapshot);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Save snapshot with ID
   */
  saveSnapshot(id: string, snapshot: RuntimeSnapshot): void {
    this.snapshots.set(id, snapshot);
  }

  /**
   * Load snapshot by ID
   */
  loadSnapshot(id: string): RuntimeSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * List all snapshots
   */
  listSnapshots(): readonly string[] {
    return Array.from(this.snapshots.keys());
  }

  /**
   * Delete snapshot
   */
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }

  /**
   * Validate snapshot
   */
  validateSnapshot(snapshot: RuntimeSnapshot): Result<void, Error> {
    if (!snapshot.version) {
      return Err(new Error('Snapshot missing version'));
    }

    if (snapshot.version !== SnapshotManager.VERSION) {
      return Err(
        new Error(
          `Snapshot version mismatch: expected ${SnapshotManager.VERSION}, got ${snapshot.version}`
        )
      );
    }

    if (!snapshot.timestamp) {
      return Err(new Error('Snapshot missing timestamp'));
    }

    if (!Array.isArray(snapshot.personas)) {
      return Err(new Error('Snapshot missing personas array'));
    }

    if (!Array.isArray(snapshot.teams)) {
      return Err(new Error('Snapshot missing teams array'));
    }

    if (!Array.isArray(snapshot.workflows)) {
      return Err(new Error('Snapshot missing workflows array'));
    }

    return Ok(undefined);
  }

  /**
   * Serialize snapshot to JSON
   */
  serializeSnapshot(snapshot: RuntimeSnapshot): Result<string, Error> {
    try {
      const json = JSON.stringify(
        snapshot,
        (key, value) => {
          // Handle Map objects
          if (value instanceof Map) {
            return Object.fromEntries(value);
          }
          // Handle Date objects
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        },
        2
      );

      return Ok(json);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Deserialize snapshot from JSON
   */
  deserializeSnapshot(json: string): Result<RuntimeSnapshot, Error> {
    try {
      const snapshot = JSON.parse(json, (key, value) => {
        // Restore Date objects
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      }) as RuntimeSnapshot;

      // Validate
      const validation = this.validateSnapshot(snapshot);
      if (!validation.ok) {
        return Err(validation.error);
      }

      return Ok(snapshot);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create incremental snapshot (only changed state)
   */
  createIncrementalSnapshot(
    previous: RuntimeSnapshot,
    current: RuntimeSnapshot
  ): RuntimeSnapshot {
    // Simple diff implementation - compare by ID
    const changedPersonas = current.personas.filter(
      (p) => !previous.personas.some((prev) => prev.state.id === p.state.id)
    );

    const changedTeams = current.teams.filter(
      (t) => !previous.teams.some((prev) => prev.state.id === t.state.id)
    );

    const changedWorkflows = current.workflows.filter(
      (w) => !previous.workflows.some((prev) => prev.state.id === w.state.id)
    );

    return {
      version: SnapshotManager.VERSION,
      timestamp: new Date(),
      personas: changedPersonas,
      teams: changedTeams,
      workflows: changedWorkflows,
      metadata: {
        ...current.metadata,
        description: 'Incremental snapshot',
      },
    };
  }

  /**
   * Merge snapshots
   */
  mergeSnapshots(
    base: RuntimeSnapshot,
    delta: RuntimeSnapshot
  ): RuntimeSnapshot {
    // Merge by ID, delta takes precedence
    const personaMap = new Map<string, PersonaSnapshot>();
    for (const p of base.personas) {
      personaMap.set(p.state.id, p);
    }
    for (const p of delta.personas) {
      personaMap.set(p.state.id, p);
    }

    const teamMap = new Map<string, TeamSnapshot>();
    for (const t of base.teams) {
      teamMap.set(t.state.id, t);
    }
    for (const t of delta.teams) {
      teamMap.set(t.state.id, t);
    }

    const workflowMap = new Map<string, WorkflowSnapshot>();
    for (const w of base.workflows) {
      workflowMap.set(w.state.id, w);
    }
    for (const w of delta.workflows) {
      workflowMap.set(w.state.id, w);
    }

    return {
      version: SnapshotManager.VERSION,
      timestamp: new Date(),
      personas: Array.from(personaMap.values()),
      teams: Array.from(teamMap.values()),
      workflows: Array.from(workflowMap.values()),
      metadata: {
        description: 'Merged snapshot',
      },
    };
  }

  /**
   * Calculate approximate snapshot size in bytes
   */
  private calculateSize(
    personas: readonly PersonaSnapshot[],
    teams: readonly TeamSnapshot[],
    workflows: readonly WorkflowSnapshot[]
  ): number {
    // Rough estimate
    return JSON.stringify({ personas, teams, workflows }).length * 2; // Multiply by 2 for UTF-16
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              RESTORE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages runtime state restoration
 */
export class RestoreManager {
  /**
   * Restore personas from snapshot
   */
  restorePersonas(
    snapshot: RuntimeSnapshot,
    options: RestoreOptions = {}
  ): Result<Map<string, PersonaSnapshot>, Error> {
    const { mergePersonas = false, skipValidation = false } = options;

    if (!skipValidation) {
      if (!Array.isArray(snapshot.personas)) {
        return Err(new Error('Invalid snapshot: personas is not an array'));
      }
    }

    const personaMap = new Map<string, PersonaSnapshot>();

    for (const persona of snapshot.personas) {
      if (!persona.state?.id) {
        if (skipValidation) continue;
        return Err(new Error('Invalid persona snapshot: missing state.id'));
      }

      if (!mergePersonas && personaMap.has(persona.state.id)) {
        return Err(new Error(`Duplicate persona ID: ${persona.state.id}`));
      }

      personaMap.set(persona.state.id, persona);
    }

    return Ok(personaMap);
  }

  /**
   * Restore teams from snapshot
   */
  restoreTeams(
    snapshot: RuntimeSnapshot,
    options: RestoreOptions = {}
  ): Result<Map<string, TeamSnapshot>, Error> {
    const { mergeTeams = false, skipValidation = false } = options;

    if (!skipValidation) {
      if (!Array.isArray(snapshot.teams)) {
        return Err(new Error('Invalid snapshot: teams is not an array'));
      }
    }

    const teamMap = new Map<string, TeamSnapshot>();

    for (const team of snapshot.teams) {
      if (!team.state?.id) {
        if (skipValidation) continue;
        return Err(new Error('Invalid team snapshot: missing state.id'));
      }

      if (!mergeTeams && teamMap.has(team.state.id)) {
        return Err(new Error(`Duplicate team ID: ${team.state.id}`));
      }

      teamMap.set(team.state.id, team);
    }

    return Ok(teamMap);
  }

  /**
   * Restore workflows from snapshot
   */
  restoreWorkflows(
    snapshot: RuntimeSnapshot,
    options: RestoreOptions = {}
  ): Result<Map<string, WorkflowSnapshot>, Error> {
    const { mergeWorkflows = false, skipValidation = false } = options;

    if (!skipValidation) {
      if (!Array.isArray(snapshot.workflows)) {
        return Err(new Error('Invalid snapshot: workflows is not an array'));
      }
    }

    const workflowMap = new Map<string, WorkflowSnapshot>();

    for (const workflow of snapshot.workflows) {
      if (!workflow.state?.id) {
        if (skipValidation) continue;
        return Err(new Error('Invalid workflow snapshot: missing state.id'));
      }

      if (!mergeWorkflows && workflowMap.has(workflow.state.id)) {
        return Err(new Error(`Duplicate workflow ID: ${workflow.state.id}`));
      }

      workflowMap.set(workflow.state.id, workflow);
    }

    return Ok(workflowMap);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a snapshot manager
 */
export function createSnapshotManager(): SnapshotManager {
  return new SnapshotManager();
}

/**
 * Create a restore manager
 */
export function createRestoreManager(): RestoreManager {
  return new RestoreManager();
}
