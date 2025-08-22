// Node.js test runner to actually run the simulation tests
const fs = require('fs');

// Read the app.js file
const appJs = fs.readFileSync('app.js', 'utf8');

// Create a minimal DOM-like environment for the simulation
global.document = {
  getElementById: () => ({ value: '1337' }),
  createElement: () => ({ getContext: () => ({}) }),
  createTextNode: () => {},
  addEventListener: () => {}
};

global.window = global;
global.alert = console.log;
global.console = console;

// Execute the simulation code
eval(appJs.replace(/canvas\./g, '{}.')
           .replace(/ctx\./g, '{}.')
           .replace(/document\.getElementById.*\.textContent.*=.*;/g, '')
           .replace(/document\.addEventListener.*;/g, '')
           .replace(/requestAnimationFrame.*;/g, '')
           .replace(/notify\([^)]*\);/g, ''));

// Now run the actual tests
console.log('Running tests...\n');

try {
  const results = runAllTests();
  
  console.log('=== TEST RESULTS ===');
  console.log(`Slime Trails: ${results.slimeTrails ? 'PASS' : 'FAIL'}`);
  console.log(`Nutrient Balance: ${results.nutrientBalance ? 'PASS' : 'FAIL'}`);
  
  console.log('\nNutrient Dynamics:');
  for(const test of results.nutrientDynamics) {
    console.log(`  ${test.name}: ${test.passed ? 'PASS' : 'FAIL'}`);
    if(test.error) console.log(`    Error: ${test.error}`);
  }
  
  console.log('\nColony Movement:');
  for(const test of results.colonyMovement) {
    console.log(`  ${test.name}: ${test.passed ? 'PASS' : 'FAIL'}`);
    if(test.error) console.log(`    Error: ${test.error}`);
  }
  
  const allPassed = results.slimeTrails && results.nutrientBalance && 
                   results.nutrientDynamics.every(t => t.passed) &&
                   results.colonyMovement.every(t => t.passed);
  
  console.log(`\n=== OVERALL: ${allPassed ? 'ALL TESTS PASS' : 'TESTS FAILING'} ===`);
  
  // Debug nutrient state
  console.log('\n=== DEBUG INFO ===');
  console.log(debugNutrients());
  
} catch(error) {
  console.error('Test execution failed:', error.message);
  console.error(error.stack);
}