/**
 * PCL Language Server - Skill Navigation
 *
 * Provides go-to-definition and find-references for skills
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Location } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { parseSkillMd } from '../skills/skill-loader';

/**
 * Skill navigation provider
 */
export class SkillNavigationProvider {
  /**
   * Go to skill definition
   */
  async gotoSkillDefinition(
    skillName: string,
    documentPath: string
  ): Promise<Location | null> {
    const skillPath = await this.findSkillFile(skillName, documentPath);

    if (!skillPath) {
      return null;
    }

    return {
      uri: URI.file(skillPath).toString(),
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };
  }

  /**
   * Find all references to a skill
   */
  async findSkillReferences(
    skillName: string,
    documentPath: string
  ): Promise<Location[]> {
    const locations: Location[] = [];
    const searchDirs = this.getSearchDirectories(documentPath);

    for (const dir of searchDirs) {
      const dirLocations = await this.searchDirectoryForReferences(
        dir,
        skillName
      );
      locations.push(...dirLocations);
    }

    return locations;
  }

  /**
   * Search a directory for skill references
   */
  private async searchDirectoryForReferences(
    dir: string,
    skillName: string
  ): Promise<Location[]> {
    const locations: Location[] = [];

    if (!existsSync(dir)) {
      return locations;
    }

    try {
      const files = await readdir(dir);
      const skillFiles = files.filter((f) => f.endsWith('.md'));

      for (const file of skillFiles) {
        const location = await this.checkFileForReference(
          join(dir, file),
          skillName
        );
        if (location) {
          locations.push(location);
        }
      }
    } catch {
      // Skip inaccessible directories
    }

    return locations;
  }

  /**
   * Check a single file for skill reference
   */
  private async checkFileForReference(
    filePath: string,
    skillName: string
  ): Promise<Location | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const skill = parseSkillMd(content);

      // Check if this skill has the target as a dependency
      if (skill.dependencies?.includes(skillName)) {
        return this.findDependencyLocation(filePath, content, skillName);
      }
    } catch {
      // Skip invalid files
    }

    return null;
  }

  /**
   * Find the location of a dependency in file content
   */
  private findDependencyLocation(
    filePath: string,
    content: string,
    skillName: string
  ): Location | null {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(skillName) && lines[i].includes('dependencies')) {
        return {
          uri: URI.file(filePath).toString(),
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: lines[i].length },
          },
        };
      }
    }

    return null;
  }

  /**
   * Find skill file by name
   */
  private async findSkillFile(
    skillName: string,
    documentPath: string
  ): Promise<string | null> {
    const searchDirs = this.getSearchDirectories(documentPath);

    for (const dir of searchDirs) {
      if (!existsSync(dir)) {
        continue;
      }

      try {
        const files = await readdir(dir);
        const mdFiles = files.filter((f) => f.endsWith('.md'));

        for (const file of mdFiles) {
          const filePath = join(dir, file);

          try {
            const content = await readFile(filePath, 'utf-8');
            const skill = parseSkillMd(content);

            if (skill.name === skillName) {
              return filePath;
            }
          } catch {
            // Skip invalid files
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    return null;
  }

  /**
   * Get directories to search for skills
   */
  private getSearchDirectories(documentPath: string): string[] {
    const dirs: string[] = [];
    const docDir = dirname(documentPath);

    // Project .claude/skills directory
    // Parent .claude/skills directory
    // User home .claude/skills directory
    const home = process.env.HOME || process.env.USERPROFILE;
    const newDirs = [
      join(docDir, '.claude', 'skills'),
      join(docDir, '..', '.claude', 'skills'),
      ...(home ? [join(home, '.claude', 'skills')] : []),
      join(docDir, 'skills'),
      join(docDir, 'stdlib', 'skills'),
    ];
    dirs.push(...newDirs);

    return dirs;
  }

  /**
   * Get skill dependency tree
   */
  async getSkillDependencyTree(
    skillName: string,
    documentPath: string,
    visited: Set<string> = new Set()
  ): Promise<DependencyNode> {
    // Prevent infinite recursion
    if (visited.has(skillName)) {
      return {
        name: skillName,
        circular: true,
        dependencies: [],
      };
    }

    visited.add(skillName);

    const skillPath = await this.findSkillFile(skillName, documentPath);
    if (!skillPath) {
      return {
        name: skillName,
        missing: true,
        dependencies: [],
      };
    }

    try {
      const content = await readFile(skillPath, 'utf-8');
      const skill = parseSkillMd(content);

      const dependencies: DependencyNode[] = [];

      if (skill.dependencies && skill.dependencies.length > 0) {
        for (const dep of skill.dependencies) {
          const depNode = await this.getSkillDependencyTree(
            dep,
            documentPath,
            visited
          );
          dependencies.push(depNode);
        }
      }

      return {
        name: skillName,
        path: skillPath,
        dependencies,
      };
    } catch {
      return {
        name: skillName,
        error: true,
        dependencies: [],
      };
    }
  }

  /**
   * Format dependency tree as string
   */
  formatDependencyTree(node: DependencyNode, indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    let result = `${prefix}• ${node.name}`;

    if (node.missing) {
      result += ' ❌ (missing)';
    } else if (node.circular) {
      result += ' 🔄 (circular)';
    } else if (node.error) {
      result += ' ⚠️ (error)';
    }

    result += '\n';

    if (node.dependencies && node.dependencies.length > 0) {
      for (const dep of node.dependencies) {
        result += this.formatDependencyTree(dep, indent + 1);
      }
    }

    return result;
  }
}

/**
 * Dependency tree node
 */
export interface DependencyNode {
  name: string;
  path?: string;
  dependencies: DependencyNode[];
  missing?: boolean;
  circular?: boolean;
  error?: boolean;
}
