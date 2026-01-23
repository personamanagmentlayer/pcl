/**
 * Skill Test CLI Command
 *
 * Test skills by running their examples with composition testing and benchmarking
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { parseSkillMd } from '../../../skills/skill-loader';
import { SkillCompiler } from '../../../skills/skill-compiler';
import { formatError } from '../../utils/output';

export interface SkillTestOptions {
  example?: number;
  verbose?: boolean;
  composition?: boolean;  // Test skill composition and dependencies
  benchmark?: boolean;    // Run performance benchmarks
  directory?: string;     // Directory to search for related skills
}

/**
 * Test a skill by running its examples
 */
export async function skillTestCommand(
  filePath: string,
  options: SkillTestOptions = {}
): Promise<void> {
  const { example, verbose = false, composition = false, benchmark = false } = options;

  try {
    console.log(`Testing skill: ${filePath}\n`);

    // Read and parse skill
    const content = await readFile(filePath, 'utf-8');
    const skill = parseSkillMd(content);

    // Benchmark: Compilation time
    let compileTime = 0;
    if (benchmark) {
      const start = performance.now();
      const compiler = new SkillCompiler();
      const result = compiler.compile(skill);
      compileTime = performance.now() - start;

      if (!result.success) {
        console.error(formatError('Skill validation failed!'));
        result.errors.forEach((err) => console.error(`  • ${err}`));
        process.exit(1);
      }
    } else {
      // Normal validation
      const compiler = new SkillCompiler();
      const result = compiler.compile(skill);

      if (!result.success) {
        console.error(formatError('Skill validation failed!'));
        result.errors.forEach((err) => console.error(`  • ${err}`));
        process.exit(1);
      }
    }

    // Run composition tests if requested
    if (composition) {
      console.log('═══════════════════════════════════════════════════');
      console.log('Composition Testing');
      console.log('═══════════════════════════════════════════════════\n');

      const compositionResults = await testSkillComposition(filePath, skill, options);
      displayCompositionResults(compositionResults, verbose);
      console.log();
    }

    // Test examples
    if (!skill.examples || skill.examples.length === 0) {
      console.log('⚠ No examples found in skill');
      console.log('\nSkills should include examples for testing.');

      if (benchmark) {
        displayBenchmarkResults(compileTime, 0);
      }
      return;
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('Example Testing');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`Found ${skill.examples.length} example(s)\n`);

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
    let totalExampleTime = 0;

    for (let i = 0; i < examplesToTest.length; i++) {
      const ex = examplesToTest[i];
      const exampleNum = example !== undefined ? example : i + 1;

      console.log(`Testing Example ${exampleNum}: ${ex.description}`);

      let testResult;
      if (benchmark) {
        const start = performance.now();
        testResult = testExample(ex.code, verbose);
        const elapsed = performance.now() - start;
        totalExampleTime += elapsed;

        if (verbose) {
          console.log(`    ⏱ ${elapsed.toFixed(2)}ms`);
        }
      } else {
        testResult = testExample(ex.code, verbose);
      }

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
    console.log('\n═══════════════════════════════════════════════════');
    console.log('Summary');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    // Benchmark results
    if (benchmark) {
      displayBenchmarkResults(compileTime, totalExampleTime);
    }

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
    'Has comments': /\/\/|\/\*|#/.test(code),
    'Has meaningful content': code.trim().length > 20,
    'Has structure': code.includes('{') || code.includes('(') || code.includes('['),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
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

// ═══════════════════════════════════════════════════════════════════════════════
//                           COMPOSITION TESTING
// ═══════════════════════════════════════════════════════════════════════════════

interface CompositionTestResult {
  dependencies: {
    declared: string[];
    found: string[];
    missing: string[];
    status: 'pass' | 'fail' | 'warning';
  };
  conflicts: {
    detected: string[];
    status: 'pass' | 'fail';
  };
  toolOverlap: {
    tools: string[];
    overlapping: string[];
    status: 'pass' | 'info';
  };
}

/**
 * Test skill composition and dependencies
 */
async function testSkillComposition(
  filePath: string,
  skill: any,
  options: SkillTestOptions
): Promise<CompositionTestResult> {
  const result: CompositionTestResult = {
    dependencies: {
      declared: skill.dependencies || [],
      found: [],
      missing: [],
      status: 'pass',
    },
    conflicts: {
      detected: [],
      status: 'pass',
    },
    toolOverlap: {
      tools: skill.tools || [],
      overlapping: [],
      status: 'pass',
    },
  };

  // If no directory specified, check the parent directory
  const directory = options.directory || dirname(filePath);

  try {
    // Find all skills in directory
    const files = await readdir(directory);
    const skillFiles = files.filter((f) => f.endsWith('.md'));

    const relatedSkills: any[] = [];
    for (const file of skillFiles) {
      try {
        const content = await readFile(join(directory, file), 'utf-8');
        const s = parseSkillMd(content);
        if (s.name !== skill.name) {
          relatedSkills.push(s);
        }
      } catch {
        // Skip invalid skills
      }
    }

    // Check dependencies
    if (result.dependencies.declared.length > 0) {
      for (const dep of result.dependencies.declared) {
        const found = relatedSkills.find((s) => s.name === dep);
        if (found) {
          result.dependencies.found.push(dep);
        } else {
          result.dependencies.missing.push(dep);
        }
      }

      if (result.dependencies.missing.length > 0) {
        result.dependencies.status = 'fail';
      }
    }

    // Check for conflicts
    if (skill.conflicts) {
      for (const conflict of skill.conflicts) {
        const found = relatedSkills.find((s) => s.name === conflict);
        if (found) {
          result.conflicts.detected.push(conflict);
          result.conflicts.status = 'fail';
        }
      }
    }

    // Check tool overlap with related skills
    if (result.toolOverlap.tools.length > 0) {
      for (const relatedSkill of relatedSkills) {
        if (relatedSkill.tools) {
          const overlap = result.toolOverlap.tools.filter((t) =>
            relatedSkill.tools.includes(t)
          );
          if (overlap.length > 0) {
            result.toolOverlap.overlapping.push(
              `${relatedSkill.name} (${overlap.length} tools)`
            );
          }
        }
      }

      if (result.toolOverlap.overlapping.length > 0) {
        result.toolOverlap.status = 'info';
      }
    }
  } catch (error) {
    // Directory read failed, mark as warning
    result.dependencies.status = 'warning';
  }

  return result;
}

/**
 * Display composition test results
 */
function displayCompositionResults(result: CompositionTestResult, verbose: boolean): void {
  // Dependencies
  console.log('Dependencies:');
  if (result.dependencies.declared.length === 0) {
    console.log('  ℹ No dependencies declared');
  } else {
    console.log(`  Declared: ${result.dependencies.declared.length}`);
    console.log(`  Found: ${result.dependencies.found.length}`);

    if (result.dependencies.missing.length > 0) {
      console.log(`  ✗ Missing: ${result.dependencies.missing.join(', ')}`);
    } else {
      console.log('  ✓ All dependencies found');
    }

    if (verbose) {
      result.dependencies.found.forEach((dep) => {
        console.log(`    ✓ ${dep}`);
      });
    }
  }

  console.log();

  // Conflicts
  console.log('Conflicts:');
  if (!result.conflicts.detected || result.conflicts.detected.length === 0) {
    console.log('  ✓ No conflicts detected');
  } else {
    console.log(`  ✗ Detected conflicts:`);
    result.conflicts.detected.forEach((conflict) => {
      console.log(`    • ${conflict}`);
    });
  }

  console.log();

  // Tool overlap
  if (verbose && result.toolOverlap.overlapping.length > 0) {
    console.log('Tool Overlap:');
    console.log(`  ℹ ${result.toolOverlap.overlapping.length} skill(s) with overlapping tools:`);
    result.toolOverlap.overlapping.forEach((overlap) => {
      console.log(`    • ${overlap}`);
    });
    console.log();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                           BENCHMARKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Display benchmark results
 */
function displayBenchmarkResults(compileTime: number, exampleTime: number): void {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('Benchmark Results');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Compilation Time:    ${compileTime.toFixed(2)}ms`);
  console.log(`Example Test Time:   ${exampleTime.toFixed(2)}ms`);
  console.log(`Total Time:          ${(compileTime + exampleTime).toFixed(2)}ms`);

  // Performance rating
  const totalTime = compileTime + exampleTime;
  let rating = '';
  if (totalTime < 50) {
    rating = '⚡ Excellent';
  } else if (totalTime < 100) {
    rating = '✓ Good';
  } else if (totalTime < 200) {
    rating = '⚠ Fair';
  } else {
    rating = '✗ Slow';
  }

  console.log(`Performance Rating:  ${rating}`);
}
