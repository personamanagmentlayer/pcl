/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Connection Pool
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * HTTP connection pooling for provider requests
 *
 * @packageDocumentation
 * @module @pcl/runtime/providers/connection-pool
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectionPoolOptions {
  readonly maxConnections: number;
  readonly maxConnectionsPerHost: number;
  readonly connectionTimeout: number;
  readonly idleTimeout: number;
  readonly keepAlive: boolean;
  readonly keepAliveMsecs: number;
}

export interface Connection {
  readonly id: string;
  readonly host: string;
  readonly createdAt: Date;
  lastUsedAt: Date;
  inUse: boolean;
  requests: number;
}

export interface PoolStats {
  readonly total: number;
  readonly idle: number;
  readonly active: number;
  readonly pending: number;
  readonly byHost: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONNECTION POOL
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_OPTIONS: ConnectionPoolOptions = {
  maxConnections: 50,
  maxConnectionsPerHost: 6,
  connectionTimeout: 30000,
  idleTimeout: 60000,
  keepAlive: true,
  keepAliveMsecs: 1000,
};

/**
 * HTTP connection pool for efficient request handling
 */
export class ConnectionPool {
  private readonly options: ConnectionPoolOptions;
  private readonly connections = new Map<string, Connection>();
  private readonly byHost = new Map<string, Set<string>>();
  private readonly pending: Array<{
    host: string;
    resolve: (connection: Connection) => void;
    reject: (error: Error) => void;
  }> = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: Partial<ConnectionPoolOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Acquire a connection for a host
   */
  async acquire(host: string): Promise<Connection> {
    // Try to find idle connection for this host
    const hostConnections = this.byHost.get(host);
    if (hostConnections) {
      for (const connId of hostConnections) {
        const conn = this.connections.get(connId);
        if (conn && !conn.inUse) {
          conn.inUse = true;
          conn.lastUsedAt = new Date();
          return conn;
        }
      }
    }

    // Check if we can create a new connection
    if (this.canCreateConnection(host)) {
      return this.createConnection(host);
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      this.pending.push({ host, resolve, reject });

      // Set timeout
      setTimeout(() => {
        const index = this.pending.findIndex((p) => p.resolve === resolve);
        if (index !== -1) {
          this.pending.splice(index, 1);
          reject(
            new Error(
              `Connection timeout for ${host} after ${this.options.connectionTimeout}ms`
            )
          );
        }
      }, this.options.connectionTimeout);
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(connection: Connection): void {
    const conn = this.connections.get(connection.id);
    if (!conn) return;

    conn.inUse = false;
    conn.lastUsedAt = new Date();

    // Try to fulfill pending requests for this host
    const pendingIndex = this.pending.findIndex(
      (p) => p.host === connection.host
    );
    if (pendingIndex !== -1) {
      const [pending] = this.pending.splice(pendingIndex, 1);
      conn.inUse = true;
      conn.lastUsedAt = new Date();
      pending.resolve(conn);
    }
  }

  /**
   * Remove a connection from the pool
   */
  remove(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    // Remove from connections map
    this.connections.delete(connectionId);

    // Remove from host set
    const hostConns = this.byHost.get(conn.host);
    if (hostConns) {
      hostConns.delete(connectionId);
      if (hostConns.size === 0) {
        this.byHost.delete(conn.host);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const byHost: Record<string, number> = {};
    for (const [host, conns] of this.byHost.entries()) {
      byHost[host] = conns.size;
    }

    const connections = Array.from(this.connections.values());

    return {
      total: connections.length,
      idle: connections.filter((c) => !c.inUse).length,
      active: connections.filter((c) => c.inUse).length,
      pending: this.pending.length,
      byHost,
    };
  }

  /**
   * Clear all idle connections
   */
  clearIdle(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, conn] of this.connections.entries()) {
      if (
        !conn.inUse &&
        now - conn.lastUsedAt.getTime() > this.options.idleTimeout
      ) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.remove(id);
    }
  }

  /**
   * Clear all connections
   */
  clear(): void {
    this.connections.clear();
    this.byHost.clear();

    // Reject all pending requests
    for (const pending of this.pending) {
      pending.reject(new Error('Connection pool cleared'));
    }
    this.pending.length = 0;
  }

  /**
   * Destroy the pool
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  private canCreateConnection(host: string): boolean {
    // Check global limit
    if (this.connections.size >= this.options.maxConnections) {
      return false;
    }

    // Check per-host limit
    const hostConns = this.byHost.get(host);
    if (hostConns && hostConns.size >= this.options.maxConnectionsPerHost) {
      return false;
    }

    return true;
  }

  private createConnection(host: string): Connection {
    const conn: Connection = {
      id: generateConnectionId(),
      host,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      inUse: true,
      requests: 0,
    };

    // Add to connections map
    this.connections.set(conn.id, conn);

    // Add to host set
    let hostConns = this.byHost.get(host);
    if (!hostConns) {
      hostConns = new Set();
      this.byHost.set(host, hostConns);
    }
    hostConns.add(conn.id);

    return conn;
  }

  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.clearIdle();
    }, 60000);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONNECTION WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrapper for HTTP requests with connection pooling
 */
export class PooledRequest<T = unknown> {
  constructor(
    private readonly pool: ConnectionPool,
    private readonly host: string
  ) {}

  /**
   * Execute a request using a pooled connection
   */
  async execute(operation: (connection: Connection) => Promise<T>): Promise<T> {
    let connection: Connection | null = null;

    try {
      // Acquire connection
      connection = await this.pool.acquire(this.host);
      connection.requests++;

      // Execute operation
      const result = await operation(connection);

      return result;
    } finally {
      // Always release connection
      if (connection) {
        this.pool.release(connection);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

let connectionIdCounter = 0;

function generateConnectionId(): string {
  return `conn-${Date.now()}-${++connectionIdCounter}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new connection pool
 */
export function createConnectionPool(
  options?: Partial<ConnectionPoolOptions>
): ConnectionPool {
  return new ConnectionPool(options);
}

/**
 * Create a pooled request for a host
 */
export function createPooledRequest<T>(
  pool: ConnectionPool,
  host: string
): PooledRequest<T> {
  return new PooledRequest<T>(pool, host);
}
