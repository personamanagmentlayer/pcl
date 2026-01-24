/**
 * Prompt Builder Integration for Skills
 *
 * Integrates compiled skills into system prompts:
 * - Inserts skill content at appropriate sections
 * - Formats skills for specific providers
 * - Manages token budgets
 * - Optimizes skill content delivery
 */

import type { CompiledSkill } from './skill-compiler';
import type { MergedSkillResult, SkillMergeOptions } from './skill-merger';
import { SkillMerger, ProviderFormat } from './skill-merger';

/**
 * Provider types that support different prompt formats
 */
export enum PromptProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek',
  OLLAMA = 'ollama',
  AZURE = 'azure',
  BEDROCK = 'bedrock',
  MOCK = 'mock',
}

/**
 * Prompt section types where skills can be inserted
 */
export enum PromptSection {
  /** Before main instructions */
  PREAMBLE = 'preamble',
  /** Main instruction section */
  INSTRUCTIONS = 'instructions',
  /** After main instructions */
  POSTAMBLE = 'postamble',
  /** Examples section */
  EXAMPLES = 'examples',
  /** Tool/capability section */
  TOOLS = 'tools',
}

/**
 * Prompt integration options
 */
export interface PromptIntegrationOptions {
  /** Target provider */
  provider: PromptProvider;
  /** Where to insert skills in prompt */
  section: PromptSection;
  /** Token budget for skills */
  maxTokens?: number;
  /** Include examples from skills */
  includeExamples?: boolean;
  /** Include tool definitions from skills */
  includeTools?: boolean;
  /** Progressive disclosure */
  progressiveDisclosure?: boolean;
  /** Skill priority order */
  priority?: string[];
}

/**
 * Integrated prompt result
 */
export interface IntegratedPromptResult {
  /** Complete system prompt with skills */
  systemPrompt: string;
  /** Skills that were included */
  includedSkills: string[];
  /** Skills that were skipped */
  skippedSkills: string[];
  /** Total token estimate */
  totalTokens: number;
  /** Warnings during integration */
  warnings: string[];
}

/**
 * Prompt Builder Integration
 */
export class PromptIntegration {
  private merger: SkillMerger;

  constructor() {
    this.merger = new SkillMerger();
  }

  /**
   * Integrate skills into a system prompt
   */
  integrate(
    basePrompt: string,
    skills: CompiledSkill[],
    options: PromptIntegrationOptions
  ): IntegratedPromptResult {
    // Determine provider format
    const format = this.getProviderFormat(options.provider);

    // Build merge options
    const mergeOptions: SkillMergeOptions = {
      ...SkillMerger.defaultOptions(),
      format,
      maxTokens: options.maxTokens,
      includeExamples: options.includeExamples ?? true,
      includeTools: options.includeTools ?? true,
      progressiveDisclosure: options.progressiveDisclosure ?? false,
      priority: options.priority,
    };

    // Merge skills
    const mergeResult = this.merger.merge(skills, mergeOptions);

    // Integrate merged skills into base prompt
    const systemPrompt = this.insertSkillsIntoPrompt(
      basePrompt,
      mergeResult,
      options.section,
      format
    );

    // Calculate total tokens
    const baseTokens = Math.ceil(basePrompt.length / 4);
    const totalTokens = baseTokens + mergeResult.estimatedTokens;

    return {
      systemPrompt,
      includedSkills: mergeResult.includedSkills,
      skippedSkills: mergeResult.skippedSkills,
      totalTokens,
      warnings: mergeResult.warnings,
    };
  }

  /**
   * Integrate skills into multiple prompt sections
   */
  integrateMultiSection(
    basePrompt: string,
    skills: CompiledSkill[],
    sectionAssignments: Map<PromptSection, CompiledSkill[]>,
    options: Omit<PromptIntegrationOptions, 'section'>
  ): IntegratedPromptResult {
    let systemPrompt = basePrompt;
    const allIncluded: string[] = [];
    const allSkipped: string[] = [];
    const allWarnings: string[] = [];
    let totalTokens = Math.ceil(basePrompt.length / 4);

    // Process each section
    for (const [section, sectionSkills] of sectionAssignments) {
      const result = this.integrate(systemPrompt, sectionSkills, {
        ...options,
        section,
      });

      systemPrompt = result.systemPrompt;
      allIncluded.push(...result.includedSkills);
      allSkipped.push(...result.skippedSkills);
      allWarnings.push(...result.warnings);
      totalTokens = result.totalTokens;
    }

    return {
      systemPrompt,
      includedSkills: Array.from(new Set(allIncluded)),
      skippedSkills: Array.from(new Set(allSkipped)),
      totalTokens,
      warnings: allWarnings,
    };
  }

  /**
   * Get provider-specific format
   */
  private getProviderFormat(provider: PromptProvider): ProviderFormat {
    switch (provider) {
      case PromptProvider.ANTHROPIC:
      case PromptProvider.BEDROCK:
        return ProviderFormat.CLAUDE_XML;

      case PromptProvider.OPENAI:
      case PromptProvider.AZURE:
      case PromptProvider.DEEPSEEK:
        return ProviderFormat.GPT_MARKDOWN;

      case PromptProvider.GEMINI:
        return ProviderFormat.GPT_MARKDOWN;

      case PromptProvider.OLLAMA:
        return ProviderFormat.PLAIN_TEXT;

      case PromptProvider.MOCK:
        return ProviderFormat.PLAIN_TEXT;

      default:
        return ProviderFormat.PLAIN_TEXT;
    }
  }

  /**
   * Insert skills into specific prompt section
   */
  private insertSkillsIntoPrompt(
    basePrompt: string,
    mergeResult: MergedSkillResult,
    section: PromptSection,
    format: ProviderFormat
  ): string {
    const skillContent = this.formatSkillSection(mergeResult, format);

    switch (section) {
      case PromptSection.PREAMBLE:
        return `${skillContent}\n\n${basePrompt}`;

      case PromptSection.INSTRUCTIONS:
        // Insert in middle of prompt (after intent but before constraints)
        return this.insertInMiddle(basePrompt, skillContent);

      case PromptSection.POSTAMBLE:
        return `${basePrompt}\n\n${skillContent}`;

      case PromptSection.EXAMPLES:
        return this.insertExamples(basePrompt, mergeResult, format);

      case PromptSection.TOOLS:
        return this.insertTools(basePrompt, mergeResult, format);

      default:
        return `${basePrompt}\n\n${skillContent}`;
    }
  }

  /**
   * Format skill section with header
   */
  private formatSkillSection(
    mergeResult: MergedSkillResult,
    format: ProviderFormat
  ): string {
    const parts: string[] = [];

    switch (format) {
      case ProviderFormat.CLAUDE_XML:
        parts.push('<skills>');
        parts.push(mergeResult.instructions);
        parts.push('</skills>');
        break;

      case ProviderFormat.GPT_MARKDOWN:
        parts.push('# Skills');
        parts.push('');
        parts.push(mergeResult.instructions);
        break;

      case ProviderFormat.PLAIN_TEXT:
        parts.push('=== SKILLS ===');
        parts.push('');
        parts.push(mergeResult.instructions);
        parts.push('');
        parts.push('=== END SKILLS ===');
        break;

      case ProviderFormat.JSON:
        parts.push(mergeResult.instructions);
        break;
    }

    return parts.join('\n');
  }

  /**
   * Insert skills in middle of prompt
   */
  private insertInMiddle(basePrompt: string, skillContent: string): string {
    // Try to find a good insertion point
    const lines = basePrompt.split('\n');
    const insertIndex = Math.floor(lines.length / 2);

    lines.splice(insertIndex, 0, '', skillContent, '');

    return lines.join('\n');
  }

  /**
   * Insert examples section
   */
  private insertExamples(
    basePrompt: string,
    mergeResult: MergedSkillResult,
    format: ProviderFormat
  ): string {
    if (mergeResult.examples.length === 0) {
      return basePrompt;
    }

    const exampleSection = this.formatExamples(mergeResult.examples, format);
    return `${basePrompt}\n\n${exampleSection}`;
  }

  /**
   * Format examples
   */
  private formatExamples(
    examples: Array<{ description: string; code: string }>,
    format: ProviderFormat
  ): string {
    const parts: string[] = [];

    switch (format) {
      case ProviderFormat.CLAUDE_XML:
        parts.push('<examples>');
        for (const example of examples) {
          parts.push('  <example>');
          parts.push(`    <description>${example.description}</description>`);
          parts.push(`    <code>${example.code}</code>`);
          parts.push('  </example>');
        }
        parts.push('</examples>');
        break;

      case ProviderFormat.GPT_MARKDOWN:
        parts.push('## Examples');
        parts.push('');
        for (const example of examples) {
          parts.push(`### ${example.description}`);
          parts.push('');
          parts.push('```');
          parts.push(example.code);
          parts.push('```');
          parts.push('');
        }
        break;

      case ProviderFormat.PLAIN_TEXT:
        parts.push('=== EXAMPLES ===');
        parts.push('');
        for (const example of examples) {
          parts.push(`Example: ${example.description}`);
          parts.push(example.code);
          parts.push('');
        }
        parts.push('=== END EXAMPLES ===');
        break;
    }

    return parts.join('\n');
  }

  /**
   * Insert tools section
   */
  private insertTools(
    basePrompt: string,
    mergeResult: MergedSkillResult,
    format: ProviderFormat
  ): string {
    if (mergeResult.tools.length === 0) {
      return basePrompt;
    }

    const toolSection = this.formatTools(mergeResult.tools, format);
    return `${basePrompt}\n\n${toolSection}`;
  }

  /**
   * Format tools
   */
  private formatTools(tools: string[], format: ProviderFormat): string {
    const parts: string[] = [];

    switch (format) {
      case ProviderFormat.CLAUDE_XML:
        parts.push('<available_tools>');
        for (const tool of tools) {
          parts.push(`  <tool>${tool}</tool>`);
        }
        parts.push('</available_tools>');
        break;

      case ProviderFormat.GPT_MARKDOWN:
        parts.push('## Available Tools');
        parts.push('');
        for (const tool of tools) {
          parts.push(`- ${tool}`);
        }
        break;

      case ProviderFormat.PLAIN_TEXT:
        parts.push('=== AVAILABLE TOOLS ===');
        parts.push('');
        parts.push(tools.join(', '));
        parts.push('');
        parts.push('=== END AVAILABLE TOOLS ===');
        break;
    }

    return parts.join('\n');
  }

  /**
   * Optimize prompt for token budget
   */
  optimizeForTokens(
    prompt: string,
    targetTokens: number
  ): { optimized: string; removed: string[] } {
    const removed: string[] = [];
    let optimized = prompt;
    let currentTokens = Math.ceil(prompt.length / 4);

    if (currentTokens <= targetTokens) {
      return { optimized, removed };
    }

    // Strategy: Remove examples first, then reduce detail
    // This is a simple implementation - can be enhanced

    // Remove example sections
    const examplePattern = /<examples>[\s\S]*?<\/examples>/g;
    if (examplePattern.test(optimized)) {
      optimized = optimized.replace(examplePattern, '');
      removed.push('examples');
      currentTokens = Math.ceil(optimized.length / 4);
    }

    if (currentTokens <= targetTokens) {
      return { optimized, removed };
    }

    // If still over budget, truncate content
    const truncateLength = targetTokens * 4;
    if (optimized.length > truncateLength) {
      optimized =
        optimized.substring(0, truncateLength) + '\n\n[Content truncated]';
      removed.push('truncated-content');
    }

    return { optimized, removed };
  }
}

/**
 * Helper function to create default integration options
 */
export function defaultPromptIntegrationOptions(
  provider: PromptProvider
): PromptIntegrationOptions {
  return {
    provider,
    section: PromptSection.INSTRUCTIONS,
    includeExamples: true,
    includeTools: true,
    progressiveDisclosure: false,
  };
}
