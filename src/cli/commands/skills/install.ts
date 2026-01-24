/**
 * Skill Install CLI Command
 *
 * Install skills from the registry
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { SkillResolver } from '../../../skills/skill-resolver';
import { toSkillMd } from '../../../skills/skill-loader';
import { createRegistry } from '../../config/registry';
import { formatError } from '../../utils/output';

export interface SkillInstallOptions {
  backend?: string;
  directory?: string;
  force?: boolean;
}

/**
 * Install a skill from the registry
 */
export async function skillInstallCommand(
  skillRef: string,
  options: SkillInstallOptions = {}
): Promise<void> {
  const { backend, directory, force = false } = options;

  try {
    console.log(`Installing skill: ${skillRef}`);

    // Connect to registry
    const registry = await createRegistry(backend);

    // Create resolver
    const resolver = new SkillResolver({
      registry,
      baseDir: process.cwd(),
    });

    // Resolve skill
    const result = await resolver.resolve(skillRef);

    if (!result.ok) {
      console.error(formatError('Failed to resolve skill'));
      console.error(result.error.message);
      process.exit(1);
    }

    const { skill, source } = result.value;

    // Determine installation directory
    const installDir = directory || join(process.cwd(), '.claude', 'skills');

    // Ensure directory exists
    if (!existsSync(installDir)) {
      await mkdir(installDir, { recursive: true });
    }

    // Generate file path
    const fileName = `${skill.name}.md`;
    const filePath = join(installDir, fileName);

    // Check if already exists
    if (existsSync(filePath) && !force) {
      console.error(
        formatError(
          `Skill already exists: ${filePath}\nUse --force to overwrite`
        )
      );
      process.exit(1);
    }

    // Convert to SKILL.md format
    const skillMd = toSkillMd(skill);

    // Write file
    await writeFile(filePath, skillMd, 'utf-8');

    console.log('\n✓ Skill installed successfully!');
    console.log(`  Name: ${skill.name}`);
    console.log(`  Version: ${skill.version || '1.0.0'}`);
    console.log(`  File: ${filePath}`);
    console.log(`  Source: ${source}`);

    // Show dependencies
    if (skill.dependencies && skill.dependencies.length > 0) {
      console.log('\nDependencies:');
      skill.dependencies.forEach((dep) => {
        console.log(`  • ${dep}`);
      });
      console.log('\nInstall dependencies with:');
      skill.dependencies.forEach((dep) => {
        console.log(`  pcl skill install ${dep}`);
      });
    }
  } catch (error) {
    console.error(
      formatError(
        `Install error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
