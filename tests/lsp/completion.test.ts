/**
 * Tests for LSP Completion Provider
 *
 * Tests context-aware completion, trigger characters, and position calculation
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import type { CompletionParams } from 'vscode-languageserver';
import { CompletionProvider } from '../../src/lsp/completion';

describe('CompletionProvider', () => {
  let provider: CompletionProvider;
  let mockConnection: any;
  let mockDocumentManager: any;

  beforeEach(() => {
    // Mock connection
    mockConnection = {
      console: {
        log: vi.fn(),
        error: vi.fn(),
      },
    };

    // Mock document manager
    mockDocumentManager = {
      getDocument: vi.fn(),
      getDocumentInfo: vi.fn(),
    };

    provider = new CompletionProvider(mockConnection, mockDocumentManager);
  });

  // Helper function to create mock document
  const createMockDocument = (uri: string, text: string) => {
    return TextDocument.create(uri, 'pcl', 1, text);
  };

  describe('provideCompletions', () => {
    it('should return empty array for non-existent document', async () => {
      mockDocumentManager.getDocument.mockReturnValue(undefined);

      const params: CompletionParams = {
        textDocument: { uri: 'file:///nonexistent.pcl' },
        position: { line: 0, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      expect(items).toEqual([]);
    });

    it('should provide completions at start of document', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  name: "Alice"\n}';
      const document = createMockDocument(uri, text);

      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should provide completions at end of line', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  name: "Alice"\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 7 }, // After "persona"
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should provide completions inside block', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 2 }, // Inside block
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
      // Should include property completions
      const labels = items.map((item) => item.label);
      expect(labels).toContain('name');
      expect(labels).toContain('config');
    });

    it('should handle completion at empty line', async () => {
      const uri = 'file:///test.pcl';
      const text = '\n\n\n';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle completion in middle of word', async () => {
      const uri = 'file:///test.pcl';
      const text = 'pers';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 4 }, // After "pers"
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should provide property value completions after colon', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  merge: \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 9 }, // After "merge: "
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
      // Should include merge strategies
      const labels = items.map((item) => item.label);
      expect(
        labels.some((l) => ['Primary', 'Consensus', 'Voting'].includes(l))
      ).toBe(true);
    });

    it('should log completion activity', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 0 },
      };

      await provider.provideCompletions(params);

      expect(mockConnection.console.log).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Create a provider with a document manager that throws
      const errorDocManager = {
        getDocument: () => {
          throw new Error('Test error');
        },
        getDocumentInfo: () => null,
      } as any;

      const errorProvider = new CompletionProvider(
        mockConnection,
        errorDocManager
      );

      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        position: { line: 0, character: 0 },
      };

      const items = await errorProvider.provideCompletions(params);

      expect(items).toEqual([]);
      expect(mockConnection.console.error).toHaveBeenCalled();
    });
  });

  describe('Context Detection', () => {
    it('should detect global context', async () => {
      const uri = 'file:///test.pcl';
      const text = '';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      // Should include declaration keywords
      const labels = items.map((item) => item.label);
      expect(labels).toContain('persona');
      expect(labels).toContain('team');
    });

    it('should detect persona block context', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 2 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('name');
      expect(labels).toContain('config');
      expect(labels).toContain('prompts');
    });

    it('should detect team block context', async () => {
      const uri = 'file:///test.pcl';
      const text = 'team DevTeam {\n  \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 2 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('members');
      expect(labels).toContain('primary');
      expect(labels).toContain('merge');
    });

    it('should detect workflow block context', async () => {
      const uri = 'file:///test.pcl';
      const text = 'workflow Pipeline {\n  \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 2 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('steps');
      expect(labels).toContain('timeout');
      expect(labels).toContain('retry');
    });

    it('should detect skill block context', async () => {
      const uri = 'file:///test.pcl';
      const text = 'skill Programming {\n  \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 2 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('category');
      expect(labels).toContain('items');
    });

    it('should detect nested block context', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  config {\n    \n  }\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 2, character: 4 },
      };

      const items = await provider.provideCompletions(params);

      // Should still provide completions
      expect(items.length).toBeGreaterThan(0);
    });

    it('should not suggest declarations inside blocks', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 2 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      // Should not include declaration keywords
      expect(labels).not.toContain('persona');
      expect(labels).not.toContain('team');
      expect(labels).not.toContain('workflow');
    });

    it('should handle multiple declarations', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {}\npersona Bob {}\n';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 2, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('Property Value Completions', () => {
    it('should provide merge strategy completions', async () => {
      const uri = 'file:///test.pcl';
      const text = 'team DevTeam {\n  merge: \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 9 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('Primary');
      expect(labels).toContain('Consensus');
    });

    it('should provide model name completions', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  config {\n    model: \n  }\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 2, character: 11 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('claude-sonnet-4');
    });

    it('should provide thinking style completions', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  config {\n    thinking_style: \n  }\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 2, character: 20 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('analytical');
      expect(labels).toContain('creative');
    });

    it('should provide response format completions', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  config {\n    response_format: \n  }\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 2, character: 21 },
      };

      const items = await provider.provideCompletions(params);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('json');
      expect(labels).toContain('markdown');
    });

    it('should not provide property value completions without property name', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  : \n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 4 },
      };

      const items = await provider.provideCompletions(params);

      // Should still provide general completions
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('Position Calculation', () => {
    it('should calculate position in single line', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 7 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should calculate position in multi-line document', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  name: "Alice"\n  version: "1.0.0"\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 2, character: 10 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle position at line boundary', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice\n{\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle position beyond line length', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 100 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle position at document end', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 16 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('Brace Tracking', () => {
    it('should detect inside block with open brace', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  ';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 2 },
      };

      const items = await provider.provideCompletions(params);

      // Should provide property completions
      const labels = items.map((item) => item.label);
      expect(labels).toContain('name');
    });

    it('should detect outside block with closed brace', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {}\n';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      // Should provide declaration keywords
      const labels = items.map((item) => item.label);
      expect(labels).toContain('persona');
    });

    it('should handle nested braces', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  config {\n    ';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 2, character: 4 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle unmatched braces', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  config {\n';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 2, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', async () => {
      const uri = 'file:///test.pcl';
      const text = '';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only document', async () => {
      const uri = 'file:///test.pcl';
      const text = '   \n\n\t  ';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 0 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle position beyond document', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 100, character: 100 },
      };

      const items = await provider.provideCompletions(params);

      // Should handle gracefully without crashing
      expect(Array.isArray(items)).toBe(true);
    });

    it('should handle completion in comments', async () => {
      const uri = 'file:///test.pcl';
      const text = '// This is a comment\npersona Alice {}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 10 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle completion in strings', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  name: "Ali"\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 13 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle completion after special characters', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice {\n  members: []\n}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 1, character: 13 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle Unicode characters', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Алиса {}';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 10 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });

    it('should handle very long lines', async () => {
      const uri = 'file:///test.pcl';
      const text = 'persona Alice { ' + 'x'.repeat(10000) + ' }';

      const document = createMockDocument(uri, text);
      mockDocumentManager.getDocument.mockReturnValue(document);
      mockDocumentManager.getDocumentInfo.mockReturnValue(null);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 0, character: 16 },
      };

      const items = await provider.provideCompletions(params);

      expect(items.length).toBeGreaterThan(0);
    });
  });
});
