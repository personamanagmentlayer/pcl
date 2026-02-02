/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL LSP - Code Actions
 * Phase 3: Quick fixes, refactorings, and source actions
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  Command,
  Diagnostic,
  Range,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver';
import { parse } from '../parser/index.js';
import type * as AST from '../ast/index.js';

export interface CodeActionContext {
  /** Diagnostics at the cursor position */
  diagnostics: Diagnostic[];
  /** Source code */
  source: string;
  /** Document URI */
  uri: string;
  /** Cursor range */
  range: Range;
}

/**
 * Code action provider for PCL
 * Provides quick fixes, refactorings, and source actions
 */
export class CodeActionProvider {
  constructor() {
    // No state needed - all methods are functional
  }

  /**
   * Provide code actions for a given context
   */
  async provideCodeActions(params: CodeActionParams): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];
    const { textDocument, range, context } = params;

    // Get document source (would come from document manager in real implementation)
    const source = ''; // TODO: Get from document manager

    const actionContext: CodeActionContext = {
      diagnostics: context.diagnostics,
      source,
      uri: textDocument.uri,
      range,
    };

    // Quick fixes for diagnostics
    if (context.diagnostics.length > 0) {
      actions.push(...this.getQuickFixes(actionContext));
    }

    // Refactoring actions
    actions.push(...this.getRefactorings(actionContext));

    // Source actions
    actions.push(...this.getSourceActions(actionContext));

    return actions;
  }

  /**
   * Get quick fixes for diagnostics
   */
  private getQuickFixes(context: CodeActionContext): CodeAction[] {
    const fixes: CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      // Fix: Undefined persona reference
      if (diagnostic.message.includes('Undefined persona')) {
        fixes.push(this.createPersonaFix(diagnostic, context));
      }

      // Fix: Missing required field
      if (diagnostic.message.includes('Missing required field')) {
        fixes.push(this.createMissingFieldFix(diagnostic, context));
      }

      // Fix: Invalid type
      if (diagnostic.message.includes('Type mismatch')) {
        fixes.push(this.createTypeFix(diagnostic, context));
      }

      // Fix: Unused declaration
      if (diagnostic.message.includes('unused')) {
        fixes.push(this.createRemoveUnusedFix(diagnostic, context));
      }

      // Fix: Import not found
      if (diagnostic.message.includes('Cannot find module')) {
        fixes.push(this.createImportFix(diagnostic, context));
      }
    }

    return fixes;
  }

  /**
   * Get refactoring actions
   */
  private getRefactorings(context: CodeActionContext): CodeAction[] {
    const refactorings: CodeAction[] = [];

    // Parse the source to get AST
    const parseResult = parse(context.source);
    if (!parseResult.ok) {
      return refactorings;
    }

    const ast = parseResult.value.program;

    // Extract to persona/skill/workflow
    const extract = this.createExtractRefactoring(context, ast);
    if (extract) refactorings.push(extract);

    // Inline persona/skill
    const inline = this.createInlineRefactoring(context, ast);
    if (inline) refactorings.push(inline);

    // Convert between persona types
    const convert = this.createConvertTypeRefactoring(context, ast);
    if (convert) refactorings.push(convert);

    // Simplify workflow
    const simplify = this.createSimplifyWorkflowRefactoring(context, ast);
    if (simplify) refactorings.push(simplify);

    return refactorings;
  }

  /**
   * Get source actions
   */
  private getSourceActions(context: CodeActionContext): CodeAction[] {
    const actions: CodeAction[] = [];

    // Organize imports
    actions.push(this.createOrganizeImportsAction(context));

    // Sort declarations
    actions.push(this.createSortDeclarationsAction(context));

    // Format document
    actions.push(this.createFormatAction(context));

    // Add missing imports
    actions.push(this.createAddMissingImportsAction(context));

    return actions.filter((a) => a !== null) as CodeAction[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              QUICK FIXES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fix undefined persona reference
   */
  private createPersonaFix(
    diagnostic: Diagnostic,
    context: CodeActionContext
  ): CodeAction {
    const personaName = this.extractName(diagnostic.message);

    return {
      title: `Create persona '${personaName}'`,
      kind: 'quickfix' as CodeActionKind,
      diagnostics: [diagnostic],
      edit: {
        changes: {
          [context.uri]: [
            {
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
              },
              newText: `persona ${personaName} {\n  instructions: "TODO: Add instructions"\n}\n\n`,
            },
          ],
        },
      },
    };
  }

  /**
   * Fix missing required field
   */
  private createMissingFieldFix(
    diagnostic: Diagnostic,
    context: CodeActionContext
  ): CodeAction {
    const fieldName = this.extractFieldName(diagnostic.message);
    const line = diagnostic.range.end.line;

    return {
      title: `Add missing field '${fieldName}'`,
      kind: 'quickfix' as CodeActionKind,
      diagnostics: [diagnostic],
      edit: {
        changes: {
          [context.uri]: [
            {
              range: {
                start: { line, character: 0 },
                end: { line, character: 0 },
              },
              newText: `  ${fieldName}: TODO\n`,
            },
          ],
        },
      },
    };
  }

  /**
   * Fix type mismatch
   */
  private createTypeFix(
    diagnostic: Diagnostic,
    context: CodeActionContext
  ): CodeAction {
    return {
      title: 'Convert to correct type',
      kind: 'quickfix' as CodeActionKind,
      diagnostics: [diagnostic],
      edit: {
        changes: {
          [context.uri]: [
            {
              range: diagnostic.range,
              newText: this.inferCorrectType(diagnostic, context),
            },
          ],
        },
      },
    };
  }

  /**
   * Remove unused declaration
   */
  private createRemoveUnusedFix(
    diagnostic: Diagnostic,
    context: CodeActionContext
  ): CodeAction {
    return {
      title: 'Remove unused declaration',
      kind: 'quickfix' as CodeActionKind,
      diagnostics: [diagnostic],
      edit: {
        changes: {
          [context.uri]: [
            {
              range: this.getDeclarationRange(diagnostic, context),
              newText: '',
            },
          ],
        },
      },
    };
  }

  /**
   * Fix import not found
   */
  private createImportFix(
    diagnostic: Diagnostic,
    context: CodeActionContext
  ): CodeAction {
    const moduleName = this.extractModuleName(diagnostic.message);

    return {
      title: `Install module '${moduleName}'`,
      kind: 'quickfix' as CodeActionKind,
      diagnostics: [diagnostic],
      command: {
        title: 'Install module',
        command: 'pcl.installModule',
        arguments: [moduleName],
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              REFACTORINGS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract selected code to new persona/skill/workflow
   */
  private createExtractRefactoring(
    context: CodeActionContext,
    ast: AST.Program
  ): CodeAction | null {
    // Check if selection is extractable
    const selectedNode = this.getNodeAtRange(ast, context.range);
    if (!selectedNode) {
      return null;
    }

    return {
      title: 'Extract to new declaration',
      kind: 'refactor.extract' as CodeActionKind,
      edit: this.buildExtractEdit(selectedNode, context),
    };
  }

  /**
   * Inline persona/skill reference
   */
  private createInlineRefactoring(
    context: CodeActionContext,
    ast: AST.Program
  ): CodeAction | null {
    const selectedNode = this.getNodeAtRange(ast, context.range);
    if (!selectedNode || selectedNode.kind !== 'Identifier') {
      return null;
    }

    return {
      title: 'Inline declaration',
      kind: 'refactor.inline' as CodeActionKind,
      edit: this.buildInlineEdit(selectedNode, ast, context),
    };
  }

  /**
   * Convert between persona types (persona ↔ team)
   */
  private createConvertTypeRefactoring(
    context: CodeActionContext,
    ast: AST.Program
  ): CodeAction | null {
    const selectedNode = this.getNodeAtRange(ast, context.range);
    if (
      !selectedNode ||
      (selectedNode.kind !== 'PersonaDecl' && selectedNode.kind !== 'TeamDecl')
    ) {
      return null;
    }

    const targetType = selectedNode.kind === 'PersonaDecl' ? 'team' : 'persona';

    return {
      title: `Convert to ${targetType}`,
      kind: 'refactor.rewrite' as CodeActionKind,
      edit: this.buildConvertTypeEdit(selectedNode, targetType, context),
    };
  }

  /**
   * Simplify workflow (remove redundant steps, merge sequences)
   */
  private createSimplifyWorkflowRefactoring(
    context: CodeActionContext,
    ast: AST.Program
  ): CodeAction | null {
    const selectedNode = this.getNodeAtRange(ast, context.range);
    if (!selectedNode || selectedNode.kind !== 'WorkflowDeclaration') {
      return null;
    }

    return {
      title: 'Simplify workflow',
      kind: 'refactor.rewrite' as CodeActionKind,
      edit: this.buildSimplifyWorkflowEdit(
        selectedNode as AST.WorkflowDeclaration,
        context
      ),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              SOURCE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Organize imports (sort, remove unused, group)
   */
  private createOrganizeImportsAction(context: CodeActionContext): CodeAction {
    return {
      title: 'Organize imports',
      kind: 'source.organizeImports' as CodeActionKind,
      edit: this.buildOrganizeImportsEdit(context),
    };
  }

  /**
   * Sort declarations alphabetically
   */
  private createSortDeclarationsAction(context: CodeActionContext): CodeAction {
    return {
      title: 'Sort declarations',
      kind: 'source' as CodeActionKind,
      edit: this.buildSortDeclarationsEdit(context),
    };
  }

  /**
   * Format document
   */
  private createFormatAction(context: CodeActionContext): CodeAction {
    return {
      title: 'Format document',
      kind: 'source' as CodeActionKind,
      command: {
        title: 'Format document',
        command: 'editor.action.formatDocument',
      },
    };
  }

  /**
   * Add missing imports automatically
   */
  private createAddMissingImportsAction(
    context: CodeActionContext
  ): CodeAction {
    return {
      title: 'Add missing imports',
      kind: 'source' as CodeActionKind,
      edit: this.buildAddMissingImportsEdit(context),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract name from diagnostic message
   */
  private extractName(message: string): string {
    const match = message.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Extract field name from diagnostic message
   */
  private extractFieldName(message: string): string {
    const match = message.match(/field ['"]([^'"]+)['"]/);
    return match ? match[1] : 'field';
  }

  /**
   * Extract module name from diagnostic message
   */
  private extractModuleName(message: string): string {
    const match = message.match(/module ['"]([^'"]+)['"]/);
    return match ? match[1] : '';
  }

  /**
   * Infer correct type from context
   */
  private inferCorrectType(
    diagnostic: Diagnostic,
    context: CodeActionContext
  ): string {
    // Simple inference - in real implementation would analyze expected vs actual types
    return '/* TODO: Fix type */';
  }

  /**
   * Get full declaration range for removal
   */
  private getDeclarationRange(
    diagnostic: Diagnostic,
    context: CodeActionContext
  ): Range {
    // Extend range to include entire declaration line(s)
    return {
      start: { line: diagnostic.range.start.line, character: 0 },
      end: { line: diagnostic.range.end.line + 1, character: 0 },
    };
  }

  /**
   * Get AST node at given range
   */
  private getNodeAtRange(ast: AST.Program, range: Range): AST.ASTNode | null {
    // Walk AST to find node at position
    // Simplified implementation - would use visitor pattern in real code
    for (const stmt of ast.statements) {
      if (this.nodeContainsRange(stmt, range)) {
        return stmt;
      }
    }
    return null;
  }

  /**
   * Check if node contains range
   */
  private nodeContainsRange(node: AST.ASTNode, range: Range): boolean {
    const nodeStart = node.span.start;
    const nodeEnd = node.span.end;
    const rangeStart = range.start.line * 1000 + range.start.character;
    const rangeEnd = range.end.line * 1000 + range.end.character;

    return nodeStart.offset <= rangeStart && nodeEnd.offset >= rangeEnd;
  }

  /**
   * Build edit for extract refactoring
   */
  private buildExtractEdit(
    node: AST.ASTNode,
    context: CodeActionContext
  ): WorkspaceEdit {
    // Extract code to new declaration
    const extracted = this.extractNodeText(node, context.source);
    const name = this.generateUniqueName('Extracted', context);

    return {
      changes: {
        [context.uri]: [
          // Add new declaration at top
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            newText: `persona ${name} {\n  ${extracted}\n}\n\n`,
          },
          // Replace original with reference
          {
            range: this.nodeToRange(node),
            newText: name,
          },
        ],
      },
    };
  }

  /**
   * Build edit for inline refactoring
   */
  private buildInlineEdit(
    node: AST.ASTNode,
    ast: AST.Program,
    context: CodeActionContext
  ): WorkspaceEdit {
    // Find declaration and inline its content
    // Simplified - would need full symbol resolution
    return {
      changes: {
        [context.uri]: [],
      },
    };
  }

  /**
   * Build edit for type conversion
   */
  private buildConvertTypeEdit(
    node: AST.ASTNode,
    targetType: string,
    context: CodeActionContext
  ): WorkspaceEdit {
    return {
      changes: {
        [context.uri]: [
          {
            range: this.nodeToRange(node),
            newText: this.convertNodeType(node, targetType, context.source),
          },
        ],
      },
    };
  }

  /**
   * Build edit for workflow simplification
   */
  private buildSimplifyWorkflowEdit(
    node: AST.WorkflowDeclaration,
    context: CodeActionContext
  ): WorkspaceEdit {
    return {
      changes: {
        [context.uri]: [
          {
            range: this.nodeToRange(node),
            newText: this.simplifyWorkflow(node, context.source),
          },
        ],
      },
    };
  }

  /**
   * Build edit for organizing imports
   */
  private buildOrganizeImportsEdit(context: CodeActionContext): WorkspaceEdit {
    const imports = this.extractImports(context.source);
    const organized = this.organizeImports(imports);

    return {
      changes: {
        [context.uri]: [
          {
            range: this.getImportsRange(context.source),
            newText: organized,
          },
        ],
      },
    };
  }

  /**
   * Build edit for sorting declarations
   */
  private buildSortDeclarationsEdit(context: CodeActionContext): WorkspaceEdit {
    // Parse and sort declarations alphabetically
    return {
      changes: {
        [context.uri]: [],
      },
    };
  }

  /**
   * Build edit for adding missing imports
   */
  private buildAddMissingImportsEdit(
    context: CodeActionContext
  ): WorkspaceEdit {
    const missingImports = this.findMissingImports(context);

    return {
      changes: {
        [context.uri]: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            newText: missingImports.map((imp) => `import "${imp}";\n`).join(''),
          },
        ],
      },
    };
  }

  /**
   * Extract node text from source
   */
  private extractNodeText(node: AST.ASTNode, source: string): string {
    return source.substring(node.span.start.offset, node.span.end.offset);
  }

  /**
   * Convert node to LSP range
   */
  private nodeToRange(node: AST.ASTNode): Range {
    return {
      start: {
        line: node.span.start.line - 1,
        character: node.span.start.column - 1,
      },
      end: {
        line: node.span.end.line - 1,
        character: node.span.end.column - 1,
      },
    };
  }

  /**
   * Generate unique name
   */
  private generateUniqueName(base: string, context: CodeActionContext): string {
    let i = 1;
    let name = base;
    while (context.source.includes(name)) {
      name = `${base}${i}`;
      i++;
    }
    return name;
  }

  /**
   * Convert node type
   */
  private convertNodeType(
    node: AST.ASTNode,
    targetType: string,
    source: string
  ): string {
    const content = this.extractNodeText(node, source);
    // Simple conversion - real implementation would transform AST
    return content.replace(/^(persona|team)/, targetType);
  }

  /**
   * Simplify workflow
   */
  private simplifyWorkflow(
    node: AST.WorkflowDeclaration,
    source: string
  ): string {
    // Analyze and simplify workflow steps
    return this.extractNodeText(node, source);
  }

  /**
   * Extract imports from source
   */
  private extractImports(source: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+"([^"]+)";/g;
    let match;

    while ((match = importRegex.exec(source)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Organize imports (sort, deduplicate, group)
   */
  private organizeImports(imports: string[]): string {
    // Remove duplicates
    const unique = Array.from(new Set(imports));

    // Sort alphabetically
    unique.sort();

    // Group by prefix (stdlib/, custom)
    const stdlib = unique.filter((imp) => imp.startsWith('stdlib/'));
    const custom = unique.filter((imp) => !imp.startsWith('stdlib/'));

    const organized = [...stdlib, ...custom]
      .map((imp) => `import "${imp}";\n`)
      .join('');

    return organized + (organized ? '\n' : '');
  }

  /**
   * Get range of import statements
   */
  private getImportsRange(source: string): Range {
    const lines = source.split('\n');
    let start = 0;
    let end = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        if (start === 0) start = i;
        end = i + 1;
      } else if (start > 0) {
        break;
      }
    }

    return {
      start: { line: start, character: 0 },
      end: { line: end, character: 0 },
    };
  }

  /**
   * Find missing imports based on undefined references
   */
  private findMissingImports(context: CodeActionContext): string[] {
    // Analyze diagnostics and suggest imports
    const missing: string[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.message.includes('Undefined')) {
        const name = this.extractName(diagnostic.message);
        // Look up in standard library
        const suggestedImport = this.suggestImport(name);
        if (suggestedImport) {
          missing.push(suggestedImport);
        }
      }
    }

    return Array.from(new Set(missing));
  }

  /**
   * Suggest import path for a name
   */
  private suggestImport(name: string): string | null {
    // Simple mapping - would use index/catalog in real implementation
    const commonImports: Record<string, string> = {
      Developer: 'stdlib/personas/coding/developer',
      Analyst: 'stdlib/personas/analysis/analyst',
      Reviewer: 'stdlib/personas/coding/reviewer',
    };

    return commonImports[name] || null;
  }
}
