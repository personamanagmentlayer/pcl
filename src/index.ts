/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Main Entry Point
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The world's first programming language for AI persona management.
 *
 * @packageDocumentation
 * @module @pcl/core
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export * from './types';

// ═══════════════════════════════════════════════════════════════════════════════
//                              AST
// ═══════════════════════════════════════════════════════════════════════════════

export * as AST from './ast';

// ═══════════════════════════════════════════════════════════════════════════════
//                              LEXER
// ═══════════════════════════════════════════════════════════════════════════════

export { Lexer, tokenize, TokenType } from './lexer';

// ═══════════════════════════════════════════════════════════════════════════════
//                              PARSER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  parse,
  parseExpression,
  parseProgram,
  Parser,
  parseType,
} from './parser';

// ═══════════════════════════════════════════════════════════════════════════════
//                              SEMANTIC ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  analyze,
  createSymbolTable,
  createTypeChecker,
  SemanticAnalyzer,
  SymbolTable,
  TypeChecker,
  Types,
} from './semantic';

export type {
  ScopeKind,
  SymbolFlags,
  SymbolKind,
  TypeKind,
} from './semantic';

// ═══════════════════════════════════════════════════════════════════════════════
//                              RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════

export {
  createPersona,
  createRuntime,
  createTeam,
  PersonaInstance,
  Runtime,
  TeamInstance,
  WorkflowExecutor,
} from './runtime';

// ═══════════════════════════════════════════════════════════════════════════════
//                              CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generate,
  generateJSON,
  generateMarkdown,
  generatePrompt,
  generateTeamPrompt,
  generateTypeScript,
} from './codegen';

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONVENIENCE API
// ═══════════════════════════════════════════════════════════════════════════════

import type { Program } from './ast';
import type { GeneratorOptions } from './codegen';
import { generate as generateCode } from './codegen';
import { parseProgram } from './parser';
import { createRuntime, Runtime } from './runtime';
import type { AnalysisResult } from './semantic';
import { analyze as analyzeProgram } from './semantic';
import type { PCLError, Result } from './types';
import { Err, Ok } from './types';

/**
 * Compile PCL source code
 */
export function compile(
  source: string,
  options?: {
    source?: string;
    strict?: boolean;
  }
): Result<{ program: Program; analysis: AnalysisResult }, PCLError[]> {
  const parseResult = parseProgram(source, { source: options?.source });
  if (!parseResult.ok) {
    return parseResult;
  }

  const analysisResult = analyzeProgram(parseResult.value);
  if (!analysisResult.ok) {
    return analysisResult;
  }

  return Ok({
    program: parseResult.value,
    analysis: analysisResult.value,
  });
}

/**
 * Execute a PCL program
 */
export async function execute(
  source: string,
  options?: {
    source?: string;
    onEvent?: (event: any) => void;
  }
): Promise<Result<Runtime, PCLError[]>> {
  const compiled = compile(source, options);
  if (!compiled.ok) {
    return compiled;
  }

  const runtime = createRuntime();

  if (options?.onEvent) {
    runtime.on(options.onEvent);
  }

  try {
    runtime.load(compiled.value.program);
    return Ok(runtime);
  } catch (error) {
    return Err([
      {
        code: 'RUNTIME_ERROR',
        message: error instanceof Error ? error.message : String(error),
      } as PCLError,
    ]);
  }
}

/**
 * Transpile PCL to another format
 */
export function transpile(
  source: string,
  options: GeneratorOptions
): Result<string, PCLError[]> {
  const parseResult = parseProgram(source, { source: options.target });
  if (!parseResult.ok) {
    return parseResult;
  }

  try {
    const output = generateCode(parseResult.value, options);
    return Ok(output);
  } catch (error) {
    return Err([
      {
        code: 'CODEGEN_ERROR',
        message: error instanceof Error ? error.message : String(error),
      } as PCLError,
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              VERSION INFO
// ═══════════════════════════════════════════════════════════════════════════════

export const version = {
  major: 1,
  minor: 0,
  patch: 0,
  prerelease: 'alpha',
  full: '1.0.0-alpha',
} as const;

export const features = {
  personas: true,
  teams: true,
  workflows: true,
  commands: true,
  pql: true,
  generics: true,
  async: true,
  decorators: true,
} as const;
