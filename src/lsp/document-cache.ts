/**
 * PCL Language Server - Document Cache
 *
 * In-memory cache for parsed documents and analysis results
 */

import { DocumentInfo } from './types';

/**
 * Document cache with LRU eviction
 */
export class DocumentCache {
  private cache = new Map<string, DocumentInfo>();
  private accessOrder: string[] = [];

  constructor(private maxSize: number = 100) {}

  /**
   * Get document from cache
   */
  get(uri: string): DocumentInfo | undefined {
    const doc = this.cache.get(uri);
    if (doc) {
      // Update access order (move to end for LRU)
      this.updateAccessOrder(uri);
    }
    return doc;
  }

  /**
   * Set document in cache
   */
  set(uri: string, info: DocumentInfo): void {
    // If cache is full, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(uri)) {
      this.evictLRU();
    }

    this.cache.set(uri, info);
    this.updateAccessOrder(uri);
  }

  /**
   * Check if document exists in cache
   */
  has(uri: string): boolean {
    return this.cache.has(uri);
  }

  /**
   * Delete document from cache
   */
  delete(uri: string): boolean {
    this.accessOrder = this.accessOrder.filter((u) => u !== uri);
    return this.cache.delete(uri);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all cached URIs
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(uri: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter((u) => u !== uri);
    // Add to end (most recently used)
    this.accessOrder.push(uri);
  }

  /**
   * Evict least recently used document
   */
  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruUri = this.accessOrder[0];
      this.delete(lruUri);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}
