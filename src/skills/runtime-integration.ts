/**
 * Runtime Integration for Skills
 *
 * Connects the skill system to the PCL runtime:
 * - Load skills when personas are instantiated
 * - Merge skill instructions into system prompts
 * - Pass skill tools/capabilities to providers
 * - Manage skill lifecycle with personas
 */

import type { PersonaConfig, PersonaState } from '../runtime';
import type { CompiledSkill } from './skill-compiler';
import type { SkillContext } from './skill-context';
import { createSkillContext, LoadingStrategy } from './skill-context';
import type { PromptIntegration } from './prompt-integration';
import { PromptIntegration as PromptIntegrationClass, PromptProvider, PromptSection, defaultPromptIntegrationOptions } from './prompt-integration';
import type { Result } from '../types';
import { Ok as ok, Err as err } from '../types';

/**
 * Skill runtime configuration
 */
export interface SkillRuntimeConfig {
  /** Skill context manager */
  skillContext?: SkillContext;
  /** Prompt integration */
  promptIntegration?: PromptIntegration;
  /** Loading strategy */
  loadingStrategy?: LoadingStrategy;
  /** Enable skill caching */
  enableCache?: boolean;
  /** Maximum skill tokens per persona */
  maxSkillTokens?: number;
  /** Progressive disclosure */
  progressiveDisclosure?: boolean;
}

/**
 * Enhanced persona configuration with skill support
 */
export interface PersonaConfigWithSkills extends PersonaConfig {
  /** Skill references to load */
  skillRefs?: string[];
  /** Skill loading strategy */
  skillLoadingStrategy?: LoadingStrategy;
  /** Maximum tokens for skills */
  maxSkillTokens?: number;
}

/**
 * Skill runtime state
 */
export interface SkillRuntimeState {
  /** Loaded skills */
  loadedSkills: CompiledSkill[];
  /** Active skills */
  activeSkills: CompiledSkill[];
  /** Total skill tokens */
  totalSkillTokens: number;
  /** Last skill load time */
  lastSkillLoadTime: Date | null;
}

/**
 * Skill Runtime Integration
 */
export class SkillRuntimeIntegration {
  private skillContext: SkillContext;
  private promptIntegration: PromptIntegration;
  private config: Required<SkillRuntimeConfig>;

  constructor(config: SkillRuntimeConfig = {}) {
    this.skillContext = config.skillContext || createSkillContext({
      loadingStrategy: config.loadingStrategy || LoadingStrategy.LAZY,
      cache: config.enableCache ?? true,
    });

    this.promptIntegration = (config.promptIntegration as PromptIntegration) || new PromptIntegrationClass();

    this.config = {
      skillContext: this.skillContext,
      promptIntegration: this.promptIntegration,
      loadingStrategy: config.loadingStrategy || LoadingStrategy.LAZY,
      enableCache: config.enableCache ?? true,
      maxSkillTokens: config.maxSkillTokens || 2000,
      progressiveDisclosure: config.progressiveDisclosure ?? true,
    };
  }

  /**
   * Load skills for a persona
   */
  async loadPersonaSkills(
    personaConfig: PersonaConfigWithSkills
  ): Promise<Result<SkillRuntimeState, Error>> {
    // Extract skill references from config
    const skillRefs = personaConfig.skillRefs || [];

    if (skillRefs.length === 0) {
      // No skills to load
      return ok({
        loadedSkills: [],
        activeSkills: [],
        totalSkillTokens: 0,
        lastSkillLoadTime: null,
      });
    }

    // Load skills from context
    const results = await this.skillContext.loadMany(skillRefs);

    const loadedSkills: CompiledSkill[] = [];
    const errors: string[] = [];

    for (const [ref, result] of results) {
      if (result.ok) {
        loadedSkills.push(result.value);
      } else {
        errors.push(`${ref}: ${result.error.message}`);
      }
    }

    if (errors.length > 0) {
      return err(new Error(`Failed to load some skills:\n${errors.join('\n')}`));
    }

    // Calculate total tokens
    const totalSkillTokens = loadedSkills.reduce(
      (sum, skill) => sum + skill.metadata.tokenCount,
      0
    );

    return ok({
      loadedSkills,
      activeSkills: loadedSkills,
      totalSkillTokens,
      lastSkillLoadTime: new Date(),
    });
  }

  /**
   * Build enhanced system prompt with skills
   */
  buildSystemPromptWithSkills(
    basePrompt: string,
    skills: CompiledSkill[],
    provider: string
  ): Result<string, Error> {
    if (skills.length === 0) {
      return ok(basePrompt);
    }

    // Map provider string to PromptProvider enum
    const promptProvider = this.mapProvider(provider);

    // Create integration options
    const options = {
      ...defaultPromptIntegrationOptions(promptProvider),
      maxTokens: this.config.maxSkillTokens,
      progressiveDisclosure: this.config.progressiveDisclosure,
    };

    // Integrate skills into prompt
    const result = this.promptIntegration.integrate(basePrompt, skills, options);

    // Check for warnings
    if (result.warnings.length > 0) {
      console.warn('Skill integration warnings:', result.warnings);
    }

    return ok(result.systemPrompt);
  }

  /**
   * Map provider string to PromptProvider enum
   */
  private mapProvider(provider: string): PromptProvider {
    const providerLower = provider.toLowerCase();

    switch (providerLower) {
      case 'anthropic':
        return PromptProvider.ANTHROPIC;
      case 'openai':
        return PromptProvider.OPENAI;
      case 'gemini':
        return PromptProvider.GEMINI;
      case 'deepseek':
        return PromptProvider.DEEPSEEK;
      case 'ollama':
        return PromptProvider.OLLAMA;
      case 'azure':
        return PromptProvider.AZURE;
      case 'bedrock':
        return PromptProvider.BEDROCK;
      case 'mock':
        return PromptProvider.MOCK;
      default:
        return PromptProvider.MOCK;
    }
  }

  /**
   * Get skill tools for provider
   */
  getSkillTools(skills: CompiledSkill[]): string[] {
    const tools = new Set<string>();

    for (const skill of skills) {
      if (skill.skill.tools) {
        skill.skill.tools.forEach((tool) => tools.add(tool));
      }
    }

    return Array.from(tools);
  }

  /**
   * Get skill context manager
   */
  getSkillContext(): SkillContext {
    return this.skillContext;
  }

  /**
   * Get prompt integration
   */
  getPromptIntegration(): PromptIntegration {
    return this.promptIntegration;
  }

  /**
   * Clear skill cache
   */
  clearCache(): void {
    this.skillContext.clear();
  }

  /**
   * Get skill statistics
   */
  getStats() {
    return this.skillContext.getStats();
  }
}

/**
 * Create default skill runtime integration
 */
export function createSkillRuntime(config?: SkillRuntimeConfig): SkillRuntimeIntegration {
  return new SkillRuntimeIntegration(config);
}

/**
 * Helper: Extract skill references from persona config
 */
export function extractSkillRefs(config: PersonaConfig): string[] {
  // For now, skill references are stored in config.skills array
  // In the future, this could parse more complex skill references
  return config.skills as string[];
}

/**
 * Helper: Enhance persona config with skill support
 */
export function enhancePersonaConfig(
  config: PersonaConfig,
  skillRefs: string[]
): PersonaConfigWithSkills {
  return {
    ...config,
    skillRefs,
    skills: skillRefs,
  };
}
