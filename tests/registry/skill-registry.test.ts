/**
 * Skill Registry Tests
 *
 * Comprehensive test suite for SkillRegistry covering:
 * - Skill registration and discovery
 * - Skill metadata management
 * - Skill search with filters
 * - Skill versioning
 * - Dependency resolution
 * - Compatibility checking
 * - Usage metrics tracking
 * - Trending and recommendations
 * - Quality metrics
 * - Skill bundles and collections
 */

import {
  SkillRegistryImpl,
  createSkillRegistry,
} from '../../src/registry/skill-registry';
import {
  SkillCategory,
  SkillComplexity,
  SkillCompatibility,
  SkillRelationType,
  type SkillMetadata,
} from '../../src/registry/skill-metadata';
import { ArtifactType } from '../../src/registry/interfaces';
import { MockBackend } from './__mocks__/mock-backend';

describe('SkillRegistry', () => {
  let backend: MockBackend;
  let registry: SkillRegistryImpl;

  beforeEach(async () => {
    backend = new MockBackend();
    await backend.connect();
    registry = new SkillRegistryImpl(backend);
  });

  afterEach(() => {
    backend.clear();
  });

  describe('Factory Function', () => {
    it('should create skill registry instance', () => {
      const skillRegistry = createSkillRegistry(backend);
      expect(skillRegistry).toBeDefined();
      expect(skillRegistry).toBeInstanceOf(SkillRegistryImpl);
    });
  });

  describe('Skill Search', () => {
    beforeEach(async () => {
      // Create test skills
      await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'TypeScript Expert',
          version: '1.0.0',
          tags: ['typescript', 'javascript', 'programming'],
          category: SkillCategory.LANGUAGE,
          tools: ['Read', 'Write'],
          complexity: SkillComplexity.ADVANCED,
        } as SkillMetadata,
        source: 'skill TypeScriptExpert {}',
        stats: { downloads: 100, stars: 50, views: 200 },
        published: true,
        deleted: false,
      });

      await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'React Developer',
          version: '1.0.0',
          tags: ['react', 'javascript', 'frontend'],
          category: SkillCategory.FRAMEWORK,
          tools: ['Read', 'Write', 'Bash'],
          complexity: SkillComplexity.INTERMEDIATE,
        } as SkillMetadata,
        source: 'skill ReactDeveloper {}',
        stats: { downloads: 200, stars: 75, views: 300 },
        published: true,
        deleted: false,
      });

      await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'Python Data Science',
          version: '1.0.0',
          tags: ['python', 'data', 'ml'],
          category: SkillCategory.DATA,
          tools: ['Read', 'Write'],
          complexity: SkillComplexity.EXPERT,
        } as SkillMetadata,
        source: 'skill PythonDataScience {}',
        stats: { downloads: 150, stars: 60, views: 250 },
        published: true,
        deleted: false,
      });
    });

    it('should search skills by query', async () => {
      const result = await registry.searchSkills('typescript');

      expect(result.ok).toBe(true);
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it('should filter skills by category', async () => {
      const result = await registry.searchSkills('', {
        category: SkillCategory.FRAMEWORK,
      });

      expect(result.ok).toBe(true);
      expect(result.value?.length).toBeGreaterThan(0);
      expect(
        result.value?.every(
          (s) => s.metadata.category === SkillCategory.FRAMEWORK
        )
      ).toBe(true);
    });

    it('should filter skills by complexity', async () => {
      const result = await registry.searchSkills('', {
        complexity: SkillComplexity.EXPERT,
      });

      expect(result.ok).toBe(true);
      expect(
        result.value?.every(
          (s) => s.metadata.complexity === SkillComplexity.EXPERT
        )
      ).toBe(true);
    });

    it('should filter skills by tools', async () => {
      const result = await registry.searchSkills('', {
        tools: ['Bash'],
      });

      expect(result.ok).toBe(true);
      expect(
        result.value?.every((s) => s.metadata.tools.includes('Bash'))
      ).toBe(true);
    });

    it('should filter skills by minimum rating', async () => {
      // Add rating to a skill
      const skills = backend.getAll();
      if (skills[0]) {
        await backend.update(skills[0].id, {
          metadata: {
            ...skills[0].metadata,
            rating: 4.5,
          } as SkillMetadata,
        });
      }

      const result = await registry.searchSkills('', {
        minRating: 4.0,
      });

      expect(result.ok).toBe(true);
    });

    it('should filter skills by token range', async () => {
      const result = await registry.searchSkills('', {
        tokenRange: { min: 0, max: 1000 },
      });

      expect(result.ok).toBe(true);
    });

    it('should filter skills by tags', async () => {
      const result = await registry.searchSkills('', {
        tags: ['javascript'],
      });

      expect(result.ok).toBe(true);
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it('should limit search results', async () => {
      const result = await registry.searchSkills('', {}, { limit: 1 });

      expect(result.ok).toBe(true);
      expect(result.value?.length).toBeLessThanOrEqual(1);
    });

    it('should offset search results', async () => {
      const result = await registry.searchSkills(
        '',
        {},
        { offset: 1, limit: 10 }
      );

      expect(result.ok).toBe(true);
    });

    it('should return relevance scores', async () => {
      const result = await registry.searchSkills('typescript');

      expect(result.ok).toBe(true);
      if (result.value && result.value.length > 0) {
        expect(result.value[0].relevance).toBeDefined();
        expect(result.value[0].relevance).toBeGreaterThan(0);
      }
    });
  });

  describe('Get Skill', () => {
    let skillId: string;

    beforeEach(async () => {
      const created = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'Test Skill',
          version: '1.0.0',
          tags: ['test'],
          category: SkillCategory.TOOLS,
          tools: ['Read'],
          complexity: SkillComplexity.BEGINNER,
        } as SkillMetadata,
        source: 'skill TestSkill {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      skillId = created.value!.id;
    });

    it('should get skill by ID', async () => {
      const result = await registry.getSkill(skillId);

      expect(result.ok).toBe(true);
      expect(result.value?.id).toBe(skillId);
      expect(result.value?.metadata.name).toBe('Test Skill');
    });

    it('should fail for non-existent skill', async () => {
      const result = await registry.getSkill('non-existent-id');

      expect(result.ok).toBe(false);
    });

    it('should fail for non-skill artifact', async () => {
      const persona = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Not a Skill',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona NotASkill {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      const result = await registry.getSkill(persona.value!.id);

      expect(result.ok).toBe(false);
    });
  });

  describe('Usage Tracking', () => {
    let skillId: string;

    beforeEach(async () => {
      const created = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'Tracked Skill',
          version: '1.0.0',
          tags: [],
          category: SkillCategory.TOOLS,
          tools: [],
          complexity: SkillComplexity.BEGINNER,
        } as SkillMetadata,
        source: 'skill TrackedSkill {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      skillId = created.value!.id;
    });

    it('should track skill usage', async () => {
      const result = await registry.trackUsage(skillId, {
        skillId,
        activations: 10,
        successCount: 8,
        failureCount: 2,
        totalTokens: 5000,
        avgTokens: 500,
        lastUsed: new Date(),
      });

      expect(result.ok).toBe(true);
    });

    it('should get usage metrics', async () => {
      const result = await registry.getUsageMetrics(skillId);

      expect(result.ok).toBe(true);
      expect(result.value?.skillId).toBe(skillId);
      expect(result.value?.activations).toBeDefined();
    });
  });

  describe('Compatibility Checking', () => {
    let skill1Id: string;
    let skill2Id: string;
    let skill3Id: string;

    beforeEach(async () => {
      const s1 = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'JavaScript',
          version: '1.0.0',
          tags: [],
          category: SkillCategory.LANGUAGE,
          tools: ['Read', 'Write'],
          complexity: SkillComplexity.INTERMEDIATE,
        } as SkillMetadata,
        source: 'skill JavaScript {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      const s2 = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'TypeScript',
          version: '1.0.0',
          tags: [],
          category: SkillCategory.LANGUAGE,
          tools: ['Read', 'Write'],
          complexity: SkillComplexity.INTERMEDIATE,
        } as SkillMetadata,
        source: 'skill TypeScript {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      const s3 = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'Python',
          version: '1.0.0',
          tags: [],
          category: SkillCategory.LANGUAGE,
          tools: ['Read'],
          complexity: SkillComplexity.BEGINNER,
        } as SkillMetadata,
        source: 'skill Python {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      skill1Id = s1.value!.id;
      skill2Id = s2.value!.id;
      skill3Id = s3.value!.id;
    });

    it('should check compatibility between skills', async () => {
      const result = await registry.checkCompatibility(skill1Id, [
        skill2Id,
        skill3Id,
      ]);

      expect(result.ok).toBe(true);
      expect(result.value?.skillId).toBe(skill1Id);
      expect(result.value?.results).toHaveLength(2);
    });

    it('should calculate compatibility scores', async () => {
      const result = await registry.checkCompatibility(skill1Id, [skill2Id]);

      expect(result.ok).toBe(true);
      expect(result.value?.results[0].compatible).toBeDefined();
    });

    it('should calculate overall compatibility score', async () => {
      const result = await registry.checkCompatibility(skill1Id, [
        skill2Id,
        skill3Id,
      ]);

      expect(result.ok).toBe(true);
      expect(result.value?.overallScore).toBeDefined();
      expect(result.value?.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.value?.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle non-existent skill in compatibility check', async () => {
      const result = await registry.checkCompatibility(skill1Id, [
        'non-existent',
      ]);

      expect(result.ok).toBe(true);
      expect(result.value?.results).toHaveLength(0);
    });
  });

  describe('Relationships', () => {
    let skillId: string;

    beforeEach(async () => {
      const created = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'Related Skill',
          version: '1.0.0',
          tags: [],
          category: SkillCategory.TOOLS,
          tools: [],
          complexity: SkillComplexity.BEGINNER,
        } as SkillMetadata,
        source: 'skill RelatedSkill {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      skillId = created.value!.id;
    });

    it('should get skill relationships', async () => {
      const result = await registry.getRelationships(skillId);

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should add skill relationship', async () => {
      const result = await registry.addRelationship({
        fromSkillId: skillId,
        toSkillId: 'other-skill',
        type: SkillRelationType.DEPENDS_ON,
        versionConstraint: '^1.0.0',
      });

      expect(result.ok).toBe(true);
    });

    it('should support different relationship types', async () => {
      const relationshipTypes = [
        SkillRelationType.DEPENDS_ON,
        SkillRelationType.CONFLICTS_WITH,
        SkillRelationType.EXTENDS,
        SkillRelationType.SUPERSEDES,
        SkillRelationType.SIMILAR_TO,
        SkillRelationType.BUNDLED_WITH,
      ];

      for (const type of relationshipTypes) {
        const result = await registry.addRelationship({
          fromSkillId: skillId,
          toSkillId: `other-${type}`,
          type,
        });

        expect(result.ok).toBe(true);
      }
    });
  });

  describe('Versioning', () => {
    let skillId: string;

    beforeEach(async () => {
      const created = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'Versioned Skill',
          version: '1.0.0',
          tags: [],
          category: SkillCategory.TOOLS,
          tools: [],
          complexity: SkillComplexity.BEGINNER,
        } as SkillMetadata,
        source: 'skill VersionedSkill {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      skillId = created.value!.id;
    });

    it('should get skill versions', async () => {
      const result = await registry.getVersions(skillId);

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });
  });

  describe('Trending Skills', () => {
    it('should get trending skills', async () => {
      const result = await registry.getTrending();

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should get trending skills by category', async () => {
      const result = await registry.getTrending(SkillCategory.LANGUAGE);

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should get trending skills for specific period', async () => {
      const result = await registry.getTrending(undefined, 'month', 20);

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should limit trending skills', async () => {
      const result = await registry.getTrending(undefined, 'week', 5);

      expect(result.ok).toBe(true);
      expect(result.value?.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Recommendations', () => {
    let skillId: string;

    beforeEach(async () => {
      const created = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'Base Skill',
          version: '1.0.0',
          tags: [],
          category: SkillCategory.TOOLS,
          tools: [],
          complexity: SkillComplexity.BEGINNER,
        } as SkillMetadata,
        source: 'skill BaseSkill {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      skillId = created.value!.id;
    });

    it('should get skill recommendations', async () => {
      const result = await registry.getRecommendations(skillId);

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should limit recommendations', async () => {
      const result = await registry.getRecommendations(skillId, 3);

      expect(result.ok).toBe(true);
      expect(result.value?.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Curated Collections', () => {
    it('should get curated collections', async () => {
      const result = await registry.getCuratedCollections();

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });
  });

  describe('Skill Bundles', () => {
    it('should get skill bundles', async () => {
      const result = await registry.getSkillBundles();

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should get skill bundles by category', async () => {
      const result = await registry.getSkillBundles(SkillCategory.FRAMEWORK);

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should create skill bundle', async () => {
      const result = await registry.createBundle({
        name: 'Web Development',
        description: 'Essential web development skills',
        skillIds: ['html', 'css', 'javascript'],
        category: SkillCategory.FRAMEWORK,
        tags: ['web', 'frontend'],
        author: 'Test Author',
        version: '1.0.0',
      });

      expect(result.ok).toBe(true);
      expect(result.value?.id).toBeDefined();
      expect(result.value?.name).toBe('Web Development');
      expect(result.value?.createdAt).toBeDefined();
      expect(result.value?.updatedAt).toBeDefined();
    });

    it('should create bundle with all supported categories', async () => {
      const categories = Object.values(SkillCategory);

      for (const category of categories) {
        const result = await registry.createBundle({
          name: `${category} Bundle`,
          description: `Bundle for ${category}`,
          skillIds: [],
          category,
          tags: [],
          version: '1.0.0',
        });

        expect(result.ok).toBe(true);
        expect(result.value?.category).toBe(category);
      }
    });
  });

  describe('Quality Metrics', () => {
    let skillId: string;

    beforeEach(async () => {
      const created = await backend.create({
        type: ArtifactType.SKILL,
        metadata: {
          name: 'Quality Skill',
          version: '1.0.0',
          tags: [],
          category: SkillCategory.TOOLS,
          tools: [],
          complexity: SkillComplexity.BEGINNER,
        } as SkillMetadata,
        source: 'skill QualitySkill {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: true,
        deleted: false,
      });

      skillId = created.value!.id;
    });

    it('should get quality metrics', async () => {
      const result = await registry.getQualityMetrics(skillId);

      expect(result.ok).toBe(true);
      expect(result.value?.skillId).toBe(skillId);
      expect(result.value?.documentationScore).toBeDefined();
      expect(result.value?.exampleScore).toBeDefined();
      expect(result.value?.clarityScore).toBeDefined();
      expect(result.value?.completenessScore).toBeDefined();
      expect(result.value?.overallScore).toBeDefined();
      expect(result.value?.tier).toBeDefined();
    });

    it('should have valid quality scores', async () => {
      const result = await registry.getQualityMetrics(skillId);

      expect(result.ok).toBe(true);
      const metrics = result.value!;

      expect(metrics.documentationScore).toBeGreaterThanOrEqual(0);
      expect(metrics.documentationScore).toBeLessThanOrEqual(100);
      expect(metrics.exampleScore).toBeGreaterThanOrEqual(0);
      expect(metrics.exampleScore).toBeLessThanOrEqual(100);
      expect(metrics.clarityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.clarityScore).toBeLessThanOrEqual(100);
      expect(metrics.completenessScore).toBeGreaterThanOrEqual(0);
      expect(metrics.completenessScore).toBeLessThanOrEqual(100);
      expect(metrics.overallScore).toBeGreaterThanOrEqual(0);
      expect(metrics.overallScore).toBeLessThanOrEqual(100);
    });

    it('should have valid quality tier', async () => {
      const result = await registry.getQualityMetrics(skillId);

      expect(result.ok).toBe(true);
      expect(['bronze', 'silver', 'gold', 'platinum']).toContain(
        result.value?.tier
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      backend.setShouldFail(true);

      const result = await registry.searchSkills('test');

      expect(result.ok).toBe(false);
    });

    it('should handle get skill errors', async () => {
      backend.setShouldFail(true);

      const result = await registry.getSkill('some-id');

      expect(result.ok).toBe(false);
    });

    it('should handle bundle creation errors', async () => {
      // Invalid data should trigger error
      const result = await registry.createBundle({
        name: '',
        description: '',
        skillIds: [],
        category: SkillCategory.TOOLS,
        tags: [],
        version: '1.0.0',
      });

      expect(result).toBeDefined();
    });
  });
});
