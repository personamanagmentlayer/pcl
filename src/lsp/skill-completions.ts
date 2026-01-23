/**
 * PCL Language Server - Skill Completion Provider
 *
 * Provides auto-complete for skill references, includes, and metadata
 */

import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
} from 'vscode-languageserver/node';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { parseSkillMd } from '../skills/skill-loader';

/**
 * Skill information for completions
 */
export interface SkillInfo {
  name: string;
  description: string;
  category?: string;
  complexity?: string;
  tools?: string[];
  version?: string;
  filePath: string;
}

/**
 * Skill completion provider
 */
export class SkillCompletionProvider {
  private skillCache: Map<string, SkillInfo[]> = new Map();
  private cacheTimestamp: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds

  /**
   * Get skill completions for include statements
   */
  async getSkillIncludeCompletions(
    documentPath: string,
    prefix: string = ''
  ): Promise<CompletionItem[]> {
    const skills = await this.discoverSkills(documentPath);

    return skills
      .filter(skill => !prefix || skill.name.toLowerCase().includes(prefix.toLowerCase()))
      .map(skill => this.createSkillCompletionItem(skill));
  }

  /**
   * Get skill property completions (for skill metadata)
   */
  getSkillPropertyCompletions(): CompletionItem[] {
    const properties = [
      {
        label: 'name',
        detail: 'Skill identifier',
        documentation: 'Unique skill name (lowercase, hyphens allowed)',
        insertText: 'name: ',
      },
      {
        label: 'description',
        detail: 'Skill description',
        documentation: 'Brief description of skill purpose and capabilities',
        insertText: 'description: ',
      },
      {
        label: 'category',
        detail: 'Skill category',
        documentation: 'Category: language, framework, devops, domain, etc.',
        insertText: 'category: ',
      },
      {
        label: 'complexity',
        detail: 'Skill complexity level',
        documentation: 'Complexity: beginner, intermediate, advanced, expert',
        insertText: 'complexity: ',
      },
      {
        label: 'allowed-tools',
        detail: 'Allowed tools list',
        documentation: 'List of tools this skill can access',
        insertText: 'allowed-tools:\n  - ',
      },
      {
        label: 'version',
        detail: 'Skill version',
        documentation: 'Semantic version (e.g., 1.0.0)',
        insertText: 'version: ',
      },
      {
        label: 'user-invocable',
        detail: 'User invocability',
        documentation: 'Whether skill can be invoked directly by users',
        insertText: 'user-invocable: true',
      },
      {
        label: 'dependencies',
        detail: 'Skill dependencies',
        documentation: 'Other skills this skill depends on',
        insertText: 'dependencies:\n  - ',
      },
    ];

    return properties.map(prop => ({
      label: prop.label,
      kind: CompletionItemKind.Property,
      detail: prop.detail,
      documentation: {
        kind: MarkupKind.Markdown,
        value: prop.documentation,
      },
      insertText: prop.insertText,
      insertTextFormat: InsertTextFormat.PlainText,
    }));
  }

  /**
   * Get skill category completions
   */
  getSkillCategoryCompletions(): CompletionItem[] {
    const categories = [
      { label: 'language', description: 'Programming language expertise' },
      { label: 'framework', description: 'Framework development skills' },
      { label: 'devops', description: 'DevOps and infrastructure' },
      { label: 'domain', description: 'Domain-specific knowledge' },
      { label: 'data', description: 'Data analysis and processing' },
      { label: 'security', description: 'Security and compliance' },
      { label: 'qa', description: 'Quality assurance and testing' },
      { label: 'api', description: 'API development and integration' },
      { label: 'cloud', description: 'Cloud platforms and services' },
      { label: 'ai', description: 'AI and machine learning' },
      { label: 'professional', description: 'Professional skills' },
      { label: 'scientific', description: 'Scientific computing' },
      { label: 'tools', description: 'Development tools' },
      { label: 'design', description: 'Design and UX' },
    ];

    return categories.map(cat => ({
      label: cat.label,
      kind: CompletionItemKind.EnumMember,
      detail: cat.description,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `**${cat.label}** category\n\n${cat.description}`,
      },
      insertText: cat.label,
      insertTextFormat: InsertTextFormat.PlainText,
    }));
  }

  /**
   * Get skill complexity completions
   */
  getSkillComplexityCompletions(): CompletionItem[] {
    const levels = [
      { label: 'beginner', description: 'Basic, introductory level' },
      { label: 'intermediate', description: 'Moderate complexity' },
      { label: 'advanced', description: 'Advanced techniques' },
      { label: 'expert', description: 'Expert-level mastery' },
    ];

    return levels.map(level => ({
      label: level.label,
      kind: CompletionItemKind.EnumMember,
      detail: level.description,
      insertText: level.label,
      insertTextFormat: InsertTextFormat.PlainText,
    }));
  }

  /**
   * Get common tool completions
   */
  getToolCompletions(): CompletionItem[] {
    const tools = [
      'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
      'Task', 'WebFetch', 'WebSearch', 'NotebookEdit',
      'AskUserQuestion', 'TodoWrite', 'Skill',
    ];

    return tools.map(tool => ({
      label: tool,
      kind: CompletionItemKind.Value,
      detail: `${tool} tool`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `Allow access to the **${tool}** tool`,
      },
      insertText: tool,
      insertTextFormat: InsertTextFormat.PlainText,
    }));
  }

  /**
   * Create completion item for a skill
   */
  private createSkillCompletionItem(skill: SkillInfo): CompletionItem {
    const documentation = this.formatSkillDocumentation(skill);

    return {
      label: skill.name,
      kind: CompletionItemKind.Module,
      detail: skill.description,
      documentation: {
        kind: MarkupKind.Markdown,
        value: documentation,
      },
      insertText: skill.name,
      insertTextFormat: InsertTextFormat.PlainText,
      sortText: `skill_${skill.name}`,
      filterText: skill.name,
      data: {
        type: 'skill',
        filePath: skill.filePath,
      },
    };
  }

  /**
   * Format skill documentation for hover/completion
   */
  private formatSkillDocumentation(skill: SkillInfo): string {
    let doc = `### ${skill.name}\n\n${skill.description}\n\n`;

    if (skill.category) {
      doc += `**Category:** ${skill.category}\n\n`;
    }

    if (skill.complexity) {
      doc += `**Complexity:** ${skill.complexity}\n\n`;
    }

    if (skill.version) {
      doc += `**Version:** ${skill.version}\n\n`;
    }

    if (skill.tools && skill.tools.length > 0) {
      doc += `**Tools:** ${skill.tools.join(', ')}\n\n`;
    }

    doc += `**Source:** ${skill.filePath}`;

    return doc;
  }

  /**
   * Discover skills in the workspace
   */
  private async discoverSkills(documentPath: string): Promise<SkillInfo[]> {
    // Check cache
    const cacheKey = dirname(documentPath);
    const cachedTime = this.cacheTimestamp.get(cacheKey);
    const now = Date.now();

    if (cachedTime && now - cachedTime < this.CACHE_TTL) {
      const cached = this.skillCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Discover skills
    const skills: SkillInfo[] = [];
    const searchDirs = this.getSkillSearchDirectories(documentPath);

    for (const dir of searchDirs) {
      if (!existsSync(dir)) {
        continue;
      }

      try {
        const files = await readdir(dir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        for (const file of mdFiles) {
          try {
            const filePath = join(dir, file);
            const content = await readFile(filePath, 'utf-8');
            const skill = parseSkillMd(content);

            skills.push({
              name: skill.name,
              description: skill.description || 'No description',
              category: skill.category,
              complexity: skill.complexity,
              tools: skill.tools,
              version: skill.version,
              filePath,
            });
          } catch {
            // Skip invalid skill files
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    // Update cache
    this.skillCache.set(cacheKey, skills);
    this.cacheTimestamp.set(cacheKey, now);

    return skills;
  }

  /**
   * Get directories to search for skills
   */
  private getSkillSearchDirectories(documentPath: string): string[] {
    const dirs: string[] = [];
    const docDir = dirname(documentPath);

    // Project .claude/skills directory
    dirs.push(join(docDir, '.claude', 'skills'));

    // Parent .claude/skills directory
    dirs.push(join(docDir, '..', '.claude', 'skills'));

    // User home .claude/skills directory
    const home = process.env.HOME || process.env.USERPROFILE;
    if (home) {
      dirs.push(join(home, '.claude', 'skills'));
    }

    // Project skills directory
    dirs.push(join(docDir, 'skills'));

    // Standard library
    dirs.push(join(docDir, 'stdlib', 'skills'));

    return dirs;
  }

  /**
   * Clear cache for a directory
   */
  clearCache(directory: string): void {
    this.skillCache.delete(directory);
    this.cacheTimestamp.delete(directory);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.skillCache.clear();
    this.cacheTimestamp.clear();
  }
}
