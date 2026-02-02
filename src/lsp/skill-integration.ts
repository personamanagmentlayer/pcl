/**
 * PCL Language Server - Skill Integration
 *
 * Integrates skill-specific features into the LSP server
 */

import {
  Connection,
  CompletionItem,
  Hover,
  Location,
  Diagnostic,
  CodeAction,
  CodeActionKind,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver/node';

import { DocumentManager } from './document-manager';
import { SkillCompletionProvider } from './skill-completions';
import { SkillHoverProvider } from './skill-hover';
import { SkillDiagnosticsProvider } from './skill-diagnostics';
import { SkillNavigationProvider } from './skill-navigation';

/**
 * Skill LSP integration manager
 */
export class SkillLSPIntegration {
  private completionProvider: SkillCompletionProvider;
  private hoverProvider: SkillHoverProvider;
  private diagnosticsProvider: SkillDiagnosticsProvider;
  private navigationProvider: SkillNavigationProvider;

  constructor(
    private connection: Connection,
    private documentManager: DocumentManager
  ) {
    this.completionProvider = new SkillCompletionProvider();
    this.hoverProvider = new SkillHoverProvider();
    this.diagnosticsProvider = new SkillDiagnosticsProvider();
    this.navigationProvider = new SkillNavigationProvider();

    this.registerHandlers();
  }

  /**
   * Register skill-specific LSP handlers
   */
  private registerHandlers(): void {
    // Note: Actual registration happens in the main server
    // This method documents the handlers we provide
    this.connection.console.log('Skill LSP integration initialized');
  }

  /**
   * Get skill-specific completions
   */
  async getSkillCompletions(
    documentUri: string,
    lineText: string,
    position: { line: number; character: number }
  ): Promise<CompletionItem[]> {
    const items: CompletionItem[] = [];

    try {
      const document = this.documentManager.getDocument(documentUri);
      if (!document) {
        return items;
      }

      const documentPath = this.uriToPath(documentUri);

      // Check context
      const context = this.getCompletionContext(lineText, position.character);

      // Skill include completions: includes: [...]
      if (context.type === 'skill-include') {
        const skillItems =
          await this.completionProvider.getSkillIncludeCompletions(
            documentPath,
            context.prefix
          );
        items.push(...skillItems);
      }

      // Skill property completions (in YAML frontmatter)
      if (context.type === 'skill-property') {
        const propItems = this.completionProvider.getSkillPropertyCompletions();
        items.push(...propItems);
      }

      // Category completions
      if (context.type === 'skill-category') {
        const catItems = this.completionProvider.getSkillCategoryCompletions();
        items.push(...catItems);
      }

      // Complexity completions
      if (context.type === 'skill-complexity') {
        const complexityItems =
          this.completionProvider.getSkillComplexityCompletions();
        items.push(...complexityItems);
      }

      // Tool completions
      if (context.type === 'skill-tool') {
        const toolItems = this.completionProvider.getToolCompletions();
        items.push(...toolItems);
      }

      this.connection.console.log(
        `Provided ${items.length} skill-specific completion items`
      );
    } catch (error) {
      this.connection.console.error(
        `Error providing skill completions: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return items;
  }

  /**
   * Get skill hover information
   */
  async getSkillHover(
    documentUri: string,
    word: string,
    isSkillFile: boolean
  ): Promise<Hover | null> {
    try {
      if (!isSkillFile) {
        return null;
      }

      const documentPath = this.uriToPath(documentUri);

      // If hovering over a skill name in dependencies
      const skillPath = await this.navigationProvider['findSkillFile'](
        word,
        documentPath
      );
      if (skillPath) {
        return await this.hoverProvider.getSkillHover(skillPath);
      }

      return null;
    } catch (error) {
      this.connection.console.error(
        `Error providing skill hover: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Get skill diagnostics
   */
  async getSkillDiagnostics(
    documentUri: string,
    content: string,
    isSkillFile: boolean
  ): Promise<Diagnostic[]> {
    if (!isSkillFile) {
      return [];
    }

    try {
      const documentPath = this.uriToPath(documentUri);
      return await this.diagnosticsProvider.validateSkillFile(
        documentPath,
        content
      );
    } catch (error) {
      this.connection.console.error(
        `Error providing skill diagnostics: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Go to skill definition
   */
  async gotoSkillDefinition(
    documentUri: string,
    word: string
  ): Promise<Location | null> {
    try {
      const documentPath = this.uriToPath(documentUri);
      return await this.navigationProvider.gotoSkillDefinition(
        word,
        documentPath
      );
    } catch (error) {
      this.connection.console.error(
        `Error in goto definition: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Find skill references
   */
  async findSkillReferences(
    documentUri: string,
    word: string
  ): Promise<Location[]> {
    try {
      const documentPath = this.uriToPath(documentUri);
      return await this.navigationProvider.findSkillReferences(
        word,
        documentPath
      );
    } catch (error) {
      this.connection.console.error(
        `Error finding references: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get skill code actions (quick fixes)
   */
  async getSkillCodeActions(
    documentUri: string,
    diagnostics: Diagnostic[]
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    for (const diagnostic of diagnostics) {
      // Add quick fix for missing dependencies
      if (diagnostic.code === 'missing-dependency') {
        actions.push({
          title: 'Install missing dependency',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          // command: would trigger skill install command
        });
      }

      // Add quick fix for token limit exceeded
      if (diagnostic.code === 'token-limit-exceeded') {
        actions.push({
          title: 'Optimize skill to reduce tokens',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          // command: would trigger skill optimize command
        });
      }

      // Add quick fix for incomplete skill
      if (diagnostic.code === 'incomplete-skill') {
        actions.push({
          title: 'Find and remove TODO items',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
        });
      }

      // Add quick fix for missing examples
      if (diagnostic.code === 'missing-examples') {
        actions.push({
          title: 'Add example template',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
        });
      }
    }

    return actions;
  }

  /**
   * Show skill dependency tree
   */
  async getSkillDependencyTree(
    documentUri: string,
    skillName: string
  ): Promise<string> {
    try {
      const documentPath = this.uriToPath(documentUri);
      const tree = await this.navigationProvider.getSkillDependencyTree(
        skillName,
        documentPath
      );
      return this.navigationProvider.formatDependencyTree(tree);
    } catch (error) {
      return `Error generating dependency tree: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Determine completion context from line text
   */
  private getCompletionContext(
    lineText: string,
    character: number
  ): { type: string; prefix: string } {
    const beforeCursor = lineText.substring(0, character);

    // Check for skill include context: includes: [...]
    if (/includes:\s*\[/.test(beforeCursor)) {
      const match = beforeCursor.match(/\[([^\]]*?)$/);
      return {
        type: 'skill-include',
        prefix: match ? match[1].trim() : '',
      };
    }

    // Check for skill property context (YAML frontmatter)
    if (/^[a-z-]+:\s*$/.test(lineText.trim())) {
      return { type: 'skill-property', prefix: '' };
    }

    // Check for category context
    if (/category:\s*$/.test(beforeCursor)) {
      return { type: 'skill-category', prefix: '' };
    }

    // Check for complexity context
    if (/complexity:\s*$/.test(beforeCursor)) {
      return { type: 'skill-complexity', prefix: '' };
    }

    // Check for tool context
    if (/allowed-tools:\s*$/m.test(lineText) || /^\s*-\s*$/.test(lineText)) {
      return { type: 'skill-tool', prefix: '' };
    }

    return { type: 'none', prefix: '' };
  }

  /**
   * Convert URI to file path
   */
  private uriToPath(uri: string): string {
    // Simple conversion - in production, use proper URI parsing
    return uri.replace('file://', '').replace(/^\/([A-Z]):/, '$1:');
  }

  /**
   * Check if document is a skill file
   */
  isSkillFile(documentUri: string): boolean {
    const path = this.uriToPath(documentUri);
    return (
      path.endsWith('.md') &&
      (path.includes('skills') || path.includes('.claude'))
    );
  }

  /**
   * Clear skill caches
   */
  clearCaches(): void {
    this.completionProvider.clearAllCaches();
    this.connection.console.log('Skill caches cleared');
  }
}
