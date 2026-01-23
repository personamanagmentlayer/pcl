/**
 * Skill Linter - Best Practices Checker
 *
 * Analyzes skills for quality and best practices
 */

import { readFile } from 'fs/promises';
import { parseSkillMd } from '../../../skills/skill-loader';
import { SkillCompiler } from '../../../skills/skill-compiler';
import { formatError } from '../../utils/output';

export interface LintOptions {
  strict?: boolean;
  fix?: boolean;
}

interface LintIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  line?: number;
  suggestion?: string;
}

interface LintResult {
  passed: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
  info: LintIssue[];
  score: number;
}

/**
 * Lint a skill file for best practices
 */
export async function skillLintCommand(
  filePath: string,
  options: LintOptions = {}
): Promise<void> {
  const { strict = false } = options;

  try {
    console.log(`Linting skill: ${filePath}\n`);

    // Read and parse skill
    const content = await readFile(filePath, 'utf-8');
    const skill = parseSkillMd(content);

    // Compile first
    const compiler = new SkillCompiler();
    const compileResult = compiler.compile(skill);

    if (!compileResult.success) {
      console.error(formatError('Skill has compilation errors. Fix these first.'));
      compileResult.errors.forEach((err) => console.error(`  • ${err}`));
      process.exit(1);
    }

    // Run linting checks
    const result = lintSkill(skill, content, compileResult.skill!);

    // Display results
    displayLintResults(result);

    // Exit code
    if (result.errors.length > 0) {
      process.exit(1);
    }

    if (strict && result.warnings.length > 0) {
      console.log('\n❌ Failed in strict mode (warnings treated as errors)');
      process.exit(1);
    }

    if (result.passed) {
      console.log('\n✓ All checks passed!');
      console.log(`  Quality Score: ${result.score}/100`);
    }
  } catch (error) {
    console.error(
      formatError(
        `Lint error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}

/**
 * Lint skill for best practices
 */
function lintSkill(skill: any, content: string, compiled: any): LintResult {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const info: LintIssue[] = [];

  // Check 1: Naming conventions
  if (skill.name.length < 3) {
    warnings.push({
      severity: 'warning',
      category: 'Naming',
      message: 'Skill name is very short (< 3 chars)',
      suggestion: 'Use descriptive names like "python-expert" or "react-testing"',
    });
  }

  if (skill.name.length > 50) {
    warnings.push({
      severity: 'warning',
      category: 'Naming',
      message: 'Skill name is very long (> 50 chars)',
      suggestion: 'Keep names concise and focused',
    });
  }

  // Check 2: Description quality
  if (skill.description && skill.description.length < 20) {
    warnings.push({
      severity: 'warning',
      category: 'Description',
      message: 'Description is too brief (< 20 chars)',
      suggestion: 'Provide a clear, informative description of the skill purpose',
    });
  }

  if (skill.description && skill.description.length > 200) {
    info.push({
      severity: 'info',
      category: 'Description',
      message: 'Description is very long (> 200 chars)',
      suggestion: 'Consider condensing to 1-2 sentences',
    });
  }

  // Check 3: Instructions length
  const instructionsLength = compiled.metadata.instructionsLength;
  if (instructionsLength < 100) {
    warnings.push({
      severity: 'warning',
      category: 'Content',
      message: `Instructions are very short (${instructionsLength} chars)`,
      suggestion: 'Provide detailed instructions for better results',
    });
  }

  if (instructionsLength > 10000) {
    warnings.push({
      severity: 'warning',
      category: 'Content',
      message: `Instructions are very long (${instructionsLength} chars)`,
      suggestion: 'Consider splitting into multiple focused skills',
    });
  }

  // Check 4: Token count
  const tokenCount = compiled.metadata.tokenCount;
  if (tokenCount > 2000) {
    warnings.push({
      severity: 'warning',
      category: 'Performance',
      message: `High token count (${tokenCount} tokens)`,
      suggestion: 'Optimize to stay under 2000 tokens for better performance',
    });
  }

  if (tokenCount > 4000) {
    errors.push({
      severity: 'error',
      category: 'Performance',
      message: `Token count exceeds recommended maximum (${tokenCount} > 4000)`,
      suggestion: 'Split into smaller skills or use aggressive optimization',
    });
  }

  // Check 5: Examples
  const exampleCount = compiled.metadata.exampleCount;
  if (exampleCount === 0) {
    warnings.push({
      severity: 'warning',
      category: 'Examples',
      message: 'No examples provided',
      suggestion: 'Add at least 2-3 examples to demonstrate usage',
    });
  }

  if (exampleCount === 1) {
    info.push({
      severity: 'info',
      category: 'Examples',
      message: 'Only one example provided',
      suggestion: 'Add more examples for better coverage',
    });
  }

  if (exampleCount > 10) {
    warnings.push({
      severity: 'warning',
      category: 'Examples',
      message: `Too many examples (${exampleCount})`,
      suggestion: 'Keep to 5-7 focused examples',
    });
  }

  // Check 6: Example quality
  if (skill.examples) {
    skill.examples.forEach((ex: any, i: number) => {
      if (!ex.description || ex.description.length < 5) {
        warnings.push({
          severity: 'warning',
          category: 'Examples',
          message: `Example ${i + 1} has poor description`,
          suggestion: 'Provide clear descriptions for all examples',
        });
      }

      if (!ex.code || ex.code.trim().length < 10) {
        warnings.push({
          severity: 'warning',
          category: 'Examples',
          message: `Example ${i + 1} has minimal code`,
          suggestion: 'Provide meaningful code examples',
        });
      }

      if (ex.code && ex.code.length > 1000) {
        info.push({
          severity: 'info',
          category: 'Examples',
          message: `Example ${i + 1} is very long`,
          suggestion: 'Keep examples concise and focused',
        });
      }
    });
  }

  // Check 7: Tools specification
  if (!skill.tools || skill.tools.length === 0) {
    warnings.push({
      severity: 'warning',
      category: 'Security',
      message: 'No tools specified',
      suggestion: 'Explicitly list required tools for security',
    });
  }

  if (skill.tools && skill.tools.length > 10) {
    warnings.push({
      severity: 'warning',
      category: 'Security',
      message: `Too many tools specified (${skill.tools.length})`,
      suggestion: 'Limit to essential tools only',
    });
  }

  // Check 8: Content structure
  const hasHeaders = /^#{1,6}\s+.+$/m.test(skill.instructions);
  if (!hasHeaders) {
    warnings.push({
      severity: 'warning',
      category: 'Structure',
      message: 'No headers found in instructions',
      suggestion: 'Use Markdown headers (##) to organize content',
    });
  }

  const hasBullets = /^[-*+]\s+.+$/m.test(skill.instructions);
  const hasNumbered = /^\d+\.\s+.+$/m.test(skill.instructions);
  if (!hasBullets && !hasNumbered) {
    info.push({
      severity: 'info',
      category: 'Structure',
      message: 'No lists found',
      suggestion: 'Use bullet points or numbered lists for clarity',
    });
  }

  const hasCodeBlocks = /```/.test(skill.instructions);
  if (!hasCodeBlocks && exampleCount === 0) {
    warnings.push({
      severity: 'warning',
      category: 'Content',
      message: 'No code blocks or examples',
      suggestion: 'Include code examples to demonstrate concepts',
    });
  }

  // Check 9: TODOs (common issue)
  const todoCount = (content.match(/\[?TODO:?/gi) || []).length;
  if (todoCount > 0) {
    errors.push({
      severity: 'error',
      category: 'Completeness',
      message: `Found ${todoCount} TODO items in skill`,
      suggestion: 'Complete all TODO items before publishing',
    });
  }

  // Check 10: Placeholder content
  const placeholders = [
    /\[TODO/gi,
    /\[PLACEHOLDER/gi,
    /\[FIXME/gi,
    /example\.com/gi,
  ];

  placeholders.forEach((pattern) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 2) {
      warnings.push({
        severity: 'warning',
        category: 'Completeness',
        message: `Found ${matches.length} placeholder items`,
        suggestion: 'Replace placeholders with actual content',
      });
    }
  });

  // Check 11: Version
  if (!skill.version) {
    info.push({
      severity: 'info',
      category: 'Metadata',
      message: 'No version specified',
      suggestion: 'Add version field for better tracking',
    });
  }

  // Check 12: Category
  if (!skill.category) {
    warnings.push({
      severity: 'warning',
      category: 'Metadata',
      message: 'No category specified',
      suggestion: 'Categorize skill for better discoverability',
    });
  }

  // Calculate quality score
  const score = calculateQualityScore(errors, warnings, info, compiled);

  return {
    passed: errors.length === 0 && (warnings.length === 0 || !strict),
    errors,
    warnings,
    info,
    score,
  };
}

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(
  errors: LintIssue[],
  warnings: LintIssue[],
  info: LintIssue[],
  compiled: any
): number {
  let score = 100;

  // Deduct for errors (10 points each)
  score -= errors.length * 10;

  // Deduct for warnings (5 points each)
  score -= warnings.length * 5;

  // Deduct for info (1 point each)
  score -= info.length * 1;

  // Bonus for good metadata
  const metadata = compiled.metadata;
  if (metadata.exampleCount >= 2) score += 5;
  if (metadata.exampleCount >= 5) score += 5;
  if (metadata.toolCount > 0 && metadata.toolCount <= 5) score += 5;
  if (metadata.instructionsLength >= 500 && metadata.instructionsLength <= 5000) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Display lint results
 */
function displayLintResults(result: LintResult): void {
  console.log('Lint Results');
  console.log('═══════════════════════════════════════════════════\n');

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.category}] ${issue.message}`);
      if (issue.suggestion) {
        console.log(`     💡 ${issue.suggestion}`);
      }
    });
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠ Warnings:');
    result.warnings.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.category}] ${issue.message}`);
      if (issue.suggestion) {
        console.log(`     💡 ${issue.suggestion}`);
      }
    });
    console.log('');
  }

  if (result.info.length > 0) {
    console.log('ℹ Info:');
    result.info.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.category}] ${issue.message}`);
      if (issue.suggestion) {
        console.log(`     💡 ${issue.suggestion}`);
      }
    });
    console.log('');
  }

  // Summary
  console.log('Summary');
  console.log('───────────────────────────────────────────────────');
  console.log(`  Errors:   ${result.errors.length}`);
  console.log(`  Warnings: ${result.warnings.length}`);
  console.log(`  Info:     ${result.info.length}`);
  console.log(`  Score:    ${result.score}/100`);

  // Score interpretation
  console.log('\nQuality Rating:');
  if (result.score >= 90) {
    console.log('  ⭐⭐⭐⭐⭐ Excellent');
  } else if (result.score >= 75) {
    console.log('  ⭐⭐⭐⭐ Good');
  } else if (result.score >= 60) {
    console.log('  ⭐⭐⭐ Fair');
  } else if (result.score >= 40) {
    console.log('  ⭐⭐ Needs Improvement');
  } else {
    console.log('  ⭐ Poor');
  }
}
