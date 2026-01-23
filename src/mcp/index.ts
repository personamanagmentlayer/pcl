/**
 * Model Context Protocol (MCP) Module
 *
 * Exposes PCL personas and workflows via the MCP protocol for integration
 * with Claude Code, Cursor, VS Code, and other MCP-compatible clients.
 */

// Types
export * from './types/index.js';

// Server
export * from './server/index.js';

// Client
export * from './client/index.js';

// Transports
export * from './transports/index.js';
