/**
 * PCL Language Server - Definition Provider
 *
 * Provides go-to-definition functionality
 */

import {
  Connection,
  Definition,
  DefinitionParams,
} from 'vscode-languageserver/node';

import { DocumentManager } from './document-manager';

/**
 * Definition provider handles textDocument/definition requests
 */
export class DefinitionProvider {
  constructor(
    private connection: Connection,
    private documentManager: DocumentManager
  ) {}

  /**
   * Provide definition location
   */
  async provideDefinition(
    params: DefinitionParams
  ): Promise<Definition | null> {
    const uri = params.textDocument.uri;
    const position = params.position;

    try {
      const document = this.documentManager.getDocument(uri);
      if (!document) {
        return null;
      }

      const docInfo = this.documentManager.getDocumentInfo(uri);
      if (!docInfo?.analysis?.symbols) {
        return null;
      }

      // Get word at position
      const word = this.getWordAtPosition(document.getText(), position);
      if (!word) {
        return null;
      }

      // Look up symbol
      const symbols: any = docInfo.analysis.symbols;
      const symbol = symbols[word];

      if (symbol && symbol.location) {
        return {
          uri: symbol.location.uri || uri,
          range: {
            start: {
              line: symbol.location.line - 1,
              character: symbol.location.column - 1,
            },
            end: {
              line: symbol.location.line - 1,
              character: symbol.location.column + word.length - 1,
            },
          },
        };
      }

      return null;
    } catch (error) {
      this.connection.console.error(
        `Error providing definition: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Get word at position
   */
  private getWordAtPosition(
    text: string,
    position: { line: number; character: number }
  ): string | null {
    const lines = text.split('\n');
    const line = lines[position.line];
    if (!line) {
      return null;
    }

    let start = position.character;
    let end = position.character;

    while (start > 0 && /[\w_]/.test(line[start - 1])) {
      start--;
    }

    while (end < line.length && /[\w_]/.test(line[end])) {
      end++;
    }

    if (start === end) {
      return null;
    }

    return line.substring(start, end);
  }
}
