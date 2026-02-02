/**
 * PCL Language Server - References Provider
 *
 * Provides find-all-references functionality
 */

import {
  Connection,
  Location,
  ReferenceParams,
} from 'vscode-languageserver/node';

import { DocumentManager } from './document-manager';

/**
 * References provider handles textDocument/references requests
 */
export class ReferencesProvider {
  constructor(
    private connection: Connection,
    private documentManager: DocumentManager
  ) {}

  /**
   * Provide all references to a symbol
   */
  async provideReferences(params: ReferenceParams): Promise<Location[] | null> {
    const uri = params.textDocument.uri;
    const position = params.position;

    try {
      const document = this.documentManager.getDocument(uri);
      if (!document) {
        return null;
      }

      const docInfo = this.documentManager.getDocumentInfo(uri);
      if (!docInfo?.analysis) {
        return null;
      }

      // Get word at position
      const word = this.getWordAtPosition(document.getText(), position);
      if (!word) {
        return null;
      }

      // Find all references in current document
      const text = document.getText();
      const references: Location[] = [];
      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let index = 0;

        while ((index = line.indexOf(word, index)) !== -1) {
          // Check if it's a word boundary
          const before = index > 0 ? line[index - 1] : ' ';
          const after =
            index + word.length < line.length ? line[index + word.length] : ' ';

          if (!/[\w_]/.test(before) && !/[\w_]/.test(after)) {
            references.push({
              uri,
              range: {
                start: { line: i, character: index },
                end: { line: i, character: index + word.length },
              },
            });
          }

          index += word.length;
        }
      }

      return references.length > 0 ? references : null;
    } catch (error) {
      this.connection.console.error(
        `Error providing references: ${error instanceof Error ? error.message : String(error)}`
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
