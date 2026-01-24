/**
 * Artifact schemas for validation
 */

import { z } from 'zod';

/**
 * Artifact type enumeration
 */
export const ArtifactTypeSchema = z.enum([
  'persona',
  'skill',
  'workflow',
  'team',
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

/**
 * Artifact metadata schema
 */
export const ArtifactMetadataSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and underscores'
    ),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be at most 500 characters'),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  tags: z
    .array(z.string().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .default([]),
  license: z.string().max(50).default('MIT').optional(),
  repository: z.string().url('Repository must be a valid URL').optional(),
  homepage: z.string().url('Homepage must be a valid URL').optional(),
  keywords: z
    .array(z.string().min(1).max(30))
    .max(20, 'Maximum 20 keywords allowed')
    .default([])
    .optional(),
});

export type ArtifactMetadata = z.infer<typeof ArtifactMetadataSchema>;

/**
 * Artifact statistics schema
 */
export const ArtifactStatsSchema = z.object({
  downloads: z.number().int().min(0).default(0),
  stars: z.number().int().min(0).default(0),
  views: z.number().int().min(0).default(0),
});

export type ArtifactStats = z.infer<typeof ArtifactStatsSchema>;

/**
 * Create artifact request schema
 */
export const CreateArtifactSchema = z.object({
  type: ArtifactTypeSchema,
  metadata: ArtifactMetadataSchema,
  source: z
    .string()
    .min(10, 'Source code must be at least 10 characters')
    .max(100000, 'Source code must be at most 100KB'),
  published: z.boolean().default(false),
});

export type CreateArtifactInput = z.infer<typeof CreateArtifactSchema>;

/**
 * Update artifact request schema
 */
export const UpdateArtifactSchema = z.object({
  metadata: ArtifactMetadataSchema.partial(),
  source: z
    .string()
    .min(10, 'Source code must be at least 10 characters')
    .max(100000, 'Source code must be at most 100KB')
    .optional(),
  published: z.boolean().optional(),
});

export type UpdateArtifactInput = z.infer<typeof UpdateArtifactSchema>;

/**
 * Artifact response schema
 */
export const ArtifactResponseSchema = z.object({
  id: z.string(),
  type: ArtifactTypeSchema,
  metadata: ArtifactMetadataSchema,
  source: z.string(),
  stats: ArtifactStatsSchema,
  published: z.boolean(),
  authorId: z.string(),
  authorUsername: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ArtifactResponse = z.infer<typeof ArtifactResponseSchema>;

/**
 * List artifacts query schema
 */
export const ListArtifactsQuerySchema = z.object({
  type: ArtifactTypeSchema.optional(),
  tags: z.string().optional(), // Comma-separated tags
  author: z.string().optional(),
  search: z.string().max(100).optional(),
  published: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  limit: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .default('0')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0)),
  sort: z
    .enum([
      'createdAt:asc',
      'createdAt:desc',
      'downloads:asc',
      'downloads:desc',
      'stars:asc',
      'stars:desc',
    ])
    .default('createdAt:desc')
    .optional(),
});

export type ListArtifactsQuery = z.infer<typeof ListArtifactsQuerySchema>;

/**
 * List artifacts response schema
 */
export const ListArtifactsResponseSchema = z.object({
  artifacts: z.array(ArtifactResponseSchema),
  pagination: z.object({
    total: z.number().int().min(0),
    offset: z.number().int().min(0),
    limit: z.number().int().min(1),
    hasMore: z.boolean(),
  }),
});

export type ListArtifactsResponse = z.infer<typeof ListArtifactsResponseSchema>;

/**
 * Star/unstar artifact response schema
 */
export const StarResponseSchema = z.object({
  starred: z.boolean(),
  totalStars: z.number().int().min(0),
});

export type StarResponse = z.infer<typeof StarResponseSchema>;
