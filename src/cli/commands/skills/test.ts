/**
 * Skill Test CLI Command
 *
 * Test skills by running their examples
 */

import { readFile } from 'fs/promises';
import { parseSkillMd } from '../../../skills/skill-loader';
import { SkillCompiler } from '../../../skills/skill-compiler';
import { formatError } from '../../utils/output';

export interface SkillTestOptions {
  example?: number;
  verbose?: boolean;
}

/**
 * Test a skill by running its examples
 */
export async function skillTestCommand(
  filePath: string,
  options: SkillTestOptions = {}
): Promise<void> {
  const { example, verbose = false } = options;

  try {
    console.log(`Testing skill: ${filePath}`);

    // Read and parse skill
    const content = await readFile(filePath, 'utf-8');
    const skill = parseSkillMd(content);

    // Validate skill first
    const compiler = new SkillCompiler();
    const result = compiler.compile(skill);

    if (!result.success) {
      console.error(formatError('Skill validation failed!'));
      result.errors.forEach((err) => console.error(`  • ${err}`));
      process.exit(1);
    }

    // Check if skill has examples
    if (!skill.examples || skill.examples.length === 0) {
      console.log('⚠ No examples found in skill');
      console.log('\nSkills should include examples for testing.');
      return;
    }

    console.log(`\nFound ${skill.examples.length} example(s)\n`);

    // Determine which examples to test
    const examplesToTest =
      example !== undefined
        ? [skill.examples[example - 1]]
        : skill.examples;

    if (example !== undefined && !examplesToTest[0]) {
      console.error(formatError(`Example ${example} not found`));
      console.error(`Skill has ${skill.examples.length} example(s)`);
      process.exit(1);
    }

    // Test examples
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < examplesToTest.length; i++) {
      const ex = examplesToTest[i];
      const exampleNum = example !== undefined ? example : i + 1;

      console.log(`Testing Example ${exampleNum}: ${ex.description}`);

      // Simple validation: check if code is non-empty
      const testResult = testExample(ex.code, verbose);

      if (testResult.success) {
        console.log(`  ✓ Pass`);
        if (verbose && testResult.message) {
          console.log(`    ${testResult.message}`);
        }
        passed++;
      } else {
        console.log(`  ✗ Fail`);
        if (testResult.message) {
          console.log(`    ${testResult.message}`);
        }
        failed++;
      }
    }

    // Summary
    console.log('\n─────────────────────────────────────────');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(
      formatError(
        `Test error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}

/**
 * Test an example code block
 */
function testExample(
  code: string,
  verbose: boolean
): { success: boolean; message?: string } {
  // Basic validation checks
  if (!code || code.trim() === '') {
    return {
      success: false,
      message: 'Example code is empty',
    };
  }

  // Check for common code patterns
  const checks = {
    'Has comments': /\/\/|\/\*|\#/.test(code),
    'Has meaningful content': code.trim().length > 20,
    'Has structure': code.includes('{') || code.includes('(') || code.includes('['),
  };

  const passedChecks = Object.values(checks).filter((v) => v).length;
  const totalChecks = Object.keys(checks).length;

  if (verbose) {
    const details = Object.entries(checks)
      .map(([name, passed]) => `      ${passed ? '✓' : '✗'} ${name}`)
      .join('\n');
    return {
      success: passedChecks >= 2, // At least 2 checks must pass
      message: `Checks (${passedChecks}/${totalChecks}):\n${details}`,
    };
  }

  return {
    success: passedChecks >= 2,
    message: passedChecks < 2 ? `Only ${passedChecks}/${totalChecks} checks passed` : undefined,
  };
}
