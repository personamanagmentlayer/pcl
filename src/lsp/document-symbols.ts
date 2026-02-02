/**
 * PCL Language Server - Document Symbols Provider
 *
 * Provides document outline/symbols functionality
 */

import {
  Connection,
  DocumentSymbol,
  DocumentSymbolParams,
  SymbolKind,
} from 'vscode-languageserver/node';

import { DocumentManager } from './document-manager';

/**
 * Document symbols provider handles textDocument/documentSymbol requests
 */
export class DocumentSymbolsProvider {
  constructor(
    private connection: Connection,
    private documentManager: DocumentManager
  ) {}

  /**
   * Provide document symbols
   */
  async provideDocumentSymbols(
    params: DocumentSymbolParams
  ): Promise<DocumentSymbol[] | null> {
    const uri = params.textDocument.uri;

    try {
      const docInfo = this.documentManager.getDocumentInfo(uri);
      if (!docInfo?.analysis?.symbols) {
        return null;
      }

      const symbols: DocumentSymbol[] = [];
      const symbolsMap: any = docInfo.analysis.symbols;

      for (const [name, symbol] of Object.entries<any>(symbolsMap)) {
        if (symbol && symbol.location) {
          const line = symbol.location.line - 1;
          const character = symbol.location.column - 1;

          symbols.push({
            name,
            kind: this.getSymbolKind(symbol.kind),
            range: {
              start: { line, character },
              end: { line, character: character + name.length },
            },
            selectionRange: {
              start: { line, character },
              end: { line, character: character + name.length },
            },
            detail: symbol.kind,
          });
        }
      }

      return symbols.length > 0 ? symbols : null;
    } catch (error) {
      this.connection.console.error(
        `Error providing document symbols: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Get LSP symbol kind from PCL symbol kind
   */
  private getSymbolKind(kind: string): SymbolKind {
    switch (kind?.toLowerCase()) {
      case 'persona':
        return SymbolKind.Class;
      case 'team':
        return SymbolKind.Module;
      case 'workflow':
        return SymbolKind.Function;
      case 'skill':
        return SymbolKind.Interface;
      case 'type':
        return SymbolKind.TypeParameter;
      case 'const':
        return SymbolKind.Constant;
      default:
        return SymbolKind.Variable;
    }
  }
}
