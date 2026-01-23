/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Skills System
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete skill system for PCL:
 * - Skill loading (Claude Code SKILL.md format)
 * - Skill compilation (validation, hashing, metadata)
 * - Skill merging (combining multiple skills)
 * - Skill resolution (@org/package/skill references)
 * - Prompt integration (provider-specific formatting)
 * - Context management (lazy loading, caching)
 * - Runtime integration (persona execution)
 *
 * @packageDocumentation
 * @module @pcl/skills
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                                  LOADER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  parseSkillMd,
  toSkillMd,
  loadSkillFromFile,
  saveSkillToFile,
  type PCLSkill,
  type SkillMetadata,
} from './skill-loader';

// ═══════════════════════════════════════════════════════════════════════════════
//                                 COMPILER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SkillCompiler,
  type CompiledSkill,
  type SkillCompilationMetadata,
  type CompilationResult,
} from './skill-compiler';

// ═══════════════════════════════════════════════════════════════════════════════
//                                  MERGER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SkillMerger,
  ConflictStrategy,
  ProviderFormat,
  type SkillMergeOptions,
  type MergedSkillResult,
} from './skill-merger';

// ═══════════════════════════════════════════════════════════════════════════════
//                                 RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SkillResolver,
  SkillRefType,
  type SkillRef,
  type SkillRefParsed,
  type SkillResolutionResult,
  type SkillResolverOptions,
} from './skill-resolver';

// ═══════════════════════════════════════════════════════════════════════════════
//                            PROMPT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  PromptIntegration,
  PromptProvider,
  PromptSection,
  defaultPromptIntegrationOptions,
  type PromptIntegrationOptions,
  type IntegratedPromptResult,
} from './prompt-integration';

// ═══════════════════════════════════════════════════════════════════════════════
//                             CONTEXT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SkillContext,
  createSkillContext,
  LoadingStrategy,
  SkillEvent,
  type SkillContextEntry,
  type SkillContextStats,
  type SkillContextOptions,
  type SkillEventData,
} from './skill-context';

// ═══════════════════════════════════════════════════════════════════════════════
//                            RUNTIME INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SkillRuntimeIntegration,
  createSkillRuntime,
  extractSkillRefs,
  enhancePersonaConfig,
  type SkillRuntimeConfig,
  type PersonaConfigWithSkills,
  type SkillRuntimeState,
} from './runtime-integration';
