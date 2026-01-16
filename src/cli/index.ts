#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Command Line Interface
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { Lexer, tokenize } from '../lexer';
import { Parser, parse } from '../parser';
import { analyze } from '../semantic';
import { createRuntime } from '../runtime';
import { generate, generatePrompt, generateJSON, generateTypeScript, generateMarkdown } from '../codegen';
import type { Program, PersonaDeclaration } from '../ast';
import type { PCLError } from '../types';
import type { GeneratorTarget } from '../codegen';


// ═══════════════════════════════════════════════════════════════════════════════
//                              CLI CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const VERSION = '1.0.0-alpha';
const BANNER = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ██████╗  ██████╗██╗                                                         ║
║   ██╔══██╗██╔════╝██║         The World's First Programming Language          ║
║   ██████╔╝██║     ██║              for AI Persona Management                  ║
║   ██╔═══╝ ██║     ██║                                                         ║
║   ██║     ╚██████╗███████╗                                                    ║
║   ╚═╝      ╚═════╝╚══════╝    v${VERSION}                                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

const HELP = `
Usage: pcl <command> [options] [file]

Commands:
  parse <file>       Parse a PCL file and show AST
  lex <file>         Tokenize a PCL file
  check <file>       Type check a PCL file (semantic analysis)
  fmt <file>         Format a PCL file
  gen <file>         Generate code from a PCL file
  run <file>         Load and run a PCL file
  repl               Start interactive REPL
  version            Show version information
  help               Show this help message

Options:
  -o, --output <file>    Output file
  -f, --format <format>  Output format (json, yaml, pretty)
  -t, --target <target>  Generation target (prompt, typescript, json, markdown)
  -q, --quiet            Suppress output
  -v, --verbose          Verbose output
  --no-color             Disable colored output
  --strict               Enable strict type checking

Examples:
  pcl parse main.pcl
  pcl lex main.pcl --format json
  pcl check src/**/*.pcl --strict
  pcl gen main.pcl --target typescript -o output.ts
  pcl gen main.pcl --target prompt
  pcl fmt main.pcl -o formatted.pcl
  pcl run main.pcl
  pcl repl
`;


// ═══════════════════════════════════════════════════════════════════════════════
//                              COLOR UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

let useColors = process.stdout.isTTY !== false;

function color(c: keyof typeof colors, text: string): string {
  return useColors ? `${colors[c]}${text}${colors.reset}` : text;
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              ERROR FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

function formatError(error: PCLError, source: string, filename: string): string {
  const lines = source.split('\n');
  const line = error.span?.start.line ?? 0;
  const column = error.span?.start.column ?? 0;
  
  let output = '';
  
  // Error header
  output += color('red', `error[${error.code}]`) + `: ${error.message}\n`;
  
  // Location
  if (line > 0) {
    output += color('cyan', ` --> `) + `${filename}:${line}:${column}\n`;
    output += color('cyan', '  |') + '\n';
    
    // Context lines
    const startLine = Math.max(1, line - 2);
    const endLine = Math.min(lines.length, line + 2);
    
    for (let i = startLine; i <= endLine; i++) {
      const lineNum = i.toString().padStart(4);
      const lineContent = lines[i - 1] ?? '';
      
      if (i === line) {
        output += color('cyan', `${lineNum} |`) + ' ' + lineContent + '\n';
        // Error indicator
        const padding = ' '.repeat(column);
        const indicator = '^'.repeat(Math.max(1, error.span?.end.column ?? 1 - column));
        output += color('cyan', '     |') + ' ' + padding + color('red', indicator) + '\n';
      } else {
        output += color('dim', `${lineNum} |`) + ' ' + lineContent + '\n';
      }
    }
    
    output += color('cyan', '  |') + '\n';
  }
  
  return output;
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

interface CommandOptions {
  output?: string;
  format?: 'json' | 'yaml' | 'pretty';
  target?: GeneratorTarget;
  quiet?: boolean;
  verbose?: boolean;
  strict?: boolean;
}

/**
 * Parse command - parse a PCL file and display AST
 */
function commandParse(file: string, options: CommandOptions): number {
  if (!existsSync(file)) {
    console.error(color('red', `Error: File not found: ${file}`));
    return 1;
  }
  
  const source = readFileSync(file, 'utf-8');
  const result = parse(source, { source: file });
  
  if (!result.ok) {
    for (const error of result.error) {
      console.error(formatError(error, source, file));
    }
    return 1;
  }
  
  if (!options.quiet) {
    const output = formatAST(result.value, options.format ?? 'pretty');
    
    if (options.output) {
      writeFileSync(options.output, output);
      console.log(color('green', `✓ AST written to ${options.output}`));
    } else {
      console.log(output);
    }
  }
  
  console.log(color('green', `✓ Parsed successfully: ${result.value.statements.length} statements`));
  return 0;
}

/**
 * Lex command - tokenize a PCL file
 */
function commandLex(file: string, options: CommandOptions): number {
  if (!existsSync(file)) {
    console.error(color('red', `Error: File not found: ${file}`));
    return 1;
  }
  
  const source = readFileSync(file, 'utf-8');
  const result = tokenize(source, { source: file });
  
  if (!result.ok) {
    for (const error of result.error) {
      console.error(formatError(error, source, file));
    }
    return 1;
  }
  
  if (!options.quiet) {
    const tokens = result.value;
    
    if (options.format === 'json') {
      console.log(JSON.stringify(tokens, null, 2));
    } else {
      console.log(color('bold', `Tokens (${tokens.length}):\n`));
      
      for (const token of tokens) {
        const loc = `${token.span.start.line}:${token.span.start.column}`;
        const type = color('cyan', token.type.padEnd(20));
        const value = token.value.length > 40 
          ? token.value.substring(0, 37) + '...' 
          : token.value;
        console.log(`  ${loc.padEnd(10)} ${type} ${color('yellow', JSON.stringify(value))}`);
      }
    }
  }
  
  console.log(color('green', `✓ Tokenized: ${result.value.length} tokens`));
  return 0;
}

/**
 * Check command - type check a PCL file
 */
function commandCheck(file: string, options: CommandOptions): number {
  if (!existsSync(file)) {
    console.error(color('red', `Error: File not found: ${file}`));
    return 1;
  }
  
  const source = readFileSync(file, 'utf-8');
  const parseResult = parse(source, { source: file });
  
  if (!parseResult.ok) {
    for (const error of parseResult.error) {
      console.error(formatError(error, source, file));
    }
    return 1;
  }
  
  // Perform semantic analysis
  const analysisResult = analyze(parseResult.value);
  
  if (!analysisResult.ok) {
    for (const error of analysisResult.error) {
      console.error(formatError(error, source, file));
    }
    return 1;
  }
  
  // Show warnings if verbose
  if (options.verbose && analysisResult.value.warnings.length > 0) {
    console.log(color('yellow', `\n⚠ ${analysisResult.value.warnings.length} warning(s):`));
    for (const warning of analysisResult.value.warnings) {
      console.log(color('yellow', `  - ${warning.message}`));
    }
  }
  
  // Show symbol table summary if verbose
  if (options.verbose) {
    const symbols = analysisResult.value.symbolTable.getCurrentScope().symbols;
    console.log(color('dim', `\nSymbols defined: ${symbols.size}`));
  }
  
  console.log(color('green', `✓ Type check passed: ${file}`));
  return 0;
}

/**
 * Gen command - generate code from a PCL file
 */
function commandGen(file: string, options: CommandOptions): number {
  if (!existsSync(file)) {
    console.error(color('red', `Error: File not found: ${file}`));
    return 1;
  }
  
  const source = readFileSync(file, 'utf-8');
  const parseResult = parse(source, { source: file });
  
  if (!parseResult.ok) {
    for (const error of parseResult.error) {
      console.error(formatError(error, source, file));
    }
    return 1;
  }
  
  const target = options.target || 'prompt';
  
  try {
    let output: string;
    
    switch (target) {
      case 'prompt': {
        // Find first persona and generate prompt
        const persona = parseResult.value.statements.find(s => s.kind === 'PersonaDeclaration');
        if (persona) {
          output = generatePrompt(persona as PersonaDeclaration);
        } else {
          console.error(color('red', 'No persona found in file'));
          return 1;
        }
        break;
      }
      case 'json':
        output = generateJSON(parseResult.value);
        break;
      case 'typescript':
      case 'javascript':
        output = generateTypeScript(parseResult.value);
        break;
      case 'markdown':
        output = generateMarkdown(parseResult.value);
        break;
      default:
        output = generate(parseResult.value, { target });
    }
    
    if (options.output) {
      writeFileSync(options.output, output);
      console.log(color('green', `✓ Generated ${target} output to ${options.output}`));
    } else {
      console.log(output);
    }
    
    return 0;
  } catch (error) {
    console.error(color('red', `Generation error: ${error instanceof Error ? error.message : String(error)}`));
    return 1;
  }
}

/**
 * Run command - load and run a PCL file
 */
function commandRun(file: string, options: CommandOptions): number {
  if (!existsSync(file)) {
    console.error(color('red', `Error: File not found: ${file}`));
    return 1;
  }
  
  const source = readFileSync(file, 'utf-8');
  const parseResult = parse(source, { source: file });
  
  if (!parseResult.ok) {
    for (const error of parseResult.error) {
      console.error(formatError(error, source, file));
    }
    return 1;
  }
  
  // Create runtime and load program
  const runtime = createRuntime({
    enableTracing: options.verbose ?? false,
  });
  
  try {
    runtime.load(parseResult.value);
    
    // Show loaded entities
    const personas = runtime.getAllPersonas();
    const teams = runtime.getAllTeams();
    
    console.log(color('green', `✓ Loaded ${file}`));
    console.log(color('dim', `  Personas: ${personas.length}`));
    console.log(color('dim', `  Teams: ${teams.length}`));
    
    // List personas
    if (options.verbose) {
      for (const persona of personas) {
        const state = persona.getState();
        console.log(color('cyan', `  - ${state.name}: ${state.config.intent || '(no intent)'}`));
      }
    }
    
    console.log(color('dim', '\nUse the REPL to interact with loaded personas.'));
    
    return 0;
  } catch (error) {
    console.error(color('red', `Runtime error: ${error instanceof Error ? error.message : String(error)}`));
    return 1;
  }
}

/**
 * Format command - format a PCL file
 */
function commandFmt(file: string, options: CommandOptions): number {
  if (!existsSync(file)) {
    console.error(color('red', `Error: File not found: ${file}`));
    return 1;
  }
  
  const source = readFileSync(file, 'utf-8');
  const result = parse(source, { source: file });
  
  if (!result.ok) {
    for (const error of result.error) {
      console.error(formatError(error, source, file));
    }
    return 1;
  }
  
  // TODO: Implement pretty printer
  console.log(color('yellow', '⚠ Formatter not yet implemented'));
  return 0;
}

/**
 * REPL command - interactive read-eval-print loop
 */
async function commandRepl(): Promise<number> {
  console.log(BANNER);
  console.log('Type ".help" for available commands, ".exit" to quit.\n');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: color('cyan', 'pcl> '),
  });
  
  const history: string[] = [];
  
  rl.prompt();
  
  rl.on('line', (line: string) => {
    const input = line.trim();
    
    if (input === '.exit' || input === '.quit' || input === '.q') {
      console.log(color('dim', 'Goodbye!'));
      rl.close();
      return;
    }
    
    if (input === '.help' || input === '.h') {
      console.log(`
REPL Commands:
  .help, .h     Show this help
  .exit, .q     Exit the REPL
  .clear, .c    Clear the screen
  .history      Show command history
  .ast          Show AST for last input
  .tokens       Show tokens for last input
  
Enter PCL code to parse and evaluate.
      `);
      rl.prompt();
      return;
    }
    
    if (input === '.clear' || input === '.c') {
      console.clear();
      console.log(BANNER);
      rl.prompt();
      return;
    }
    
    if (input === '.history') {
      history.forEach((h, i) => console.log(`${i + 1}: ${h}`));
      rl.prompt();
      return;
    }
    
    if (input === '') {
      rl.prompt();
      return;
    }
    
    history.push(input);
    
    // Try to parse
    const result = parse(input, { source: '<repl>' });
    
    if (!result.ok) {
      for (const error of result.error) {
        console.error(color('red', `Error: ${error.message}`));
      }
    } else {
      console.log(color('green', `✓ Parsed ${result.value.statements.length} statement(s)`));
      
      // Show brief summary
      for (const stmt of result.value.statements) {
        console.log(color('dim', `  ${stmt.kind}`));
      }
    }
    
    rl.prompt();
  });
  
  return new Promise((resolve) => {
    rl.on('close', () => resolve(0));
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatAST(program: Program, format: 'json' | 'yaml' | 'pretty'): string {
  if (format === 'json') {
    return JSON.stringify(program, replacer, 2);
  }
  
  // Pretty format
  return prettyPrintAST(program);
}

function replacer(key: string, value: unknown): unknown {
  // Remove span information for cleaner output
  if (key === 'span') return undefined;
  return value;
}

function prettyPrintAST(node: unknown, indent: number = 0): string {
  const pad = '  '.repeat(indent);
  
  if (node === null || node === undefined) {
    return `${pad}${color('dim', 'null')}`;
  }
  
  if (typeof node === 'string') {
    return `${pad}${color('green', JSON.stringify(node))}`;
  }
  
  if (typeof node === 'number' || typeof node === 'boolean') {
    return `${pad}${color('yellow', String(node))}`;
  }
  
  if (Array.isArray(node)) {
    if (node.length === 0) return `${pad}[]`;
    const items = node.map(item => prettyPrintAST(item, indent + 1)).join(',\n');
    return `${pad}[\n${items}\n${pad}]`;
  }
  
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const kind = obj['kind'];
    const entries = Object.entries(obj)
      .filter(([k]) => k !== 'span' && k !== 'kind')
      .map(([k, v]) => `${pad}  ${color('cyan', k)}: ${prettyPrintAST(v, indent + 1).trim()}`)
      .join(',\n');
    
    if (kind) {
      return `${pad}${color('magenta', String(kind))} {\n${entries}\n${pad}}`;
    }
    
    return `${pad}{\n${entries}\n${pad}}`;
  }
  
  return `${pad}${String(node)}`;
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  
  // Parse options
  const options: CommandOptions = {};
  const positional: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--no-color') {
      useColors = false;
    } else if (arg === '-o' || arg === '--output') {
      options.output = args[++i];
    } else if (arg === '-f' || arg === '--format') {
      options.format = args[++i] as any;
    } else if (arg === '-t' || arg === '--target') {
      options.target = args[++i] as any;
    } else if (arg === '-q' || arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }
  
  const command = positional[0];
  const file = positional[1];
  
  switch (command) {
    case 'parse':
      if (!file) {
        console.error(color('red', 'Error: No file specified'));
        return 1;
      }
      return commandParse(resolve(file), options);
    
    case 'lex':
    case 'tokenize':
      if (!file) {
        console.error(color('red', 'Error: No file specified'));
        return 1;
      }
      return commandLex(resolve(file), options);
    
    case 'check':
      if (!file) {
        console.error(color('red', 'Error: No file specified'));
        return 1;
      }
      return commandCheck(resolve(file), options);
    
    case 'gen':
    case 'generate':
      if (!file) {
        console.error(color('red', 'Error: No file specified'));
        return 1;
      }
      return commandGen(resolve(file), options);
    
    case 'run':
      if (!file) {
        console.error(color('red', 'Error: No file specified'));
        return 1;
      }
      return commandRun(resolve(file), options);
    
    case 'fmt':
    case 'format':
      if (!file) {
        console.error(color('red', 'Error: No file specified'));
        return 1;
      }
      return commandFmt(resolve(file), options);
    
    case 'repl':
      return commandRepl();
    
    case 'version':
    case '-v':
    case '--version':
      console.log(`PCL ${VERSION}`);
      return 0;
    
    case 'help':
    case '-h':
    case '--help':
      console.log(BANNER);
      console.log(HELP);
      return 0;
    
    default:
      if (!command) {
        console.log(BANNER);
        console.log(HELP);
        return 0;
      }
      console.error(color('red', `Error: Unknown command: ${command}`));
      console.log(HELP);
      return 1;
  }
}

main()
  .then(code => process.exit(code))
  .catch(error => {
    console.error(color('red', `Fatal error: ${error.message}`));
    process.exit(1);
  });
