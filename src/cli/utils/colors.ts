/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Color Utilities
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

let useColors = process.stdout.isTTY !== false;

/**
 * Enable or disable color output
 */
export function setColorEnabled(enabled: boolean): void {
  useColors = enabled;
}

/**
 * Check if colors are enabled
 */
export function isColorEnabled(): boolean {
  return useColors;
}

/**
 * Apply a color to text
 */
export function color(c: keyof typeof colors, text: string): string {
  return useColors ? `${colors[c]}${text}${colors.reset}` : text;
}

/**
 * Predefined color functions for common use cases
 */
export const chalk = {
  reset: (text: string) => color('reset', text),
  bold: (text: string) => color('bold', text),
  dim: (text: string) => color('dim', text),
  italic: (text: string) => color('italic', text),
  underline: (text: string) => color('underline', text),

  black: (text: string) => color('black', text),
  red: (text: string) => color('red', text),
  green: (text: string) => color('green', text),
  yellow: (text: string) => color('yellow', text),
  blue: (text: string) => color('blue', text),
  magenta: (text: string) => color('magenta', text),
  cyan: (text: string) => color('cyan', text),
  white: (text: string) => color('white', text),
  gray: (text: string) => color('gray', text),

  // Semantic colors
  error: (text: string) => color('red', text),
  success: (text: string) => color('green', text),
  warning: (text: string) => color('yellow', text),
  info: (text: string) => color('cyan', text),
  debug: (text: string) => color('dim', text),
};
