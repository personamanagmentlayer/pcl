/**
 * Skill Merger
 *
 * Merges multiple skills into a unified system prompt:
 * - Handles skill order and hierarchy
 * - Resolves conflicts between skills
 * - Supports progressive disclosure
 * - Provider-specific formatting (Claude XML vs GPT Markdown)
 */

import type { CompiledSkill } from './skill-compiler';
import type { PCLSkill } from './skill-loader';

/**
 * Skill merge conflict resolution strategies
 */
export enum ConflictStrategy {
  /** Override earlier skills with later ones */
  OVERRIDE = 'override',
  /** Merge skill content together */
  MERGE = 'merge',
  /** Throw error on conflict */
  ERROR = 'error',
  /** Skip conflicting skills */
  SKIP = 'skip',
}

/**
 * Provider-specific formatting options
 */
export enum ProviderFormat {
  /** Claude XML format with tags */
  CLAUDE_XML = 'claude-xml',
  /** GPT/OpenAI Markdown format */
  GPT_MARKDOWN = 'gpt-markdown',
  /** Plain text format */
  PLAIN_TEXT = 'plain-text',
  /** JSON format */
  JSON = 'json',
}

/**
 * Skill merge options
 */
export interface SkillMergeOptions {
  /** Conflict resolution strategy */
  conflictStrategy: ConflictStrategy;
  /** Provider-specific formatting */
  format: ProviderFormat;
  /** Include examples in merged output */
  includeExamples: boolean;
  /** Include tool definitions in merged output */
  includeTools: boolean;
  /** Maximum token budget for skills */
  maxTokens?: number;
  /** Skill hierarchy (higher priority = later in array) */
  priority?: string[];
  /** Progressive disclosure: only load essential skills */
  progressiveDisclosure?: boolean;
}

/**
 * Merged skill result
 */
export interface MergedSkillResult {
  /** Combined instructions */
  instructions: string;
  /** Combined examples */
  examples: Array<{ description: string; code: string }>;
  /** Combined tool list */
  tools: string[];
  /** Estimated token count */
  estimatedTokens: number;
  /** Skills included in merge */
  includedSkills: string[];
  /** Skills skipped (due to conflicts or token limits) */
  skippedSkills: string[];
  /** Warnings during merge */
  warnings: string[];
}

/**
 * Skill Merger
 */
export class SkillMerger {
  /**
   * Merge multiple compiled skills into a unified prompt
   */
  merge(skills: CompiledSkill[], options: SkillMergeOptions): MergedSkillResult {
    const warnings: string[] = [];
    const includedSkills: string[] = [];
    const skippedSkills: string[] = [];

    // Sort skills by priority if specified
    const sortedSkills = this.sortByPriority(skills, options.priority);

    // Handle progressive disclosure
    const skillsToMerge = options.progressiveDisclosure
      ? this.selectEssentialSkills(sortedSkills, options.maxTokens)
      : sortedSkills;

    // Track which skills were excluded by progressive disclosure
    if (options.progressiveDisclosure) {
      const excluded = skills.filter(
        (s) => !skillsToMerge.includes(s)
      );
      excluded.forEach((s) => {
        skippedSkills.push(s.skill.name);
        warnings.push(`Skill "${s.skill.name}" excluded by progressive disclosure`);
      });
    }

    // Detect and resolve conflicts
    const { resolved, conflicts } = this.detectConflicts(skillsToMerge);

    if (conflicts.length > 0) {
      const handled = this.handleConflicts(
        skillsToMerge,
        conflicts,
        options.conflictStrategy
      );

      handled.skipped.forEach((name) => {
        skippedSkills.push(name);
        warnings.push(`Skill "${name}" skipped due to conflict`);
      });

      if (handled.errors.length > 0) {
        throw new Error(
          `Skill merge conflicts:\n${handled.errors.join('\n')}`
        );
      }
    }

    // Merge instructions
    const instructions = this.mergeInstructions(
      skillsToMerge,
      options.format
    );

    // Merge examples
    const examples = options.includeExamples
      ? this.mergeExamples(skillsToMerge)
      : [];

    // Merge tools
    const tools = options.includeTools
      ? this.mergeTools(skillsToMerge)
      : [];

    // Track included skills
    skillsToMerge.forEach((s) => includedSkills.push(s.skill.name));

    // Estimate tokens
    const estimatedTokens = this.estimateTokens(
      instructions,
      examples,
      tools
    );

    // Check token budget
    if (options.maxTokens && estimatedTokens > options.maxTokens) {
      warnings.push(
        `Merged skills exceed token budget: ${estimatedTokens} > ${options.maxTokens}`
      );
    }

    return {
      instructions,
      examples,
      tools,
      estimatedTokens,
      includedSkills,
      skippedSkills,
      warnings,
    };
  }

  /**
   * Sort skills by priority order
   */
  private sortByPriority(
    skills: CompiledSkill[],
    priority?: string[]
  ): CompiledSkill[] {
    if (!priority || priority.length === 0) {
      return skills;
    }

    return [...skills].sort((a, b) => {
      const aIndex = priority.indexOf(a.skill.name);
      const bIndex = priority.indexOf(b.skill.name);

      // Skills not in priority list come first
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return -1;
      if (bIndex === -1) return 1;

      // Higher priority (later in array) comes last
      return aIndex - bIndex;
    });
  }

  /**
   * Select essential skills for progressive disclosure
   */
  private selectEssentialSkills(
    skills: CompiledSkill[],
    maxTokens?: number
  ): CompiledSkill[] {
    if (!maxTokens) {
      return skills;
    }

    const selected: CompiledSkill[] = [];
    let totalTokens = 0;

    for (const skill of skills) {
      const skillTokens = skill.metadata.tokenCount;

      if (totalTokens + skillTokens <= maxTokens) {
        selected.push(skill);
        totalTokens += skillTokens;
      } else {
        // Stop adding skills when budget exceeded
        break;
      }
    }

    return selected;
  }

  /**
   * Detect conflicts between skills
   */
  private detectConflicts(
    skills: CompiledSkill[]
  ): { resolved: CompiledSkill[]; conflicts: string[] } {
    const seen = new Set<string>();
    const conflicts: string[] = [];

    for (const skill of skills) {
      if (seen.has(skill.skill.name)) {
        conflicts.push(skill.skill.name);
      }
      seen.add(skill.skill.name);
    }

    return { resolved: skills, conflicts };
  }

  /**
   * Handle conflicts according to strategy
   */
  private handleConflicts(
    skills: CompiledSkill[],
    conflicts: string[],
    strategy: ConflictStrategy
  ): { skipped: string[]; errors: string[] } {
    const skipped: string[] = [];
    const errors: string[] = [];

    switch (strategy) {
      case ConflictStrategy.ERROR:
        conflicts.forEach((name) => {
          errors.push(`Duplicate skill: "${name}"`);
        });
        break;

      case ConflictStrategy.SKIP:
        conflicts.forEach((name) => skipped.push(name));
        break;

      case ConflictStrategy.OVERRIDE:
        // Keep last occurrence (already sorted by priority)
        // No action needed - later skills override earlier ones
        break;

      case ConflictStrategy.MERGE:
        // Merge strategy: combine instructions from all occurrences
        // Implemented in mergeInstructions
        break;
    }

    return { skipped, errors };
  }

  /**
   * Merge instructions from multiple skills
   */
  private mergeInstructions(
    skills: CompiledSkill[],
    format: ProviderFormat
  ): string {
    const parts: string[] = [];

    for (const compiled of skills) {
      const skill = compiled.skill;
      const formatted = this.formatSkillInstructions(skill, format);
      parts.push(formatted);
    }

    // Join with appropriate separator for format
    const separator = this.getSeparator(format);
    return parts.join(separator);
  }

  /**
   * Format skill instructions for specific provider
   */
  private formatSkillInstructions(
    skill: PCLSkill,
    format: ProviderFormat
  ): string {
    switch (format) {
      case ProviderFormat.CLAUDE_XML:
        return this.formatClaudeXml(skill);

      case ProviderFormat.GPT_MARKDOWN:
        return this.formatGptMarkdown(skill);

      case ProviderFormat.PLAIN_TEXT:
        return this.formatPlainText(skill);

      case ProviderFormat.JSON:
        return JSON.stringify(skill, null, 2);

      default:
        return skill.instructions;
    }
  }

  /**
   * Format skill for Claude XML
   */
  private formatClaudeXml(skill: PCLSkill): string {
    const parts: string[] = [];

    parts.push(`<skill name="${skill.name}">`);
    parts.push(`<description>${skill.description}</description>`);
    parts.push(`<instructions>`);
    parts.push(skill.instructions);
    parts.push(`</instructions>`);

    if (skill.tools && skill.tools.length > 0) {
      parts.push(`<tools>`);
      skill.tools.forEach((tool) => {
        parts.push(`  <tool>${tool}</tool>`);
      });
      parts.push(`</tools>`);
    }

    parts.push(`</skill>`);

    return parts.join('\n');
  }

  /**
   * Format skill for GPT Markdown
   */
  private formatGptMarkdown(skill: PCLSkill): string {
    const parts: string[] = [];

    parts.push(`## Skill: ${skill.name}`);
    parts.push('');
    parts.push(`**Description:** ${skill.description}`);
    parts.push('');
    parts.push(`### Instructions`);
    parts.push('');
    parts.push(skill.instructions);
    parts.push('');

    if (skill.tools && skill.tools.length > 0) {
      parts.push(`### Available Tools`);
      parts.push('');
      skill.tools.forEach((tool) => {
        parts.push(`- ${tool}`);
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Format skill as plain text
   */
  private formatPlainText(skill: PCLSkill): string {
    const parts: string[] = [];

    parts.push(`Skill: ${skill.name}`);
    parts.push(`Description: ${skill.description}`);
    parts.push('');
    parts.push(skill.instructions);

    if (skill.tools && skill.tools.length > 0) {
      parts.push('');
      parts.push(`Available tools: ${skill.tools.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Get separator for format
   */
  private getSeparator(format: ProviderFormat): string {
    switch (format) {
      case ProviderFormat.CLAUDE_XML:
        return '\n\n';
      case ProviderFormat.GPT_MARKDOWN:
        return '\n\n---\n\n';
      case ProviderFormat.PLAIN_TEXT:
        return '\n\n---\n\n';
      case ProviderFormat.JSON:
        return ',\n';
      default:
        return '\n\n';
    }
  }

  /**
   * Merge examples from multiple skills
   */
  private mergeExamples(
    skills: CompiledSkill[]
  ): Array<{ description: string; code: string }> {
    const examples: Array<{ description: string; code: string }> = [];

    for (const compiled of skills) {
      if (compiled.skill.examples) {
        for (const example of compiled.skill.examples) {
          // Prefix example description with skill name to avoid confusion
          examples.push({
            description: `[${compiled.skill.name}] ${example.description}`,
            code: example.code,
          });
        }
      }
    }

    return examples;
  }

  /**
   * Merge tools from multiple skills
   */
  private mergeTools(skills: CompiledSkill[]): string[] {
    const toolSet = new Set<string>();

    for (const compiled of skills) {
      if (compiled.skill.tools) {
        compiled.skill.tools.forEach((tool) => toolSet.add(tool));
      }
    }

    return Array.from(toolSet).sort();
  }

  /**
   * Estimate total token count
   */
  private estimateTokens(
    instructions: string,
    examples: Array<{ description: string; code: string }>,
    tools: string[]
  ): number {
    let total = Math.ceil(instructions.length / 4);

    for (const example of examples) {
      total += Math.ceil((example.description.length + example.code.length) / 4);
    }

    total += Math.ceil(tools.join(' ').length / 4);

    return total;
  }

  /**
   * Create default merge options
   */
  static defaultOptions(): SkillMergeOptions {
    return {
      conflictStrategy: ConflictStrategy.OVERRIDE,
      format: ProviderFormat.CLAUDE_XML,
      includeExamples: true,
      includeTools: true,
      progressiveDisclosure: false,
    };
  }
}
