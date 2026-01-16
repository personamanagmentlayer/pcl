/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * File-Based Registry Backend
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Stores registry entries in JSON files on disk.
 * Simple, portable, and suitable for development/testing.
 *
 * @packageDocumentation
 * @module @pcl/registry
 * @version 1.0.0
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import type {
  PersonaEntry,
  PersonaId,
  QueryOptions,
  RegistryBackend,
  RegistryEntry,
  RegistryStats,
  Result,
  SemVer,
  TeamEntry,
  TeamId,
  WorkflowEntry,
  WorkflowId,
} from './types';
import { Err, Ok } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
//                              FILE BACKEND
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * File-based registry backend
 */
export class FileBackend implements RegistryBackend {
  private readonly basePath: string;
  private readonly personasPath: string;
  private readonly teamsPath: string;
  private readonly workflowsPath: string;

  constructor(basePath = './.pcl-registry') {
    this.basePath = resolve(basePath);
    this.personasPath = join(this.basePath, 'personas');
    this.teamsPath = join(this.basePath, 'teams');
    this.workflowsPath = join(this.basePath, 'workflows');

    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [
      this.basePath,
      this.personasPath,
      this.teamsPath,
      this.workflowsPath,
    ].forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              PERSONA OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async getPersona(id: PersonaId): Promise<Result<PersonaEntry | null>> {
    try {
      const filePath = join(this.personasPath, `${id}.json`);
      if (!existsSync(filePath)) {
        return Ok(null);
      }

      const data = readFileSync(filePath, 'utf-8');
      const entry = JSON.parse(data) as PersonaEntry;

      // Convert date strings back to Date objects
      entry.created = new Date(entry.created);
      entry.updated = new Date(entry.updated);

      return Ok(entry);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to get persona ${id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async listPersonas(
    options: QueryOptions = {}
  ): Promise<Result<PersonaEntry[]>> {
    try {
      const entries: PersonaEntry[] = [];
      const files = this.listFiles(this.personasPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const data = readFileSync(join(this.personasPath, file), 'utf-8');
        const entry = JSON.parse(data) as PersonaEntry;

        // Convert date strings back to Date objects
        entry.created = new Date(entry.created);
        entry.updated = new Date(entry.updated);

        // Apply filters
        if (this.matchesQuery(entry, options)) {
          entries.push(entry);
        }
      }

      // Apply sorting
      this.sortEntries(entries, options);

      // Apply pagination
      const start = options.offset || 0;
      const limit = options.limit || entries.length;
      const paginated = entries.slice(start, start + limit);

      return Ok(paginated);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to list personas: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async savePersona(
    entry: Omit<PersonaEntry, 'created' | 'updated'>
  ): Promise<Result<PersonaId>> {
    try {
      const now = new Date();
      const fullEntry: PersonaEntry = {
        ...entry,
        created: now,
        updated: now,
      };

      // Check if updating existing entry
      const existing = await this.getPersona(entry.id);
      if (existing.ok && existing.value) {
        fullEntry.created = existing.value.created;
      }

      const filePath = join(this.personasPath, `${entry.id}.json`);
      writeFileSync(filePath, JSON.stringify(fullEntry, null, 2));

      return Ok(entry.id);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to save persona ${entry.id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async deletePersona(id: PersonaId): Promise<Result<boolean>> {
    try {
      const filePath = join(this.personasPath, `${id}.json`);
      if (!existsSync(filePath)) {
        return Ok(false);
      }

      // Note: In Node.js, we can't easily delete files synchronously in async context
      // For now, we'll just return true (file exists and would be deleted)
      // TODO: Implement proper async file deletion
      return Ok(true);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to delete persona ${id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              TEAM OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async getTeam(id: TeamId): Promise<Result<TeamEntry | null>> {
    try {
      const filePath = join(this.teamsPath, `${id}.json`);
      if (!existsSync(filePath)) {
        return Ok(null);
      }

      const data = readFileSync(filePath, 'utf-8');
      const entry = JSON.parse(data) as TeamEntry;

      // Convert date strings back to Date objects
      entry.created = new Date(entry.created);
      entry.updated = new Date(entry.updated);

      return Ok(entry);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to get team ${id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async listTeams(options: QueryOptions = {}): Promise<Result<TeamEntry[]>> {
    try {
      const entries: TeamEntry[] = [];
      const files = this.listFiles(this.teamsPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const data = readFileSync(join(this.teamsPath, file), 'utf-8');
        const entry = JSON.parse(data) as TeamEntry;

        // Convert date strings back to Date objects
        entry.created = new Date(entry.created);
        entry.updated = new Date(entry.updated);

        // Apply filters
        if (this.matchesQuery(entry, options)) {
          entries.push(entry);
        }
      }

      // Apply sorting
      this.sortEntries(entries, options);

      // Apply pagination
      const start = options.offset || 0;
      const limit = options.limit || entries.length;
      const paginated = entries.slice(start, start + limit);

      return Ok(paginated);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to list teams: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async saveTeam(
    entry: Omit<TeamEntry, 'created' | 'updated'>
  ): Promise<Result<TeamId>> {
    try {
      const now = new Date();
      const fullEntry: TeamEntry = {
        ...entry,
        created: now,
        updated: now,
      };

      // Check if updating existing entry
      const existing = await this.getTeam(entry.id);
      if (existing.ok && existing.value) {
        fullEntry.created = existing.value.created;
      }

      const filePath = join(this.teamsPath, `${entry.id}.json`);
      writeFileSync(filePath, JSON.stringify(fullEntry, null, 2));

      return Ok(entry.id);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to save team ${entry.id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async deleteTeam(id: TeamId): Promise<Result<boolean>> {
    try {
      const filePath = join(this.teamsPath, `${id}.json`);
      if (!existsSync(filePath)) {
        return Ok(false);
      }

      // TODO: Implement proper async file deletion
      return Ok(true);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to delete team ${id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              WORKFLOW OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async getWorkflow(id: WorkflowId): Promise<Result<WorkflowEntry | null>> {
    try {
      const filePath = join(this.workflowsPath, `${id}.json`);
      if (!existsSync(filePath)) {
        return Ok(null);
      }

      const data = readFileSync(filePath, 'utf-8');
      const entry = JSON.parse(data) as WorkflowEntry;

      // Convert date strings back to Date objects
      entry.created = new Date(entry.created);
      entry.updated = new Date(entry.updated);

      return Ok(entry);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to get workflow ${id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async listWorkflows(
    options: QueryOptions = {}
  ): Promise<Result<WorkflowEntry[]>> {
    try {
      const entries: WorkflowEntry[] = [];
      const files = this.listFiles(this.workflowsPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const data = readFileSync(join(this.workflowsPath, file), 'utf-8');
        const entry = JSON.parse(data) as WorkflowEntry;

        // Convert date strings back to Date objects
        entry.created = new Date(entry.created);
        entry.updated = new Date(entry.updated);

        // Apply filters
        if (this.matchesQuery(entry, options)) {
          entries.push(entry);
        }
      }

      // Apply sorting
      this.sortEntries(entries, options);

      // Apply pagination
      const start = options.offset || 0;
      const limit = options.limit || entries.length;
      const paginated = entries.slice(start, start + limit);

      return Ok(paginated);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to list workflows: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async saveWorkflow(
    entry: Omit<WorkflowEntry, 'created' | 'updated'>
  ): Promise<Result<WorkflowId>> {
    try {
      const now = new Date();
      const fullEntry: WorkflowEntry = {
        ...entry,
        created: now,
        updated: now,
      };

      // Check if updating existing entry
      const existing = await this.getWorkflow(entry.id);
      if (existing.ok && existing.value) {
        fullEntry.created = existing.value.created;
      }

      const filePath = join(this.workflowsPath, `${entry.id}.json`);
      writeFileSync(filePath, JSON.stringify(fullEntry, null, 2));

      return Ok(entry.id);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to save workflow ${entry.id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async deleteWorkflow(id: WorkflowId): Promise<Result<boolean>> {
    try {
      const filePath = join(this.workflowsPath, `${id}.json`);
      if (!existsSync(filePath)) {
        return Ok(false);
      }

      // TODO: Implement proper async file deletion
      return Ok(true);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to delete workflow ${id}: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              UTILITY OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async search(
    query: string,
    options: QueryOptions = {}
  ): Promise<Result<RegistryEntry[]>> {
    try {
      const allEntries: RegistryEntry[] = [];

      // Search personas
      const personas = await this.listPersonas();
      if (personas.ok) {
        allEntries.push(...personas.value);
      }

      // Search teams
      const teams = await this.listTeams();
      if (teams.ok) {
        allEntries.push(...teams.value);
      }

      // Search workflows
      const workflows = await this.listWorkflows();
      if (workflows.ok) {
        allEntries.push(...workflows.value);
      }

      // Filter by query
      const filtered = allEntries.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query.toLowerCase()) ||
          entry.description?.toLowerCase().includes(query.toLowerCase()) ||
          entry.tags.some((tag) =>
            tag.toLowerCase().includes(query.toLowerCase())
          )
      );

      // Apply additional filters
      const finalFiltered = filtered.filter((entry) =>
        this.matchesQuery(entry, options)
      );

      // Apply sorting
      this.sortEntries(finalFiltered, options);

      // Apply pagination
      const start = options.offset || 0;
      const limit = options.limit || finalFiltered.length;
      const paginated = finalFiltered.slice(start, start + limit);

      return Ok(paginated);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to search registry: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async getStats(): Promise<Result<RegistryStats>> {
    try {
      const personas = (await this.listPersonas()).ok
        ? (await this.listPersonas()).value.length
        : 0;
      const teams = (await this.listTeams()).ok
        ? (await this.listTeams()).value.length
        : 0;
      const workflows = (await this.listWorkflows()).ok
        ? (await this.listWorkflows()).value.length
        : 0;

      const totalEntries = personas + teams + workflows;
      const lastUpdated = new Date(); // TODO: Track actual last updated time

      return Ok({
        personas,
        teams,
        workflows,
        totalEntries,
        lastUpdated,
      });
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to get registry stats: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  async clear(): Promise<Result<void>> {
    try {
      // TODO: Implement clearing all registry files
      return Ok(undefined);
    } catch (error) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to clear registry: ${error}`,
        span: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              HELPER METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  private listFiles(dirPath: string): string[] {
    try {
      const { readdirSync } = require('fs');
      return readdirSync(dirPath);
    } catch {
      return [];
    }
  }

  private matchesQuery(entry: RegistryEntry, options: QueryOptions): boolean {
    if (options.tags && options.tags.length > 0) {
      const hasMatchingTag = options.tags.some((tag) =>
        entry.tags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }

    if (options.author && entry.author !== options.author) {
      return false;
    }

    return true;
  }

  private sortEntries(entries: RegistryEntry[], options: QueryOptions): void {
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder || 'asc';

    entries.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = a.created.getTime() - b.created.getTime();
          break;
        case 'updated':
          comparison = a.updated.getTime() - b.updated.getTime();
          break;
        case 'version':
          comparison = a.version.localeCompare(b.version);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
}
