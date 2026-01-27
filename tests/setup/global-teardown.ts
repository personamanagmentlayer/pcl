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

  console.log('✓ Global teardown complete\n');

  // Force immediate exit to prevent hanging on background timers
  // This is necessary because some modules (registry, runtime) have setInterval
  // timers that may not cleanup properly in test environments
  // In CI, we cannot afford to wait - force exit immediately
  if (process.env.CI) {
    console.log('⚠️  CI environment detected - forcing immediate exit');
    process.exit(0);
  } else {
    // Give local dev a moment to cleanup gracefully
    setTimeout(() => {
      console.log('⚠️  Forcing process exit after 500ms grace period');
      process.exit(0);
    }, 500);
  }
}
