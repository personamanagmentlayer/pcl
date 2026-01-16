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

export {
  Lexer,
  TokenType,
  tokenize,
} from './lexer';

// ═══════════════════════════════════════════════════════════════════════════════
//                              PARSER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  Parser,
  parse,
  parseProgram,
  parseExpression,
  parseType,
} from './parser';

// ═══════════════════════════════════════════════════════════════════════════════
//                              SEMANTIC ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SemanticAnalyzer,
  SymbolTable,
  TypeChecker,
  analyze,
  createSymbolTable,
  createTypeChecker,
  Types,
  TypeKind,
  SymbolKind,
  SymbolFlags,
  ScopeKind,
} from './semantic';

// ═══════════════════════════════════════════════════════════════════════════════
//                              RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════

export {
  Runtime,
  PersonaInstance,
  TeamInstance,
  WorkflowExecutor,
  createRuntime,
  createPersona,
  createTeam,
} from './runtime';

// ═══════════════════════════════════════════════════════════════════════════════
//                              CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generate,
  generatePrompt,
  generateTeamPrompt,
  generateJSON,
  generateTypeScript,
  generateMarkdown,
} from './codegen';


// ═══════════════════════════════════════════════════════════════════════════════
//                              CONVENIENCE API
// ═══════════════════════════════════════════════════════════════════════════════

import { parse as parseSource } from './parser';
import { analyze as analyzeProgram } from './semantic';
import { createRuntime, Runtime } from './runtime';
import { generate as generateCode } from './codegen';
import type { Program } from './ast';
import type { Result, PCLError } from './types';
import type { AnalysisResult } from './semantic';
import type { GeneratorOptions } from './codegen';
import { Ok, Err } from './types';

/**
 * Compile PCL source code
 */
export function compile(source: string, options?: {
  source?: string;
  strict?: boolean;
}): Result<{ program: Program; analysis: AnalysisResult }, PCLError[]> {
  const parseResult = parseSource(source, { source: options?.source });
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
export async function execute(source: string, options?: {
  source?: string;
  onEvent?: (event: any) => void;
}): Promise<Result<Runtime, PCLError[]>> {
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
    return Err([{
      code: 'RUNTIME_ERROR',
      message: error instanceof Error ? error.message : String(error),
    } as PCLError]);
  }
}

/**
 * Transpile PCL to another format
 */
export function transpile(
  source: string,
  options: GeneratorOptions
): Result<string, PCLError[]> {
  const parseResult = parseSource(source, { source: options.target });
  if (!parseResult.ok) {
    return parseResult;
  }
  
  try {
    const output = generateCode(parseResult.value, options);
    return Ok(output);
  } catch (error) {
    return Err([{
      code: 'CODEGEN_ERROR',
      message: error instanceof Error ? error.message : String(error),
    } as PCLError]);
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
