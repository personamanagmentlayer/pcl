/**
 * Skill LSP Integration Tests
 *
 * Tests for the integration layer that coordinates all skill-related LSP features
 */

import {
  Connection,
  CompletionItemKind,
  DiagnosticSeverity,
} from 'vscode-languageserver/node';
import { SkillLSPIntegration } from '../../src/lsp/skill-integration';
import { DocumentManager } from '../../src/lsp/document-manager';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('SkillLSPIntegration', () => {
  let integration: SkillLSPIntegration;
  let mockConnection: Connection;
  let mockDocumentManager: DocumentManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `pcl-test-int-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Create mock connection
    mockConnection = {
      console: {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      },
    } as any;

    // Create mock document manager
    mockDocumentManager = {
      getDocument: vi.fn().mockReturnValue({
        getText: () => 'test content',
        uri: 'file:///test.md',
        version: 1,
      }),
    } as any;

    integration = new SkillLSPIntegration(mockConnection, mockDocumentManager);
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize with connection and document manager', () => {
      expect(integration).toBeDefined();
      expect(mockConnection.console.log).toHaveBeenCalledWith(
        'Skill LSP integration initialized'
      );
    });

    it('should create all provider instances', () => {
      expect(integration['completionProvider']).toBeDefined();
      expect(integration['hoverProvider']).toBeDefined();
      expect(integration['diagnosticsProvider']).toBeDefined();
      expect(integration['navigationProvider']).toBeDefined();
    });
  });

  describe('Skill Completions', () => {
    it('should provide skill include completions', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'test-skill.md'),
        `---
name: test-skill
description: Test skill
---
`,
        'utf-8'
      );

      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const lineText = 'includes: [';
      const position = { line: 5, character: 11 };

      const completions = await integration.getSkillCompletions(
        documentUri,
        lineText,
        position
      );

      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);
    });

    it('should provide property completions in skill context', async () => {
      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const lineText = '';
      const position = { line: 2, character: 0 };

      const completions = await integration.getSkillCompletions(
        documentUri,
        lineText,
        position
      );

      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
    });

    it('should provide category completions', async () => {
      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const lineText = 'category: ';
      const position = { line: 3, character: 10 };

      const completions = await integration.getSkillCompletions(
        documentUri,
        lineText,
        position
      );

      expect(completions).toBeDefined();
      expect(completions.some((c) => c.label === 'language')).toBe(true);
      expect(completions.some((c) => c.label === 'framework')).toBe(true);
    });

    it('should provide complexity completions', async () => {
      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const lineText = 'complexity: ';
      const position = { line: 4, character: 12 };

      const completions = await integration.getSkillCompletions(
        documentUri,
        lineText,
        position
      );

      expect(completions).toBeDefined();
      expect(completions.some((c) => c.label === 'beginner')).toBe(true);
      expect(completions.some((c) => c.label === 'intermediate')).toBe(true);
      expect(completions.some((c) => c.label === 'advanced')).toBe(true);
      expect(completions.some((c) => c.label === 'expert')).toBe(true);
    });

    it('should provide tool completions', async () => {
      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const lineText = 'allowed-tools:';
      const position = { line: 5, character: 13 };

      const completions = await integration.getSkillCompletions(
        documentUri,
        lineText,
        position
      );

      expect(completions).toBeDefined();
      expect(completions.some((c) => c.label === 'Read')).toBe(true);
      expect(completions.some((c) => c.label === 'Write')).toBe(true);
      expect(completions.some((c) => c.label === 'Bash')).toBe(true);
    });

    it('should return empty array when document not found', async () => {
      mockDocumentManager.getDocument = vi.fn().mockReturnValue(null);

      const documentUri = `file:///${testDir}/missing.md`.replace(/\\/g, '/');
      const completions = await integration.getSkillCompletions(
        documentUri,
        '',
        { line: 0, character: 0 }
      );

      expect(completions).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const documentUri = 'invalid://uri';
      const completions = await integration.getSkillCompletions(
        documentUri,
        '',
        { line: 0, character: 0 }
      );

      expect(completions).toEqual([]);
      expect(mockConnection.console.error).toHaveBeenCalled();
    });

    it('should log completion count', async () => {
      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const lineText = 'category: ';
      const position = { line: 3, character: 10 };

      await integration.getSkillCompletions(documentUri, lineText, position);

      expect(mockConnection.console.log).toHaveBeenCalledWith(
        expect.stringContaining('skill-specific completion items')
      );
    });
  });

  describe('Skill Hover', () => {
    it('should provide hover for skill reference', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'hover-skill.md'),
        `---
name: hover-skill
description: Skill for hover testing
category: language
complexity: intermediate
version: 1.0.0
---

# Instructions

Hover test instructions
`,
        'utf-8'
      );

      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const hover = await integration.getSkillHover(
        documentUri,
        'hover-skill',
        true
      );

      expect(hover).toBeDefined();
      expect(hover?.contents).toBeDefined();
    });

    it('should return null for non-skill files', async () => {
      const documentUri = `file:///${testDir}/regular.txt`.replace(/\\/g, '/');
      const hover = await integration.getSkillHover(
        documentUri,
        'any-skill',
        false
      );

      expect(hover).toBeNull();
    });

    it('should return null when skill not found', async () => {
      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const hover = await integration.getSkillHover(
        documentUri,
        'nonexistent-skill',
        true
      );

      expect(hover).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const documentUri = 'invalid://uri';
      const hover = await integration.getSkillHover(documentUri, 'skill', true);

      expect(hover).toBeNull();
      expect(mockConnection.console.error).toHaveBeenCalled();
    });
  });

  describe('Skill Diagnostics', () => {
    it('should provide diagnostics for skill file', async () => {
      const content = `---
name: diagnostic-skill
description: Test diagnostics
TODO: Complete this
---
`;

      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const diagnostics = await integration.getSkillDiagnostics(
        documentUri,
        content,
        true
      );

      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-skill files', async () => {
      const content = 'Regular file content';
      const documentUri = `file:///${testDir}/regular.md`.replace(/\\/g, '/');

      const diagnostics = await integration.getSkillDiagnostics(
        documentUri,
        content,
        false
      );

      expect(diagnostics).toEqual([]);
    });

    it('should handle validation errors gracefully', async () => {
      const content = 'invalid content';
      const documentUri = `file:///${testDir}/invalid.md`.replace(/\\/g, '/');

      const diagnostics = await integration.getSkillDiagnostics(
        documentUri,
        content,
        true
      );

      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it('should log errors during diagnostics', async () => {
      const documentUri = 'invalid://uri';
      await integration.getSkillDiagnostics(documentUri, '', true);

      expect(mockConnection.console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error providing skill diagnostics')
      );
    });
  });

  describe('Go to Definition', () => {
    it('should navigate to skill definition', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'nav-skill.md'),
        `---
name: nav-skill
description: Navigation test
---
`,
        'utf-8'
      );

      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const location = await integration.gotoSkillDefinition(
        documentUri,
        'nav-skill'
      );

      expect(location).toBeDefined();
      expect(location?.uri).toContain('nav-skill.md');
    });

    it('should return null when skill not found', async () => {
      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const location = await integration.gotoSkillDefinition(
        documentUri,
        'missing-skill'
      );

      expect(location).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const documentUri = 'invalid://uri';
      const location = await integration.gotoSkillDefinition(
        documentUri,
        'skill'
      );

      expect(location).toBeNull();
      expect(mockConnection.console.error).toHaveBeenCalled();
    });
  });

  describe('Find References', () => {
    it('should find all references to a skill', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'base.md'),
        `---
name: base
description: Base skill
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'dependent.md'),
        `---
name: dependent
description: Dependent skill
dependencies:
  - base
---
`,
        'utf-8'
      );

      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const locations = await integration.findSkillReferences(
        documentUri,
        'base'
      );

      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should return empty array when no references found', async () => {
      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const locations = await integration.findSkillReferences(
        documentUri,
        'unreferenced'
      );

      expect(locations).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const documentUri = 'invalid://uri';
      const locations = await integration.findSkillReferences(
        documentUri,
        'skill'
      );

      expect(locations).toEqual([]);
      expect(mockConnection.console.error).toHaveBeenCalled();
    });
  });

  describe('Code Actions', () => {
    it('should provide quick fix for missing dependency', async () => {
      const diagnostics = [
        {
          range: {
            start: { line: 5, character: 0 },
            end: { line: 5, character: 20 },
          },
          message: 'Missing dependency: test-skill',
          severity: DiagnosticSeverity.Error,
          code: 'missing-dependency',
        },
      ];

      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const actions = await integration.getSkillCodeActions(
        documentUri,
        diagnostics
      );

      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);

      const installAction = actions.find((a) =>
        a.title.includes('Install missing')
      );
      expect(installAction).toBeDefined();
    });

    it('should provide quick fix for token limit exceeded', async () => {
      const diagnostics = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 100, character: 0 },
          },
          message: 'Token count exceeds maximum',
          severity: DiagnosticSeverity.Error,
          code: 'token-limit-exceeded',
        },
      ];

      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const actions = await integration.getSkillCodeActions(
        documentUri,
        diagnostics
      );

      const optimizeAction = actions.find((a) => a.title.includes('Optimize'));
      expect(optimizeAction).toBeDefined();
    });

    it('should provide quick fix for incomplete skill', async () => {
      const diagnostics = [
        {
          range: {
            start: { line: 10, character: 0 },
            end: { line: 10, character: 50 },
          },
          message: 'Found TODO items',
          severity: DiagnosticSeverity.Error,
          code: 'incomplete-skill',
        },
      ];

      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const actions = await integration.getSkillCodeActions(
        documentUri,
        diagnostics
      );

      const todoAction = actions.find((a) => a.title.includes('TODO'));
      expect(todoAction).toBeDefined();
    });

    it('should provide quick fix for missing examples', async () => {
      const diagnostics = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 50, character: 0 },
          },
          message: 'No examples provided',
          severity: DiagnosticSeverity.Information,
          code: 'missing-examples',
        },
      ];

      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const actions = await integration.getSkillCodeActions(
        documentUri,
        diagnostics
      );

      const exampleAction = actions.find((a) => a.title.includes('example'));
      expect(exampleAction).toBeDefined();
    });

    it('should return empty array for unrelated diagnostics', async () => {
      const diagnostics = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Some other error',
          severity: DiagnosticSeverity.Error,
          code: 'unknown-error',
        },
      ];

      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const actions = await integration.getSkillCodeActions(
        documentUri,
        diagnostics
      );

      expect(actions).toEqual([]);
    });

    it('should handle multiple diagnostics', async () => {
      const diagnostics = [
        {
          range: {
            start: { line: 5, character: 0 },
            end: { line: 5, character: 20 },
          },
          message: 'Missing dependency',
          severity: DiagnosticSeverity.Error,
          code: 'missing-dependency',
        },
        {
          range: {
            start: { line: 10, character: 0 },
            end: { line: 10, character: 30 },
          },
          message: 'Found TODO',
          severity: DiagnosticSeverity.Error,
          code: 'incomplete-skill',
        },
      ];

      const documentUri = `file:///${testDir}/skill.md`.replace(/\\/g, '/');
      const actions = await integration.getSkillCodeActions(
        documentUri,
        diagnostics
      );

      expect(actions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Dependency Tree', () => {
    it('should generate dependency tree string', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'child.md'),
        `---
name: child
description: Child skill
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'parent.md'),
        `---
name: parent
description: Parent skill
dependencies:
  - child
---
`,
        'utf-8'
      );

      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');
      const tree = await integration.getSkillDependencyTree(
        documentUri,
        'parent'
      );

      expect(tree).toBeDefined();
      expect(typeof tree).toBe('string');
      expect(tree).toContain('parent');
      expect(tree).toContain('child');
    });

    it('should handle errors in tree generation', async () => {
      const documentUri = 'invalid://uri';
      const tree = await integration.getSkillDependencyTree(
        documentUri,
        'skill'
      );

      expect(tree).toBeDefined();
      expect(tree).toContain('Error');
    });
  });

  describe('Context Detection', () => {
    it('should detect skill-include context', () => {
      const context = integration['getCompletionContext']('includes: [', 11);

      expect(context.type).toBe('skill-include');
    });

    it('should detect skill-property context', () => {
      const context = integration['getCompletionContext']('name: ', 6);

      expect(context.type).toBe('skill-property');
    });

    it('should detect skill-category context', () => {
      const context = integration['getCompletionContext']('category: ', 10);

      expect(context.type).toBe('skill-category');
    });

    it('should detect skill-complexity context', () => {
      const context = integration['getCompletionContext']('complexity: ', 12);

      expect(context.type).toBe('skill-complexity');
    });

    it('should detect skill-tool context', () => {
      const context = integration['getCompletionContext']('allowed-tools:', 13);

      expect(context.type).toBe('skill-tool');
    });

    it('should return none for unrecognized context', () => {
      const context = integration['getCompletionContext']('random text', 5);

      expect(context.type).toBe('none');
    });

    it('should extract prefix from include context', () => {
      const context = integration['getCompletionContext'](
        'includes: [test',
        15
      );

      expect(context.type).toBe('skill-include');
      expect(context.prefix).toContain('test');
    });
  });

  describe('URI Conversion', () => {
    it('should convert file URI to path', () => {
      const uri = 'file:///path/to/file.md';
      const path = integration['uriToPath'](uri);

      expect(path).not.toContain('file://');
      expect(path).toContain('file.md');
    });

    it('should handle Windows paths', () => {
      const uri = 'file:///C:/Users/test/file.md';
      const path = integration['uriToPath'](uri);

      expect(path).toMatch(/^[A-Z]:/);
    });

    it('should handle Unix paths', () => {
      const uri = 'file:///home/user/file.md';
      const path = integration['uriToPath'](uri);

      expect(path).toContain('home/user/file.md');
    });
  });

  describe('Skill File Detection', () => {
    it('should detect .md files in skills directory as skill files', () => {
      const uri = 'file:///project/skills/my-skill.md';
      const isSkill = integration.isSkillFile(uri);

      expect(isSkill).toBe(true);
    });

    it('should detect .md files in .claude directory as skill files', () => {
      const uri = 'file:///project/.claude/custom-skill.md';
      const isSkill = integration.isSkillFile(uri);

      expect(isSkill).toBe(true);
    });

    it('should reject non-.md files', () => {
      const uri = 'file:///project/skills/file.txt';
      const isSkill = integration.isSkillFile(uri);

      expect(isSkill).toBe(false);
    });

    it('should reject .md files not in skill directories', () => {
      const uri = 'file:///project/docs/readme.md';
      const isSkill = integration.isSkillFile(uri);

      expect(isSkill).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should clear caches', () => {
      integration.clearCaches();

      expect(mockConnection.console.log).toHaveBeenCalledWith(
        'Skill caches cleared'
      );
    });

    it('should clear caches without errors', () => {
      expect(() => integration.clearCaches()).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete skill authoring workflow', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      const documentUri = `file:///${testDir}/new-skill.md`.replace(/\\/g, '/');

      // 1. Get property completions for authoring
      const propCompletions = await integration.getSkillCompletions(
        documentUri,
        '',
        { line: 2, character: 0 }
      );
      expect(propCompletions).toBeDefined();

      // 2. Get category suggestions
      const catCompletions = await integration.getSkillCompletions(
        documentUri,
        'category: ',
        { line: 3, character: 10 }
      );
      expect(catCompletions.length).toBeGreaterThan(0);

      // 3. Validate the skill
      const content = `---
name: new-skill
description: New skill
category: language
---
`;
      const diagnostics = await integration.getSkillDiagnostics(
        documentUri,
        content,
        true
      );
      expect(diagnostics).toBeDefined();
    });

    it('should handle skill dependency workflow', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'base.md'),
        `---
name: base-skill
description: Base skill
---
`,
        'utf-8'
      );

      const documentUri = `file:///${testDir}/test.md`.replace(/\\/g, '/');

      // 1. Navigate to skill definition
      const location = await integration.gotoSkillDefinition(
        documentUri,
        'base-skill'
      );
      expect(location).toBeDefined();

      // 2. Find references to the skill
      const references = await integration.findSkillReferences(
        documentUri,
        'base-skill'
      );
      expect(references).toBeDefined();

      // 3. Get dependency tree
      const tree = await integration.getSkillDependencyTree(
        documentUri,
        'base-skill'
      );
      expect(tree).toBeDefined();
    });

    it('should handle error recovery workflow', async () => {
      const documentUri = `file:///${testDir}/broken.md`.replace(/\\/g, '/');
      const content = `---
name: broken
TODO: Fix this
---
`;

      // 1. Get diagnostics (should show errors)
      const diagnostics = await integration.getSkillDiagnostics(
        documentUri,
        content,
        true
      );
      expect(diagnostics.length).toBeGreaterThan(0);

      // 2. Get code actions for fixes
      const actions = await integration.getSkillCodeActions(
        documentUri,
        diagnostics
      );
      expect(actions).toBeDefined();
    });
  });
});
