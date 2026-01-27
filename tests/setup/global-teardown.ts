/**
 * Global teardown to forcefully cleanup any lingering resources
 * after all tests complete to prevent CI hangs.
 */

export default async function globalTeardown() {
  console.log('\n🧹 Running global teardown...');

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Give Node.js a moment to cleanup
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log('✓ Global teardown complete\n');

  // Force exit to prevent hanging on background timers
  // This is necessary because some modules (registry, runtime) have setInterval
  // timers that may not cleanup properly in test environments
  setTimeout(() => {
    console.log('⚠️  Forcing process exit after 1s grace period');
    process.exit(0);
  }, 1000);
}
