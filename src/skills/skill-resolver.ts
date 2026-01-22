/**
 * Skill Resolver
 *
 * Resolves skill references to actual skill definitions:
 * - Local skills (.claude/skills/ directory)
 * - Registry skills (@org/package/skill format)
 * - Standard library skills (stdlib/skills/)
 * - Remote skills (URLs)
 */

import { join, resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import type { PCLSkill } from './skill-loader';
import { parseSkillMd, loadSkillFromFile } from './skill-loader';
import type { RegistryManager } from '../registry/manager';
import type { Result } from '../types';
import { Ok as ok, Err as err } from '../types';

/**
 * Skill reference types
 */
export enum SkillRefType {
  /** Local file path */
  LOCAL = 'local',
  /** Registry reference (@org/package/skill) */
  REGISTRY = 'registry',
  /** Standard library (stdlib/skills/name) */
  STDLIB = 'stdlib',
  /** Remote URL */
  REMOTE = 'remote',
  /** Inline skill definition */
  INLINE = 'inline',
}

/**
 * Skill reference
 */
export interface SkillRef {
  /** Reference type */
  type: SkillRefType;
  /** Original reference string */
  ref: string;
  /** Parsed components */
  parsed: SkillRefParsed;
}

/**
 * Parsed skill reference components
 */
export interface SkillRefParsed {
  /** Organization (for registry refs) */
  org?: string;
  /** Package name (for registry refs) */
  package?: string;
  /** Skill name */
  name: string;
  /** Version (for registry refs) */
  version?: string;
  /** File path (for local refs) */
  path?: string;
  /** URL (for remote refs) */
  url?: string;
}

/**
 * Skill resolution result
 */
export interface SkillResolutionResult {
  /** Resolved skill */
  skill: PCLSkill;
  /** Source of resolution */
  source: string;
  /** Resolution type */
  type: SkillRefType;
  /** Whether skill was cached */
  cached: boolean;
}

/**
 * Skill resolution options
 */
export interface SkillResolverOptions {
  /** Base directory for resolving local paths */
  baseDir?: string;
  /** Path to .claude/skills directory */
  claudeSkillsDir?: string;
  /** Path to stdlib directory */
  stdlibDir?: string;
  /** Registry manager for resolving registry refs */
  registry?: RegistryManager;
  /** Enable caching */
  cache?: boolean;
  /** Allow remote skill loading */
  allowRemote?: boolean;
}

/**
 * Skill Resolver
 */
export class SkillResolver {
  private options: Required<SkillResolverOptions>;
  private cache = new Map<string, PCLSkill>();

  constructor(options: SkillResolverOptions = {}) {
    this.options = {
      baseDir: options.baseDir || process.cwd(),
      claudeSkillsDir: options.claudeSkillsDir || join(process.cwd(), '.claude', 'skills'),
      stdlibDir: options.stdlibDir || join(__dirname, '../../stdlib/skills'),
      registry: options.registry || undefined!,
      cache: options.cache ?? true,
      allowRemote: options.allowRemote ?? false,
    };
  }

  /**
   * Resolve a skill reference to a skill definition
   */
  async resolve(ref: string): Promise<Result<SkillResolutionResult, Error>> {
    // Check cache first
    if (this.options.cache && this.cache.has(ref)) {
      const skill = this.cache.get(ref)!;
      return ok({
        skill,
        source: 'cache',
        type: SkillRefType.INLINE,
        cached: true,
      });
    }

    // Parse reference
    const parsed = this.parseRef(ref);

    // Resolve based on type
    let result: Result<SkillResolutionResult, Error>;

    switch (parsed.type) {
      case SkillRefType.LOCAL:
        result = await this.resolveLocal(parsed);
        break;

      case SkillRefType.REGISTRY:
        result = await this.resolveRegistry(parsed);
        break;

      case SkillRefType.STDLIB:
        result = await this.resolveStdlib(parsed);
        break;

      case SkillRefType.REMOTE:
        result = await this.resolveRemote(parsed);
        break;

      default:
        return err(new Error(`Unknown skill reference type: ${parsed.type}`));
    }

    // Cache successful resolution
    if (result.ok && this.options.cache) {
      this.cache.set(ref, result.value.skill);
    }

    return result;
  }

  /**
   * Resolve multiple skill references
   */
  async resolveMany(refs: string[]): Promise<Map<string, Result<SkillResolutionResult, Error>>> {
    const results = new Map<string, Result<SkillResolutionResult, Error>>();

    // Resolve in parallel
    await Promise.all(
      refs.map(async (ref) => {
        const result = await this.resolve(ref);
        results.set(ref, result);
      })
    );

    return results;
  }

  /**
   * Parse skill reference string
   */
  parseRef(ref: string): SkillRef {
    // Registry reference: @org/package/skill[@version]
    if (ref.startsWith('@')) {
      return this.parseRegistryRef(ref);
    }

    // Remote URL: http(s)://...
    if (ref.startsWith('http://') || ref.startsWith('https://')) {
      return this.parseRemoteRef(ref);
    }

    // Local file path: ./path/to/skill.md or /abs/path/skill.md
    if (ref.startsWith('./') || ref.startsWith('../') || ref.startsWith('/')) {
      return this.parseLocalRef(ref);
    }

    // Standard library: skill-name
    return this.parseStdlibRef(ref);
  }

  /**
   * Parse registry reference: @org/package/skill[@version]
   */
  private parseRegistryRef(ref: string): SkillRef {
    const match = ref.match(/^@([^/]+)\/([^/]+)\/([^@]+)(?:@(.+))?$/);

    if (!match) {
      throw new Error(`Invalid registry reference: ${ref}`);
    }

    const [, org, pkg, name, version] = match;

    return {
      type: SkillRefType.REGISTRY,
      ref,
      parsed: { org, package: pkg, name, version },
    };
  }

  /**
   * Parse remote URL reference
   */
  private parseRemoteRef(ref: string): SkillRef {
    try {
      new URL(ref); // Validate URL
    } catch {
      throw new Error(`Invalid URL: ${ref}`);
    }

    const name = ref.split('/').pop()?.replace(/\.md$/, '') || 'remote-skill';

    return {
      type: SkillRefType.REMOTE,
      ref,
      parsed: { name, url: ref },
    };
  }

  /**
   * Parse local file reference
   */
  private parseLocalRef(ref: string): SkillRef {
    const absPath = resolve(this.options.baseDir, ref);
    const name = ref.split('/').pop()?.replace(/\.md$/, '') || 'local-skill';

    return {
      type: SkillRefType.LOCAL,
      ref,
      parsed: { name, path: absPath },
    };
  }

  /**
   * Parse standard library reference
   */
  private parseStdlibRef(ref: string): SkillRef {
    return {
      type: SkillRefType.STDLIB,
      ref,
      parsed: { name: ref },
    };
  }

  /**
   * Resolve local file reference
   */
  private async resolveLocal(ref: SkillRef): Promise<Result<SkillResolutionResult, Error>> {
    const path = ref.parsed.path!;

    if (!existsSync(path)) {
      // Try .claude/skills directory
      const claudePath = join(this.options.claudeSkillsDir, `${ref.parsed.name}.md`);

      if (existsSync(claudePath)) {
        return this.loadSkillFromPath(claudePath, SkillRefType.LOCAL);
      }

      return err(new Error(`Skill file not found: ${path}`));
    }

    return this.loadSkillFromPath(path, SkillRefType.LOCAL);
  }

  /**
   * Resolve registry reference
   */
  private async resolveRegistry(ref: SkillRef): Promise<Result<SkillResolutionResult, Error>> {
    if (!this.options.registry) {
      return err(new Error('Registry not configured'));
    }

    const { org, package: pkg, name, version } = ref.parsed;

    // Build registry query
    const query = `${org}/${pkg}/${name}`;
    const fullRef = version ? `${query}@${version}` : query;

    try {
      // Query registry
      const searchResult = await this.options.registry.search({
        query: fullRef,
        filter: { type: 'skill' },
        pagination: { limit: 1, offset: 0 },
      });

      if (!searchResult.ok || searchResult.value.length === 0) {
        return err(new Error(`Skill not found in registry: ${fullRef}`));
      }

      const artifact = searchResult.value[0].artifact;

      // Parse skill content
      const content = JSON.stringify(artifact.payload);
      const skill = parseSkillMd(content);

      return ok({
        skill,
        source: `registry:${fullRef}`,
        type: SkillRefType.REGISTRY,
        cached: false,
      });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to resolve registry skill: ${fullRef}`)
      );
    }
  }

  /**
   * Resolve standard library reference
   */
  private async resolveStdlib(ref: SkillRef): Promise<Result<SkillResolutionResult, Error>> {
    const path = join(this.options.stdlibDir, `${ref.parsed.name}.md`);

    if (!existsSync(path)) {
      return err(new Error(`Standard library skill not found: ${ref.parsed.name}`));
    }

    return this.loadSkillFromPath(path, SkillRefType.STDLIB);
  }

  /**
   * Resolve remote URL reference
   */
  private async resolveRemote(ref: SkillRef): Promise<Result<SkillResolutionResult, Error>> {
    if (!this.options.allowRemote) {
      return err(new Error('Remote skill loading is disabled'));
    }

    const url = ref.parsed.url!;

    try {
      // Fetch remote skill
      const response = await fetch(url);

      if (!response.ok) {
        return err(new Error(`Failed to fetch remote skill: ${response.statusText}`));
      }

      const content = await response.text();
      const skill = parseSkillMd(content);

      return ok({
        skill,
        source: `remote:${url}`,
        type: SkillRefType.REMOTE,
        cached: false,
      });
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to load remote skill: ${url}`)
      );
    }
  }

  /**
   * Load skill from file path
   */
  private async loadSkillFromPath(
    path: string,
    type: SkillRefType
  ): Promise<Result<SkillResolutionResult, Error>> {
    try {
      const skill = await loadSkillFromFile(path);

      return ok({
        skill,
        source: path,
        type,
        cached: false,
      });
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(`Failed to load skill: ${path}`)
      );
    }
  }

  /**
   * Clear resolution cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
