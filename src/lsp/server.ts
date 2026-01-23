/**
 * PCL Language Server
 *
 * Main entry point for the LSP server
 *
 * @shebang #!/usr/bin/env node
 */

import {
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import { createLSPConnection } from './connection';
import { getServerCapabilities } from './capabilities';
import { ServerConfig } from './types';
import { DocumentManager } from './document-manager';
import { DiagnosticsProvider } from './diagnostics';
import { CompletionProvider } from './completion';
import { HoverProvider } from './hover';
import { DefinitionProvider } from './definition';
import { ReferencesProvider } from './references';
import { DocumentSymbolsProvider } from './document-symbols';
import { FormattingProvider } from './formatting';
import { CodeActionProvider } from './code-actions';
import { RenameProvider } from './rename';

/**
 * PCL Language Server
 */
export class PCLLanguageServer {
  private config: ServerConfig = {
    trace: false,
    maxCachedDocuments: 100,
    diagnosticsDebounce: 300,
  };

  private readonly documentManager: DocumentManager;
  private readonly diagnosticsProvider: DiagnosticsProvider;
  private readonly completionProvider: CompletionProvider;
  private readonly hoverProvider: HoverProvider;
  private readonly definitionProvider: DefinitionProvider;
  private readonly referencesProvider: ReferencesProvider;
  private readonly documentSymbolsProvider: DocumentSymbolsProvider;
  private readonly formattingProvider: FormattingProvider;
  private readonly codeActionProvider: CodeActionProvider;
  private readonly renameProvider: RenameProvider;

  constructor(private connection = createLSPConnection()) {
    this.documentManager = new DocumentManager(
      this.connection,
      this.config.maxCachedDocuments
    );

    this.diagnosticsProvider = new DiagnosticsProvider(
      this.connection,
      this.documentManager,
      this.config.diagnosticsDebounce
    );

    this.completionProvider = new CompletionProvider(
      this.connection,
      this.documentManager
    );

    this.hoverProvider = new HoverProvider(
      this.connection,
      this.documentManager
    );

    this.definitionProvider = new DefinitionProvider(
      this.connection,
      this.documentManager
    );

    this.referencesProvider = new ReferencesProvider(
      this.connection,
      this.documentManager
    );

    this.documentSymbolsProvider = new DocumentSymbolsProvider(
      this.connection,
      this.documentManager
    );

    this.formattingProvider = new FormattingProvider(
      this.connection,
      this.documentManager
    );

    this.codeActionProvider = new CodeActionProvider();

    this.renameProvider = new RenameProvider();

    // Set up diagnostics callback
    this.documentManager.onDiagnosticsNeeded((uri) => {
      this.diagnosticsProvider.publishDiagnostics(uri);
    });

    this.setupHandlers();
  }

  /**
   * Set up LSP request/notification handlers
   */
  private setupHandlers(): void {
    // Initialize
    this.connection.onInitialize(this.onInitialize.bind(this));

    // Initialized
    this.connection.onInitialized(this.onInitialized.bind(this));

    // Completion
    this.connection.onCompletion(this.completionProvider.provideCompletions.bind(this.completionProvider));

    // Hover
    this.connection.onHover(this.hoverProvider.provideHover.bind(this.hoverProvider));

    // Definition
    this.connection.onDefinition(this.definitionProvider.provideDefinition.bind(this.definitionProvider));

    // References
    this.connection.onReferences(this.referencesProvider.provideReferences.bind(this.referencesProvider));

    // Document Symbols
    this.connection.onDocumentSymbol(this.documentSymbolsProvider.provideDocumentSymbols.bind(this.documentSymbolsProvider));

    // Formatting
    this.connection.onDocumentFormatting(this.formattingProvider.provideFormatting.bind(this.formattingProvider));

    // Code Actions
    this.connection.onCodeAction(async (params) => {
      return this.codeActionProvider.provideCodeActions(params);
    });

    // Prepare Rename
    this.connection.onPrepareRename(async (params) => {
      const document = this.documentManager.getDocument(params.textDocument.uri);
      if (!document) return null;
      return this.renameProvider.prepareRename(params, document.getText());
    });

    // Rename
    this.connection.onRenameRequest(async (params) => {
      const document = this.documentManager.getDocument(params.textDocument.uri);
      if (!document) return null;

      // Get all workspace files (simplified - would use workspace folders in real implementation)
      const workspaceFiles = new Map<string, string>();
      // TODO: Populate with actual workspace files

      return this.renameProvider.rename(params, document.getText(), workspaceFiles);
    });

    // Shutdown
    this.connection.onShutdown(this.onShutdown.bind(this));

    // Exit
    this.connection.onExit(this.onExit.bind(this));
  }

  /**
   * Handle initialize request
   */
  private onInitialize(params: InitializeParams): InitializeResult {
    this.connection.console.info('PCL Language Server initializing...');

    // Log client info
    if (params.clientInfo) {
      this.connection.console.info(
        `Client: ${params.clientInfo.name} ${params.clientInfo.version || ''}`
      );
    }

    // Log workspace folders
    if (params.workspaceFolders) {
      this.connection.console.info(
        `Workspace folders: ${params.workspaceFolders.length}`
      );
    }

    // Get capabilities
    const capabilities = getServerCapabilities();

    return {
      capabilities,
      serverInfo: {
        name: 'PCL Language Server',
        version: '1.0.0',
      },
    };
  }

  /**
   * Handle initialized notification
   */
  private onInitialized(): void {
    this.connection.console.info('PCL Language Server initialized successfully');

    // Log cache configuration
    const stats = this.documentManager.getCacheStats();
    this.connection.console.info(
      `Document cache: ${stats.size}/${stats.maxSize} documents`
    );
  }

  /**
   * Handle shutdown request
   */
  private onShutdown(): void {
    this.connection.console.info('PCL Language Server shutting down...');
    // Clean up timers
    this.diagnosticsProvider.dispose();
  }

  /**
   * Handle exit notification
   */
  private onExit(): void {
    this.connection.console.info('PCL Language Server exited');
    process.exit(0);
  }

  /**
   * Get document manager
   */
  getDocumentManager(): DocumentManager {
    return this.documentManager;
  }

  /**
   * Get diagnostics provider
   */
  getDiagnosticsProvider(): DiagnosticsProvider {
    return this.diagnosticsProvider;
  }

  /**
   * Get completion provider
   */
  getCompletionProvider(): CompletionProvider {
    return this.completionProvider;
  }

  /**
   * Get hover provider
   */
  getHoverProvider(): HoverProvider {
    return this.hoverProvider;
  }

  /**
   * Start the language server
   */
  start(): void {
    this.connection.console.info('Starting PCL Language Server...');
    this.connection.listen();
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new PCLLanguageServer();
  server.start();
}
