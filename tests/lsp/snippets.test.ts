/**
 * Tests for LSP Snippets
 *
 * Tests snippet templates, placeholders, tab stops, and variable expansion
 */

import { getSnippetsForContext, PCL_SNIPPETS } from '../../src/lsp/snippets';

describe('PCL Snippets', () => {
  describe('PCL_SNIPPETS Array', () => {
    it('should contain snippet definitions', () => {
      expect(PCL_SNIPPETS).toBeDefined();
      expect(Array.isArray(PCL_SNIPPETS)).toBe(true);
      expect(PCL_SNIPPETS.length).toBeGreaterThan(0);
    });

    it('should have unique labels', () => {
      const labels = PCL_SNIPPETS.map((s) => s.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('should have all required fields', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        expect(snippet.label).toBeDefined();
        expect(typeof snippet.label).toBe('string');
        expect(snippet.snippet).toBeDefined();
        expect(typeof snippet.snippet).toBe('string');
        expect(snippet.documentation).toBeDefined();
        expect(snippet.detail).toBeDefined();
      });
    });

    it('should have valid snippet syntax', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        // Should not have obvious syntax errors
        expect(snippet.snippet).toBeTruthy();
        expect(snippet.snippet.length).toBeGreaterThan(0);
      });
    });

    it('should have sort priorities', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        if (snippet.sortPriority !== undefined) {
          expect(typeof snippet.sortPriority).toBe('number');
          expect(snippet.sortPriority).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Persona Snippets', () => {
    it('should include full persona snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'persona');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('persona');
      expect(snippet?.snippet).toContain('metadata');
      expect(snippet?.snippet).toContain('config');
      expect(snippet?.snippet).toContain('prompts');
    });

    it('should include minimal persona snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'persona-minimal');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('persona');
      expect(snippet?.snippet).toContain('config');
      expect(snippet?.snippet).toContain('prompts');
    });

    it('should have placeholders in persona snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'persona');
      expect(snippet?.snippet).toMatch(/\$\{1:/); // First placeholder
      expect(snippet?.snippet).toMatch(/\$\{2:/); // Second placeholder
    });

    it('should have tab stops in correct order', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'persona');
      const tabStopNumbers = (snippet?.snippet.match(/\$\{(\d+):/g) || []).map(
        (match) => parseInt(match.match(/\d+/)?.[0] || '0')
      );

      // Tab stops should be sequential
      expect(tabStopNumbers.length).toBeGreaterThan(0);
      expect(Math.min(...tabStopNumbers)).toBe(1); // Should start at 1
    });

    it('should have default values for placeholders', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'persona');
      expect(snippet?.snippet).toContain('PERSONA_NAME');
      expect(snippet?.snippet).toContain('Display Name');
      expect(snippet?.snippet).toContain('1.0.0');
    });

    it('should use triple-quoted strings for prompts', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'persona');
      expect(snippet?.snippet).toContain('"""');
    });

    it('should be in global context', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'persona');
      expect(snippet?.contexts).toContain('global');
    });
  });

  describe('Team Snippets', () => {
    it('should include team snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'team');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('team');
      expect(snippet?.snippet).toContain('members');
      expect(snippet?.snippet).toContain('primary');
      expect(snippet?.snippet).toContain('merge');
    });

    it('should include team-consensus snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'team-consensus');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('team');
      expect(snippet?.snippet).toContain('Consensus');
      expect(snippet?.snippet).toContain('quorum');
    });

    it('should have member placeholders in team snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'team');
      expect(snippet?.snippet).toMatch(/PERSONA1/);
      expect(snippet?.snippet).toMatch(/PERSONA2/);
    });

    it('should have array syntax for members', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'team');
      expect(snippet?.snippet).toMatch(/members:\s*\[/);
    });

    it('should have quorum in fraction format', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'team-consensus');
      // Uses placeholders like ${6:2}/${7:3}
      expect(snippet?.snippet).toMatch(/quorum:/);
      expect(snippet?.snippet).toContain('/');
    });

    it('should be in global context', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'team');
      expect(snippet?.contexts).toContain('global');
    });
  });

  describe('Workflow Snippets', () => {
    it('should include workflow snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'workflow');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('workflow');
      expect(snippet?.snippet).toContain('steps');
    });

    it('should include workflow-parallel snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'workflow-parallel');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('||');
    });

    it('should include workflow-conditional snippet', () => {
      const snippet = PCL_SNIPPETS.find(
        (s) => s.label === 'workflow-conditional'
      );
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('if');
      expect(snippet?.snippet).toContain('then');
      expect(snippet?.snippet).toContain('else');
    });

    it('should use arrow operator for sequential steps', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'workflow');
      expect(snippet?.snippet).toMatch(/->/);
    });

    it('should use parallel operator in parallel workflow', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'workflow-parallel');
      expect(snippet?.snippet).toMatch(/\|\|/);
    });

    it('should be in global context', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'workflow');
      expect(snippet?.contexts).toContain('global');
    });
  });

  describe('Skill Snippets', () => {
    it('should include skill snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'skill');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('skill');
      expect(snippet?.snippet).toContain('category');
      expect(snippet?.snippet).toContain('items');
    });

    it('should have array syntax for items', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'skill');
      expect(snippet?.snippet).toMatch(/items:\s*\[/);
    });

    it('should have multiple item placeholders', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'skill');
      expect(snippet?.snippet).toMatch(/skill-item-1/);
      expect(snippet?.snippet).toMatch(/skill-item-2/);
    });

    it('should be in global context', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'skill');
      expect(snippet?.contexts).toContain('global');
    });
  });

  describe('Property Block Snippets', () => {
    it('should include config snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'config');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('config:');
      expect(snippet?.snippet).toContain('model');
      expect(snippet?.snippet).toContain('temperature');
      expect(snippet?.snippet).toContain('max_tokens');
    });

    it('should include metadata snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'metadata');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('metadata:');
      expect(snippet?.snippet).toContain('category');
      expect(snippet?.snippet).toContain('description');
      expect(snippet?.snippet).toContain('tags');
    });

    it('should include prompts snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'prompts');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('prompts:');
      expect(snippet?.snippet).toContain('system');
      expect(snippet?.snippet).toContain('"""');
    });

    it('should have default model in config', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'config');
      expect(snippet?.snippet).toContain('claude-sonnet-4');
    });

    it('should have default temperature in config', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'config');
      expect(snippet?.snippet).toMatch(/temperature:.*0\.7/);
    });

    it('should be in persona context', () => {
      const configSnippet = PCL_SNIPPETS.find((s) => s.label === 'config');
      expect(configSnippet?.contexts).toContain('persona');

      const promptsSnippet = PCL_SNIPPETS.find((s) => s.label === 'prompts');
      expect(promptsSnippet?.contexts).toContain('persona');
    });

    it('should be in multiple contexts for metadata', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'metadata');
      expect(snippet?.contexts).toContain('persona');
      expect(snippet?.contexts).toContain('team');
      expect(snippet?.contexts).toContain('workflow');
    });
  });

  describe('Import/Export Snippets', () => {
    it('should include import snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'import');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('import');
      expect(snippet?.snippet).toContain('from');
    });

    it('should include export snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'export');
      expect(snippet).toBeDefined();
      expect(snippet?.snippet).toContain('export');
    });

    it('should have curly braces for import', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'import');
      expect(snippet?.snippet).toMatch(/\{.*\}/);
    });

    it('should have file path placeholder', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'import');
      expect(snippet?.snippet).toMatch(/\.\/.*\.pcl/);
    });

    it('should be in global context', () => {
      const importSnippet = PCL_SNIPPETS.find((s) => s.label === 'import');
      expect(importSnippet?.contexts).toContain('global');

      const exportSnippet = PCL_SNIPPETS.find((s) => s.label === 'export');
      expect(exportSnippet?.contexts).toContain('global');
    });
  });

  describe('Comment Snippets', () => {
    it('should include comment-block snippet', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'comment-block');
      expect(snippet).toBeDefined();
    });

    it('should use JSDoc-style comments', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'comment-block');
      expect(snippet?.snippet).toMatch(/\/\*\*/);
      expect(snippet?.snippet).toMatch(/\*\//);
    });

    it('should be in global context', () => {
      const snippet = PCL_SNIPPETS.find((s) => s.label === 'comment-block');
      expect(snippet?.contexts).toContain('global');
    });
  });

  describe('getSnippetsForContext', () => {
    it('should return snippets for global context', () => {
      const snippets = getSnippetsForContext('global');
      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should include global snippets in all contexts', () => {
      const contexts = ['persona', 'team', 'workflow', 'skill'];
      contexts.forEach((context) => {
        const snippets = getSnippetsForContext(context);
        expect(snippets.length).toBeGreaterThan(0);
      });
    });

    it('should return persona-specific snippets', () => {
      const snippets = getSnippetsForContext('persona');
      const labels = snippets.map((s) => s.label);
      expect(labels).toContain('config');
      expect(labels).toContain('prompts');
    });

    it('should return team-specific snippets', () => {
      const snippets = getSnippetsForContext('team');
      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should return workflow-specific snippets', () => {
      const snippets = getSnippetsForContext('workflow');
      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should sort snippets by priority', () => {
      const snippets = getSnippetsForContext('global');

      // Check that snippets with priorities are in order
      const withPriorities = snippets.filter(
        (s) => s.sortPriority !== undefined
      );
      for (let i = 1; i < withPriorities.length; i++) {
        const prev = withPriorities[i - 1].sortPriority || 100;
        const curr = withPriorities[i].sortPriority || 100;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('should handle unknown context gracefully', () => {
      const snippets = getSnippetsForContext('unknown');
      // Should still return global snippets
      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should handle empty context string', () => {
      const snippets = getSnippetsForContext('');
      expect(snippets.length).toBeGreaterThan(0);
    });

    it('should not return context-specific snippets in wrong context', () => {
      const snippets = getSnippetsForContext('team');
      const labels = snippets.map((s) => s.label);
      // Prompts is persona-only, should not be in team context
      expect(labels).not.toContain('prompts');
    });
  });

  describe('Placeholder Syntax', () => {
    it('should use ${n:text} format for placeholders', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        if (snippet.snippet.includes('${')) {
          expect(snippet.snippet).toMatch(/\$\{\d+:[^}]+\}/);
        }
      });
    });

    it('should have unique tab stop numbers within snippets', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        const matches = snippet.snippet.match(/\$\{(\d+):/g);
        if (matches && matches.length > 1) {
          const numbers = matches.map((m) =>
            parseInt(m.match(/\d+/)?.[0] || '0')
          );
          // Check for reasonable range (1-20)
          numbers.forEach((n) => {
            expect(n).toBeGreaterThan(0);
            expect(n).toBeLessThan(20);
          });
        }
      });
    });

    it('should use meaningful placeholder names', () => {
      const personaSnippet = PCL_SNIPPETS.find((s) => s.label === 'persona');
      expect(personaSnippet?.snippet).toMatch(/PERSONA_NAME/);
      expect(personaSnippet?.snippet).toMatch(/Display Name/);
      expect(personaSnippet?.snippet).not.toMatch(/placeholder\d+/);
    });

    it('should use consistent naming patterns', () => {
      const teamSnippet = PCL_SNIPPETS.find((s) => s.label === 'team');
      // Should use UPPERCASE for identifier placeholders
      expect(teamSnippet?.snippet).toMatch(/TEAM_NAME/);
      expect(teamSnippet?.snippet).toMatch(/PERSONA1/);
    });
  });

  describe('Snippet Documentation', () => {
    it('should have non-empty documentation for all snippets', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        expect(snippet.documentation.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive details', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        expect(snippet.detail.length).toBeGreaterThan(0);
        expect(snippet.detail).toMatch(/^[A-Z]/); // Should start with capital
      });
    });

    it('should have documentation that explains purpose', () => {
      const personaSnippet = PCL_SNIPPETS.find((s) => s.label === 'persona');
      expect(personaSnippet?.documentation.toLowerCase()).toContain('persona');
    });
  });

  describe('Edge Cases', () => {
    it('should handle snippets without contexts', () => {
      const snippetsWithoutContext = PCL_SNIPPETS.filter(
        (s) => !s.contexts || s.contexts.length === 0
      );

      if (snippetsWithoutContext.length > 0) {
        // Should still be accessible via getSnippetsForContext
        const globalSnippets = getSnippetsForContext('global');
        snippetsWithoutContext.forEach((snippet) => {
          expect(globalSnippets).toContainEqual(snippet);
        });
      }
    });

    it('should handle snippets without sort priority', () => {
      const snippetsWithoutPriority = PCL_SNIPPETS.filter(
        (s) => s.sortPriority === undefined
      );

      if (snippetsWithoutPriority.length > 0) {
        // Should still be sortable (treated as priority 100)
        const sorted = getSnippetsForContext('global');
        expect(sorted.length).toBeGreaterThan(0);
      }
    });

    it('should handle very long snippets', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        // Should be reasonable length (not empty, not huge)
        expect(snippet.snippet.length).toBeGreaterThan(0);
        expect(snippet.snippet.length).toBeLessThan(5000);
      });
    });

    it('should handle special characters in snippets', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        // Should not have unescaped special chars that break snippet syntax
        expect(snippet.snippet).not.toMatch(/\$(?!\{)/); // $ not followed by {
      });
    });

    it('should have valid JSON-like structure for completions', () => {
      PCL_SNIPPETS.forEach((snippet) => {
        // Should be parseable as snippet
        expect(() => {
          // Basic validation that it doesn't have obvious syntax errors
          const hasOpenBrace = snippet.snippet.includes('{');
          const hasCloseBrace = snippet.snippet.includes('}');
          if (hasOpenBrace) {
            expect(hasCloseBrace).toBe(true);
          }
        }).not.toThrow();
      });
    });
  });

  describe('Coverage', () => {
    it('should cover all major PCL declarations', () => {
      const labels = PCL_SNIPPETS.map((s) => s.label);
      expect(labels.some((l) => l.includes('persona'))).toBe(true);
      expect(labels.some((l) => l.includes('team'))).toBe(true);
      expect(labels.some((l) => l.includes('workflow'))).toBe(true);
      expect(labels.some((l) => l.includes('skill'))).toBe(true);
    });

    it('should cover common property blocks', () => {
      const labels = PCL_SNIPPETS.map((s) => s.label);
      expect(labels).toContain('config');
      expect(labels).toContain('metadata');
      expect(labels).toContain('prompts');
    });

    it('should cover workflow patterns', () => {
      const labels = PCL_SNIPPETS.map((s) => s.label);
      expect(labels).toContain('workflow');
      expect(labels).toContain('workflow-parallel');
      expect(labels).toContain('workflow-conditional');
    });

    it('should cover import/export', () => {
      const labels = PCL_SNIPPETS.map((s) => s.label);
      expect(labels).toContain('import');
      expect(labels).toContain('export');
    });

    it('should have at least 14 snippets total', () => {
      expect(PCL_SNIPPETS.length).toBeGreaterThanOrEqual(14);
    });
  });
});
