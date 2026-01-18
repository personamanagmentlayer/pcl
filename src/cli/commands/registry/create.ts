/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry Create Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse } from '../../../parser';
import { createRegistry } from '../../config/registry';
import { formatSuccess, formatError, formatWarning } from '../../utils/output';
import { formatArtifactDetails } from '../../utils/output';
import type { ArtifactType } from '../../../registry/interfaces';

export interface CreateOptions {
  backend?: string;
  publish?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Create an artifact from a PCL file
 */
export async function createCommand(
  filePath: string,
  options: CreateOptions = {}
): Promise<void> {
  const { backend, publish = false, dryRun = false, force = false } = options;

  try {
    // Validate file exists
    const absolutePath = resolve(filePath);
    if (!existsSync(absolutePath)) {
      console.error(formatError(`File not found: ${filePath}`));
      process.exit(1);
    }

    // Read PCL file
    console.log(`Reading PCL file: ${filePath}`);
    const source = readFileSync(absolutePath, 'utf-8');

    // Parse PCL source
    console.log('Parsing PCL source...');
    const parseResult = parse(source);

    if (!parseResult.ok) {
      console.error(formatError('Failed to parse PCL file'));
      console.error(parseResult.error.map((e) => e.message).join('\n'));
      process.exit(1);
    }

    const ast = parseResult.value;

    // Extract artifact metadata from AST
    const metadata = extractMetadata(ast, filePath);

    if (dryRun) {
      console.log(formatWarning('Dry run mode - artifact will not be created'));
      console.log('\nExtracted Metadata:');
      console.log(JSON.stringify(metadata, null, 2));
      return;
    }

    // Connect to registry
    console.log(`Connecting to registry (backend: ${backend || 'default'})...`);
    const registry = await createRegistry(backend);

    // Check if artifact already exists (search by slug)
    if (metadata.slug) {
      const existing = await registry.find({
        filter: {
          deleted: false,
        },
      });

      if (existing.ok && existing.value) {
        const duplicate = existing.value.find(
          (a) => a.metadata.slug === metadata.slug
        );

        if (duplicate && !force) {
          console.error(
            formatError(
              `Artifact already exists: ${duplicate.metadata.name} (${duplicate.id})`
            )
          );
          console.error('Use --force to overwrite');
          process.exit(1);
        }

        if (duplicate) {
          console.log(
            formatWarning(
              `Overwriting existing artifact: ${duplicate.metadata.name}`
            )
          );
        }
      }
    }

    // Create artifact
    console.log(`Creating ${metadata.type} artifact: ${metadata.name}...`);
    const createResult = await registry.create({
      type: metadata.type,
      source: source,
      metadata: {
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        tags: metadata.tags || [],
        author: metadata.author,
        authorEmail: metadata.authorEmail,
        organization: metadata.organization,
        license: metadata.license,
        skills: metadata.skills,
        slug: metadata.slug,
      },
      stats: {
        downloads: 0,
        stars: 0,
        views: 0,
      },
      published: false,
      deleted: false,
    });

    if (!createResult.ok) {
      console.error(formatError('Failed to create artifact'));
      console.error(createResult.error.message);
      process.exit(1);
    }

    const artifact = createResult.value;
    console.log(formatSuccess(`Created artifact: ${artifact.id}`));

    // Publish if requested
    if (publish) {
      console.log('Publishing artifact...');
      const publishResult = await registry.publish(
        artifact.id,
        artifact.metadata.version
      );

      if (!publishResult.ok) {
        console.error(formatError('Failed to publish artifact'));
        console.error(publishResult.error.message);
        process.exit(1);
      }

      console.log(formatSuccess('Artifact published successfully'));
    }

    // Display artifact details
    console.log('\n' + formatArtifactDetails(artifact));

    // Close registry connection
    // await registry.close(); // Not needed - auto-closes on process exit
  } catch (error) {
    console.error(
      formatError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}

/**
 * Extract artifact metadata from PCL AST
 */
function extractMetadata(
  ast: any,
  filePath: string
): {
  type: ArtifactType;
  name: string;
  version: string;
  description?: string;
  tags: string[];
  author?: string;
  authorEmail?: string;
  organization?: string;
  license?: string;
  skills?: string[];
  slug?: string;
} {
  // Default metadata
  const metadata: any = {
    type: 'persona' as ArtifactType,
    name: 'Unnamed Artifact',
    version: '1.0.0',
    tags: [],
  };

  // Extract from AST structure
  if (ast.type === 'Program' && ast.body) {
    for (const node of ast.body) {
      // Extract persona definition
      if (node.type === 'PersonaDeclaration') {
        metadata.type = 'persona';
        metadata.name = node.name || metadata.name;

        // Extract metadata from persona properties
        if (node.properties) {
          for (const prop of node.properties) {
            switch (prop.key) {
              case 'version':
                metadata.version = prop.value;
                break;
              case 'description':
                metadata.description = prop.value;
                break;
              case 'tags':
                metadata.tags = Array.isArray(prop.value)
                  ? prop.value
                  : [prop.value];
                break;
              case 'author':
                metadata.author = prop.value;
                break;
              case 'authorEmail':
                metadata.authorEmail = prop.value;
                break;
              case 'organization':
                metadata.organization = prop.value;
                break;
              case 'license':
                metadata.license = prop.value;
                break;
              case 'slug':
                metadata.slug = prop.value;
                break;
            }
          }
        }

        // Extract skills
        if (node.skills && Array.isArray(node.skills)) {
          metadata.skills = node.skills.map((s: any) => s.name || s);
        }
      }

      // Extract team definition
      if (node.type === 'TeamDeclaration') {
        metadata.type = 'team';
        metadata.name = node.name || metadata.name;
        // Extract team-specific metadata...
      }

      // Extract workflow definition
      if (node.type === 'WorkflowDeclaration') {
        metadata.type = 'workflow';
        metadata.name = node.name || metadata.name;
        // Extract workflow-specific metadata...
      }

      // Extract skill definition
      if (node.type === 'SkillDeclaration') {
        metadata.type = 'skill';
        metadata.name = node.name || metadata.name;
        // Extract skill-specific metadata...
      }
    }
  }

  // Fallback: try to infer from file name
  if (metadata.name === 'Unnamed Artifact') {
    const fileName = filePath
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.pcl$/, '');
    if (fileName) {
      metadata.name = fileName
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  return metadata;
}
