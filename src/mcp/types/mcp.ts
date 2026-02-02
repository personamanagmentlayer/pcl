/**
 * Model Context Protocol (MCP) Types
 *
 * Based on Anthropic's MCP specification:
 * https://modelcontextprotocol.io/
 */

import type { JsonRpcRequest, JsonRpcResponse } from './jsonrpc.js';

/**
 * MCP Protocol Version
 */
export const MCP_VERSION = '2024-11-05' as const;

/**
 * MCP Capability
 */
export interface McpCapability {
  readonly type: string;
  readonly description?: string;
  readonly properties?: Record<string, unknown>;
}

/**
 * MCP Server Information
 */
export interface McpServerInfo {
  readonly name: string;
  readonly version: string;
  readonly protocolVersion: typeof MCP_VERSION;
  readonly capabilities: McpCapability[];
}

/**
 * MCP Client Information
 */
export interface McpClientInfo {
  readonly name: string;
  readonly version: string;
  readonly protocolVersion: typeof MCP_VERSION;
}

/**
 * MCP Tool Definition (for AI function calling)
 */
export interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: string[];
  };
}

/**
 * MCP Tool Call Request Parameters
 */
export interface McpToolCallParams {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

/**
 * MCP Tool Call Result
 */
export interface McpToolCallResult {
  readonly content: Array<{
    readonly type: 'text' | 'image' | 'resource';
    readonly text?: string;
    readonly data?: string;
    readonly mimeType?: string;
  }>;
  readonly isError?: boolean;
}

/**
 * MCP Resource (exposed data/content)
 */
export interface McpResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

/**
 * MCP Resource Content
 */
export interface McpResourceContent {
  readonly uri: string;
  readonly mimeType: string;
  readonly text?: string;
  readonly blob?: string; // base64 encoded
}

/**
 * MCP Prompt Template
 */
export interface McpPrompt {
  readonly name: string;
  readonly description?: string;
  readonly arguments?: Array<{
    readonly name: string;
    readonly description?: string;
    readonly required?: boolean;
  }>;
}

/**
 * MCP Prompt Result
 */
export interface McpPromptResult {
  readonly description?: string;
  readonly messages: Array<{
    readonly role: 'user' | 'assistant';
    readonly content: {
      readonly type: 'text' | 'image' | 'resource';
      readonly text?: string;
      readonly data?: string;
      readonly mimeType?: string;
    };
  }>;
}

/**
 * MCP Initialize Request Parameters
 */
export interface McpInitializeParams {
  readonly protocolVersion: typeof MCP_VERSION;
  readonly capabilities: McpCapability[];
  readonly clientInfo: McpClientInfo;
}

/**
 * MCP Initialize Result
 */
export interface McpInitializeResult {
  readonly protocolVersion: typeof MCP_VERSION;
  readonly capabilities: McpCapability[];
  readonly serverInfo: McpServerInfo;
}

/**
 * MCP Method Names
 */
export enum McpMethod {
  // Lifecycle
  Initialize = 'initialize',
  Initialized = 'initialized',
  Shutdown = 'shutdown',

  // Tools
  ToolsList = 'tools/list',
  ToolsCall = 'tools/call',

  // Resources
  ResourcesList = 'resources/list',
  ResourcesRead = 'resources/read',
  ResourcesSubscribe = 'resources/subscribe',
  ResourcesUnsubscribe = 'resources/unsubscribe',

  // Prompts
  PromptsList = 'prompts/list',
  PromptsGet = 'prompts/get',

  // Logging
  LoggingSetLevel = 'logging/setLevel',

  // Notifications
  NotificationCancelled = 'notifications/cancelled',
  NotificationProgress = 'notifications/progress',
  NotificationMessage = 'notifications/message',
  NotificationResourcesListChanged = 'notifications/resources/list_changed',
  NotificationResourcesUpdated = 'notifications/resources/updated',
}

/**
 * MCP Request (extends JSON-RPC)
 */
export interface McpRequest extends JsonRpcRequest {
  readonly method: McpMethod | string;
}

/**
 * MCP Response (extends JSON-RPC)
 */
export type McpResponse = JsonRpcResponse;

/**
 * MCP Transport Interface
 */
export interface McpTransport {
  /**
   * Send a message through the transport
   */
  send(message: McpRequest): Promise<void>;

  /**
   * Receive messages from the transport
   */
  onMessage(handler: (message: McpResponse) => void): void;

  /**
   * Close the transport
   */
  close(): Promise<void>;

  /**
   * Check if transport is connected
   */
  isConnected(): boolean;
}

/**
 * MCP Server Interface
 */
export interface McpServer {
  /**
   * Server information
   */
  readonly info: McpServerInfo;

  /**
   * Handle incoming MCP request
   */
  handleRequest(request: McpRequest): Promise<McpResponse>;

  /**
   * Start the server with a transport
   */
  start(transport: McpTransport): Promise<void>;

  /**
   * Stop the server
   */
  stop(): Promise<void>;

  /**
   * Register a tool handler
   */
  registerTool(
    tool: McpTool,
    handler: (params: McpToolCallParams) => Promise<McpToolCallResult>
  ): void;

  /**
   * Register a resource provider
   */
  registerResource(
    resource: McpResource,
    provider: (uri: string) => Promise<McpResourceContent>
  ): void;
}

/**
 * MCP Client Interface
 */
export interface McpClient {
  /**
   * Client information
   */
  readonly info: McpClientInfo;

  /**
   * Connect to an MCP server
   */
  connect(transport: McpTransport): Promise<McpInitializeResult>;

  /**
   * Disconnect from the server
   */
  disconnect(): Promise<void>;

  /**
   * List available tools
   */
  listTools(): Promise<McpTool[]>;

  /**
   * Call a tool
   */
  callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<McpToolCallResult>;

  /**
   * List available resources
   */
  listResources(): Promise<McpResource[]>;

  /**
   * Read a resource
   */
  readResource(uri: string): Promise<McpResourceContent>;

  /**
   * List available prompts
   */
  listPrompts(): Promise<McpPrompt[]>;

  /**
   * Get a prompt
   */
  getPrompt(
    name: string,
    args?: Record<string, unknown>
  ): Promise<McpPromptResult>;
}
