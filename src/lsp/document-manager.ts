/**
 * PCL Language Server - Document Manager
 *
 * Manages document lifecycle and synchronization
 */

import {
  TextDocuments,
  Connection,
  TextDocumentChangeEvent,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { parse } from '../parser';
import { analyze } from '../semantic';
import { DocumentInfo } from './types';
import { DocumentCache } from './document-cache';

/**
 * Document manager handles document lifecycle and parsing
 */
export class DocumentManager {
  private documents: TextDocuments<TextDocument>;
  private cache: DocumentCache;
  private diagnosticsCallback?: (uri: string) => void;

  constructor(
    private connection: Connection,
    maxCachedDocuments: number = 100
  ) {
    this.cache = new DocumentCache(maxCachedDocuments);
    this.documents = new TextDocuments(TextDocument);
    this.setupHandlers();
  }

  /**
   * Set callback for diagnostics updates
   */
  onDiagnosticsNeeded(callback: (uri: string) => void): void {
    this.diagnosticsCallback = callback;
  }

  /**
   * Set up document event handlers
   */
  private setupHandlers(): void {
    // Document opened
    this.documents.onDidOpen((event) => {
      this.connection.console.log(`Document opened: ${event.document.uri}`);
      this.onDocumentOpen(event);
    });

    // Document changed
    this.documents.onDidChangeContent((event) => {
      this.connection.console.log(`Document changed: ${event.document.uri}`);
      this.onDocumentChange(event);
    });

    // Document saved
    this.documents.onDidSave((event) => {
      this.connection.console.log(`Document saved: ${event.document.uri}`);
      this.onDocumentSave(event);
    });

    // Document closed
    this.documents.onDidClose((event) => {
      this.connection.console.log(`Document closed: ${event.document.uri}`);
      this.onDocumentClose(event);
    });

    // Listen to document notifications
    this.documents.listen(this.connection);
  }

  /**
   * Handle document open
   */
  private async onDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>
  ): Promise<void> {
    await this.parseAndAnalyze(event.document);
  }

  /**
   * Handle document change
   */
  private async onDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>
  ): Promise<void> {
    await this.parseAndAnalyze(event.document);
  }

  /**
   * Handle document save
   */
  private async onDocumentSave(
    event: TextDocumentChangeEvent<TextDocument>
  ): Promise<void> {
    // Re-parse on save to ensure cache is up to date
    await this.parseAndAnalyze(event.document);
  }

  /**
   * Handle document close
   */
  private onDocumentClose(event: TextDocumentChangeEvent<TextDocument>): void {
    // Remove from cache
    this.cache.delete(event.document.uri);
  }

  /**
   * Parse and analyze a document
   */
  private async parseAndAnalyze(document: TextDocument): Promise<void> {
    const uri = document.uri;
    const text = document.getText();

    try {
      // Parse the document
      const parseResult = parse(text, {
        source: uri,
      });

      const docInfo: DocumentInfo = {
        document,
        timestamp: Date.now(),
      };

      if (parseResult.ok) {
        docInfo.ast = parseResult.value.program;

        // Perform semantic analysis
        const analysisResult = analyze(parseResult.value.program, {
          source: uri,
          modulePath: uri,
        });

        if (analysisResult.ok) {
          docInfo.analysis = analysisResult.value;
        }
      }

      // Update cache
      this.cache.set(uri, docInfo);

      this.connection.console.log(
        `Parsed document: ${uri} (AST: ${docInfo.ast ? 'OK' : 'FAIL'}, Analysis: ${docInfo.analysis ? 'OK' : 'FAIL'})`
      );

      // Trigger diagnostics update
      if (this.diagnosticsCallback) {
        this.diagnosticsCallback(uri);
      }
    } catch (error) {
      this.connection.console.error(
        `Error parsing document ${uri}: ${error instanceof Error ? error.message : String(error)}`
      );

      // Still trigger diagnostics to show the error
      if (this.diagnosticsCallback) {
        this.diagnosticsCallback(uri);
      }
    }
  }

  /**
   * Get document by URI
   */
  getDocument(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  /**
   * Get document info (including parsed AST and analysis)
   */
  getDocumentInfo(uri: string): DocumentInfo | undefined {
    return this.cache.get(uri);
  }

  /**
   * Get all open documents
   */
  getAllDocuments(): TextDocument[] {
    return this.documents.all();
  }

  /**
   * Check if document is cached
   */
  hasDocument(uri: string): boolean {
    return this.cache.has(uri);
  }

  /**
   * Force re-parse of a document
   */
  async refreshDocument(uri: string): Promise<void> {
    const document = this.getDocument(uri);
    if (document) {
      await this.parseAndAnalyze(document);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return this.cache.getStats();
  }

  /**
   * Clear document cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
