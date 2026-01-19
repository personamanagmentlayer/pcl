/**
 * PCL Language Server - Error Converter
 *
 * Converts PCL errors to LSP diagnostics
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { PCLError } from '../types';

/**
 * Convert PCL error to LSP diagnostic
 */
export function convertErrorToDiagnostic(error: PCLError): Diagnostic {
  // Determine severity
  const severity = error.severity === 'warning'
    ? DiagnosticSeverity.Warning
    : DiagnosticSeverity.Error;

  // Create diagnostic
  const diagnostic: Diagnostic = {
    severity,
    range: {
      start: {
        line: error.span.start.line - 1, // LSP is 0-indexed, PCL is 1-indexed
        character: error.span.start.column - 1,
      },
      end: {
        line: error.span.end.line - 1,
        character: error.span.end.column - 1,
      },
    },
    message: error.message,
    source: 'pcl',
  };

  // Add error code if available
  if (error.code) {
    diagnostic.code = error.code;
  }

  return diagnostic;
}

/**
 * Convert array of PCL errors to LSP diagnostics
 */
export function convertErrorsToDiagnostics(errors: PCLError[]): Diagnostic[] {
  return errors.map(convertErrorToDiagnostic);
}

/**
 * Create a diagnostic for a parse error (when no span is available)
 */
export function createGenericDiagnostic(
  message: string,
  severity: DiagnosticSeverity = DiagnosticSeverity.Error
): Diagnostic {
  return {
    severity,
    range: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    },
    message,
    source: 'pcl',
  };
}
