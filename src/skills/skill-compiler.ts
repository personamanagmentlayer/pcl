/**
 * Skill Compiler
 *
 * Compiles PCL skills into executable format:
 * - Validates skill structure
 * - Resolves dependencies
 * - Generates metadata and hashes
 * - Prepares for runtime execution
 */

import { createHash } from 'crypto';
import type { PCLSkill } from './skill-loader';

/**
 * Compiled skill with metadata
 */
export interface CompiledSkill {
  readonly skill: PCLSkill;
  readonly hash: string;
  readonly metadata: SkillCompilationMetadata;
  readonly resolvedDependencies: string[];
}

/**
 * Skill compilation metadata
 */
export interface SkillCompilationMetadata {
  readonly compiledAt: Date;
  readonly tokenCount: number;
  readonly instructionsLength: number;
  readonly exampleCount: number;
  readonly toolCount: number;
  readonly dependencyCount: number;
}

/**
 * Skill compilation result
 */
export interface CompilationResult {
  readonly success: boolean;
  readonly skill?: CompiledSkill;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Skill Compiler
 */
export class SkillCompiler {
  /**
   * Compile a skill
   */
  compile(skill: PCLSkill): CompilationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate skill structure
    const validation = this.validateSkill(skill);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    // Generate hash
    const hash = this.generateHash(skill);

    // Resolve dependencies
    const resolvedDependencies = skill.dependencies || [];

    // Generate metadata
    const metadata: SkillCompilationMetadata = {
      compiledAt: new Date(),
      tokenCount: this.estimateTokenCount(skill),
      instructionsLength: skill.instructions.length,
      exampleCount: skill.examples?.length || 0,
      toolCount: skill.tools?.length || 0,
      dependencyCount: resolvedDependencies.length,
    };

    const compiled: CompiledSkill = {
      skill,
      hash,
      metadata,
      resolvedDependencies,
    };

    return { success: true, skill: compiled, errors, warnings };
  }

  /**
   * Validate skill structure
   */
  private validateSkill(skill: PCLSkill): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!skill.name) {
      errors.push('Skill must have a name');
    }

    if (!skill.description) {
      errors.push('Skill must have a description');
    }

    if (!skill.instructions || skill.instructions.trim() === '') {
      errors.push('Skill must have instructions');
    }

    // Name validation
    if (skill.name) {
      const namePattern = /^[a-zA-Z][a-zA-Z0-9-_]*$/;
      if (!namePattern.test(skill.name)) {
        errors.push(
          `Invalid skill name: "${skill.name}". Must match pattern: ^[a-zA-Z][a-zA-Z0-9-_]*$`
        );
      }
    }

    // Content quality checks
    if (skill.instructions && skill.instructions.length < 50) {
      warnings.push('Instructions are very short (<50 chars). Consider adding more detail.');
    }

    if (!skill.examples || skill.examples.length === 0) {
      warnings.push('No examples provided. Examples help users understand usage.');
    }

    if (!skill.tools || skill.tools.length === 0) {
      warnings.push('No tools specified. Consider restricting tool access for security.');
    }

    return { errors, warnings };
  }

  /**
   * Generate content hash for skill
   */
  private generateHash(skill: PCLSkill): string {
    const content = JSON.stringify({
      name: skill.name,
      version: skill.version,
      instructions: skill.instructions,
      examples: skill.examples,
      tools: skill.tools,
      dependencies: skill.dependencies,
    });

    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Estimate token count for skill content
   * Uses rough approximation: 1 token ~= 4 characters
   */
  private estimateTokenCount(skill: PCLSkill): number {
    let content = skill.instructions;

    if (skill.examples) {
      content += '\n\n' + skill.examples.map((ex) => ex.code).join('\n\n');
    }

    // Rough token estimation: 1 token ~= 4 characters
    return Math.ceil(content.length / 4);
  }

  /**
   * Compile multiple skills
   */
  compileMany(skills: PCLSkill[]): Map<string, CompilationResult> {
    const results = new Map<string, CompilationResult>();

    for (const skill of skills) {
      const result = this.compile(skill);
      results.set(skill.name, result);
    }

    return results;
  }
}
