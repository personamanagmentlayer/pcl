#!/usr/bin/env node

/**
 * Debug script to check what's keeping Node.js alive
 */

import { execSync } from 'child_process';

console.log('Running tests and checking for hanging handles...\n');

const startTime = Date.now();

// Run tests
try {
  execSync('npm test', {
    stdio: 'inherit',
    timeout: 60000, // 60 second timeout
  });
} catch (error) {
  console.error('\n❌ Tests failed or timed out');
  console.error(`Exit code: ${error.status}`);
}

const elapsed = Date.now() - startTime;
console.log(`\n⏱️  Total time: ${(elapsed / 1000).toFixed(2)}s`);

// Check active handles
console.log('\n🔍 Checking active handles...');
try {
  const handles = process._getActiveHandles();
  const requests = process._getActiveRequests();

  console.log(`Active handles: ${handles.length}`);
  console.log(`Active requests: ${requests.length}`);

  if (handles.length > 0) {
    console.log('\n📋 Active handles:');
    handles.forEach((handle, i) => {
      console.log(`  ${i + 1}. ${handle.constructor.name}`);
    });
  }

  if (requests.length > 0) {
    console.log('\n📋 Active requests:');
    requests.forEach((req, i) => {
      console.log(`  ${i + 1}. ${req.constructor.name}`);
    });
  }
} catch (err) {
  console.error('Cannot check handles:', err.message);
}

console.log('\n✅ Check complete');
process.exit(0);
