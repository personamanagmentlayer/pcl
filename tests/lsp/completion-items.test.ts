/**
 * Tests for LSP Completion Items Generator
 *
 * Tests keyword, snippet, property, symbol, and enum completions
 */

import type {
  CompletionContext,
  SymbolInfo,
} from '../../src/lsp/completion-types';
import {
  generateEnumCompletions,
  generateKeywordCompletions,
  generatePropertyCompletions,
  generateSnippetCompletions,
  generateSymbolCompletions,
  getPropertyValueCompletions,
} from '../../src/lsp/completion-items';

describe('Completion Items Generator', () => {
  describe('generateKeywordCompletions', () => {
    it('should generate completions for all PCL keywords', () => {
      const context: CompletionContext = {
        lineText: '',
        insideBlock: false,
      };

      const items = generateKeywordCompletions(context);

      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => item.label)).toBe(true);
      expect(items.every((item) => item.kind)).toBe(true);
    });

    it('should filter out declaration keywords inside blocks', () => {
      const context: CompletionContext = {
        lineText: '  name:',
        insideBlock: true,
      };

      const items = generateKeywordCompletions(context);

      // Should not include declaration keywords like persona, team, workflow
      const hasDeclaration = items.some((item) =>
        ['persona', 'team', 'workflow', 'skill'].includes(item.label)
      );
      expect(hasDeclaration).toBe(false);
    });

    it('should include declaration keywords at global level', () => {
      const context: CompletionContext = {
        lineText: '',
        insideBlock: false,
      };

      const items = generateKeywordCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('persona');
      expect(labels).toContain('team');
      expect(labels).toContain('workflow');
      expect(labels).toContain('skill');
    });

    it('should include markdown documentation for keywords', () => {
      const context: CompletionContext = {
        lineText: '',
        insideBlock: false,
      };

      const items = generateKeywordCompletions(context);

      const personaItem = items.find((item) => item.label === 'persona');
      expect(personaItem).toBeDefined();
      expect(personaItem?.documentation).toBeDefined();
      expect(personaItem?.documentation?.kind).toBe('markdown');
    });

    it('should set high priority sort text for keywords', () => {
      const context: CompletionContext = {
        lineText: '',
        insideBlock: false,
      };

      const items = generateKeywordCompletions(context);

      items.forEach((item) => {
        expect(item.sortText).toMatch(/^0_/);
      });
    });

    it('should include visibility keywords', () => {
      const context: CompletionContext = {
        lineText: '',
        insideBlock: false,
      };

      const items = generateKeywordCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('pub');
      expect(labels).toContain('priv');
    });

    it('should include type keywords', () => {
      const context: CompletionContext = {
        lineText: '',
        insideBlock: false,
      };

      const items = generateKeywordCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('String');
      expect(labels).toContain('Int');
      expect(labels).toContain('Bool');
      expect(labels).toContain('Array');
    });

    it('should include workflow keywords', () => {
      const context: CompletionContext = {
        lineText: '',
        insideBlock: false,
      };

      const items = generateKeywordCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('if');
      expect(labels).toContain('then');
      expect(labels).toContain('else');
    });

    it('should include control keywords', () => {
      const context: CompletionContext = {
        lineText: '',
        insideBlock: false,
      };

      const items = generateKeywordCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('true');
      expect(labels).toContain('false');
      expect(labels).toContain('null');
    });
  });

  describe('generateSnippetCompletions', () => {
    it('should generate snippets for global context', () => {
      const context: CompletionContext = {
        lineText: '',
        declarationType: undefined,
      };

      const items = generateSnippetCompletions(context);

      expect(items.length).toBeGreaterThan(0);
      const labels = items.map((item) => item.label);
      expect(labels).toContain('persona');
      expect(labels).toContain('team');
      expect(labels).toContain('workflow');
    });

    it('should generate snippets for persona context', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'persona',
        insideBlock: true,
      };

      const items = generateSnippetCompletions(context);

      expect(items.length).toBeGreaterThan(0);
      const labels = items.map((item) => item.label);
      expect(labels).toContain('config');
      expect(labels).toContain('prompts');
    });

    it('should set snippet insert text format', () => {
      const context: CompletionContext = {
        lineText: '',
      };

      const items = generateSnippetCompletions(context);

      items.forEach((item) => {
        expect(item.insertTextFormat).toBe(2); // InsertTextFormat.Snippet
      });
    });

    it('should include snippet documentation with code block', () => {
      const context: CompletionContext = {
        lineText: '',
      };

      const items = generateSnippetCompletions(context);

      const personaSnippet = items.find((item) => item.label === 'persona');
      expect(personaSnippet?.documentation).toBeDefined();
      const docValue =
        typeof personaSnippet?.documentation === 'object'
          ? personaSnippet.documentation.value
          : personaSnippet?.documentation;
      expect(docValue).toContain('```pcl');
    });

    it('should set medium priority sort text', () => {
      const context: CompletionContext = {
        lineText: '',
      };

      const items = generateSnippetCompletions(context);

      items.forEach((item) => {
        expect(item.sortText).toMatch(/^1_/);
      });
    });

    it('should include minimal persona snippet', () => {
      const context: CompletionContext = {
        lineText: '',
      };

      const items = generateSnippetCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('persona-minimal');
    });

    it('should include team snippets', () => {
      const context: CompletionContext = {
        lineText: '',
      };

      const items = generateSnippetCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('team');
      expect(labels).toContain('team-consensus');
    });

    it('should include workflow snippets', () => {
      const context: CompletionContext = {
        lineText: '',
      };

      const items = generateSnippetCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('workflow');
      expect(labels).toContain('workflow-parallel');
      expect(labels).toContain('workflow-conditional');
    });

    it('should include import and export snippets', () => {
      const context: CompletionContext = {
        lineText: '',
      };

      const items = generateSnippetCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('import');
      expect(labels).toContain('export');
    });
  });

  describe('generatePropertyCompletions', () => {
    it('should return empty array without declaration type', () => {
      const context: CompletionContext = {
        lineText: '',
        declarationType: undefined,
      };

      const items = generatePropertyCompletions(context);

      expect(items).toEqual([]);
    });

    it('should generate persona properties', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'persona',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      expect(items.length).toBeGreaterThan(0);
      const labels = items.map((item) => item.label);
      expect(labels).toContain('name');
      expect(labels).toContain('version');
      expect(labels).toContain('config');
      expect(labels).toContain('prompts');
      expect(labels).toContain('skills');
    });

    it('should generate team properties', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'team',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('members');
      expect(labels).toContain('primary');
      expect(labels).toContain('merge');
      expect(labels).toContain('quorum');
    });

    it('should generate workflow properties', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'workflow',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('steps');
      expect(labels).toContain('timeout');
      expect(labels).toContain('retry');
      expect(labels).toContain('fallback');
    });

    it('should generate skill properties', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'skill',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('category');
      expect(labels).toContain('items');
    });

    it('should append colon to property insert text', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'persona',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      items.forEach((item) => {
        expect(item.insertText).toMatch(/:\s*$/);
      });
    });

    it('should set property completion kind', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'persona',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      items.forEach((item) => {
        expect(item.kind).toBe(10); // CompletionItemKind.Property
      });
    });

    it('should set lower priority sort text', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'persona',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      items.forEach((item) => {
        expect(item.sortText).toMatch(/^2_/);
      });
    });

    it('should handle config properties', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'config',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('model');
      expect(labels).toContain('temperature');
      expect(labels).toContain('max_tokens');
      expect(labels).toContain('thinking_style');
    });

    it('should handle metadata properties', () => {
      const context: CompletionContext = {
        lineText: '  ',
        declarationType: 'metadata',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);

      const labels = items.map((item) => item.label);
      expect(labels).toContain('category');
      expect(labels).toContain('description');
      expect(labels).toContain('tags');
      expect(labels).toContain('author');
    });
  });

  describe('generateSymbolCompletions', () => {
    it('should generate completions from symbols', () => {
      const symbols: SymbolInfo[] = [
        {
          name: 'Alice',
          type: 'Persona',
          exported: true,
          file: 'test.pcl',
        },
        {
          name: 'DevTeam',
          type: 'Team',
          exported: false,
          file: 'test.pcl',
        },
      ];

      const items = generateSymbolCompletions(symbols);

      expect(items).toHaveLength(2);
      expect(items[0].label).toBe('Alice');
      expect(items[1].label).toBe('DevTeam');
    });

    it('should handle empty symbol array', () => {
      const items = generateSymbolCompletions([]);

      expect(items).toEqual([]);
    });

    it('should set correct kind for persona symbols', () => {
      const symbols: SymbolInfo[] = [
        {
          name: 'Alice',
          type: 'Persona',
          exported: true,
          file: 'test.pcl',
        },
      ];

      const items = generateSymbolCompletions(symbols);

      expect(items[0].kind).toBe(7); // CompletionItemKind.Class
    });

    it('should set correct kind for team symbols', () => {
      const symbols: SymbolInfo[] = [
        {
          name: 'DevTeam',
          type: 'Team',
          exported: true,
          file: 'test.pcl',
        },
      ];

      const items = generateSymbolCompletions(symbols);

      expect(items[0].kind).toBe(9); // CompletionItemKind.Module
    });

    it('should set correct kind for workflow symbols', () => {
      const symbols: SymbolInfo[] = [
        {
          name: 'Pipeline',
          type: 'Workflow',
          exported: true,
          file: 'test.pcl',
        },
      ];

      const items = generateSymbolCompletions(symbols);

      expect(items[0].kind).toBe(3); // CompletionItemKind.Function
    });

    it('should include exported status in detail', () => {
      const symbols: SymbolInfo[] = [
        {
          name: 'Alice',
          type: 'Persona',
          exported: true,
          file: 'test.pcl',
        },
        {
          name: 'Bob',
          type: 'Persona',
          exported: false,
          file: 'test.pcl',
        },
      ];

      const items = generateSymbolCompletions(symbols);

      expect(items[0].detail).toContain('(exported)');
      expect(items[1].detail).not.toContain('(exported)');
    });

    it('should include documentation if available', () => {
      const symbols: SymbolInfo[] = [
        {
          name: 'Alice',
          type: 'Persona',
          exported: true,
          documentation: 'A helpful assistant',
          file: 'test.pcl',
        },
      ];

      const items = generateSymbolCompletions(symbols);

      expect(items[0].documentation).toBeDefined();
    });

    it('should set lowest priority sort text', () => {
      const symbols: SymbolInfo[] = [
        {
          name: 'Alice',
          type: 'Persona',
          exported: true,
          file: 'test.pcl',
        },
      ];

      const items = generateSymbolCompletions(symbols);

      expect(items[0].sortText).toMatch(/^3_/);
    });
  });

  describe('generateEnumCompletions', () => {
    it('should generate completions for enum values', () => {
      const values = ['Primary', 'Consensus', 'Voting'];
      const items = generateEnumCompletions('merge', values);

      expect(items).toHaveLength(3);
      expect(items.map((i) => i.label)).toEqual(values);
    });

    it('should wrap values in quotes', () => {
      const values = ['Primary', 'Consensus'];
      const items = generateEnumCompletions('merge', values);

      items.forEach((item) => {
        expect(item.insertText).toMatch(/^".*"$/);
      });
    });

    it('should set enum member kind', () => {
      const values = ['Primary'];
      const items = generateEnumCompletions('merge', values);

      expect(items[0].kind).toBe(20); // CompletionItemKind.EnumMember
    });

    it('should include property name in detail', () => {
      const values = ['Primary'];
      const items = generateEnumCompletions('merge', values);

      expect(items[0].detail).toContain('merge');
    });

    it('should handle empty values array', () => {
      const items = generateEnumCompletions('test', []);

      expect(items).toEqual([]);
    });

    it('should set appropriate sort text', () => {
      const values = ['A', 'B', 'C'];
      const items = generateEnumCompletions('test', values);

      items.forEach((item) => {
        expect(item.sortText).toMatch(/^2_/);
      });
    });
  });

  describe('getPropertyValueCompletions', () => {
    it('should return merge strategy completions', () => {
      const items = getPropertyValueCompletions('merge');

      expect(items.length).toBeGreaterThan(0);
      const labels = items.map((i) => i.label);
      expect(labels).toContain('Primary');
      expect(labels).toContain('Consensus');
      expect(labels).toContain('Voting');
    });

    it('should return model name completions', () => {
      const items = getPropertyValueCompletions('model');

      expect(items.length).toBeGreaterThan(0);
      const labels = items.map((i) => i.label);
      expect(labels).toContain('claude-sonnet-4');
      expect(labels).toContain('gpt-4');
    });

    it('should return thinking style completions', () => {
      const items = getPropertyValueCompletions('thinking_style');

      expect(items.length).toBeGreaterThan(0);
      const labels = items.map((i) => i.label);
      expect(labels).toContain('analytical');
      expect(labels).toContain('creative');
      expect(labels).toContain('practical');
    });

    it('should return response format completions', () => {
      const items = getPropertyValueCompletions('response_format');

      expect(items.length).toBeGreaterThan(0);
      const labels = items.map((i) => i.label);
      expect(labels).toContain('text');
      expect(labels).toContain('json');
      expect(labels).toContain('markdown');
    });

    it('should return empty array for unknown property', () => {
      const items = getPropertyValueCompletions('unknown_property');

      expect(items).toEqual([]);
    });

    it('should return empty array for null property', () => {
      const items = getPropertyValueCompletions('');

      expect(items).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle context with all fields undefined', () => {
      const context: CompletionContext = {
        lineText: '',
      };

      const keywords = generateKeywordCompletions(context);
      const snippets = generateSnippetCompletions(context);

      expect(keywords.length).toBeGreaterThan(0);
      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should handle context with empty strings', () => {
      const context: CompletionContext = {
        lineText: '',
        charAtPosition: '',
        charBefore: '',
        wordBeingTyped: '',
        declarationType: '',
      };

      const properties = generatePropertyCompletions(context);
      expect(properties).toEqual([]);
    });

    it('should handle symbol with missing optional fields', () => {
      const symbols: SymbolInfo[] = [
        {
          name: 'Test',
          type: 'Persona',
          exported: false,
          file: 'test.pcl',
        },
      ];

      const items = generateSymbolCompletions(symbols);
      expect(items).toHaveLength(1);
      expect(items[0].documentation).toBeUndefined();
    });

    it('should handle unknown declaration type', () => {
      const context: CompletionContext = {
        lineText: '',
        declarationType: 'unknown_type',
        insideBlock: true,
      };

      const items = generatePropertyCompletions(context);
      expect(items).toEqual([]);
    });

    it('should handle case-insensitive declaration types', () => {
      const contextLower: CompletionContext = {
        lineText: '',
        declarationType: 'persona',
        insideBlock: true,
      };

      const contextUpper: CompletionContext = {
        lineText: '',
        declarationType: 'PERSONA',
        insideBlock: true,
      };

      const itemsLower = generatePropertyCompletions(contextLower);
      const itemsUpper = generatePropertyCompletions(contextUpper);

      // Both should work
      expect(itemsLower.length).toBeGreaterThan(0);
      expect(itemsUpper.length).toBeGreaterThan(0);
    });
  });
});
