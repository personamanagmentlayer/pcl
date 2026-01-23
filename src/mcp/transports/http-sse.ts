/**
 * MCP HTTP + Server-Sent Events (SSE) Transport
 *
 * Communication via HTTP for web applications
 * - HTTP POST for requests
 * - SSE for server-to-client notifications
 */

import type { McpTransport, McpRequest, McpResponse } from '../types/mcp.js';

/**
 * HTTP/SSE Transport Configuration
 */
export interface HttpSseTransportConfig {
  /**
   * Base URL for the MCP server
   */
  readonly baseUrl: string;

  /**
   * Request headers
   */
  readonly headers?: Record<string, string>;

  /**
   * Enable debug logging
   */
  readonly debug?: boolean;
}

/**
 * MCP HTTP/SSE Transport Implementation
 */
export class HttpSseTransport implements McpTransport {
  private readonly config: HttpSseTransportConfig;
  private eventSource: EventSource | null = null;
  private connected = false;
  private messageHandler: ((message: McpResponse) => void) | null = null;

  constructor(config: HttpSseTransportConfig) {
    this.config = config;
  }

  /**
   * Send a message via HTTP POST
   */
  public async send(message: McpRequest): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }

    const url = `${this.config.baseUrl}/mcp/request`;

    if (this.config.debug) {
      console.debug(`[MCP HTTP] Sending to ${url}:`, message);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      // Parse response
      const result = (await response.json()) as McpResponse;

      if (this.config.debug) {
        console.debug('[MCP HTTP] Received response:', result);
      }

      // Deliver response to handler
      if (this.messageHandler) {
        this.messageHandler(result);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[MCP HTTP] Request failed:', error);
      }
      throw error;
    }
  }

  /**
   * Set up message handler for SSE events
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
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
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
   * Connect to SSE endpoint for notifications
   */
  private connect(): void {
    if (this.connected) {
      return;
    }

    const sseUrl = `${this.config.baseUrl}/mcp/events`;

    if (this.config.debug) {
      console.debug(`[MCP SSE] Connecting to ${sseUrl}`);
    }

    try {
      this.eventSource = new EventSource(sseUrl);

      // Handle SSE messages
      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as McpResponse;

          if (this.config.debug) {
            console.debug('[MCP SSE] Received event:', message);
          }

          if (this.messageHandler) {
            this.messageHandler(message);
          }
        } catch (error) {
          if (this.config.debug) {
            console.error('[MCP SSE] Parse error:', error);
          }
        }
      };

      // Handle SSE connection open
      this.eventSource.onopen = () => {
        this.connected = true;

        if (this.config.debug) {
          console.debug('[MCP SSE] Connected');
        }
      };

      // Handle SSE errors
      this.eventSource.onerror = (error) => {
        if (this.config.debug) {
          console.error('[MCP SSE] Error:', error);
        }

        this.connected = false;
      };
    } catch (error) {
      if (this.config.debug) {
        console.error('[MCP SSE] Connection failed:', error);
      }
      throw error;
    }
  }
}
