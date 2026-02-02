/**
 * PCL Language Server - Skill Hover Provider
 *
 * Provides hover documentation for skill references
 */

import { Hover, MarkupKind } from 'vscode-languageserver/node';
import { readFile } from 'fs/promises';
import { parseSkillMd } from '../skills/skill-loader';
import { SkillCompiler } from '../skills/skill-compiler';

/**
 * Skill hover provider
 */
export class SkillHoverProvider {
  /**
   * Get hover information for a skill reference
   */
  async getSkillHover(skillPath: string): Promise<Hover | null> {
    try {
      const content = await readFile(skillPath, 'utf-8');
      const skill = parseSkillMd(content);

      // Compile for metadata
      const compiler = new SkillCompiler();
      const result = compiler.compile(skill);

      if (!result.success) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `### ${skill.name}\n\n⚠️ Skill has compilation errors`,
          },
        };
      }

      const compiled = result.skill!;
      const metadata = compiled.metadata;

      // Format hover content
      let content_md = `### ${skill.name}\n\n`;
      content_md += `${skill.description}\n\n`;

      // Metadata section
      content_md += `---\n\n`;
      content_md += `**Metadata**\n\n`;

      if (skill.category) {
        content_md += `- **Category:** ${skill.category}\n`;
      }

      if (skill.complexity) {
        content_md += `- **Complexity:** ${skill.complexity}\n`;
      }

      if (skill.version) {
        content_md += `- **Version:** ${skill.version}\n`;
      }

      if (metadata.tokenCount) {
        content_md += `- **Token Count:** ${metadata.tokenCount}\n`;
      }

      if (metadata.exampleCount > 0) {
        content_md += `- **Examples:** ${metadata.exampleCount}\n`;
      }

      // Tools section
      if (skill.tools && skill.tools.length > 0) {
        content_md += `\n**Tools:** ${skill.tools.join(', ')}\n`;
      }

      // Dependencies section
      if (skill.dependencies && skill.dependencies.length > 0) {
        content_md += `\n**Dependencies:**\n`;
        skill.dependencies.forEach((dep) => {
          content_md += `- ${dep}\n`;
        });
      }

      // Instructions preview
      if (skill.instructions) {
        const preview = skill.instructions.substring(0, 200);
        content_md += `\n---\n\n**Instructions Preview:**\n\n`;
        content_md += `${preview}${skill.instructions.length > 200 ? '...' : ''}\n`;
      }

      // Examples section
      if (skill.examples && skill.examples.length > 0) {
        content_md += `\n---\n\n**Examples:**\n\n`;
        skill.examples.slice(0, 2).forEach((ex, i) => {
          content_md += `${i + 1}. ${ex.description}\n`;
        });

        if (skill.examples.length > 2) {
          content_md += `\n_...and ${skill.examples.length - 2} more examples_\n`;
        }
      }

      // Source path
      content_md += `\n---\n\n**Source:** \`${skillPath}\``;

      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: content_md,
        },
      };
    } catch (error) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `### Skill Not Found\n\nUnable to load skill from: \`${skillPath}\`\n\nError: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  /**
   * Get quick info hover (for completion items)
   */
  getQuickSkillHover(
    skillName: string,
    description: string,
    category?: string
  ): Hover {
    let content = `### ${skillName}\n\n`;
    content += `${description}\n\n`;

    if (category) {
      content += `**Category:** ${category}`;
    }

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: content,
      },
    };
  }
}
