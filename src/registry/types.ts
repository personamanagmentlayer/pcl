/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Registry System
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Persistent storage for personas, teams, and workflows.
 * Supports multiple backends: file, SQLite, HTTP.
 *
 * @packageDocumentation
 * @module @pcl/registry
 * @version 1.0.0
 */

import type {
  PersonaId,
  TeamId,
  WorkflowId,
  SkillId,
  Result,
  SemVer,
  UUID,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
//                              REGISTRY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry entry metadata
 */
export interface RegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: SemVer;
  readonly author?: string;
  readonly tags: readonly string[];
  readonly created: Date;
  readonly updated: Date;
  readonly source: string; // PCL source code
}

/**
 * Persona registry entry
 */
export interface PersonaEntry extends RegistryEntry {
  readonly id: PersonaId;
  readonly skills: readonly SkillId[];
  readonly intent?: string;
}

/**
 * Team registry entry
 */
export interface TeamEntry extends RegistryEntry {
  readonly id: TeamId;
  readonly members: readonly PersonaId[];
  readonly primary?: PersonaId;
  readonly mergeMode: 'primary' | 'consensus' | 'majority' | 'debate' | 'chain';
}

/**
 * Workflow registry entry
 */
export interface WorkflowEntry extends RegistryEntry {
  readonly id: WorkflowId;
  readonly steps: readonly WorkflowStep[];
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  readonly id: string;
  readonly type: 'persona' | 'team' | 'transform' | 'choice' | 'parallel';
  readonly config: Record<string, unknown>;
}

/**
 * Registry query options
 */
export interface QueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly tags?: readonly string[];
  readonly author?: string;
  readonly sortBy?: 'name' | 'created' | 'updated' | 'version';
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  readonly personas: number;
  readonly teams: number;
  readonly workflows: number;
  readonly totalEntries: number;
  readonly lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              REGISTRY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry backend interface
 */
export interface RegistryBackend {
  // Persona operations
  getPersona(id: PersonaId): Promise<Result<PersonaEntry | null>>;
  listPersonas(options?: QueryOptions): Promise<Result<PersonaEntry[]>>;
  savePersona(
    entry: Omit<PersonaEntry, 'created' | 'updated'>
  ): Promise<Result<PersonaId>>;
  deletePersona(id: PersonaId): Promise<Result<boolean>>;

  // Team operations
  getTeam(id: TeamId): Promise<Result<TeamEntry | null>>;
  listTeams(options?: QueryOptions): Promise<Result<TeamEntry[]>>;
  saveTeam(
    entry: Omit<TeamEntry, 'created' | 'updated'>
  ): Promise<Result<TeamId>>;
  deleteTeam(id: TeamId): Promise<Result<boolean>>;

  // Workflow operations
  getWorkflow(id: WorkflowId): Promise<Result<WorkflowEntry | null>>;
  listWorkflows(options?: QueryOptions): Promise<Result<WorkflowEntry[]>>;
  saveWorkflow(
    entry: Omit<WorkflowEntry, 'created' | 'updated'>
  ): Promise<Result<WorkflowId>>;
  deleteWorkflow(id: WorkflowId): Promise<Result<boolean>>;

  // Utility operations
  search(
    query: string,
    options?: QueryOptions
  ): Promise<Result<RegistryEntry[]>>;
  getStats(): Promise<Result<RegistryStats>>;
  clear(): Promise<Result<void>>;
}

/**
 * Registry instance
 */
export interface Registry {
  readonly backend: RegistryBackend;
  readonly id: UUID;

  // High-level operations
  import(source: string): Promise<Result<void>>;
  export(ids?: readonly string[]): Promise<Result<string>>;
}
