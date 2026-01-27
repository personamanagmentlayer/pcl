/**
 * VSCode Extension for PCL Language Support
 */

import * as path from 'path';
import { workspace, ExtensionContext, window } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // Path to the language server module
  const serverModule = context.asAbsolutePath(
    path.join('..', 'dist', 'lsp', 'server.js')
  );

  // Debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // Server options: run the server in Node.js
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Client options: configure the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for PCL documents
    documentSelector: [{ scheme: 'file', language: 'pcl' }],
    synchronize: {
      // Notify the server about file changes to PCL files in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/*.pcl'),
    },
    // Get configuration from workspace settings
    initializationOptions: {
      trace: workspace.getConfiguration('pcl').get('trace.server'),
      maxCachedDocuments: workspace
        .getConfiguration('pcl')
        .get('maxCachedDocuments'),
      diagnosticsDebounce: workspace
        .getConfiguration('pcl')
        .get('diagnosticsDebounce'),
    },
  };

  // Create the language client
  client = new LanguageClient(
    'pclLanguageServer',
    'PCL Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client (this will also launch the server)
  client.start();

  // Log activation
  window.showInformationMessage('PCL Language Support activated!');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
