/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Database Adapter
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Adapter for persisting runtime events to a database.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events/adapters
 * @version 1.0.0
 */

import type { RuntimeEvent, RuntimeEventHandler } from '../types.js';

/**
 * Database provider interface
 */
export interface DatabaseProvider {
  /**
   * Insert an event record
   */
  insert(table: string, data: Record<string, unknown>): Promise<void>;

  /**
   * Batch insert multiple records
   */
  insertMany?(
    table: string,
    data: Array<Record<string, unknown>>
  ): Promise<void>;

  /**
   * Close database connection
   */
  close?(): Promise<void>;
}

/**
 * Database adapter configuration
 */
export interface DatabaseAdapterConfig {
  /** Database provider implementation */
  provider: DatabaseProvider;
  /** Table/collection name for events */
  eventsTable?: string;
  /** Table for persona execution history */
  personaExecutionsTable?: string;
  /** Table for workflow executions */
  workflowExecutionsTable?: string;
  /** Table for cost tracking */
  costsTable?: string;
  /** Batch size for bulk inserts (default: 10) */
  batchSize?: number;
  /** Flush interval in ms (default: 1000) */
  flushInterval?: number;
  /** Filter function to select which events to persist */
  filter?: (event: RuntimeEvent) => boolean;
}

/**
 * Database adapter for persisting runtime events
 *
 * Stores events in a database for historical analysis, cost tracking,
 * and audit trails.
 *
 * @example
 * ```typescript
 * // With Prisma
 * import { PrismaClient } from '@prisma/client';
 * const prisma = new PrismaClient();
 *
 * const dbAdapter = createDatabaseAdapter({
 *   provider: {
 *     insert: async (table, data) => {
 *       if (table === 'events') {
 *         await prisma.event.create({ data });
 *       }
 *     },
 *     close: async () => {
 *       await prisma.$disconnect();
 *     }
 *   },
 *   eventsTable: 'events',
 *   batchSize: 20,
 *   flushInterval: 5000
 * });
 *
 * runtime.on(dbAdapter);
 * ```
 */
export class DatabaseAdapter {
  private readonly config: Required<Omit<DatabaseAdapterConfig, 'filter'>> & {
    filter?: (event: RuntimeEvent) => boolean;
  };
  private eventBatch: Array<Record<string, unknown>> = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: DatabaseAdapterConfig) {
    this.config = {
      provider: config.provider,
      eventsTable: config.eventsTable ?? 'pcl_events',
      personaExecutionsTable:
        config.personaExecutionsTable ?? 'pcl_persona_executions',
      workflowExecutionsTable:
        config.workflowExecutionsTable ?? 'pcl_workflow_executions',
      costsTable: config.costsTable ?? 'pcl_costs',
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 1000,
      filter: config.filter,
    };

    // Start flush timer
    this.startFlushTimer();
  }

  /**
   * Get the event handler function
   */
  getHandler(): RuntimeEventHandler {
    return (event: RuntimeEvent) => this.handleEvent(event);
  }

  /**
   * Handle an event
   */
  private async handleEvent(event: RuntimeEvent): Promise<void> {
    // Apply filter if configured
    if (this.config.filter && !this.config.filter(event)) {
      return;
    }

    // Add to batch
    const record = this.mapEventToRecord(event);
    this.eventBatch.push(record);

    // Flush if batch is full
    if (this.eventBatch.length >= this.config.batchSize) {
      await this.flush();
    }

    // Store specialized records
    await this.storeSpecializedRecords(event);
  }

  /**
   * Map event to database record
   */
  private mapEventToRecord(event: RuntimeEvent): Record<string, unknown> {
    return {
      type: event.type,
      timestamp: 'timestamp' in event ? event.timestamp : new Date(),
      data: JSON.stringify(event),
    };
  }

  /**
   * Store specialized records for specific event types
   */
  private async storeSpecializedRecords(event: RuntimeEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'persona:after':
          await this.config.provider.insert(
            this.config.personaExecutionsTable,
            {
              personaId: event.persona.id,
              personaName: event.persona.name,
              messageId: event.message.id,
              responseId: event.response.id,
              duration: event.duration,
              confidence: event.response.confidence,
              tokensUsed: event.response.metadata.tokensUsed,
              timestamp: event.timestamp,
            }
          );
          break;

        case 'workflow:complete':
          await this.config.provider.insert(
            this.config.workflowExecutionsTable,
            {
              workflowId: event.workflow.id,
              duration: event.duration,
              timestamp: event.timestamp,
            }
          );
          break;

        case 'llm:response':
          if (event.cost) {
            await this.config.provider.insert(this.config.costsTable, {
              provider: event.provider,
              model: event.model,
              personaId: event.persona.id,
              tokensUsed: event.tokensUsed,
              cost: event.cost,
              timestamp: event.timestamp,
            });
          }
          break;
      }
    } catch (error) {
      console.error(
        '[DatabaseAdapter] Failed to store specialized record:',
        error
      );
    }
  }

  /**
   * Flush pending events to database
   */
  async flush(): Promise<void> {
    if (this.eventBatch.length === 0) {
      return;
    }

    const batch = this.eventBatch.splice(0);

    try {
      if (this.config.provider.insertMany) {
        await this.config.provider.insertMany(this.config.eventsTable, batch);
      } else {
        // Fallback to individual inserts
        for (const record of batch) {
          await this.config.provider.insert(this.config.eventsTable, record);
        }
      }
    } catch (error) {
      console.error('[DatabaseAdapter] Failed to flush events:', error);
      // Re-add to batch for retry
      this.eventBatch.push(...batch);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer and flush remaining events
   */
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();

    if (this.config.provider.close) {
      await this.config.provider.close();
    }
  }
}

/**
 * Create a database adapter
 *
 * @param config - Adapter configuration
 * @returns Object with event handler and close function
 *
 * @example
 * ```typescript
 * const dbAdapter = createDatabaseAdapter({
 *   provider: myDatabaseProvider,
 *   eventsTable: 'pcl_events',
 *   batchSize: 50,
 *   flushInterval: 5000,
 *   filter: (event) => {
 *     // Only persist important events
 *     return event.type.includes('complete') || event.type.includes('error');
 *   }
 * });
 *
 * runtime.on(dbAdapter.handler);
 *
 * // Later, close the adapter
 * await dbAdapter.close();
 * ```
 */
export function createDatabaseAdapter(config: DatabaseAdapterConfig): {
  handler: RuntimeEventHandler;
  close: () => Promise<void>;
} {
  const adapter = new DatabaseAdapter(config);
  return {
    handler: adapter.getHandler(),
    close: () => adapter.close(),
  };
}
