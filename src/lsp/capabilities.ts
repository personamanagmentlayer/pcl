/**
 * PCL Language Server - Server Capabilities
 *
 * Defines what features the LSP server supports
 */

import {
  TextDocumentSyncKind,
  CompletionOptions,
  ServerCapabilities,
} from 'vscode-languageserver/node';

/**
 * Get server capabilities configuration
 */
export function getServerCapabilities(): ServerCapabilities {
  return {
    // Document synchronization
    textDocumentSync: {
      openClose: true,
      change: TextDocumentSyncKind.Incremental,
      save: {
        includeText: false,
      },
    },

    // Code completion
    completionProvider: {
      resolveProvider: true,
      triggerCharacters: ['.', ':', '@', '{', '[', ' '],
    } as CompletionOptions,

    // Hover information
    hoverProvider: true,

    // Go to definition
    definitionProvider: true,

    // Find references
    referencesProvider: true,

    // Document symbols (outline)
    documentSymbolProvider: true,

    // Workspace symbols (search)
    workspaceSymbolProvider: true,

    // Code actions (quick fixes, refactorings)
    codeActionProvider: {
      codeActionKinds: [
        'quickfix',
        'refactor',
        'refactor.extract',
        'refactor.inline',
        'refactor.rewrite',
        'source',
        'source.organizeImports',
      ],
    },

    // Rename symbol
    renameProvider: {
      prepareProvider: true,
    },

    // Document formatting
    documentFormattingProvider: true,
    documentRangeFormattingProvider: true,

    // Semantic tokens (syntax highlighting)
    semanticTokensProvider: {
      legend: {
        tokenTypes: [
          'namespace',
          'class',
          'enum',
          'interface',
          'struct',
          'typeParameter',
          'type',
          'parameter',
          'variable',
          'property',
          'enumMember',
          'decorator',
          'event',
          'function',
          'method',
          'macro',
          'label',
          'comment',
          'string',
          'keyword',
          'number',
          'regexp',
          'operator',
        ],
        tokenModifiers: [
          'declaration',
          'definition',
          'readonly',
          'static',
          'deprecated',
          'abstract',
          'async',
          'modification',
          'documentation',
          'defaultLibrary',
        ],
      },
      full: true,
      range: false,
    },

    // Folding ranges
    foldingRangeProvider: true,

    // Workspace features
    workspace: {
      workspaceFolders: {
        supported: true,
        changeNotifications: true,
      },
    },
  };
}
