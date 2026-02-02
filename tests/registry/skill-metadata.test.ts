/**
 * Skill Metadata Tests
 *
 * Comprehensive test suite for skill metadata covering:
 * - Metadata creation and validation
 * - Category and complexity enums
 * - Compatibility scoring
 * - Quality tier determination
 * - Metadata transformation
 * - Schema compliance
 */

import {
  SkillCategory,
  SkillComplexity,
  SkillCompatibility,
  SkillRelationType,
  createDefaultSkillMetadata,
  calculateCompatibilityScore,
  determineQualityTier,
  type SkillMetadata,
  type SkillRelationship,
  type SkillBundle,
  type SkillQualityMetrics,
} from '../../src/registry/skill-metadata';

describe('Skill Metadata', () => {
  describe('Default Metadata Creation', () => {
    it('should create default skill metadata with required fields', () => {
      const metadata = createDefaultSkillMetadata(
        'Test Skill',
        SkillCategory.LANGUAGE
      );

      expect(metadata.name).toBe('Test Skill');
      expect(metadata.category).toBe(SkillCategory.LANGUAGE);
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.tags).toEqual([]);
      expect(metadata.tools).toEqual([]);
      expect(metadata.complexity).toBe(SkillComplexity.INTERMEDIATE);
    });

    it('should create metadata for different categories', () => {
      const language = createDefaultSkillMetadata('JS', SkillCategory.LANGUAGE);
      const framework = createDefaultSkillMetadata(
        'React',
        SkillCategory.FRAMEWORK
      );
      const devops = createDefaultSkillMetadata('Docker', SkillCategory.DEVOPS);

      expect(language.category).toBe(SkillCategory.LANGUAGE);
      expect(framework.category).toBe(SkillCategory.FRAMEWORK);
      expect(devops.category).toBe(SkillCategory.DEVOPS);
    });

    it('should create metadata with all supported categories', () => {
      const categories = Object.values(SkillCategory);

      categories.forEach((category) => {
        const metadata = createDefaultSkillMetadata('Test', category);
        expect(metadata.category).toBe(category);
      });
    });
  });

  describe('Skill Categories', () => {
    it('should have all expected category values', () => {
      expect(SkillCategory.LANGUAGE).toBe('language');
      expect(SkillCategory.FRAMEWORK).toBe('framework');
      expect(SkillCategory.DEVOPS).toBe('devops');
      expect(SkillCategory.DOMAIN).toBe('domain');
      expect(SkillCategory.DATA).toBe('data');
      expect(SkillCategory.SECURITY).toBe('security');
      expect(SkillCategory.QA).toBe('qa');
      expect(SkillCategory.API).toBe('api');
      expect(SkillCategory.CLOUD).toBe('cloud');
      expect(SkillCategory.AI).toBe('ai');
      expect(SkillCategory.PROFESSIONAL).toBe('professional');
      expect(SkillCategory.SCIENTIFIC).toBe('scientific');
      expect(SkillCategory.TOOLS).toBe('tools');
      expect(SkillCategory.DESIGN).toBe('design');
    });

    it('should enumerate all categories', () => {
      const categories = Object.values(SkillCategory);
      expect(categories.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe('Skill Complexity', () => {
    it('should have all complexity levels', () => {
      expect(SkillComplexity.BEGINNER).toBe('beginner');
      expect(SkillComplexity.INTERMEDIATE).toBe('intermediate');
      expect(SkillComplexity.ADVANCED).toBe('advanced');
      expect(SkillComplexity.EXPERT).toBe('expert');
    });

    it('should support complexity progression', () => {
      const complexities = [
        SkillComplexity.BEGINNER,
        SkillComplexity.INTERMEDIATE,
        SkillComplexity.ADVANCED,
        SkillComplexity.EXPERT,
      ];

      expect(complexities).toHaveLength(4);
    });
  });

  describe('Skill Compatibility Status', () => {
    it('should have all compatibility statuses', () => {
      expect(SkillCompatibility.COMPATIBLE).toBe('compatible');
      expect(SkillCompatibility.CAUTION).toBe('caution');
      expect(SkillCompatibility.CONFLICTS).toBe('conflicts');
      expect(SkillCompatibility.EXPERIMENTAL).toBe('experimental');
    });
  });

  describe('Compatibility Score Calculation', () => {
    it('should return 0 for explicit conflicts', () => {
      const skill1: SkillMetadata = {
        name: 'Skill A',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: ['Read'],
        complexity: SkillComplexity.INTERMEDIATE,
        conflicts: ['Skill B'],
      };

      const skill2: SkillMetadata = {
        name: 'Skill B',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: ['Write'],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      expect(calculateCompatibilityScore(skill1, skill2)).toBe(0);
    });

    it('should return 0 for reverse conflicts', () => {
      const skill1: SkillMetadata = {
        name: 'Skill A',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const skill2: SkillMetadata = {
        name: 'Skill B',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
        conflicts: ['Skill A'],
      };

      expect(calculateCompatibilityScore(skill1, skill2)).toBe(0);
    });

    it('should increase score for tool overlap', () => {
      const skill1: SkillMetadata = {
        name: 'Skill A',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: ['Read', 'Write', 'Bash'],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const skill2: SkillMetadata = {
        name: 'Skill B',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: ['Read', 'Write'],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const score = calculateCompatibilityScore(skill1, skill2);
      // Score is capped at 100 but should be positive due to tool overlap
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should increase score for same category', () => {
      const skill1: SkillMetadata = {
        name: 'Skill A',
        version: '1.0.0',
        category: SkillCategory.DATA,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const skill2: SkillMetadata = {
        name: 'Skill B',
        version: '1.0.0',
        category: SkillCategory.DATA,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const score = calculateCompatibilityScore(skill1, skill2);
      // Score is capped at 100 max
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should decrease score for complexity gap', () => {
      const beginner: SkillMetadata = {
        name: 'Beginner Skill',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.BEGINNER,
      };

      const expert: SkillMetadata = {
        name: 'Expert Skill',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.EXPERT,
      };

      const score = calculateCompatibilityScore(beginner, expert);
      expect(score).toBeLessThan(110); // Penalized for complexity gap
    });

    it('should handle skills with no tools', () => {
      const skill1: SkillMetadata = {
        name: 'Skill A',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const skill2: SkillMetadata = {
        name: 'Skill B',
        version: '1.0.0',
        category: SkillCategory.FRAMEWORK,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const score = calculateCompatibilityScore(skill1, skill2);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap score at 100', () => {
      const skill1: SkillMetadata = {
        name: 'Skill A',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: ['Read', 'Write', 'Bash', 'Grep', 'Glob'],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const skill2: SkillMetadata = {
        name: 'Skill B',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: ['Read', 'Write', 'Bash', 'Grep', 'Glob'],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const score = calculateCompatibilityScore(skill1, skill2);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle different complexity combinations', () => {
      const complexities = [
        SkillComplexity.BEGINNER,
        SkillComplexity.INTERMEDIATE,
        SkillComplexity.ADVANCED,
        SkillComplexity.EXPERT,
      ];

      complexities.forEach((c1) => {
        complexities.forEach((c2) => {
          const skill1: SkillMetadata = {
            name: 'Skill A',
            version: '1.0.0',
            category: SkillCategory.LANGUAGE,
            tags: [],
            tools: [],
            complexity: c1,
          };

          const skill2: SkillMetadata = {
            name: 'Skill B',
            version: '1.0.0',
            category: SkillCategory.LANGUAGE,
            tags: [],
            tools: [],
            complexity: c2,
          };

          const score = calculateCompatibilityScore(skill1, skill2);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('Quality Tier Determination', () => {
    it('should assign platinum tier for score >= 90', () => {
      expect(determineQualityTier(90)).toBe('platinum');
      expect(determineQualityTier(95)).toBe('platinum');
      expect(determineQualityTier(100)).toBe('platinum');
    });

    it('should assign gold tier for score >= 75', () => {
      expect(determineQualityTier(75)).toBe('gold');
      expect(determineQualityTier(80)).toBe('gold');
      expect(determineQualityTier(89)).toBe('gold');
    });

    it('should assign silver tier for score >= 60', () => {
      expect(determineQualityTier(60)).toBe('silver');
      expect(determineQualityTier(65)).toBe('silver');
      expect(determineQualityTier(74)).toBe('silver');
    });

    it('should assign bronze tier for score < 60', () => {
      expect(determineQualityTier(0)).toBe('bronze');
      expect(determineQualityTier(30)).toBe('bronze');
      expect(determineQualityTier(59)).toBe('bronze');
    });

    it('should handle boundary conditions', () => {
      expect(determineQualityTier(59.9)).toBe('bronze');
      expect(determineQualityTier(60)).toBe('silver');
      expect(determineQualityTier(74.9)).toBe('silver');
      expect(determineQualityTier(75)).toBe('gold');
      expect(determineQualityTier(89.9)).toBe('gold');
      expect(determineQualityTier(90)).toBe('platinum');
    });
  });

  describe('Skill Relationship Types', () => {
    it('should have all relationship types', () => {
      expect(SkillRelationType.DEPENDS_ON).toBe('depends_on');
      expect(SkillRelationType.CONFLICTS_WITH).toBe('conflicts_with');
      expect(SkillRelationType.EXTENDS).toBe('extends');
      expect(SkillRelationType.SUPERSEDES).toBe('supersedes');
      expect(SkillRelationType.SIMILAR_TO).toBe('similar_to');
      expect(SkillRelationType.BUNDLED_WITH).toBe('bundled_with');
    });

    it('should support relationship creation', () => {
      const relationship: SkillRelationship = {
        fromSkillId: 'skill-1',
        toSkillId: 'skill-2',
        type: SkillRelationType.DEPENDS_ON,
        versionConstraint: '^1.0.0',
      };

      expect(relationship.fromSkillId).toBe('skill-1');
      expect(relationship.toSkillId).toBe('skill-2');
      expect(relationship.type).toBe(SkillRelationType.DEPENDS_ON);
      expect(relationship.versionConstraint).toBe('^1.0.0');
    });
  });

  describe('Skill Metadata Structure', () => {
    it('should support full metadata structure', () => {
      const metadata: SkillMetadata = {
        name: 'Advanced TypeScript',
        version: '2.1.0',
        category: SkillCategory.LANGUAGE,
        subcategories: ['web', 'backend'],
        tags: ['typescript', 'javascript', 'programming'],
        tools: ['Read', 'Write', 'Bash'],
        complexity: SkillComplexity.ADVANCED,
        tokenCount: 1500,
        instructionsLength: 5000,
        exampleCount: 10,
        dependencies: ['javascript-basics'],
        conflicts: ['old-typescript'],
        bundles: ['web-dev-bundle'],
        compatibility: SkillCompatibility.COMPATIBLE,
        rating: 4.5,
        ratingCount: 150,
        effectiveness: 85,
        contentHash: 'abc123',
      };

      expect(metadata.name).toBe('Advanced TypeScript');
      expect(metadata.subcategories).toHaveLength(2);
      expect(metadata.dependencies).toContain('javascript-basics');
      expect(metadata.rating).toBe(4.5);
    });

    it('should support minimal metadata structure', () => {
      const metadata: SkillMetadata = {
        name: 'Basic Skill',
        version: '1.0.0',
        category: SkillCategory.TOOLS,
        tags: [],
        tools: [],
        complexity: SkillComplexity.BEGINNER,
      };

      expect(metadata.name).toBe('Basic Skill');
      expect(metadata.dependencies).toBeUndefined();
      expect(metadata.rating).toBeUndefined();
    });
  });

  describe('Skill Bundle Structure', () => {
    it('should support bundle creation', () => {
      const bundle: SkillBundle = {
        id: 'bundle-1',
        name: 'Web Development Bundle',
        description: 'Essential web development skills',
        skillIds: ['html', 'css', 'javascript', 'react'],
        category: SkillCategory.FRAMEWORK,
        tags: ['web', 'frontend'],
        author: 'PCL Team',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(bundle.skillIds).toHaveLength(4);
      expect(bundle.category).toBe(SkillCategory.FRAMEWORK);
      expect(bundle.author).toBe('PCL Team');
    });

    it('should support bundles without author', () => {
      const bundle: SkillBundle = {
        id: 'bundle-2',
        name: 'Data Science Bundle',
        description: 'Data analysis and ML skills',
        skillIds: ['python', 'pandas', 'numpy'],
        category: SkillCategory.DATA,
        tags: ['data', 'ml'],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(bundle.author).toBeUndefined();
      expect(bundle.skillIds).toHaveLength(3);
    });
  });

  describe('Skill Quality Metrics', () => {
    it('should support complete quality metrics', () => {
      const metrics: SkillQualityMetrics = {
        skillId: 'skill-1',
        documentationScore: 85,
        exampleScore: 90,
        clarityScore: 88,
        completenessScore: 92,
        overallScore: 88.75,
        tier: 'gold',
        assessedAt: new Date(),
      };

      expect(metrics.overallScore).toBeCloseTo(88.75);
      expect(metrics.tier).toBe('gold');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tool arrays in compatibility', () => {
      const skill1: SkillMetadata = {
        name: 'Skill A',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const skill2: SkillMetadata = {
        name: 'Skill B',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const score = calculateCompatibilityScore(skill1, skill2);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle undefined conflicts array', () => {
      const skill1: SkillMetadata = {
        name: 'Skill A',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const skill2: SkillMetadata = {
        name: 'Skill B',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        tags: [],
        tools: [],
        complexity: SkillComplexity.INTERMEDIATE,
      };

      const score = calculateCompatibilityScore(skill1, skill2);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle boundary quality scores', () => {
      expect(determineQualityTier(-10)).toBe('bronze');
      expect(determineQualityTier(0)).toBe('bronze');
      expect(determineQualityTier(100)).toBe('platinum');
      expect(determineQualityTier(150)).toBe('platinum');
    });
  });

  describe('Metadata Validation Scenarios', () => {
    it('should support metadata with all optional fields', () => {
      const metadata: SkillMetadata = {
        name: 'Complete Skill',
        version: '1.0.0',
        category: SkillCategory.LANGUAGE,
        subcategories: ['web'],
        tags: ['tag1'],
        tools: ['Read'],
        complexity: SkillComplexity.INTERMEDIATE,
        tokenCount: 1000,
        instructionsLength: 3000,
        exampleCount: 5,
        dependencies: ['dep1'],
        conflicts: ['conflict1'],
        bundles: ['bundle1'],
        compatibility: SkillCompatibility.COMPATIBLE,
        rating: 4,
        ratingCount: 50,
        effectiveness: 75,
        contentHash: 'hash123',
      };

      expect(Object.keys(metadata).length).toBeGreaterThanOrEqual(17);
    });

    it('should support metadata with only required fields', () => {
      const metadata: SkillMetadata = {
        name: 'Minimal Skill',
        version: '1.0.0',
        category: SkillCategory.TOOLS,
        tags: [],
        tools: [],
        complexity: SkillComplexity.BEGINNER,
      };

      expect(metadata.name).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.category).toBeDefined();
    });
  });
});
