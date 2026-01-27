/**
 * Global teardown to forcefully cleanup any lingering resources
 * after all tests complete to prevent CI hangs.
 */

export default async function globalTeardown() {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Give Node.js a moment to cleanup
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Log completion
  console.log('✓ Global teardown complete');
}
