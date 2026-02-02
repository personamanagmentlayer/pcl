/**
 * PCL Language Server - Connection Management
 *
 * Handles LSP connection setup and lifecycle
 */

import {
  Connection,
  createConnection,
  ProposedFeatures,
} from 'vscode-languageserver/node';

/**
 * Create and configure LSP connection
 */
export function createLSPConnection(): Connection {
  // Create connection using Node IPC or stdio
  const connection = createConnection(ProposedFeatures.all);

  // Note: onError and onClose are not available in current LSP API version
  // Error handling is managed internally by the connection

  return connection;
}
