/**
 * Version schemas for artifact versioning
 */

import { z } from 'zod';

/**
 * Semver version schema
 */
export const SemverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)');

/**
 * Version metadata schema
 */
export const VersionMetadataSchema = z.object({
  changelog: z
    .string()
    .max(2000, 'Changelog must be at most 2000 characters')
    .optional(),
  breaking: z.boolean().default(false),
  deprecated: z.boolean().default(false),
  deprecationMessage: z
    .string()
    .max(500, 'Deprecation message must be at most 500 characters')
    .optional(),
});

export type VersionMetadata = z.infer<typeof VersionMetadataSchema>;

/**
 * Create version request schema
 */
export const CreateVersionSchema = z.object({
  version: SemverSchema,
  source: z
    .string()
    .min(10, 'Source code must be at least 10 characters')
    .max(100000, 'Source code must be at most 100KB'),
  metadata: VersionMetadataSchema.optional(),
  published: z.boolean().default(false),
});

export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;

/**
 * Update version request schema
 */
export const UpdateVersionSchema = z.object({
  source: z
    .string()
    .min(10, 'Source code must be at least 10 characters')
    .max(100000, 'Source code must be at most 100KB')
    .optional(),
  metadata: VersionMetadataSchema.partial().optional(),
  published: z.boolean().optional(),
});

export type UpdateVersionInput = z.infer<typeof UpdateVersionSchema>;

/**
 * Version response schema
 */
export const VersionResponseSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  version: SemverSchema,
  source: z.string(),
  metadata: VersionMetadataSchema,
  published: z.boolean(),
  downloads: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type VersionResponse = z.infer<typeof VersionResponseSchema>;

/**
 * List versions response schema
 */
export const ListVersionsResponseSchema = z.object({
  versions: z.array(VersionResponseSchema),
  total: z.number().int().min(0),
});

export type ListVersionsResponse = z.infer<typeof ListVersionsResponseSchema>;

/**
 * Version comparison result schema
 */
export const VersionComparisonSchema = z.object({
  isNewer: z.boolean(),
  isMajor: z.boolean(),
  isMinor: z.boolean(),
  isPatch: z.boolean(),
  diff: z.object({
    major: z.number().int(),
    minor: z.number().int(),
    patch: z.number().int(),
  }),
});

export type VersionComparison = z.infer<typeof VersionComparisonSchema>;
