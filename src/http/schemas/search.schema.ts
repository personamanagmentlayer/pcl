/**
 * Search schemas
 */

import { z } from 'zod';
import { ArtifactResponseSchema } from './artifact.schema.js';

/**
 * Search query schema
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Query is required').max(200, 'Query must be at most 200 characters'),
  type: z.enum(['persona', 'skill', 'workflow', 'team']).optional(),
  fuzzy: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  highlight: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(50))
    .default('20'),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0))
    .default('0'),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * Search highlight schema
 */
export const SearchHighlightSchema = z.record(z.array(z.string()));

export type SearchHighlight = z.infer<typeof SearchHighlightSchema>;

/**
 * Search result schema
 */
export const SearchResultSchema = z.object({
  artifact: ArtifactResponseSchema,
  score: z.number().min(0).max(1),
  highlights: SearchHighlightSchema.optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Search response schema
 */
export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().int().min(0),
  query: z.string(),
  took: z.number().min(0), // milliseconds
  pagination: z.object({
    offset: z.number().int().min(0),
    limit: z.number().int().min(1),
    hasMore: z.boolean(),
  }),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/**
 * Search suggestions schema
 */
export const SearchSuggestionsSchema = z.object({
  suggestions: z.array(z.string()),
  query: z.string(),
});

export type SearchSuggestions = z.infer<typeof SearchSuggestionsSchema>;
