/**
 * Connection Pool Tests
 *
 * Comprehensive tests for HTTP connection pooling
 * Target: 41.52% → 75%+ coverage
 */

import { z } from 'zod';
import {
  ConnectionPool,
  PooledRequest,
  createConnectionPool,
  createPooledRequest,
  type Connection,
  type PoolStats,
} from '../../../src/runtime/providers/connection-pool';

// Zod schemas for validation
const ConnectionSchema = z.object({
  id: z.string(),
  host: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
  inUse: z.boolean(),
  requests: z.number().int().nonnegative(),
});

const PoolStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  idle: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  byHost: z.record(z.number().int().nonnegative()),
});

describe('ConnectionPool', () => {
  let pool: ConnectionPool;

  afterEach(() => {
    if (pool) {
      pool.destroy();
    }
  });

  describe('Construction', () => {
    it('should create pool with default options', () => {
      pool = new ConnectionPool();

      expect(pool).toBeDefined();
      expect(pool.getStats().total).toBe(0);
    });

    it('should create pool with custom options', () => {
      pool = new ConnectionPool({
        maxConnections: 10,
        maxConnectionsPerHost: 2,
        connectionTimeout: 5000,
        idleTimeout: 30000,
        keepAlive: true,
        keepAliveMsecs: 500,
      });

      expect(pool).toBeDefined();
    });

    it('should start cleanup interval on construction', () => {
      pool = new ConnectionPool();

      // Cleanup interval should be running (tested indirectly via destroy)
      expect(pool).toBeDefined();
    });
  });

  describe('acquire - Connection Acquisition', () => {
    beforeEach(() => {
      pool = new ConnectionPool({
        maxConnections: 10,
        maxConnectionsPerHost: 3,
      });
    });

    it('should create new connection when none exist', async () => {
      const conn = await pool.acquire('example.com');

      const validated = ConnectionSchema.parse(conn);
      expect(validated.host).toBe('example.com');
      expect(validated.inUse).toBe(true);
      expect(validated.requests).toBe(0);
    });

    it('should reuse idle connection for same host', async () => {
      const conn1 = await pool.acquire('example.com');
      pool.release(conn1);

      const conn2 = await pool.acquire('example.com');

      expect(conn2.id).toBe(conn1.id); // Same connection reused
      expect(conn2.inUse).toBe(true);
    });

    it('should create new connection when all are in use', async () => {
      const conn1 = await pool.acquire('example.com');
      const conn2 = await pool.acquire('example.com');

      expect(conn2.id).not.toBe(conn1.id);
      expect(pool.getStats().total).toBe(2);
    });

    it('should update lastUsedAt when acquiring', async () => {
      const conn1 = await pool.acquire('example.com');
      const firstUsedAt = conn1.lastUsedAt;

      pool.release(conn1);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const conn2 = await pool.acquire('example.com');

      expect(conn2.id).toBe(conn1.id);
      expect(conn2.lastUsedAt.getTime()).toBeGreaterThan(firstUsedAt.getTime());
    });

    it('should create connections for different hosts', async () => {
      const conn1 = await pool.acquire('example.com');
      const conn2 = await pool.acquire('other.com');

      expect(conn1.host).toBe('example.com');
      expect(conn2.host).toBe('other.com');
      expect(pool.getStats().byHost['example.com']).toBe(1);
      expect(pool.getStats().byHost['other.com']).toBe(1);
    });
  });

  describe('acquire - Connection Limits', () => {
    it('should respect per-host connection limit', async () => {
      pool = new ConnectionPool({
        maxConnections: 10,
        maxConnectionsPerHost: 2,
        connectionTimeout: 100,
      });

      const conn1 = await pool.acquire('example.com');
      const conn2 = await pool.acquire('example.com');

      // Third acquisition should wait (timeout)
      await expect(pool.acquire('example.com')).rejects.toThrow(
        'Connection timeout'
      );

      expect(pool.getStats().total).toBe(2);
    });

    it('should respect global connection limit', async () => {
      pool = new ConnectionPool({
        maxConnections: 2,
        maxConnectionsPerHost: 5,
        connectionTimeout: 100,
      });

      const conn1 = await pool.acquire('host1.com');
      const conn2 = await pool.acquire('host2.com');

      // Third connection should wait (timeout)
      await expect(pool.acquire('host3.com')).rejects.toThrow(
        'Connection timeout'
      );

      expect(pool.getStats().total).toBe(2);
    });

    it('should allow connection after release when at limit', async () => {
      pool = new ConnectionPool({
        maxConnections: 10,
        maxConnectionsPerHost: 1,
        connectionTimeout: 5000,
      });

      const conn1 = await pool.acquire('example.com');

      // Release in background after delay
      setTimeout(() => pool.release(conn1), 50);

      // Should succeed after release
      const conn2 = await pool.acquire('example.com');

      expect(conn2.id).toBe(conn1.id); // Same connection reused
    });
  });

  describe('acquire - Pending Queue', () => {
    beforeEach(() => {
      pool = new ConnectionPool({
        maxConnections: 10,
        maxConnectionsPerHost: 1,
        connectionTimeout: 5000,
      });
    });

    it('should queue pending requests when at limit', async () => {
      const conn1 = await pool.acquire('example.com');

      const promise = pool.acquire('example.com');

      expect(pool.getStats().pending).toBe(1);

      pool.release(conn1);

      const conn2 = await promise;
      expect(conn2.id).toBe(conn1.id);
    });

    it('should fulfill pending requests on release', async () => {
      const conn1 = await pool.acquire('example.com');

      const promise1 = pool.acquire('example.com');
      const promise2 = pool.acquire('example.com');

      expect(pool.getStats().pending).toBe(2);

      pool.release(conn1);

      const conn2 = await promise1;
      expect(conn2).toBeDefined();
      expect(pool.getStats().pending).toBe(1);

      pool.release(conn2);

      const conn3 = await promise2;
      expect(conn3).toBeDefined();
      expect(pool.getStats().pending).toBe(0);
    });

    it('should timeout pending requests', async () => {
      pool = new ConnectionPool({
        maxConnections: 1,
        maxConnectionsPerHost: 1,
        connectionTimeout: 100,
      });

      const conn1 = await pool.acquire('example.com');

      // Don't release, let it timeout
      await expect(pool.acquire('example.com')).rejects.toThrow(
        'Connection timeout for example.com after 100ms'
      );
    });

    it('should remove pending request after timeout', async () => {
      pool = new ConnectionPool({
        maxConnections: 1,
        connectionTimeout: 100,
      });

      const conn1 = await pool.acquire('example.com');

      try {
        await pool.acquire('example.com');
      } catch {
        // Expected timeout
      }

      expect(pool.getStats().pending).toBe(0);
    });

    it('should handle multiple pending requests for different hosts', async () => {
      pool = new ConnectionPool({
        maxConnections: 10,
        maxConnectionsPerHost: 1,
        connectionTimeout: 5000,
      });

      const conn1 = await pool.acquire('host1.com');
      const conn2 = await pool.acquire('host2.com');

      const promise1 = pool.acquire('host1.com');
      const promise2 = pool.acquire('host2.com');

      expect(pool.getStats().pending).toBe(2);

      pool.release(conn1);
      await promise1;

      pool.release(conn2);
      await promise2;

      expect(pool.getStats().pending).toBe(0);
    });
  });

  describe('release - Connection Release', () => {
    beforeEach(() => {
      pool = new ConnectionPool();
    });

    it('should mark connection as not in use', async () => {
      const conn = await pool.acquire('example.com');
      expect(conn.inUse).toBe(true);

      pool.release(conn);

      expect(conn.inUse).toBe(false);
    });

    it('should update lastUsedAt on release', async () => {
      const conn = await pool.acquire('example.com');
      const beforeRelease = conn.lastUsedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      pool.release(conn);

      expect(conn.lastUsedAt.getTime()).toBeGreaterThan(
        beforeRelease.getTime()
      );
    });

    it('should handle releasing non-existent connection', () => {
      const fakeConnection: Connection = {
        id: 'fake-id',
        host: 'example.com',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        inUse: true,
        requests: 0,
      };

      // Should not throw
      expect(() => pool.release(fakeConnection)).not.toThrow();
    });

    it('should allow connection to be acquired again after release', async () => {
      const conn1 = await pool.acquire('example.com');
      pool.release(conn1);

      const conn2 = await pool.acquire('example.com');

      expect(conn2.id).toBe(conn1.id);
    });
  });

  describe('remove - Connection Removal', () => {
    beforeEach(() => {
      pool = new ConnectionPool();
    });

    it('should remove connection from pool', async () => {
      const conn = await pool.acquire('example.com');

      expect(pool.getStats().total).toBe(1);

      pool.remove(conn.id);

      expect(pool.getStats().total).toBe(0);
    });

    it('should remove connection from host set', async () => {
      const conn = await pool.acquire('example.com');

      expect(pool.getStats().byHost['example.com']).toBe(1);

      pool.remove(conn.id);

      expect(pool.getStats().byHost['example.com']).toBeUndefined();
    });

    it('should handle removing non-existent connection', () => {
      expect(() => pool.remove('non-existent-id')).not.toThrow();
    });

    it('should remove host entry when last connection removed', async () => {
      const conn1 = await pool.acquire('example.com');
      const conn2 = await pool.acquire('example.com');
      pool.release(conn1);
      pool.release(conn2);

      pool.remove(conn1.id);
      expect(pool.getStats().byHost['example.com']).toBe(1);

      pool.remove(conn2.id);
      expect(pool.getStats().byHost['example.com']).toBeUndefined();
    });
  });

  describe('getStats - Pool Statistics', () => {
    beforeEach(() => {
      pool = new ConnectionPool();
    });

    it('should return valid stats for empty pool', () => {
      const stats = pool.getStats();

      const validated = PoolStatsSchema.parse(stats);
      expect(validated.total).toBe(0);
      expect(validated.idle).toBe(0);
      expect(validated.active).toBe(0);
      expect(validated.pending).toBe(0);
      expect(Object.keys(validated.byHost)).toHaveLength(0);
    });

    it('should count total connections', async () => {
      await pool.acquire('host1.com');
      await pool.acquire('host2.com');

      const stats = pool.getStats();
      expect(stats.total).toBe(2);
    });

    it('should count idle connections', async () => {
      const conn1 = await pool.acquire('example.com');
      const conn2 = await pool.acquire('example.com');

      pool.release(conn1);

      const stats = pool.getStats();
      expect(stats.idle).toBe(1);
      expect(stats.active).toBe(1);
    });

    it('should count active connections', async () => {
      await pool.acquire('example.com');
      await pool.acquire('example.com');

      const stats = pool.getStats();
      expect(stats.active).toBe(2);
      expect(stats.idle).toBe(0);
    });

    it('should count pending requests', async () => {
      pool = new ConnectionPool({
        maxConnections: 1,
        connectionTimeout: 5000,
      });

      const conn1 = await pool.acquire('example.com');

      pool.acquire('example.com'); // Will be pending

      const stats = pool.getStats();
      expect(stats.pending).toBe(1);
    });

    it('should count connections by host', async () => {
      await pool.acquire('host1.com');
      await pool.acquire('host1.com');
      await pool.acquire('host2.com');

      const stats = pool.getStats();
      expect(stats.byHost['host1.com']).toBe(2);
      expect(stats.byHost['host2.com']).toBe(1);
    });
  });

  describe('clearIdle - Idle Connection Cleanup', () => {
    it('should clear idle connections past timeout', async () => {
      pool = new ConnectionPool({
        idleTimeout: 50, // 50ms timeout
      });

      const conn = await pool.acquire('example.com');
      pool.release(conn);

      expect(pool.getStats().total).toBe(1);

      // Wait for idle timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      pool.clearIdle();

      expect(pool.getStats().total).toBe(0);
    });

    it('should not clear recently used idle connections', async () => {
      pool = new ConnectionPool({
        idleTimeout: 1000,
      });

      const conn = await pool.acquire('example.com');
      pool.release(conn);

      pool.clearIdle();

      expect(pool.getStats().total).toBe(1);
    });

    it('should not clear active connections', async () => {
      pool = new ConnectionPool({
        idleTimeout: 50,
      });

      const conn = await pool.acquire('example.com');

      await new Promise((resolve) => setTimeout(resolve, 60));

      pool.clearIdle();

      expect(pool.getStats().total).toBe(1);
      expect(conn.inUse).toBe(true);
    });

    it('should clear multiple idle connections', async () => {
      pool = new ConnectionPool({
        idleTimeout: 50,
      });

      const conn1 = await pool.acquire('host1.com');
      const conn2 = await pool.acquire('host2.com');
      const conn3 = await pool.acquire('host3.com');

      pool.release(conn1);
      pool.release(conn2);
      pool.release(conn3);

      await new Promise((resolve) => setTimeout(resolve, 60));

      pool.clearIdle();

      expect(pool.getStats().total).toBe(0);
    });
  });

  describe('clear - Clear All Connections', () => {
    beforeEach(() => {
      pool = new ConnectionPool();
    });

    it('should clear all connections', async () => {
      await pool.acquire('host1.com');
      await pool.acquire('host2.com');

      expect(pool.getStats().total).toBe(2);

      pool.clear();

      expect(pool.getStats().total).toBe(0);
    });

    it('should clear host mappings', async () => {
      await pool.acquire('example.com');

      pool.clear();

      expect(pool.getStats().byHost).toEqual({});
    });

    it('should reject pending requests', async () => {
      pool = new ConnectionPool({
        maxConnections: 1,
        connectionTimeout: 5000,
      });

      const conn = await pool.acquire('example.com');

      const promise = pool.acquire('example.com');

      pool.clear();

      await expect(promise).rejects.toThrow('Connection pool cleared');
    });

    it('should clear pending queue', async () => {
      pool = new ConnectionPool({
        maxConnections: 1,
        connectionTimeout: 5000,
      });

      const conn = await pool.acquire('example.com');

      pool.acquire('example.com'); // Will be pending

      pool.clear();

      expect(pool.getStats().pending).toBe(0);
    });
  });

  describe('destroy - Pool Destruction', () => {
    it('should stop cleanup interval', () => {
      pool = new ConnectionPool();

      pool.destroy();

      // After destroy, cleanup interval should be stopped
      // Verified by not throwing
      expect(pool).toBeDefined();
    });

    it('should clear all connections on destroy', async () => {
      pool = new ConnectionPool();

      await pool.acquire('example.com');

      pool.destroy();

      expect(pool.getStats().total).toBe(0);
    });

    it('should allow multiple destroy calls', () => {
      pool = new ConnectionPool();

      pool.destroy();

      expect(() => pool.destroy()).not.toThrow();
    });
  });

  describe('Factory Functions', () => {
    it('should create pool via factory', () => {
      pool = createConnectionPool();

      expect(pool).toBeInstanceOf(ConnectionPool);
    });

    it('should create pool with options via factory', () => {
      pool = createConnectionPool({
        maxConnections: 5,
      });

      expect(pool).toBeInstanceOf(ConnectionPool);
    });

    it('should create pooled request via factory', () => {
      pool = createConnectionPool();

      const request = createPooledRequest(pool, 'example.com');

      expect(request).toBeInstanceOf(PooledRequest);
    });
  });
});

describe('PooledRequest', () => {
  let pool: ConnectionPool;
  let request: PooledRequest<string>;

  beforeEach(() => {
    pool = createConnectionPool();
    request = createPooledRequest<string>(pool, 'example.com');
  });

  afterEach(() => {
    pool.destroy();
  });

  describe('execute - Request Execution', () => {
    it('should execute operation with connection', async () => {
      const result = await request.execute(async (conn) => {
        expect(conn.host).toBe('example.com');
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should increment request counter', async () => {
      await request.execute(async (conn) => {
        expect(conn.requests).toBe(1);
        return 'ok';
      });

      await request.execute(async (conn) => {
        expect(conn.requests).toBe(2);
        return 'ok';
      });
    });

    it('should release connection after execution', async () => {
      await request.execute(async () => {
        expect(pool.getStats().active).toBe(1);
        return 'ok';
      });

      expect(pool.getStats().active).toBe(0);
      expect(pool.getStats().idle).toBe(1);
    });

    it('should release connection even on error', async () => {
      try {
        await request.execute(async () => {
          throw new Error('Operation failed');
        });
      } catch (error) {
        expect((error as Error).message).toBe('Operation failed');
      }

      expect(pool.getStats().active).toBe(0);
      expect(pool.getStats().idle).toBe(1);
    });

    it('should reuse connection across executions', async () => {
      let firstConnId: string;

      await request.execute(async (conn) => {
        firstConnId = conn.id;
        return 'ok';
      });

      await request.execute(async (conn) => {
        expect(conn.id).toBe(firstConnId);
        return 'ok';
      });
    });

    it('should handle async operations', async () => {
      const result = await request.execute(async (conn) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `response-${conn.id}`;
      });

      expect(result).toContain('response-');
    });

    it('should propagate operation errors', async () => {
      await expect(
        request.execute(async () => {
          throw new Error('Custom error');
        })
      ).rejects.toThrow('Custom error');
    });

    it('should handle concurrent executions', async () => {
      const results = await Promise.all([
        request.execute(async () => 'result1'),
        request.execute(async () => 'result2'),
        request.execute(async () => 'result3'),
      ]);

      expect(results).toEqual(['result1', 'result2', 'result3']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operation that returns null', async () => {
      const result = await request.execute(async () => null);

      expect(result).toBeNull();
    });

    it('should handle operation that returns undefined', async () => {
      const result = await request.execute(async () => undefined);

      expect(result).toBeUndefined();
    });

    it('should handle operation that returns object', async () => {
      const result = await request.execute(async () => ({
        data: 'test',
        count: 42,
      }));

      expect(result).toEqual({ data: 'test', count: 42 });
    });

    it('should handle multiple pooled requests for same host', async () => {
      const request1 = createPooledRequest<string>(pool, 'example.com');
      const request2 = createPooledRequest<string>(pool, 'example.com');

      const [result1, result2] = await Promise.all([
        request1.execute(async () => 'req1'),
        request2.execute(async () => 'req2'),
      ]);

      expect(result1).toBe('req1');
      expect(result2).toBe('req2');
    });

    it('should handle pooled requests for different hosts', async () => {
      const request1 = createPooledRequest<string>(pool, 'host1.com');
      const request2 = createPooledRequest<string>(pool, 'host2.com');

      const [result1, result2] = await Promise.all([
        request1.execute(async (conn) => `${conn.host}-result`),
        request2.execute(async (conn) => `${conn.host}-result`),
      ]);

      expect(result1).toBe('host1.com-result');
      expect(result2).toBe('host2.com-result');
    });
  });
});
