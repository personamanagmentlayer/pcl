/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL Registry System - Complete Demo
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This example demonstrates all major features of the PCL Registry System:
 * - Creating artifacts with validation
 * - Automatic slug generation
 * - Querying and filtering
 * - Full-text search
 * - Version management
 * - Statistics
 * - Error handling
 *
 * Run with: npx tsx examples/registry-demo.ts
 */

import {
  RegistryManager,
  SQLiteBackend,
  ArtifactType,
} from '../../src/registry/index';
import type { Artifact } from '../../src/registry/index';

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(section: string, message: string): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${section}`);
  console.log(`${'='.repeat(80)}`);
  console.log(message);
}

function logSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

function logError(message: string, error?: unknown): void {
  console.error(`❌ ${message}`, error || '');
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              MAIN DEMO
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  log(
    'PCL REGISTRY DEMO',
    'Demonstrating enterprise-grade artifact management'
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. SETUP
  // ═════════════════════════════════════════════════════════════════════════════

  log(
    'STEP 1: Initialize Registry',
    'Setting up SQLite backend with in-memory database'
  );

  const backend = new SQLiteBackend({
    filename: ':memory:', // Use in-memory database for demo
    wal: true,
  });

  await backend.connect();
  logSuccess('Backend connected');

  const registry = new RegistryManager({
    backend,
    autoGenerateSlugs: true,
    validateArtifacts: true,
    cacheTTL: 3600,
  });

  logSuccess('Registry manager initialized with validation enabled');

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. CREATE ARTIFACTS
  // ═════════════════════════════════════════════════════════════════════════════

  log(
    'STEP 2: Create Artifacts',
    'Creating personas with automatic slug generation'
  );

  const pythonExpert = await registry.create({
    type: ArtifactType.PERSONA,
    metadata: {
      name: 'Python Expert',
      description: 'Expert Python developer with PEP 8 knowledge',
      version: '1.0.0',
      author: 'PCL Team',
      authorEmail: 'team@pcl-lang.org',
      tags: ['python', 'programming', 'expert'],
      skills: ['python', 'pep8', 'typing', 'testing'],
      license: 'MIT',
    },
    source: `
      persona PYTHON_EXPERT {
        name: "Python Expert"
        model: "claude-sonnet-4"
        temperature: 0.3

        prompts: {
          system: """
          You are an expert Python developer.
          Follow PEP 8 guidelines strictly.
          Use type hints and write tests.
          """
        }
      }
    `,
    stats: { downloads: 150, stars: 42, views: 500 },
    published: true,
    deleted: false,
  });

  if (!pythonExpert.ok) {
    logError('Failed to create Python Expert', pythonExpert.error);
    process.exit(1);
  }

  logSuccess(`Created: ${pythonExpert.value.metadata.name}`);
  console.log(`  ID: ${pythonExpert.value.id}`);
  console.log(`  Slug: ${pythonExpert.value.metadata.slug} (auto-generated)`);

  const typescriptExpert = await registry.create({
    type: ArtifactType.PERSONA,
    metadata: {
      name: 'TypeScript Expert',
      description: 'Expert TypeScript developer with strict mode expertise',
      version: '1.0.0',
      author: 'PCL Team',
      tags: ['typescript', 'programming', 'expert'],
      skills: ['typescript', 'strict-mode', 'generics'],
      license: 'MIT',
    },
    source: `
      persona TYPESCRIPT_EXPERT {
        name: "TypeScript Expert"
        model: "claude-sonnet-4"
        temperature: 0.3

        prompts: {
          system: "You are an expert TypeScript developer."
        }
      }
    `,
    stats: { downloads: 200, stars: 55, views: 750 },
    published: true,
    deleted: false,
  });

  if (typescriptExpert.ok) {
    logSuccess(`Created: ${typescriptExpert.value.metadata.name}`);
    console.log(`  Slug: ${typescriptExpert.value.metadata.slug}`);
  }

  const codeReviewer = await registry.create({
    type: ArtifactType.PERSONA,
    metadata: {
      name: 'Code Reviewer',
      description: 'Automated code review with security focus',
      version: '1.0.0',
      tags: ['review', 'security', 'quality'],
      skills: ['code-review', 'security', 'owasp'],
    },
    source: 'persona CODE_REVIEWER { name: "Code Reviewer" }',
    stats: { downloads: 95, stars: 30, views: 320 },
    published: true,
    deleted: false,
  });

  if (codeReviewer.ok) {
    logSuccess(`Created: ${codeReviewer.value.metadata.name}`);
  }

  // Create a team
  const expertTeam = await registry.create({
    type: ArtifactType.TEAM,
    metadata: {
      name: 'Expert Development Team',
      version: '1.0.0',
      tags: ['team', 'development'],
    },
    source: `
      team EXPERT_TEAM {
        members: [PYTHON_EXPERT, TYPESCRIPT_EXPERT]
        primary: PYTHON_EXPERT
        merge: "Consensus"
      }
    `,
    stats: { downloads: 25, stars: 10, views: 80 },
    published: true,
    deleted: false,
  });

  if (expertTeam.ok) {
    logSuccess(`Created team: ${expertTeam.value.metadata.name}`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. VALIDATION DEMO
  // ═════════════════════════════════════════════════════════════════════════════

  log('STEP 3: Validation', 'Demonstrating automatic validation');

  // Try to create with invalid version
  const invalidVersion = await registry.create({
    type: ArtifactType.PERSONA,
    metadata: {
      name: 'Invalid Persona',
      version: 'not-a-version', // Invalid!
      tags: [],
    },
    source: 'persona INVALID {}',
    stats: { downloads: 0, stars: 0, views: 0 },
    published: false,
    deleted: false,
  });

  if (!invalidVersion.ok) {
    logSuccess('Validation correctly rejected invalid version format');
    console.log(`  Error: ${invalidVersion.error.message}`);
  }

  // Try to create with invalid email
  const invalidEmail = await registry.create({
    type: ArtifactType.PERSONA,
    metadata: {
      name: 'Invalid Email',
      version: '1.0.0',
      authorEmail: 'not-an-email', // Invalid!
      tags: [],
    },
    source: 'persona INVALID_EMAIL {}',
    stats: { downloads: 0, stars: 0, views: 0 },
    published: false,
    deleted: false,
  });

  if (!invalidEmail.ok) {
    logSuccess('Validation correctly rejected invalid email');
    console.log(`  Error: ${invalidEmail.error.message}`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. QUERYING
  // ═════════════════════════════════════════════════════════════════════════════

  log('STEP 4: Querying', 'Finding artifacts with filters');

  // Find all personas
  const allPersonas = await registry.find({
    filter: { type: ArtifactType.PERSONA, deleted: false },
  });

  if (allPersonas.ok) {
    logSuccess(`Found ${allPersonas.value.length} personas`);
    allPersonas.value.forEach((p) => {
      console.log(`  - ${p.metadata.name} (${p.stats.downloads} downloads)`);
    });
  }

  // Find by tags
  const programmingPersonas = await registry.find({
    filter: { tags: ['programming'], published: true },
    sort: { field: 'downloads', order: 'desc' },
  });

  if (programmingPersonas.ok) {
    logSuccess(
      `Found ${programmingPersonas.value.length} programming personas`
    );
    programmingPersonas.value.forEach((p) => {
      console.log(`  - ${p.metadata.name}: ${p.stats.downloads} downloads`);
    });
  }

  // Find with pagination
  const paginatedResult = await registry.find({
    filter: { type: ArtifactType.PERSONA },
    sort: { field: 'stars', order: 'desc' },
    pagination: { offset: 0, limit: 2 },
  });

  if (paginatedResult.ok) {
    logSuccess('Top 2 personas by stars:');
    paginatedResult.value.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.metadata.name}: ${p.stats.stars} stars`);
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. SEARCH
  // ═════════════════════════════════════════════════════════════════════════════

  log('STEP 5: Full-Text Search', 'Searching artifacts by keywords');

  const searchResult = await registry.search({
    query: 'python expert',
    fields: ['name', 'description', 'tags'],
  });

  if (searchResult.ok) {
    logSuccess(
      `Found ${searchResult.value.length} results for "python expert"`
    );
    searchResult.value.forEach((result) => {
      console.log(
        `  - ${result.artifact.metadata.name} (score: ${result.score})`
      );
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 6. READ BY SLUG
  // ═════════════════════════════════════════════════════════════════════════════

  log('STEP 6: Read by Slug', 'Accessing artifacts via URL-friendly slugs');

  const bySlug = await registry.readBySlug('python-expert');

  if (bySlug.ok && bySlug.value) {
    logSuccess(`Found artifact by slug: ${bySlug.value.metadata.name}`);
    console.log(`  Description: ${bySlug.value.metadata.description}`);
    console.log(`  Version: ${bySlug.value.metadata.version}`);
    console.log(`  Tags: ${bySlug.value.metadata.tags.join(', ')}`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 7. UPDATE
  // ═════════════════════════════════════════════════════════════════════════════

  log('STEP 7: Update Artifact', 'Updating artifact metadata');

  if (pythonExpert.ok) {
    const updateResult = await registry.update(pythonExpert.value.id, {
      metadata: {
        ...pythonExpert.value.metadata,
        description:
          'Updated: Expert Python developer with modern best practices',
      },
      stats: {
        ...pythonExpert.value.stats,
        downloads: pythonExpert.value.stats.downloads + 10,
      },
    });

    if (updateResult.ok) {
      logSuccess('Updated Python Expert artifact');
      console.log(
        `  New description: ${updateResult.value.metadata.description}`
      );
      console.log(`  Downloads: ${updateResult.value.stats.downloads}`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 8. STATISTICS
  // ═════════════════════════════════════════════════════════════════════════════

  log('STEP 8: Registry Statistics', 'Getting registry-wide statistics');

  const statsResult = await registry.stats();

  if (statsResult.ok) {
    const stats = statsResult.value;
    logSuccess('Registry Statistics:');
    console.log(`  Total artifacts: ${stats.total}`);
    console.log(`  Personas: ${stats.byType.persona}`);
    console.log(`  Teams: ${stats.byType.team}`);
    console.log(`  Workflows: ${stats.byType.workflow}`);
    console.log(`  Skills: ${stats.byType.skill}`);
    console.log(`  Total downloads: ${stats.totalDownloads}`);
    console.log(`  Total stars: ${stats.totalStars}`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 9. COUNT
  // ═════════════════════════════════════════════════════════════════════════════

  log('STEP 9: Counting', 'Counting artifacts by criteria');

  const personaCount = await registry.count({
    filter: { type: ArtifactType.PERSONA },
  });

  if (personaCount.ok) {
    logSuccess(`Total personas: ${personaCount.value}`);
  }

  const publishedCount = await registry.count({
    filter: { published: true },
  });

  if (publishedCount.ok) {
    logSuccess(`Published artifacts: ${publishedCount.value}`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 10. CLEANUP
  // ═════════════════════════════════════════════════════════════════════════════

  log('STEP 10: Cleanup', 'Disconnecting from backend');

  await backend.disconnect();
  logSuccess('Backend disconnected');

  // ═════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═════════════════════════════════════════════════════════════════════════════

  log(
    'DEMO COMPLETE',
    `
✅ Created 4 artifacts (3 personas, 1 team)
✅ Validated inputs (rejected invalid version & email)
✅ Queried with filters, sorting, and pagination
✅ Performed full-text search
✅ Accessed artifacts by slug
✅ Updated artifact metadata
✅ Retrieved statistics
✅ Counted artifacts by criteria

The PCL Registry System is production-ready for managing AI personas,
teams, workflows, and skills across multiple backends!
  `
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              RUN DEMO
// ═══════════════════════════════════════════════════════════════════════════════

main().catch((error) => {
  console.error('\n❌ Demo failed:', error);
  process.exit(1);
});
