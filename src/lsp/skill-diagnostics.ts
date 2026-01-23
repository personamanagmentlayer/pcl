/**
 * PCL Language Server - Skill Diagnostics
 *
 * Validates skill references, dependencies, and detects issues
 */

import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from 'vscode-languageserver/node';
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { parseSkillMd } from '../skills/skill-loader';
import { SkillCompiler } from '../skills/skill-compiler';

/**
 * Skill diagnostics provider
 */
export class SkillDiagnosticsProvider {
  /**
   * Validate skill file and generate diagnostics
   */
  async validateSkillFile(
    filePath: string,
    content: string
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    try {
      // Parse skill
      const skill = parseSkillMd(content);

      // Compile skill
      const compiler = new SkillCompiler();
      const result = compiler.compile(skill);

      // Add compilation errors
      if (!result.success) {
        result.errors.forEach(error => {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: this.createFullRange(),
            message: `Compilation Error: ${error}`,
            source: 'pcl-skill',
          });
        });
      }

      // Add warnings
      if (result.warnings) {
        result.warnings.forEach(warning => {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: this.createFullRange(),
            message: `Warning: ${warning}`,
            source: 'pcl-skill',
          });
        });
      }

      // Check dependencies
      if (skill.dependencies && skill.dependencies.length > 0) {
        const depDiagnostics = await this.validateDependencies(
          filePath,
          skill.dependencies
        );
        diagnostics.push(...depDiagnostics);
      }

      // Check for conflicts
      if (skill.conflicts && skill.conflicts.length > 0) {
        const conflictDiagnostics = await this.checkConflicts(
          filePath,
          skill.conflicts
        );
        diagnostics.push(...conflictDiagnostics);
      }

      // Check token count
      if (result.success && result.skill) {
        const tokenCount = result.skill.metadata.tokenCount;
        if (tokenCount > 4000) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: this.createFullRange(),
            message: `Token count exceeds maximum (${tokenCount} > 4000). Split into smaller skills or optimize.`,
            source: 'pcl-skill',
            code: 'token-limit-exceeded',
          });
        } else if (tokenCount > 2000) {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: this.createFullRange(),
            message: `High token count (${tokenCount} tokens). Consider optimizing.`,
            source: 'pcl-skill',
            code: 'token-warning',
          });
        }
      }

      // Check for TODOs
      const todoMatches = content.match(/\[?TODO:?/gi);
      if (todoMatches && todoMatches.length > 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: this.createFullRange(),
          message: `Found ${todoMatches.length} TODO item(s). Complete before publishing.`,
          source: 'pcl-skill',
          code: 'incomplete-skill',
        });
      }

      // Check for examples
      if (!skill.examples || skill.examples.length === 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Information,
          range: this.createFullRange(),
          message: 'No examples provided. Add at least 2-3 examples to demonstrate usage.',
          source: 'pcl-skill',
          code: 'missing-examples',
        });
      }

      // Check for tools specification
      if (!skill.tools || skill.tools.length === 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: this.createFullRange(),
          message: 'No tools specified. Explicitly list required tools for security.',
          source: 'pcl-skill',
          code: 'missing-tools',
        });
      }
    } catch (error) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: this.createFullRange(),
        message: `Parse Error: ${error instanceof Error ? error.message : String(error)}`,
        source: 'pcl-skill',
      });
    }

    return diagnostics;
  }

  /**
   * Validate skill dependencies
   */
  private async validateDependencies(
    filePath: string,
    dependencies: string[]
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const directory = dirname(filePath);

    try {
      // Get available skills
      const availableSkills = await this.getAvailableSkills(directory);
      const skillNames = new Set(availableSkills.map(s => s.name));

      // Check each dependency
      for (const dep of dependencies) {
        if (!skillNames.has(dep)) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: this.createFullRange(),
            message: `Missing dependency: "${dep}" not found`,
            source: 'pcl-skill',
            code: 'missing-dependency',
          });
        }
      }

      // Check for circular dependencies (basic check)
      const circularDeps = this.detectCircularDependencies(
        filePath,
        dependencies,
        availableSkills
      );
      if (circularDeps.length > 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: this.createFullRange(),
          message: `Possible circular dependency: ${circularDeps.join(' → ')}`,
          source: 'pcl-skill',
          code: 'circular-dependency',
        });
      }
    } catch {
      // Ignore errors in dependency validation
    }

    return diagnostics;
  }

  /**
   * Check for skill conflicts
   */
  private async checkConflicts(
    filePath: string,
    conflicts: string[]
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const directory = dirname(filePath);

    try {
      // Get available skills
      const availableSkills = await this.getAvailableSkills(directory);
      const skillNames = new Set(availableSkills.map(s => s.name));

      // Check each conflict
      for (const conflict of conflicts) {
        if (skillNames.has(conflict)) {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: this.createFullRange(),
            message: `Conflict detected: "${conflict}" is present in the same directory`,
            source: 'pcl-skill',
            code: 'skill-conflict',
          });
        }
      }
    } catch {
      // Ignore errors
    }

    return diagnostics;
  }

  /**
   * Get available skills in directory
   */
  private async getAvailableSkills(directory: string): Promise<Array<{ name: string; dependencies?: string[] }>> {
    const skills: Array<{ name: string; dependencies?: string[] }> = [];

    try {
      const files = await readdir(directory);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        try {
          const filePath = join(directory, file);
          const content = await readFile(filePath, 'utf-8');
          const skill = parseSkillMd(content);

          skills.push({
            name: skill.name,
            dependencies: skill.dependencies,
          });
        } catch {
          // Skip invalid files
        }
      }
    } catch {
      // Directory not accessible
    }

    return skills;
  }

  /**
   * Detect circular dependencies (basic check)
   */
  private detectCircularDependencies(
    currentFile: string,
    dependencies: string[],
    availableSkills: Array<{ name: string; dependencies?: string[] }>
  ): string[] {
    // Simple check: if any dependency depends on this skill
    const currentSkillName = availableSkills.find(s =>
      s.name === parseSkillMd(require('fs').readFileSync(currentFile, 'utf-8')).name
    )?.name;

    if (!currentSkillName) return [];

    for (const dep of dependencies) {
      const depSkill = availableSkills.find(s => s.name === dep);
      if (depSkill && depSkill.dependencies?.includes(currentSkillName)) {
        return [currentSkillName, dep, currentSkillName];
      }
    }

    return [];
  }

  /**
   * Create a range covering the entire document
   */
  private createFullRange(): Range {
    return {
      start: { line: 0, character: 0 },
      end: { line: 999999, character: 0 },
    };
  }

  /**
   * Create a range for a specific line
   */
  private createLineRange(line: number): Range {
    return {
      start: { line, character: 0 },
      end: { line, character: 999 },
    };
  }
}
