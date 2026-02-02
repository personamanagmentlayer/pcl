/**
 * PCL Language Server - Diagnostics Provider
 *
 * Provides real-time diagnostics (errors and warnings)
 */

import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
} from 'vscode-languageserver/node';

import { DocumentManager } from './document-manager';
import {
  convertErrorsToDiagnostics,
  createGenericDiagnostic,
} from './error-converter';

/**
 * Diagnostics provider manages diagnostic publishing
 */
export class DiagnosticsProvider {
  private diagnosticsTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private connection: Connection,
    private documentManager: DocumentManager,
    private debounceMs: number = 300
  ) {}

  /**
   * Publish diagnostics for a document
   */
  async publishDiagnostics(uri: string): Promise<void> {
    // Clear existing timer for this document
    const existingTimer = this.diagnosticsTimers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce diagnostic publishing
    const timer = setTimeout(() => {
      this.diagnosticsTimers.delete(uri);
      this.computeAndPublishDiagnostics(uri);
    }, this.debounceMs);

    this.diagnosticsTimers.set(uri, timer);
  }

  /**
   * Compute and publish diagnostics immediately (no debounce)
   */
  private async computeAndPublishDiagnostics(uri: string): Promise<void> {
    const diagnostics: Diagnostic[] = [];

    try {
      const docInfo = this.documentManager.getDocumentInfo(uri);

      if (!docInfo) {
        // Document not found, clear diagnostics
        this.connection.sendDiagnostics({ uri, diagnostics: [] });
        return;
      }

      // Collect parse errors
      if (!docInfo.ast) {
        // Parse failed - try to get error from parse result
        const document = this.documentManager.getDocument(uri);
        if (document) {
          // Re-parse to get errors
          const { parse } = await import('../parser');
          const parseResult = parse(document.getText(), { source: uri });

          if (!parseResult.ok) {
            const parseDiagnostics = convertErrorsToDiagnostics(
              parseResult.error
            );
            diagnostics.push(...parseDiagnostics);
          }
        }
      }

      // Collect semantic errors and warnings
      if (docInfo.analysis) {
        // Add errors
        if (docInfo.analysis.errors && docInfo.analysis.errors.length > 0) {
          const errorDiagnostics = convertErrorsToDiagnostics(
            docInfo.analysis.errors
          );
          diagnostics.push(...errorDiagnostics);
        }

        // Add warnings
        if (docInfo.analysis.warnings && docInfo.analysis.warnings.length > 0) {
          const warningDiagnostics = convertErrorsToDiagnostics(
            docInfo.analysis.warnings
          );
          diagnostics.push(...warningDiagnostics);
        }
      }

      // Sort diagnostics by position (line, then character)
      diagnostics.sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
          return a.range.start.line - b.range.start.line;
        }
        return a.range.start.character - b.range.start.character;
      });

      // Publish diagnostics
      this.connection.sendDiagnostics({ uri, diagnostics });

      this.connection.console.log(
        `Published ${diagnostics.length} diagnostic(s) for ${uri}`
      );
    } catch (error) {
      this.connection.console.error(
        `Error computing diagnostics for ${uri}: ${error instanceof Error ? error.message : String(error)}`
      );

      // Publish error diagnostic
      diagnostics.push(
        createGenericDiagnostic(
          `Internal error: ${error instanceof Error ? error.message : String(error)}`,
          DiagnosticSeverity.Error
        )
      );
      this.connection.sendDiagnostics({ uri, diagnostics });
    }
  }

  /**
   * Clear diagnostics for a document
   */
  clearDiagnostics(uri: string): void {
    // Clear timer
    const timer = this.diagnosticsTimers.get(uri);
    if (timer) {
      clearTimeout(timer);
      this.diagnosticsTimers.delete(uri);
    }

    // Clear diagnostics
    this.connection.sendDiagnostics({ uri, diagnostics: [] });
  }

  /**
   * Refresh diagnostics for all open documents
   */
  async refreshAll(): Promise<void> {
    const documents = this.documentManager.getAllDocuments();
    for (const document of documents) {
      await this.publishDiagnostics(document.uri);
    }
  }

  /**
   * Clear all diagnostic timers
   */
  dispose(): void {
    for (const timer of this.diagnosticsTimers.values()) {
      clearTimeout(timer);
    }
    this.diagnosticsTimers.clear();
  }
}
