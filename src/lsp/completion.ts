/**
 * PCL Language Server - Completion Provider
 *
 * Provides IntelliSense/auto-complete functionality
 */

import {
  Connection,
  CompletionItem,
  CompletionParams,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node';

import { DocumentManager } from './document-manager';
import { CompletionContext, SymbolInfo } from './completion-types';
import {
  generateKeywordCompletions,
  generateSnippetCompletions,
  generatePropertyCompletions,
  generateSymbolCompletions,
  getPropertyValueCompletions,
} from './completion-items';

/**
 * Completion provider handles textDocument/completion requests
 */
export class CompletionProvider {
  constructor(
    private connection: Connection,
    private documentManager: DocumentManager
  ) {}

  /**
   * Provide completion items
   */
  async provideCompletions(params: CompletionParams): Promise<CompletionItem[]> {
    const uri = params.textDocument.uri;
    const position = params.position;

    try {
      // Get document
      const document = this.documentManager.getDocument(uri);
      if (!document) {
        return [];
      }

      // Get document info (AST + analysis)
      const docInfo = this.documentManager.getDocumentInfo(uri);

      // Get completion context
      const context = this.getCompletionContext(document.getText(), position);

      // Collect completion items
      const items: CompletionItem[] = [];

      // 1. Keywords (always)
      items.push(...generateKeywordCompletions(context));

      // 2. Snippets (always)
      items.push(...generateSnippetCompletions(context));

      // 3. Properties (if inside a block)
      if (context.insideBlock && context.declarationType) {
        items.push(...generatePropertyCompletions(context));
      }

      // 4. Property values (if after colon)
      if (context.afterColon && context.wordBeingTyped) {
        const propertyName = this.extractPropertyName(context.lineText);
        if (propertyName) {
          const valueCompletions = getPropertyValueCompletions(propertyName);
          items.push(...valueCompletions);
        }
      }

      // 5. Symbols from analysis (if available)
      if (docInfo?.analysis) {
        const symbols = this.extractSymbols(docInfo.analysis);
        items.push(...generateSymbolCompletions(symbols));
      }

      this.connection.console.log(
        `Provided ${items.length} completion items for ${uri} at ${position.line}:${position.character}`
      );

      return items;
    } catch (error) {
      this.connection.console.error(
        `Error providing completions: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get completion context from document and position
   */
  private getCompletionContext(
    text: string,
    position: { line: number; character: number }
  ): CompletionContext {
    const lines = text.split('\n');
    const lineText = lines[position.line] || '';
    const beforeCursor = lineText.substring(0, position.character);

    // Extract character at/before position
    const charAtPosition = lineText[position.character];
    const charBefore = beforeCursor[beforeCursor.length - 1];

    // Extract word being typed (alphanumeric + underscore)
    const wordMatch = beforeCursor.match(/[\w_]*$/);
    const wordBeingTyped = wordMatch ? wordMatch[0] : undefined;

    // Determine if inside a block
    const openBraces = (text.substring(0, this.getOffset(lines, position)).match(/{/g) || []).length;
    const closeBraces = (text.substring(0, this.getOffset(lines, position)).match(/}/g) || []).length;
    const insideBlock = openBraces > closeBraces;

    // Determine declaration type (search backwards for declaration keyword)
    let declarationType: string | undefined;
    if (insideBlock) {
      const textBeforeCursor = text.substring(0, this.getOffset(lines, position));
      const declarationMatch = textBeforeCursor.match(/\b(persona|team|workflow|skill|config|metadata)\s+\w+\s*{[^}]*$/);
      if (declarationMatch) {
        declarationType = declarationMatch[1];
      }
    }

    // Check if after colon (property value context)
    const afterColon = beforeCursor.trimEnd().endsWith(':');

    // Check if inside array
    const openBrackets = (beforeCursor.match(/\[/g) || []).length;
    const closeBrackets = (beforeCursor.match(/\]/g) || []).length;
    const insideArray = openBrackets > closeBrackets;

    // Check if inside string
    const quotes = (beforeCursor.match(/"/g) || []).length;
    const insideString = quotes % 2 === 1;

    return {
      lineText,
      charAtPosition,
      charBefore,
      wordBeingTyped,
      insideBlock,
      declarationType,
      afterColon,
      insideArray,
      insideString,
    };
  }

  /**
   * Get offset in text from line and character
   */
  private getOffset(lines: string[], position: { line: number; character: number }): number {
    let offset = 0;
    for (let i = 0; i < position.line; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    offset += position.character;
    return offset;
  }

  /**
   * Extract property name from line (before colon)
   */
  private extractPropertyName(lineText: string): string | undefined {
    const match = lineText.match(/(\w+)\s*:\s*$/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract symbols from analysis result
   */
  private extractSymbols(analysis: any): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    if (!analysis.symbols) {
      return symbols;
    }

    // Extract symbols from symbol table
    for (const [name, symbol] of Object.entries<any>(analysis.symbols)) {
      if (symbol && symbol.kind) {
        symbols.push({
          name,
          type: symbol.kind,
          exported: symbol.exported || false,
          documentation: symbol.documentation,
          file: analysis.source || '<unknown>',
        });
      }
    }

    return symbols;
  }
}
