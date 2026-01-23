/**
 * Skill-Specific Registry Metadata
 *
 * Extended metadata for skill artifacts in the registry:
 * - Skill categories and taxonomy
 * - Tool requirements and capabilities
 * - Complexity levels and ratings
 * - Dependencies and compatibility
 * - Usage metrics and analytics
 */

import type { Artifact, ArtifactMetadata } from './interfaces';

/**
 * Skill category taxonomy
 */
export enum SkillCategory {
  // Programming Languages
  LANGUAGE = 'language',
  // Frameworks & Libraries
  FRAMEWORK = 'framework',
  // DevOps & Infrastructure
  DEVOPS = 'devops',
  // Domain-Specific
  DOMAIN = 'domain',
  // Data & Analytics
  DATA = 'data',
  // Security & Compliance
  SECURITY = 'security',
  // Testing & QA
  QA = 'qa',
  // APIs & Integration
  API = 'api',
  // Cloud Platforms
  CLOUD = 'cloud',
  // AI & ML
  AI = 'ai',
  // Professional Services
  PROFESSIONAL = 'professional',
  // Scientific & Research
  SCIENTIFIC = 'scientific',
  // Tools & Utilities
  TOOLS = 'tools',
  // Design & UX
  DESIGN = 'design',
}

/**
 * Skill complexity level
 */
export enum SkillComplexity {
  /** Basic concepts, beginner-friendly */
  BEGINNER = 'beginner',
  /** Intermediate knowledge required */
  INTERMEDIATE = 'intermediate',
  /** Advanced expertise needed */
  ADVANCED = 'advanced',
  /** Expert-level, specialized knowledge */
  EXPERT = 'expert',
}

/**
 * Skill compatibility status
 */
export enum SkillCompatibility {
  /** Fully compatible with other skills */
  COMPATIBLE = 'compatible',
  /** May have conflicts, use with caution */
  CAUTION = 'caution',
  /** Known conflicts with specific skills */
  CONFLICTS = 'conflicts',
  /** Experimental, not fully tested */
  EXPERIMENTAL = 'experimental',
}

/**
 * Skill-specific metadata extension
 */
export interface SkillMetadata extends ArtifactMetadata {
  /** Primary skill category */
  category: SkillCategory;
  /** Subcategories (e.g., "web", "mobile" for frameworks) */
  subcategories?: string[];
  /** Required tools (e.g., ["Read", "Write", "Bash"]) */
  tools: string[];
  /** Complexity level */
  complexity: SkillComplexity;
  /** Token count estimate */
  tokenCount?: number;
  /** Instructions length (characters) */
  instructionsLength?: number;
  /** Number of examples */
  exampleCount?: number;
  /** Dependencies (other skills required) */
  dependencies?: string[];
  /** Skills that conflict with this one */
  conflicts?: string[];
  /** Compatible skill bundles */
  bundles?: string[];
  /** Compatibility status */
  compatibility?: SkillCompatibility;
  /** User rating (0-5) */
  rating?: number;
  /** Number of ratings */
  ratingCount?: number;
  /** Effectiveness score (0-100, based on usage) */
  effectiveness?: number;
  /** Content hash (for change detection) */
  contentHash?: string;
}

/**
 * Skill usage metrics
 */
export interface SkillUsageMetrics {
  /** Skill ID */
  skillId: string;
  /** Total activations */
  activations: number;
  /** Successful uses */
  successCount: number;
  /** Failed uses */
  failureCount: number;
  /** Average response quality (0-100) */
  avgQuality?: number;
  /** Total token usage */
  totalTokens: number;
  /** Average tokens per use */
  avgTokens: number;
  /** Last used timestamp */
  lastUsed: Date;
  /** Usage trend (increasing, stable, decreasing) */
  trend?: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Skill relationship types
 */
export enum SkillRelationType {
  /** Skill depends on another */
  DEPENDS_ON = 'depends_on',
  /** Skill conflicts with another */
  CONFLICTS_WITH = 'conflicts_with',
  /** Skill extends another */
  EXTENDS = 'extends',
  /** Skill supersedes another (newer version) */
  SUPERSEDES = 'supersedes',
  /** Skill is similar to another */
  SIMILAR_TO = 'similar_to',
  /** Skill is bundled with others */
  BUNDLED_WITH = 'bundled_with',
}

/**
 * Skill relationship
 */
export interface SkillRelationship {
  /** Source skill ID */
  fromSkillId: string;
  /** Target skill ID */
  toSkillId: string;
  /** Relationship type */
  type: SkillRelationType;
  /** Optional version constraint */
  versionConstraint?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Skill bundle (collection of related skills)
 */
export interface SkillBundle {
  /** Bundle ID */
  id: string;
  /** Bundle name */
  name: string;
  /** Bundle description */
  description: string;
  /** Included skill IDs */
  skillIds: string[];
  /** Bundle category */
  category: SkillCategory;
  /** Bundle tags */
  tags: string[];
  /** Bundle author */
  author?: string;
  /** Bundle version */
  version: string;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Skill search filters (extended)
 */
export interface SkillSearchFilters {
  /** Filter by category */
  category?: SkillCategory;
  /** Filter by subcategories */
  subcategories?: string[];
  /** Filter by required tools */
  tools?: string[];
  /** Filter by complexity level */
  complexity?: SkillComplexity;
  /** Filter by minimum rating */
  minRating?: number;
  /** Filter by compatibility status */
  compatibility?: SkillCompatibility;
  /** Filter by token count range */
  tokenRange?: { min?: number; max?: number };
  /** Filter by tags */
  tags?: string[];
  /** Filter by keywords */
  keywords?: string[];
  /** Filter by dependencies */
  hasDependencies?: boolean;
  /** Exclude skills with conflicts */
  excludeConflicts?: boolean;
  /** Only trending skills */
  trendingOnly?: boolean;
  /** Only curated skills */
  curatedOnly?: boolean;
}

/**
 * Skill search result with relevance score
 */
export interface SkillSearchResult {
  /** Skill artifact */
  skill: Artifact;
  /** Extended metadata */
  metadata: SkillMetadata;
  /** Relevance score (0-1) */
  relevance: number;
  /** Usage metrics */
  metrics?: SkillUsageMetrics;
  /** Related skills */
  related?: string[];
  /** Highlighted matches (for search term highlighting) */
  highlights?: {
    field: string;
    matches: string[];
  }[];
}

/**
 * Skill compatibility check result
 */
export interface SkillCompatibilityCheck {
  /** Source skill ID */
  skillId: string;
  /** Target skill IDs to check against */
  checkAgainst: string[];
  /** Compatibility results */
  results: {
    targetSkillId: string;
    compatible: boolean;
    reason?: string;
    severity?: 'error' | 'warning' | 'info';
  }[];
  /** Overall compatibility score (0-100) */
  overallScore: number;
}

/**
 * Skill versioning info
 */
export interface SkillVersion {
  /** Version number (semver) */
  version: string;
  /** Skill ID for this version */
  skillId: string;
  /** Release date */
  releasedAt: Date;
  /** Change log */
  changelog?: string;
  /** Breaking changes flag */
  breaking: boolean;
  /** Previous version */
  previousVersion?: string;
  /** Download count for this version */
  downloads: number;
}

/**
 * Skill migration guide
 */
export interface SkillMigrationGuide {
  /** From version */
  fromVersion: string;
  /** To version */
  toVersion: string;
  /** Skill ID */
  skillId: string;
  /** Migration steps */
  steps: {
    description: string;
    code?: string;
    automated?: boolean;
  }[];
  /** Breaking changes */
  breakingChanges: string[];
  /** Estimated migration time */
  estimatedTime?: string;
}

/**
 * Skill trending data
 */
export interface SkillTrending {
  /** Skill ID */
  skillId: string;
  /** Skill name */
  name: string;
  /** Category */
  category: SkillCategory;
  /** Trending score (0-100) */
  trendingScore: number;
  /** Downloads in period */
  downloads: number;
  /** Growth rate (percentage) */
  growthRate: number;
  /** Period (e.g., "week", "month") */
  period: string;
  /** Rank in category */
  rank: number;
}

/**
 * Skill recommendations
 */
export interface SkillRecommendation {
  /** Recommended skill ID */
  skillId: string;
  /** Skill name */
  name: string;
  /** Recommendation reason */
  reason: string;
  /** Relevance score (0-1) */
  relevance: number;
  /** Recommendation type */
  type: 'based-on-usage' | 'similar-skills' | 'frequently-bundled' | 'trending' | 'curated';
}

/**
 * Curated skill collection
 */
export interface CuratedCollection {
  /** Collection ID */
  id: string;
  /** Collection name */
  name: string;
  /** Description */
  description: string;
  /** Curator name */
  curator: string;
  /** Skill IDs in collection */
  skillIds: string[];
  /** Collection tags */
  tags: string[];
  /** Created timestamp */
  createdAt: Date;
  /** Featured flag */
  featured: boolean;
  /** Order (for display) */
  order?: number;
}

/**
 * Skill quality metrics
 */
export interface SkillQualityMetrics {
  /** Skill ID */
  skillId: string;
  /** Documentation score (0-100) */
  documentationScore: number;
  /** Example quality score (0-100) */
  exampleScore: number;
  /** Instruction clarity score (0-100) */
  clarityScore: number;
  /** Completeness score (0-100) */
  completenessScore: number;
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Quality tier */
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Last assessed */
  assessedAt: Date;
}

/**
 * Extended artifact interface for skills
 */
export interface SkillArtifact extends Artifact {
  type: ArtifactType.SKILL;
  metadata: SkillMetadata;
  /** Usage metrics */
  metrics?: SkillUsageMetrics;
  /** Quality metrics */
  quality?: SkillQualityMetrics;
  /** Relationships */
  relationships?: SkillRelationship[];
  /** Version history */
  versions?: SkillVersion[];
}

/**
 * Helper: Create default skill metadata
 */
export function createDefaultSkillMetadata(
  name: string,
  category: SkillCategory
): SkillMetadata {
  return {
    name,
    version: '1.0.0',
    tags: [],
    category,
    tools: [],
    complexity: SkillComplexity.INTERMEDIATE,
  };
}

/**
 * Helper: Calculate skill compatibility score
 */
export function calculateCompatibilityScore(
  skill1: SkillMetadata,
  skill2: SkillMetadata
): number {
  let score = 100;

  // Check for explicit conflicts
  if (skill1.conflicts?.includes(skill2.name) || skill2.conflicts?.includes(skill1.name)) {
    return 0;
  }

  // Check tool overlap (positive signal)
  const toolOverlap = skill1.tools.filter((t) => skill2.tools.includes(t)).length;
  const toolScore = (toolOverlap / Math.max(skill1.tools.length, skill2.tools.length, 1)) * 20;
  score += toolScore;

  // Check category match (positive signal)
  if (skill1.category === skill2.category) {
    score += 10;
  }

  // Check complexity difference (large gap = harder to use together)
  const complexityLevels = {
    [SkillComplexity.BEGINNER]: 1,
    [SkillComplexity.INTERMEDIATE]: 2,
    [SkillComplexity.ADVANCED]: 3,
    [SkillComplexity.EXPERT]: 4,
  };
  const complexityDiff = Math.abs(
    complexityLevels[skill1.complexity] - complexityLevels[skill2.complexity]
  );
  score -= complexityDiff * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Helper: Determine skill quality tier
 */
export function determineQualityTier(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (score >= 90) return 'platinum';
  if (score >= 75) return 'gold';
  if (score >= 60) return 'silver';
  return 'bronze';
}
