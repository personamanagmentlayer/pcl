/**
 * PCL Language Server - Formatting Provider
 *
 * Provides code formatting functionality
 */

import {
  Connection,
  DocumentFormattingParams,
  TextEdit,
} from 'vscode-languageserver/node';

import { DocumentManager } from './document-manager';

/**
 * Formatting provider handles textDocument/formatting requests
 */
export class FormattingProvider {
  constructor(
    private connection: Connection,
    private documentManager: DocumentManager
  ) {}

  /**
   * Provide document formatting
   */
  async provideFormatting(
    params: DocumentFormattingParams
  ): Promise<TextEdit[] | null> {
    const uri = params.textDocument.uri;

    try {
      const document = this.documentManager.getDocument(uri);
      if (!document) {
        return null;
      }

      const text = document.getText();
      const formatted = this.formatDocument(text, params.options);

      if (formatted === text) {
        return null; // No changes
      }

      // Return single edit that replaces entire document
      return [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: document.lineCount, character: 0 },
          },
          newText: formatted,
        },
      ];
    } catch (error) {
      this.connection.console.error(
        `Error formatting document: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Format document text
   */
  private formatDocument(text: string, options: any): string {
    const lines = text.split('\n');
    const formatted: string[] = [];
    let indentLevel = 0;
    const indentString = options.insertSpaces
      ? ' '.repeat(options.tabSize || 2)
      : '\t';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        formatted.push('');
        continue;
      }

      // Decrease indent for closing braces
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Add indentation
      const indented = indentString.repeat(indentLevel) + trimmed;
      formatted.push(indented);

      // Increase indent after opening braces
      if (trimmed.endsWith('{')) {
        indentLevel++;
      }
    }

    return formatted.join('\n');
  }
}
