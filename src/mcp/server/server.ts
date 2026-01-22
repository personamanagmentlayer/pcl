/**
 * MCP Server Implementation
 *
 * Exposes PCL personas and workflows as MCP tools and resources
 */

import type {
  McpServer,
  McpServerInfo,
  McpRequest,
  McpResponse,
  McpTransport,
  McpTool,
  McpToolCallParams,
  McpToolCallResult,
  McpResource,
  McpResourceContent,
  McpInitializeParams,
  McpInitializeResult,
  McpCapability,
} from '../types/mcp.js';
import {
  createJsonRpcSuccessResponse,
  createJsonRpcErrorResponse,
  JsonRpcErrorCode,
  type JsonRpcId,
} from '../types/jsonrpc.js';
import { MCP_VERSION, McpMethod } from '../types/mcp.js';

/**
 * MCP Server Configuration
 */
export interface McpServerConfig {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
}

/**
 * Tool Handler Function
 */
type ToolHandler = (params: McpToolCallParams) => Promise<McpToolCallResult>;

/**
 * Resource Provider Function
 */
type ResourceProvider = (uri: string) => Promise<McpResourceContent>;

/**
 * PCL MCP Server Implementation
 */
export class PclMcpServer implements McpServer {
  public readonly info: McpServerInfo;

  private transport: McpTransport | null = null;
  private tools = new Map<string, { definition: McpTool; handler: ToolHandler }>();
  private resources = new Map<string, { definition: McpResource; provider: ResourceProvider }>();
  private initialized = false;

  constructor(config: McpServerConfig) {
    this.info = {
      name: config.name,
      version: config.version,
      protocolVersion: MCP_VERSION,
      capabilities: [
        {
          type: 'tools',
          description: 'Execute PCL personas and workflows',
        },
        {
          type: 'resources',
          description: 'Access PCL persona definitions and outputs',
        },
      ],
    };
  }

  /**
   * Register a tool handler
   */
  public registerTool(tool: McpTool, handler: ToolHandler): void {
    this.tools.set(tool.name, { definition: tool, handler });
  }

  /**
   * Register a resource provider
   */
  public registerResource(resource: McpResource, provider: ResourceProvider): void {
    this.resources.set(resource.uri, { definition: resource, provider });
  }

  /**
   * Start the server with a transport
   */
  public async start(transport: McpTransport): Promise<void> {
    if (this.transport) {
      throw new Error('Server already started');
    }

    this.transport = transport;

    // Set up message handler
    transport.onMessage(async (message) => {
      if ('method' in message) {
        // This is a request, not a response
        const response = await this.handleRequest(message as McpRequest);
        await transport.send(response as unknown as McpRequest); // Send response back
      }
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.initialized = false;
  }

  /**
   * Handle incoming MCP request
   */
  public async handleRequest(request: McpRequest): Promise<McpResponse> {
    const { method, params, id } = request;

    try {
      // Route request to appropriate handler
      switch (method) {
        case McpMethod.Initialize:
          return this.handleInitialize(params as McpInitializeParams, id);

        case McpMethod.ToolsList:
          return this.handleToolsList(id);

        case McpMethod.ToolsCall:
          return this.handleToolsCall(params as McpToolCallParams, id);

        case McpMethod.ResourcesList:
          return this.handleResourcesList(id);

        case McpMethod.ResourcesRead:
          return this.handleResourcesRead(params as { uri: string }, id);

        case McpMethod.Shutdown:
          return this.handleShutdown(id);

        default:
          return createJsonRpcErrorResponse(
            JsonRpcErrorCode.MethodNotFound,
            `Method not found: ${method}`,
            id
          );
      }
    } catch (error) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InternalError,
        error instanceof Error ? error.message : 'Internal error',
        id,
        error instanceof Error ? { stack: error.stack } : undefined
      );
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(params: McpInitializeParams, id: JsonRpcId): McpResponse {
    if (this.initialized) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidRequest,
        'Server already initialized',
        id
      );
    }

    // Validate protocol version
    if (params.protocolVersion !== MCP_VERSION) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidParams,
        `Unsupported protocol version: ${params.protocolVersion}`,
        id
      );
    }

    this.initialized = true;

    const result: McpInitializeResult = {
      protocolVersion: MCP_VERSION,
      capabilities: this.info.capabilities,
      serverInfo: this.info,
    };

    return createJsonRpcSuccessResponse(result, id);
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(id: JsonRpcId): McpResponse {
    if (!this.initialized) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidRequest,
        'Server not initialized',
        id
      );
    }

    const tools = Array.from(this.tools.values()).map((t) => t.definition);

    return createJsonRpcSuccessResponse({ tools }, id);
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(params: McpToolCallParams, id: JsonRpcId): Promise<McpResponse> {
    if (!this.initialized) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidRequest,
        'Server not initialized',
        id
      );
    }

    const tool = this.tools.get(params.name);

    if (!tool) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.MethodNotFound,
        `Tool not found: ${params.name}`,
        id
      );
    }

    try {
      const result = await tool.handler(params);
      return createJsonRpcSuccessResponse(result, id);
    } catch (error) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InternalError,
        error instanceof Error ? error.message : 'Tool execution failed',
        id,
        error instanceof Error ? { stack: error.stack } : undefined
      );
    }
  }

  /**
   * Handle resources/list request
   */
  private handleResourcesList(id: JsonRpcId): McpResponse {
    if (!this.initialized) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidRequest,
        'Server not initialized',
        id
      );
    }

    const resources = Array.from(this.resources.values()).map((r) => r.definition);

    return createJsonRpcSuccessResponse({ resources }, id);
  }

  /**
   * Handle resources/read request
   */
  private async handleResourcesRead(
    params: { uri: string },
    id: JsonRpcId
  ): Promise<McpResponse> {
    if (!this.initialized) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidRequest,
        'Server not initialized',
        id
      );
    }

    const resource = this.resources.get(params.uri);

    if (!resource) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidParams,
        `Resource not found: ${params.uri}`,
        id
      );
    }

    try {
      const content = await resource.provider(params.uri);
      return createJsonRpcSuccessResponse(content, id);
    } catch (error) {
      return createJsonRpcErrorResponse(
        JsonRpcErrorCode.InternalError,
        error instanceof Error ? error.message : 'Resource read failed',
        id,
        error instanceof Error ? { stack: error.stack } : undefined
      );
    }
  }

  /**
   * Handle shutdown request
   */
  private async handleShutdown(id: JsonRpcId): Promise<McpResponse> {
    await this.stop();
    return createJsonRpcSuccessResponse(null, id);
  }
}
