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
import { ArtifactType } from '../../../registry/interfaces';
import type * as AST from '../../../ast';

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

    // Extract artifact metadata from AST
    const metadata = extractMetadata(parseResult.value.program, filePath);

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
interface ExtractedMetadata {
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
}

/** Property names copied straight from a declaration into the metadata */
const STRING_PROPERTIES = {
  version: 'version',
  description: 'description',
  author: 'author',
  authorEmail: 'authorEmail',
  organization: 'organization',
  license: 'license',
  slug: 'slug',
} as const;

/**
 * Read a string out of a property initializer. Only literals carry a value
 * that can be published; anything computed is ignored rather than guessed at.
 */
function literalString(
  expression: AST.Expression | null | undefined
): string | undefined {
  if (!expression) {
    return undefined;
  }

  if (expression.kind === 'StringLiteral') {
    return (expression as AST.StringLiteral).value;
  }

  if (expression.kind === 'NumberLiteral') {
    return String((expression as AST.NumberLiteral).value);
  }

  return undefined;
}

/** Collect the string values of a `tags { ... }` block */
function tagValues(block: AST.TagBlock): string[] {
  return block.items.map((item) =>
    item.kind === 'StringTag' ? item.value : item.name.name
  );
}

/** Collect the string values of a `skills { ... }` block */
function skillValues(block: AST.SkillBlock): string[] {
  return block.items.map((item) => {
    if (item.kind === 'StringSkill') {
      return item.value;
    }
    if (item.kind === 'IdentifierSkill') {
      return item.name.name;
    }
    return item.ref.parts.map((part) => part.name).join('::');
  });
}

/**
 * Extract artifact metadata from a parsed PCL program.
 *
 * The first persona, team, workflow or skill declaration in the file
 * determines the artifact type and name.
 */
function extractMetadata(
  program: AST.Program,
  filePath: string
): ExtractedMetadata {
  const metadata: ExtractedMetadata = {
    type: ArtifactType.PERSONA,
    name: 'Unnamed Artifact',
    version: '1.0.0',
    tags: [],
  };

  const DECLARATION_TYPES: Record<string, ArtifactType> = {
    PersonaDeclaration: ArtifactType.PERSONA,
    TeamDeclaration: ArtifactType.TEAM,
    WorkflowDeclaration: ArtifactType.WORKFLOW,
    SkillDeclaration: ArtifactType.SKILL,
  };

  for (const statement of program.statements) {
    const artifactType = DECLARATION_TYPES[statement.kind];
    if (!artifactType) {
      continue;
    }

    const declaration = statement as unknown as {
      id?: AST.Identifier;
      body?: { members?: readonly { kind: string }[] };
    };

    metadata.type = artifactType;
    metadata.name = declaration.id?.name ?? metadata.name;

    for (const member of declaration.body?.members ?? []) {
      if (member.kind === 'PropertyDeclaration') {
        const property = member as unknown as AST.PropertyDeclaration;
        const key = property.name.name;
        const value = literalString(property.initializer);

        if (value !== undefined && key in STRING_PROPERTIES) {
          metadata[key as keyof typeof STRING_PROPERTIES] = value;
        }
        continue;
      }

      if (member.kind === 'TagBlock') {
        metadata.tags = tagValues(member as unknown as AST.TagBlock);
        continue;
      }

      if (member.kind === 'SkillBlock') {
        metadata.skills = skillValues(member as unknown as AST.SkillBlock);
      }
    }

    // The first declaration wins: a file describes one artifact.
    break;
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
