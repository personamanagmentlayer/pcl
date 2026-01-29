/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * File Logger Event Handler
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Logs events to rotating log files with async I/O.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events/handlers
 * @version 1.0.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RuntimeEvent, RuntimeEventHandler } from '../types.js';

/**
 * File logger configuration
 */
export interface FileLoggerConfig {
  /** Directory to write log files */
  directory?: string;
  /** Base filename (without extension) */
  filename?: string;
  /** Maximum file size in bytes (default: 10MB) */
  maxSize?: number;
  /** Maximum number of backup files to keep */
  maxFiles?: number;
  /** Include timestamps in log entries */
  timestamps?: boolean;
  /** Pretty-print JSON */
  pretty?: boolean;
}

/**
 * File logger with rotation support
 *
 * Writes events to JSON log files with automatic rotation when files
 * reach max size. Supports async writes with batching.
 *
 * @example
 * ```typescript
 * const logger = createFileLogger({
 *   directory: './logs',
 *   filename: 'pcl-runtime',
 *   maxSize: 10 * 1024 * 1024, // 10MB
 *   maxFiles: 5
 * });
 *
 * runtime.on(logger);
 * ```
 */
export class FileLogger {
  private readonly config: Required<FileLoggerConfig>;
  private currentFile: string;
  private writeStream: fs.WriteStream | null = null;
  private pendingWrites: string[] = [];
  private writeTimer: NodeJS.Timeout | null = null;
  private currentSize = 0;

  constructor(config: FileLoggerConfig = {}) {
    this.config = {
      directory: config.directory ?? './logs',
      filename: config.filename ?? 'pcl-runtime',
      maxSize: config.maxSize ?? 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles ?? 5,
      timestamps: config.timestamps ?? true,
      pretty: config.pretty ?? false,
    };

    // Ensure log directory exists
    if (!fs.existsSync(this.config.directory)) {
      fs.mkdirSync(this.config.directory, { recursive: true });
    }

    this.currentFile = this.getLogFilePath();
    this.initializeStream();
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
    const logEntry = this.formatEvent(event);
    const logLine = logEntry + '\n';

    // Add to pending writes
    this.pendingWrites.push(logLine);

    // Schedule batch write (debounce 100ms)
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }

    this.writeTimer = setTimeout(() => {
      void this.flush();
    }, 100);
  }

  /**
   * Flush pending writes to disk
   */
  private async flush(): Promise<void> {
    if (this.pendingWrites.length === 0) {
      return;
    }

    const writes = this.pendingWrites.splice(0);
    const data = writes.join('');
    const dataSize = Buffer.byteLength(data, 'utf8');

    // Check if rotation needed
    if (this.currentSize + dataSize > this.config.maxSize) {
      await this.rotate();
    }

    // Write to stream
    if (this.writeStream) {
      this.writeStream.write(data);
      this.currentSize += dataSize;
    }
  }

  /**
   * Rotate log files
   */
  private async rotate(): Promise<void> {
    // Close current stream
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }

    // Rotate existing files
    for (let i = this.config.maxFiles - 1; i >= 1; i--) {
      const oldPath = `${this.currentFile}.${i}`;
      const newPath = `${this.currentFile}.${i + 1}`;

      if (fs.existsSync(oldPath)) {
        if (i === this.config.maxFiles - 1) {
          // Delete oldest file
          fs.unlinkSync(oldPath);
        } else {
          // Rename file
          fs.renameSync(oldPath, newPath);
        }
      }
    }

    // Rename current file
    if (fs.existsSync(this.currentFile)) {
      fs.renameSync(this.currentFile, `${this.currentFile}.1`);
    }

    // Create new stream
    this.currentSize = 0;
    this.initializeStream();
  }

  /**
   * Initialize write stream
   */
  private initializeStream(): void {
    this.writeStream = fs.createWriteStream(this.currentFile, {
      flags: 'a', // append mode
      encoding: 'utf8',
    });

    // Get current file size
    if (fs.existsSync(this.currentFile)) {
      const stats = fs.statSync(this.currentFile);
      this.currentSize = stats.size;
    }
  }

  /**
   * Get log file path
   */
  private getLogFilePath(): string {
    return path.join(this.config.directory, `${this.config.filename}.log`);
  }

  /**
   * Format event as JSON log entry
   */
  private formatEvent(event: RuntimeEvent): string {
    const logEntry: Record<string, unknown> = {
      ...event,
    };

    if (this.config.pretty) {
      return JSON.stringify(logEntry, null, 2);
    }

    return JSON.stringify(logEntry);
  }

  /**
   * Close the logger and flush remaining writes
   */
  async close(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }

    await this.flush();

    if (this.writeStream) {
      return new Promise((resolve) => {
        this.writeStream!.end(() => {
          this.writeStream = null;
          resolve();
        });
      });
    }
  }
}

/**
 * Create a file logger event handler
 *
 * @param config - Logger configuration
 * @returns Event handler function
 *
 * @example
 * ```typescript
 * const logger = createFileLogger({
 *   directory: './logs',
 *   filename: 'pcl-runtime',
 *   maxSize: 10 * 1024 * 1024, // 10MB
 *   maxFiles: 5
 * });
 *
 * runtime.on(logger);
 *
 * // Later, close the logger
 * await logger.close();
 * ```
 */
export function createFileLogger(config: FileLoggerConfig = {}): {
  handler: RuntimeEventHandler;
  close: () => Promise<void>;
} {
  const logger = new FileLogger(config);
  return {
    handler: logger.getHandler(),
    close: () => logger.close(),
  };
}
