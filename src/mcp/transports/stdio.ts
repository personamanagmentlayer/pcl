/**
 * MCP Stdio Transport
 *
 * Communication via stdin/stdout for CLI tools like Claude Code
 */

import { stdin, stdout } from 'node:process';
import { createInterface, type Interface } from 'node:readline';
import type { McpTransport, McpRequest, McpResponse } from '../types/mcp.js';

/**
 * Stdio Transport Configuration
 */
export interface StdioTransportConfig {
  /**
   * Enable debug logging to stderr
   */
  readonly debug?: boolean;
}

/**
 * MCP Stdio Transport Implementation
 */
export class StdioTransport implements McpTransport {
  private readline: Interface | null = null;
  private connected = false;
  private messageHandler: ((message: McpResponse) => void) | null = null;
  private readonly debug: boolean;

  constructor(config: StdioTransportConfig = {}) {
    this.debug = config.debug ?? false;
  }

  /**
   * Send a message through stdout
   */
  public async send(message: McpRequest | McpResponse): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }

    const json = JSON.stringify(message);

    if (this.debug) {
      console.error(`[MCP Stdio] Sending: ${json}`);
    }

    // Write JSON message followed by newline
    stdout.write(json + '\n');
  }

  /**
   * Set up message handler for incoming messages from stdin
   */
  public onMessage(handler: (message: McpResponse) => void): void {
    this.messageHandler = handler;

    if (!this.connected) {
      this.connect();
    }
  }

  /**
   * Close the transport
   */
  public async close(): Promise<void> {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
    this.connected = false;
    this.messageHandler = null;
  }

  /**
   * Check if transport is connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Connect and start reading from stdin
   */
  private connect(): void {
    if (this.connected) {
      return;
    }

    // Create readline interface for line-by-line reading
    this.readline = createInterface({
      input: stdin,
      output: undefined, // Don't echo to stdout
      terminal: false,
    });

    // Handle incoming lines
    this.readline.on('line', (line: string) => {
      this.handleLine(line);
    });

    // Handle stdin close
    this.readline.on('close', () => {
      if (this.debug) {
        console.error('[MCP Stdio] Stdin closed');
      }
      this.connected = false;
    });

    this.connected = true;

    if (this.debug) {
      console.error('[MCP Stdio] Connected');
    }
  }

  /**
   * Handle a line of input from stdin
   */
  private handleLine(line: string): void {
    if (!line.trim()) {
      return; // Skip empty lines
    }

    try {
      if (this.debug) {
        console.error(`[MCP Stdio] Received: ${line}`);
      }

      const message = JSON.parse(line) as McpResponse;

      if (this.messageHandler) {
        this.messageHandler(message);
      }
    } catch (error) {
      if (this.debug) {
        console.error(`[MCP Stdio] Parse error: ${error}`);
      }
      // Invalid JSON - ignore or log
    }
  }
}
