/**
 * Skill List CLI Command
 *
 * List installed skills
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { parseSkillMd } from '../../../skills/skill-loader';
import {
  formatOutput,
  formatError,
  type OutputFormat,
} from '../../utils/output';

export interface SkillListOptions {
  directory?: string;
  format?: OutputFormat;
  verbose?: boolean;
}

/**
 * List installed skills
 */
export async function skillListCommand(
  options: SkillListOptions = {}
): Promise<void> {
  const { directory, format = 'table', verbose = false } = options;

  try {
    // Determine skills directory
    const skillsDir = directory || join(process.cwd(), '.claude', 'skills');

    if (!existsSync(skillsDir)) {
      console.log('No skills directory found. No skills installed.');
      console.log(`\nExpected directory: ${skillsDir}`);
      console.log('\nInstall a skill with:');
      console.log('  pcl skill install <skill-name>');
      return;
    }

    // Read directory
    const files = await readdir(skillsDir);
    const skillFiles = files.filter((f) => f.endsWith('.md'));

    if (skillFiles.length === 0) {
      console.log('No skills found in directory.');
      console.log(`\nDirectory: ${skillsDir}`);
      return;
    }

    console.log(`Found ${skillFiles.length} skill(s) in ${skillsDir}\n`);

    // Parse skills
    const skills = [];
    for (const file of skillFiles) {
      try {
        const content = await readFile(join(skillsDir, file), 'utf-8');
        const skill = parseSkillMd(content);
        skills.push({
          name: skill.name,
          version: skill.version || 'N/A',
          description: skill.description || '',
          category: skill.category || 'N/A',
          tools: skill.tools?.length || 0,
          examples: skill.examples?.length || 0,
          file,
        });
      } catch (error) {
        console.warn(`⚠ Failed to parse ${file}: ${(error as Error).message}`);
      }
    }

    // Display skills
    if (verbose) {
      console.log(formatOutput(skills, format));
      console.log(`\nTotal: ${skills.length} skill(s)`);
    } else {
      // Simplified display
      const simpleSkills = skills.map((s) => ({
        name: s.name,
        version: s.version,
        category: s.category,
        tools: s.tools,
        examples: s.examples,
      }));
      console.log(formatOutput(simpleSkills, format));
    }

    // Show usage hint
    if (format === 'table') {
      console.log('\nGet skill info:');
      console.log(`  pcl skill info ${skills[0]?.name || '<skill-name>'}`);
    }
  } catch (error) {
    console.error(
      formatError(
        `List error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
