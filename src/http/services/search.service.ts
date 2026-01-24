/**
 * Search Service
 */

import type { SearchQuery, SearchResponse, SearchResult, SearchSuggestions } from '../schemas/search.schema.js';
import { listArtifacts } from './artifact.service.js';

/**
 * Calculate fuzzy match score (Levenshtein-based similarity)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match
  if (s1 === s2) return 1.0;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Highlight matches in text
 */
function highlightText(text: string, query: string): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  const before = text.substring(0, index);
  const match = text.substring(index, index + query.length);
  const after = text.substring(index + query.length);

  return `${before}<em>${match}</em>${after}`;
}

/**
 * Search artifacts with full-text search
 */
export async function searchArtifacts(query: SearchQuery): Promise<SearchResponse> {
  const startTime = Date.now();

  // Get all published artifacts
  const { artifacts } = await listArtifacts({
    published: 'true' as any,
    limit: '1000' as any, // Get more for searching
    offset: '0' as any,
  });

  const searchTerms = query.q.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  const fuzzyThreshold = 0.7;

  // Score and filter artifacts
  const scoredResults = artifacts
    .map((artifact) => {
      let score = 0;
      const highlights: Record<string, string[]> = {};

      // Search in name (highest weight)
      const nameScore = searchTerms.reduce((acc, term) => {
        const similarity = calculateSimilarity(artifact.metadata.name, term);
        if (!query.fuzzy && artifact.metadata.name.toLowerCase().includes(term)) {
          return acc + 0.5;
        } else if (query.fuzzy && similarity >= fuzzyThreshold) {
          return acc + 0.5 * similarity;
        }
        return acc;
      }, 0);

      if (nameScore > 0) {
        score += nameScore * 3;
        if (query.highlight) {
          highlights.name = [highlightText(artifact.metadata.name, query.q)];
        }
      }

      // Search in description (medium weight)
      const descScore = searchTerms.reduce((acc, term) => {
        const similarity = calculateSimilarity(artifact.metadata.description, term);
        if (!query.fuzzy && artifact.metadata.description.toLowerCase().includes(term)) {
          return acc + 0.3;
        } else if (query.fuzzy && similarity >= fuzzyThreshold) {
          return acc + 0.3 * similarity;
        }
        return acc;
      }, 0);

      if (descScore > 0) {
        score += descScore * 2;
        if (query.highlight) {
          highlights.description = [highlightText(artifact.metadata.description, query.q)];
        }
      }

      // Search in tags (medium weight)
      const tagMatches = artifact.metadata.tags.filter((tag) =>
        searchTerms.some((term) => {
          if (!query.fuzzy) {
            return tag.toLowerCase().includes(term);
          } else {
            return calculateSimilarity(tag, term) >= fuzzyThreshold;
          }
        })
      );

      if (tagMatches.length > 0) {
        score += tagMatches.length * 0.4;
        if (query.highlight) {
          highlights.tags = tagMatches.map((tag) => highlightText(tag, query.q));
        }
      }

      // Search in keywords (low weight)
      if (artifact.metadata.keywords) {
        const keywordMatches = artifact.metadata.keywords.filter((keyword) =>
          searchTerms.some((term) => {
            if (!query.fuzzy) {
              return keyword.toLowerCase().includes(term);
            } else {
              return calculateSimilarity(keyword, term) >= fuzzyThreshold;
            }
          })
        );

        if (keywordMatches.length > 0) {
          score += keywordMatches.length * 0.2;
        }
      }

      // Type filter
      if (query.type && artifact.type !== query.type) {
        score = 0;
      }

      // Normalize score
      const normalizedScore = Math.min(score / 5, 1);

      return {
        artifact,
        score: normalizedScore,
        highlights: Object.keys(highlights).length > 0 ? highlights : undefined,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);

  // Paginate
  const limit = query.limit ? parseInt(query.limit as any, 10) : 20;
  const offset = query.offset ? parseInt(query.offset as any, 10) : 0;
  const total = scoredResults.length;
  const paginatedResults = scoredResults.slice(offset, offset + limit);

  const took = Date.now() - startTime;

  return {
    results: paginatedResults,
    total,
    query: query.q,
    took,
    pagination: {
      offset,
      limit,
      hasMore: offset + paginatedResults.length < total,
    },
  };
}

/**
 * Get search suggestions based on existing artifacts
 */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const { artifacts } = await listArtifacts({
    published: 'true' as any,
    limit: '100' as any,
    offset: '0' as any,
  });

  const lowerQuery = query.toLowerCase();
  const suggestions = new Set<string>();

  // Collect suggestions from artifact names
  artifacts.forEach((artifact) => {
    const name = artifact.metadata.name;
    if (name.toLowerCase().includes(lowerQuery)) {
      suggestions.add(name);
    }

    // Add tags as suggestions
    artifact.metadata.tags.forEach((tag) => {
      if (tag.toLowerCase().includes(lowerQuery)) {
        suggestions.add(tag);
      }
    });

    // Add keywords as suggestions
    artifact.metadata.keywords?.forEach((keyword) => {
      if (keyword.toLowerCase().includes(lowerQuery)) {
        suggestions.add(keyword);
      }
    });
  });

  return {
    suggestions: Array.from(suggestions).slice(0, 10),
    query,
  };
}
