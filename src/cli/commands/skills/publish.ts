/**
 * Skill Publish CLI Command
 *
 * Publish skills to the registry
 */

import { readFile } from 'fs/promises';
import { parseSkillMd } from '../../../skills/skill-loader';
import { SkillCompiler } from '../../../skills/skill-compiler';
import { createRegistry } from '../../config/registry';
import { formatError } from '../../utils/output';
import type { ArtifactType } from '../../../registry/interfaces';

export interface SkillPublishOptions {
  backend?: string;
  public?: boolean;
  tags?: string;
  version?: string;
  author?: string;
  license?: string;
}

/**
 * Publish a skill to the registry
 */
export async function skillPublishCommand(
  filePath: string,
  options: SkillPublishOptions = {}
): Promise<void> {
  const {
    backend,
    public: isPublic = false,
    tags,
    version,
    author,
    license,
  } = options;

  try {
    console.log(`Publishing skill: ${filePath}`);

    // Read and parse skill
    const content = await readFile(filePath, 'utf-8');
    const skill = parseSkillMd(content);

    // Compile skill
    const compiler = new SkillCompiler();
    const result = compiler.compile(skill);

    if (!result.success) {
      console.error(formatError('Skill compilation failed!'));
      result.errors.forEach((err) => console.error(`  • ${err}`));
      process.exit(1);
    }

    // Connect to registry
    const registry = await createRegistry(backend);

    // Prepare artifact
    const artifactVersion = version || skill.version || '1.0.0';
    const artifact = {
      type: 'skill' as ArtifactType,
      metadata: {
        name: skill.name,
        version: artifactVersion,
        description: skill.description,
        author: author || skill.metadata?.author,
        license: license || skill.metadata?.license || 'MIT',
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        skills: skill.dependencies || [],
      },
      source: content,
      stats: {
        downloads: 0,
        stars: 0,
        forks: 0,
        views: 0,
      },
      published: isPublic,
      deleted: false,
    };

    // Create artifact in registry
    console.log('\nCreating artifact in registry...');
    const createResult = await registry.create(artifact);

    if (!createResult.ok) {
      console.error(formatError('Creation failed!'));
      console.error(createResult.error.message);
      process.exit(1);
    }

    const created = createResult.value;

    // Publish if public
    if (isPublic) {
      console.log('Publishing to public registry...');
      const publishResult = await registry.publish(created.id, artifactVersion);

      if (!publishResult.ok) {
        console.error(formatError('Publish failed!'));
        console.error(publishResult.error.message);
        process.exit(1);
      }
    }

    console.log('\n✓ Skill published successfully!');
    console.log(`  ID: ${created.id}`);
    console.log(`  Name: ${created.metadata.name}`);
    console.log(`  Version: ${created.metadata.version}`);
    console.log(`  Hash: ${result.skill!.hash}`);
    console.log(`  Public: ${isPublic ? 'Yes' : 'No'}`);

    if (isPublic) {
      console.log('\nSkill is now available for installation:');
      console.log(
        `  pcl skill install ${created.metadata.name}@${created.metadata.version}`
      );
    }
  } catch (error) {
    console.error(
      formatError(
        `Publish error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
