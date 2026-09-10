/**
 * MCP Client Implementation
 *
 * Connect to and interact with MCP servers
 */

import type {
  McpClient,
  McpClientInfo,
  McpTransport,
  McpInitializeResult,
  McpTool,
  McpToolCallResult,
  McpResource,
  McpResourceContent,
  McpPrompt,
  McpPromptResult,
  McpRequest,
  McpResponse,
} from '../types/mcp.js';
import { MCP_VERSION, McpMethod } from '../types/mcp.js';
import {
  createJsonRpcRequest,
  isJsonRpcSuccessResponse,
} from '../types/jsonrpc.js';

/**
 * MCP Client Configuration
 */
export interface McpClientConfig {
  readonly name: string;
  readonly version: string;
  /**
   * How long to wait for a response before failing a request, in milliseconds.
   * Defaults to 30s. A server that never answers must not hang the caller
   * forever, nor leave the request pending in memory.
   */
  readonly requestTimeoutMs?: number;
  /**
   * How long disconnect() waits for the shutdown acknowledgement, in
   * milliseconds. Defaults to 5s: closing must stay responsive even when the
   * server has stopped answering.
   */
  readonly shutdownTimeoutMs?: number;
}

/** Default request timeout (ms) */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/** Default shutdown acknowledgement timeout (ms) */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;

/**
 * PCL MCP Client Implementation
 */
export class PclMcpClient implements McpClient {
  public readonly info: McpClientInfo;

  private transport: McpTransport | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    {
      resolve: (response: McpResponse) => void;
      reject: (error: Error) => void;
    }
  >();
  private serverInfo: McpInitializeResult | null = null;
  private readonly requestTimeoutMs: number;
  private readonly shutdownTimeoutMs: number;

  constructor(config: McpClientConfig) {
    this.info = {
      name: config.name,
      version: config.version,
      protocolVersion: MCP_VERSION,
    };
    this.requestTimeoutMs =
      config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.shutdownTimeoutMs =
      config.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
  }

  /**
   * Connect to an MCP server
   */
  public async connect(transport: McpTransport): Promise<McpInitializeResult> {
    if (this.transport) {
      throw new Error('Client already connected');
    }

    this.transport = transport;

    // Set up response handler
    transport.onMessage((response) => {
      this.handleResponse(response);
    });

    // Send initialize request
    const result = await this.sendRequest<McpInitializeResult>(
      McpMethod.Initialize,
      {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: this.info,
      }
    );

    this.serverInfo = result;

    // Send initialized notification
    await this.sendNotification(McpMethod.Initialized);

    return result;
  }

  /**
   * Disconnect from the server
   */
  public async disconnect(): Promise<void> {
    if (!this.transport) {
      return;
    }

    try {
      // Send shutdown request. A server that never answers must not keep the
      // client from closing, so failures here are reported but not fatal.
      await this.sendRequest(McpMethod.Shutdown, undefined, {
        timeoutMs: this.shutdownTimeoutMs,
      });
    } finally {
      await this.transport.close();
      this.transport = null;
      this.serverInfo = null;
      this.failPendingRequests(new Error('Client disconnected'));
    }
  }

  /**
   * Fail every in-flight request. Dropping the handlers instead would leave
   * their callers awaiting a promise that can never settle.
   */
  private failPendingRequests(error: Error): void {
    const pending = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();
    for (const { reject } of pending) {
      reject(error);
    }
  }

  /**
   * List available tools
   */
  public async listTools(): Promise<McpTool[]> {
    this.ensureConnected();

    const result = await this.sendRequest<{ tools: McpTool[] }>(
      McpMethod.ToolsList
    );

    return result.tools;
  }

  /**
   * Call a tool
   */
  public async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<McpToolCallResult> {
    this.ensureConnected();

    const result = await this.sendRequest<McpToolCallResult>(
      McpMethod.ToolsCall,
      {
        name,
        arguments: args,
      }
    );

    return result;
  }

  /**
   * List available resources
   */
  public async listResources(): Promise<McpResource[]> {
    this.ensureConnected();

    const result = await this.sendRequest<{ resources: McpResource[] }>(
      McpMethod.ResourcesList
    );

    return result.resources;
  }

  /**
   * Read a resource
   */
  public async readResource(uri: string): Promise<McpResourceContent> {
    this.ensureConnected();

    const result = await this.sendRequest<McpResourceContent>(
      McpMethod.ResourcesRead,
      {
        uri,
      }
    );

    return result;
  }

  /**
   * List available prompts
   */
  public async listPrompts(): Promise<McpPrompt[]> {
    this.ensureConnected();

    const result = await this.sendRequest<{ prompts: McpPrompt[] }>(
      McpMethod.PromptsList
    );

    return result.prompts;
  }

  /**
   * Get a prompt
   */
  public async getPrompt(
    name: string,
    args?: Record<string, unknown>
  ): Promise<McpPromptResult> {
    this.ensureConnected();

    const result = await this.sendRequest<McpPromptResult>(
      McpMethod.PromptsGet,
      {
        name,
        arguments: args,
      }
    );

    return result;
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  private async sendRequest<T>(
    method: string,
    params?: unknown,
    options?: { timeoutMs?: number }
  ): Promise<T> {
    if (!this.transport) {
      throw new Error('Not connected');
    }

    const id = ++this.requestId;

    const request = createJsonRpcRequest(
      method,
      params as Record<string, unknown>,
      id
    );

    // Create promise for response, bounded by the request timeout so an
    // unresponsive server cannot block the caller or leak the pending entry.
    const timeoutMs = options?.timeoutMs ?? this.requestTimeoutMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const responsePromise = new Promise<McpResponse>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timed out after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);
      // Do not hold the process open just for this timer
      timer.unref?.();
    });

    // Send request
    let response: McpResponse;
    try {
      await this.transport.send(request as McpRequest);
      response = await responsePromise;
    } finally {
      clearTimeout(timer);
      this.pendingRequests.delete(id);
    }

    // Check for errors
    if (!isJsonRpcSuccessResponse(response)) {
      throw new Error(`Request failed: ${response.error.message}`);
    }

    return response.result as T;
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  private async sendNotification(
    method: string,
    params?: unknown
  ): Promise<void> {
    if (!this.transport) {
      throw new Error('Not connected');
    }

    const notification = createJsonRpcRequest(
      method,
      params as Record<string, unknown>
    );

    await this.transport.send(notification as McpRequest);
  }

  /**
   * Handle incoming response
   */
  private handleResponse(response: McpResponse): void {
    if (!('id' in response) || response.id === null) {
      // Notification, ignore
      return;
    }

    const handler = this.pendingRequests.get(response.id as number);

    if (handler) {
      this.pendingRequests.delete(response.id as number);
      handler.resolve(response);
    }
  }

  /**
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.transport || !this.serverInfo) {
      throw new Error('Not connected to server');
    }
  }

  /**
   * Get server information
   */
  public getServerInfo(): McpInitializeResult | null {
    return this.serverInfo;
  }

  /**
   * Check if client is connected
   */
  public isConnected(): boolean {
    return this.transport !== null && this.serverInfo !== null;
  }
}
