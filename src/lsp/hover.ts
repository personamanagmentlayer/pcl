/**
 * PCL Language Server - Hover Provider
 *
 * Provides hover information (type hints, documentation)
 */

import {
  Connection,
  Hover,
  HoverParams,
  MarkupKind,
} from 'vscode-languageserver/node';

import { DocumentManager } from './document-manager';
import { PCL_KEYWORDS } from './keywords';
import { getPropertyDocumentation } from './hover-docs';

/**
 * Hover provider handles textDocument/hover requests
 */
export class HoverProvider {
  constructor(
    private connection: Connection,
    private documentManager: DocumentManager
  ) {}

  /**
   * Provide hover information
   */
  async provideHover(params: HoverParams): Promise<Hover | null> {
    const uri = params.textDocument.uri;
    const position = params.position;

    try {
      // Get document
      const document = this.documentManager.getDocument(uri);
      if (!document) {
        return null;
      }

      // Get document info (AST + analysis)
      const docInfo = this.documentManager.getDocumentInfo(uri);

      // Get word at position
      const wordInfo = this.getWordAtPosition(document.getText(), position);
      if (!wordInfo) {
        return null;
      }

      const { word, range } = wordInfo;

      // Check if it's a keyword
      const keyword = PCL_KEYWORDS.find((kw) => kw.keyword === word);
      if (keyword) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: this.formatKeywordHover(keyword),
          },
          range,
        };
      }

      // Check if it's a property name
      if (docInfo) {
        const propertyDoc = this.getPropertyHover(word, docInfo);
        if (propertyDoc) {
          return {
            contents: {
              kind: MarkupKind.Markdown,
              value: propertyDoc,
            },
            range,
          };
        }
      }

      // Check if it's a symbol
      if (docInfo?.analysis?.symbols) {
        const symbols: any = docInfo.analysis.symbols;
        const symbol = symbols[word];
        if (symbol) {
          return {
            contents: {
              kind: MarkupKind.Markdown,
              value: this.formatSymbolHover(word, symbol),
            },
            range,
          };
        }
      }

      // No hover information available
      return null;
    } catch (error) {
      this.connection.console.error(
        `Error providing hover: ${error instanceof Error ? error.message : String(error)}`
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
  ): { word: string; range: any } | null {
    const lines = text.split('\n');
    const line = lines[position.line];
    if (!line) {
      return null;
    }

    // Find word boundaries
    let start = position.character;
    let end = position.character;

    // Expand left
    while (start > 0 && /[\w_]/.test(line[start - 1])) {
      start--;
    }

    // Expand right
    while (end < line.length && /[\w_]/.test(line[end])) {
      end++;
    }

    if (start === end) {
      return null;
    }

    const word = line.substring(start, end);

    return {
      word,
      range: {
        start: { line: position.line, character: start },
        end: { line: position.line, character: end },
      },
    };
  }

  /**
   * Format keyword hover
   */
  private formatKeywordHover(keyword: any): string {
    const parts: string[] = [];

    // Header
    parts.push(`**${keyword.keyword}** \`(keyword)\``);
    parts.push('');

    // Documentation
    parts.push(keyword.documentation);

    // Category
    if (keyword.detail) {
      parts.push('');
      parts.push(`*${keyword.detail}*`);
    }

    return parts.join('\n');
  }

  /**
   * Format symbol hover
   */
  private formatSymbolHover(name: string, symbol: any): string {
    const parts: string[] = [];

    // Header with type
    const symbolType = symbol.kind || 'symbol';
    parts.push(`**${name}** \`(${symbolType})\``);
    parts.push('');

    // Type information
    if (symbol.type) {
      parts.push(`Type: \`${this.formatType(symbol.type)}\``);
      parts.push('');
    }

    // Documentation
    if (symbol.documentation) {
      parts.push(symbol.documentation);
      parts.push('');
    }

    // Version
    if (symbol.version) {
      parts.push(`*Version: ${symbol.version}*`);
    }

    // Visibility
    if (symbol.exported !== undefined) {
      parts.push(`*${symbol.exported ? 'Exported' : 'Private'}*`);
    }

    return parts.join('\n');
  }

  /**
   * Get property hover
   */
  private getPropertyHover(propertyName: string, docInfo: any): string | null {
    // Try to determine the declaration type from context
    // This is a simplified version - could be enhanced with AST traversal
    const doc = getPropertyDocumentation(propertyName);
    if (doc) {
      return `**${propertyName}** \`(property)\`\n\n${doc}`;
    }
    return null;
  }

  /**
   * Format type for display
   */
  private formatType(type: any): string {
    if (typeof type === 'string') {
      return type;
    }

    if (type.kind) {
      switch (type.kind) {
        case 'array':
          return `Array<${this.formatType(type.elementType)}>`;
        case 'map':
          return `Map<${this.formatType(type.keyType)}, ${this.formatType(type.valueType)}>`;
        case 'union':
          return type.types.map((t: any) => this.formatType(t)).join(' | ');
        case 'object':
          return 'Object';
        default:
          return type.kind;
      }
    }

    return 'unknown';
  }
}
