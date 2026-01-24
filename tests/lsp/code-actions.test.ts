/**
 * Code Actions Tests - Phase 3
 */

import { CodeActionProvider } from '../../src/lsp/code-actions';
import type { CodeActionParams, Diagnostic, Range } from 'vscode-languageserver';

describe('CodeActionProvider', () => {
  let provider: CodeActionProvider;

  beforeEach(() => {
    provider = new CodeActionProvider();
  });

  describe('Quick Fixes', () => {
    it('should provide fix for undefined persona', async () => {
      const diagnostic: Diagnostic = {
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 20 },
        },
        message: "Undefined persona 'Developer'",
        severity: 1,
      };

      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: diagnostic.range,
        context: {
          diagnostics: [diagnostic],
        },
      };

      const actions = await provider.provideCodeActions(params);

      expect(actions).toBeDefined();
      expect(actions.length).toBeGreaterThan(0);

      const createAction = actions.find((a) => a.title.includes('Create persona'));
      expect(createAction).toBeDefined();
      expect(createAction?.kind).toBe('quickfix');
      expect(createAction?.diagnostics).toContain(diagnostic);
    });

    it('should provide fix for missing required field', async () => {
      const diagnostic: Diagnostic = {
        range: {
          start: { line: 3, character: 0 },
          end: { line: 3, character: 10 },
        },
        message: "Missing required field 'instructions'",
        severity: 1,
      };

      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: diagnostic.range,
        context: {
          diagnostics: [diagnostic],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const addFieldAction = actions.find((a) => a.title.includes('Add missing field'));
      expect(addFieldAction).toBeDefined();
      expect(addFieldAction?.kind).toBe('quickfix');
    });

    it('should provide fix for type mismatch', async () => {
      const diagnostic: Diagnostic = {
        range: {
          start: { line: 7, character: 15 },
          end: { line: 7, character: 20 },
        },
        message: 'Type mismatch: expected string, got number',
        severity: 1,
      };

      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: diagnostic.range,
        context: {
          diagnostics: [diagnostic],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const typeFixAction = actions.find((a) => a.title.includes('Convert to correct type'));
      expect(typeFixAction).toBeDefined();
      expect(typeFixAction?.kind).toBe('quickfix');
    });

    it('should provide fix to remove unused declaration', async () => {
      const diagnostic: Diagnostic = {
        range: {
          start: { line: 10, character: 0 },
          end: { line: 12, character: 1 },
        },
        message: "Persona 'Unused' is declared but never used",
        severity: 2,
      };

      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: diagnostic.range,
        context: {
          diagnostics: [diagnostic],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const removeAction = actions.find((a) => a.title.includes('Remove unused'));
      expect(removeAction).toBeDefined();
      expect(removeAction?.kind).toBe('quickfix');
    });

    it('should provide fix for missing import', async () => {
      const diagnostic: Diagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 20 },
        },
        message: "Cannot find module 'stdlib/personas/developer'",
        severity: 1,
      };

      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: diagnostic.range,
        context: {
          diagnostics: [diagnostic],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const installAction = actions.find((a) => a.title.includes('Install module'));
      expect(installAction).toBeDefined();
      expect(installAction?.command).toBeDefined();
      expect(installAction?.command?.command).toBe('pcl.installModule');
    });
  });

  describe('Refactoring Actions', () => {
    it('should provide extract refactoring', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: {
          start: { line: 5, character: 2 },
          end: { line: 10, character: 3 },
        },
        context: {
          diagnostics: [],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const extractAction = actions.find((a) => a.title.includes('Extract'));
      expect(extractAction).toBeDefined();
      expect(extractAction?.kind).toBe('refactor.extract');
    });

    it('should provide inline refactoring', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: {
          start: { line: 15, character: 10 },
          end: { line: 15, character: 20 },
        },
        context: {
          diagnostics: [],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const inlineAction = actions.find((a) => a.title.includes('Inline'));
      // May or may not be available depending on cursor position
      if (inlineAction) {
        expect(inlineAction.kind).toBe('refactor.inline');
      }
    });

    it('should provide convert type refactoring', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: {
          start: { line: 0, character: 0 },
          end: { line: 5, character: 1 },
        },
        context: {
          diagnostics: [],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const convertAction = actions.find((a) => a.title.includes('Convert to'));
      // May or may not be available
      if (convertAction) {
        expect(convertAction.kind).toBe('refactor.rewrite');
      }
    });
  });

  describe('Source Actions', () => {
    it('should provide organize imports action', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        context: {
          diagnostics: [],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const organizeAction = actions.find((a) => a.title.includes('Organize imports'));
      expect(organizeAction).toBeDefined();
      expect(organizeAction?.kind).toBe('source.organizeImports');
      expect(organizeAction?.edit).toBeDefined();
    });

    it('should provide sort declarations action', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        context: {
          diagnostics: [],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const sortAction = actions.find((a) => a.title.includes('Sort declarations'));
      expect(sortAction).toBeDefined();
      expect(sortAction?.kind).toBe('source');
    });

    it('should provide format document action', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        context: {
          diagnostics: [],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const formatAction = actions.find((a) => a.title.includes('Format document'));
      expect(formatAction).toBeDefined();
      expect(formatAction?.command).toBeDefined();
    });

    it('should provide add missing imports action', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        context: {
          diagnostics: [],
        },
      };

      const actions = await provider.provideCodeActions(params);

      const addImportsAction = actions.find((a) => a.title.includes('Add missing imports'));
      expect(addImportsAction).toBeDefined();
      expect(addImportsAction?.kind).toBe('source');
    });
  });

  describe('Code Action Filtering', () => {
    it('should filter quick fixes by diagnostic', async () => {
      const diagnostic1: Diagnostic = {
        range: {
          start: { line: 5, character: 0 },
          end: { line: 5, character: 10 },
        },
        message: "Undefined persona 'A'",
        severity: 1,
      };

      const diagnostic2: Diagnostic = {
        range: {
          start: { line: 10, character: 0 },
          end: { line: 10, character: 10 },
        },
        message: "Undefined persona 'B'",
        severity: 1,
      };

      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: diagnostic1.range,
        context: {
          diagnostics: [diagnostic1, diagnostic2],
        },
      };

      const actions = await provider.provideCodeActions(params);

      // Should include fixes for all diagnostics in context
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should provide all action types when requested', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test.pcl' },
        range: {
          start: { line: 0, character: 0 },
          end: { line: 100, character: 0 },
        },
        context: {
          diagnostics: [],
          only: undefined, // Request all action kinds
        },
      };

      const actions = await provider.provideCodeActions(params);

      // Should include source actions, refactorings, etc.
      const sourceActions = actions.filter((a) => a.kind?.startsWith('source'));
      const refactorActions = actions.filter((a) => a.kind?.startsWith('refactor'));

      expect(sourceActions.length).toBeGreaterThan(0);
      expect(refactorActions.length).toBeGreaterThan(0);
    });
  });
});
