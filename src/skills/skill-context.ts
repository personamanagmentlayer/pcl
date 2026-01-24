/**
 * Skill Context Manager
 *
 * Manages skill lifecycle and context:
 * - Tracks loaded skills
 * - Lazy loading mechanism
 * - Caches compiled skills
 * - Manages skill dependencies
 * - Handles skill lifecycle events
 */

import type { Result } from '../types';
import { Err as err, Ok as ok } from '../types';
import type { CompiledSkill } from './skill-compiler';
import { SkillCompiler } from './skill-compiler';
import { SkillResolver } from './skill-resolver';

/**
 * Skill loading strategy
 */
export enum LoadingStrategy {
  /** Load all skills immediately */
  EAGER = 'eager',
  /** Load skills when first accessed */
  LAZY = 'lazy',
  /** Load skills on demand based on usage */
  ON_DEMAND = 'on-demand',
}

/**
 * Skill lifecycle events
 */
export enum SkillEvent {
  LOADED = 'loaded',
  COMPILED = 'compiled',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
  UPDATED = 'updated',
  REMOVED = 'removed',
  ERROR = 'error',
}

/**
 * Skill lifecycle event data
 */
export interface SkillEventData {
  event: SkillEvent;
  skillName: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Skill context entry
 */
export interface SkillContextEntry {
  /** Skill reference */
  ref: string;
  /** Compiled skill */
  compiled: CompiledSkill;
  /** Loading timestamp */
  loadedAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt: Date;
  /** Access count */
  accessCount: number;
  /** Whether skill is currently active */
  active: boolean;
  /** Dependencies */
  dependencies: string[];
}

/**
 * Skill context statistics
 */
export interface SkillContextStats {
  /** Total skills loaded */
  totalLoaded: number;
  /** Active skills */
  activeSkills: number;
  /** Cached skills */
  cachedSkills: number;
  /** Total access count */
  totalAccesses: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Average skill size (tokens) */
  averageSkillSize: number;
}

/**
 * Skill context options
 */
export interface SkillContextOptions {
  /** Loading strategy */
  loadingStrategy: LoadingStrategy;
  /** Enable cache */
  cache?: boolean;
  /** Maximum cache size (number of skills) */
  maxCacheSize?: number;
  /** Enable LRU eviction */
  enableLRU?: boolean;
  /** Skill compiler instance */
  compiler?: SkillCompiler;
  /** Skill resolver instance */
  resolver?: SkillResolver;
}

/**
 * Skill Context Manager
 */
export class SkillContext {
  private options: Required<SkillContextOptions>;
  private skills = new Map<string, SkillContextEntry>();
  private compiler: SkillCompiler;
  private resolver: SkillResolver;
  private eventHandlers = new Set<(event: SkillEventData) => void>();
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(options: Partial<SkillContextOptions> = {}) {
    this.compiler = options.compiler || new SkillCompiler();
    this.resolver = options.resolver || new SkillResolver();

    this.options = {
      loadingStrategy: options.loadingStrategy || LoadingStrategy.LAZY,
      cache: options.cache ?? true,
      maxCacheSize: options.maxCacheSize || 100,
      enableLRU: options.enableLRU ?? true,
      compiler: this.compiler,
      resolver: this.resolver,
    };
  }

  /**
   * Load a skill into context
   */
  async load(ref: string): Promise<Result<CompiledSkill, Error>> {
    // Check cache
    if (this.skills.has(ref)) {
      this.stats.cacheHits++;
      const entry = this.skills.get(ref)!;
      entry.lastAccessedAt = new Date();
      entry.accessCount++;
      this.emit({
        event: SkillEvent.ACTIVATED,
        skillName: entry.compiled.skill.name,
        timestamp: new Date(),
      });
      return ok(entry.compiled);
    }

    this.stats.cacheMisses++;

    // Resolve skill reference
    const resolveResult = await this.resolver.resolve(ref);

    if (!resolveResult.ok) {
      this.emit({
        event: SkillEvent.ERROR,
        skillName: ref,
        timestamp: new Date(),
        metadata: { error: resolveResult.error.message },
      });
      return err(resolveResult.error);
    }

    const { skill } = resolveResult.value;

    // Compile skill
    const compileResult = this.compiler.compile(skill);

    if (!compileResult.success) {
      this.emit({
        event: SkillEvent.ERROR,
        skillName: skill.name,
        timestamp: new Date(),
        metadata: { errors: compileResult.errors },
      });
      return err(
        new Error(`Failed to compile skill: ${compileResult.errors.join(', ')}`)
      );
    }

    const compiled = compileResult.skill!;

    // Store in context
    this.addToContext(ref, compiled);

    // Emit events
    this.emit({
      event: SkillEvent.LOADED,
      skillName: compiled.skill.name,
      timestamp: new Date(),
    });

    this.emit({
      event: SkillEvent.COMPILED,
      skillName: compiled.skill.name,
      timestamp: new Date(),
      metadata: {
        hash: compiled.hash,
        tokenCount: compiled.metadata.tokenCount,
      },
    });

    return ok(compiled);
  }

  /**
   * Load multiple skills
   */
  async loadMany(
    refs: string[]
  ): Promise<Map<string, Result<CompiledSkill, Error>>> {
    const results = new Map<string, Result<CompiledSkill, Error>>();

    // Load in parallel based on strategy
    if (this.options.loadingStrategy === LoadingStrategy.EAGER) {
      await Promise.all(
        refs.map(async (ref) => {
          const result = await this.load(ref);
          results.set(ref, result);
        })
      );
    } else {
      // Lazy/on-demand: load sequentially
      for (const ref of refs) {
        const result = await this.load(ref);
        results.set(ref, result);
      }
    }

    return results;
  }

  /**
   * Get a skill from context
   */
  get(ref: string): CompiledSkill | undefined {
    const entry = this.skills.get(ref);

    if (entry) {
      entry.lastAccessedAt = new Date();
      entry.accessCount++;
      this.stats.cacheHits++;
      return entry.compiled;
    }

    this.stats.cacheMisses++;
    return undefined;
  }

  /**
   * Get all loaded skills
   */
  getAll(): CompiledSkill[] {
    return Array.from(this.skills.values()).map((entry) => entry.compiled);
  }

  /**
   * Get active skills only
   */
  getActive(): CompiledSkill[] {
    return Array.from(this.skills.values())
      .filter((entry) => entry.active)
      .map((entry) => entry.compiled);
  }

  /**
   * Activate a skill
   */
  activate(ref: string): boolean {
    const entry = this.skills.get(ref);

    if (!entry) {
      return false;
    }

    if (!entry.active) {
      entry.active = true;
      this.emit({
        event: SkillEvent.ACTIVATED,
        skillName: entry.compiled.skill.name,
        timestamp: new Date(),
      });
    }

    return true;
  }

  /**
   * Deactivate a skill
   */
  deactivate(ref: string): boolean {
    const entry = this.skills.get(ref);

    if (!entry) {
      return false;
    }

    if (entry.active) {
      entry.active = false;
      this.emit({
        event: SkillEvent.DEACTIVATED,
        skillName: entry.compiled.skill.name,
        timestamp: new Date(),
      });
    }

    return true;
  }

  /**
   * Remove a skill from context
   */
  remove(ref: string): boolean {
    const entry = this.skills.get(ref);

    if (!entry) {
      return false;
    }

    this.skills.delete(ref);

    this.emit({
      event: SkillEvent.REMOVED,
      skillName: entry.compiled.skill.name,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Clear all skills from context
   */
  clear(): void {
    this.skills.clear();
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
  }

  /**
   * Check if skill is loaded
   */
  has(ref: string): boolean {
    return this.skills.has(ref);
  }

  /**
   * Add skill to context
   */
  private addToContext(ref: string, compiled: CompiledSkill): void {
    // Check cache size limit
    if (
      this.options.maxCacheSize &&
      this.skills.size >= this.options.maxCacheSize
    ) {
      this.evictLRU();
    }

    const entry: SkillContextEntry = {
      ref,
      compiled,
      loadedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 1,
      active: true,
      dependencies: compiled.resolvedDependencies,
    };

    this.skills.set(ref, entry);
  }

  /**
   * Evict least recently used skill
   */
  private evictLRU(): void {
    if (!this.options.enableLRU || this.skills.size === 0) {
      return;
    }

    let oldestRef: string | null = null;
    let oldestTime = Date.now();

    for (const [ref, entry] of this.skills) {
      const accessTime = entry.lastAccessedAt.getTime();
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestRef = ref;
      }
    }

    if (oldestRef) {
      this.remove(oldestRef);
    }
  }

  /**
   * Get context statistics
   */
  getStats(): SkillContextStats {
    const totalAccesses = this.stats.cacheHits + this.stats.cacheMisses;
    const cacheHitRate =
      totalAccesses > 0 ? this.stats.cacheHits / totalAccesses : 0;

    const totalTokens = Array.from(this.skills.values()).reduce(
      (sum, entry) => sum + entry.compiled.metadata.tokenCount,
      0
    );

    const averageSkillSize =
      this.skills.size > 0 ? totalTokens / this.skills.size : 0;

    return {
      totalLoaded: this.skills.size,
      activeSkills: Array.from(this.skills.values()).filter((e) => e.active)
        .length,
      cachedSkills: this.skills.size,
      totalAccesses,
      cacheHitRate,
      averageSkillSize,
    };
  }

  /**
   * Get skill dependencies
   */
  getDependencies(ref: string): string[] {
    const entry = this.skills.get(ref);
    return entry ? entry.dependencies : [];
  }

  /**
   * Resolve and load dependencies
   */
  async loadDependencies(ref: string): Promise<Result<CompiledSkill[], Error>> {
    const entry = this.skills.get(ref);

    if (!entry) {
      return err(new Error(`Skill not found: ${ref}`));
    }

    const dependencies = entry.dependencies;

    if (dependencies.length === 0) {
      return ok([]);
    }

    const results = await this.loadMany(dependencies);
    const compiled: CompiledSkill[] = [];
    const errors: string[] = [];

    for (const [depRef, result] of results) {
      if (result.ok) {
        compiled.push(result.value);
      } else {
        errors.push(`${depRef}: ${result.error.message}`);
      }
    }

    if (errors.length > 0) {
      return err(
        new Error(`Failed to load dependencies:\n${errors.join('\n')}`)
      );
    }

    return ok(compiled);
  }

  /**
   * Subscribe to skill events
   */
  on(handler: (event: SkillEventData) => void): () => void {
    this.eventHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Emit skill event
   */
  private emit(event: SkillEventData): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in skill event handler:', error);
      }
    }
  }

  /**
   * Preload skills based on usage patterns
   */
  async preload(refs: string[]): Promise<void> {
    if (this.options.loadingStrategy === LoadingStrategy.EAGER) {
      await this.loadMany(refs);
    }
    // For lazy/on-demand, just resolve and cache skill references
  }

  /**
   * Refresh a skill (reload and recompile)
   */
  async refresh(ref: string): Promise<Result<CompiledSkill, Error>> {
    // Remove from cache
    this.remove(ref);

    // Reload
    return this.load(ref);
  }
}

/**
 * Create default skill context
 */
export function createSkillContext(
  options?: Partial<SkillContextOptions>
): SkillContext {
  return new SkillContext(options);
}
