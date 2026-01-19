/**
 * PCL Language Server - Connection Management
 *
 * Handles LSP connection setup and lifecycle
 */

import {
  createConnection,
  Connection,
  ProposedFeatures,
} from 'vscode-languageserver/node';

/**
 * Create and configure LSP connection
 */
export function createLSPConnection(): Connection {
  // Create connection using Node IPC or stdio
  const connection = createConnection(ProposedFeatures.all);

  // Set up error handling
  connection.onError((error) => {
    connection.console.error(`LSP Connection Error: ${error.message}`);
  });

  // Set up close handling
  connection.onClose(() => {
    connection.console.info('LSP Connection closed');
  });

  return connection;
}
