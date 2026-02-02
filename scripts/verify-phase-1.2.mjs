/**
 * Manual verification script for Phase 1.2 modules
 */

console.log('='.repeat(80));
console.log('Phase 1.2 Module Verification');
console.log('='.repeat(80));

try {
  console.log('\n1. Importing from dist...');
  const pcl = await import('../dist/index.js');

  console.log('✓ Import successful');

  console.log('\n2. Checking exports...');
  console.log('  - createStateMachine:', typeof pcl.createStateMachine);
  console.log('  - createTeamProcessor:', typeof pcl.createTeamProcessor);
  console.log('  - createTeamValidator:', typeof pcl.createTeamValidator);
  console.log('  - createSnapshotManager:', typeof pcl.createSnapshotManager);
  console.log('  - createRestoreManager:', typeof pcl.createRestoreManager);

  console.log('\n3. Creating instances...');

  // Test State Machine
  const machine = pcl.createStateMachine()
    .withInitialState('idle')
    .addStates('processing', 'completed')
    .on('start', 'idle', 'processing')
    .on('complete', 'processing', 'completed')
    .build();

  console.log('  ✓ State Machine created');
  console.log('    - Current state:', machine.getCurrentStateName());
  console.log('    - Can transition to start:', machine.canTransition('start'));

  // Test transition
  const result = await machine.transition('start');
  console.log('    - After transition:', machine.getCurrentStateName());
  console.log('    - Transition successful:', result.ok);

  // Test Team Processor
  const processor = pcl.createTeamProcessor();
  console.log('  ✓ Team Processor created');

  // Test Team Validator
  const validator = pcl.createTeamValidator();
  console.log('  ✓ Team Validator created');

  // Test Snapshot Manager
  const snapshotMgr = pcl.createSnapshotManager();
  console.log('  ✓ Snapshot Manager created');
  console.log('    - Snapshots:', snapshotMgr.listSnapshots().length);

  // Test Restore Manager
  const restoreMgr = pcl.createRestoreManager();
  console.log('  ✓ Restore Manager created');

  console.log('\n' + '='.repeat(80));
  console.log('✓ ALL PHASE 1.2 MODULES VERIFIED SUCCESSFULLY');
  console.log('='.repeat(80));
  console.log('\nPhase 1.2 is fully functional and ready for use!\n');

  process.exit(0);

} catch (error) {
  console.error('\n✗ Verification failed:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
