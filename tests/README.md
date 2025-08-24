# SlimeWorld Test Framework

This directory contains the test suite for the SlimeWorld simulation, now supporting both browser-based and command-line execution.

## Running Tests

### Command Line (Recommended)

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Verbose output
npm test -- --verbose
```

### Browser-Based (Fallback)

If you prefer browser-based testing or don't have puppeteer installed:

```bash
# Open test-runner.html in your default browser
open tests/test-runner.html
```

## Test Framework Architecture

### CLI Test Runner (`cli-test-runner.js`)
- **Primary Method**: Uses Puppeteer to run tests in a headless browser
- **Real DOM**: Tests run with actual DOM elements and Canvas contexts
- **No Mocks**: All functionality tested with real implementation
- **CI-Friendly**: Exits with proper return codes for automated testing
- **Watch Mode**: Automatically re-runs tests when files change

### Fallback Runner (`fallback-test-runner.js`)
- **Browser-Based**: Opens test-runner.html in your default browser
- **Manual Verification**: Visual test results in browser interface
- **No Dependencies**: Works without puppeteer installation

### Test Structure

All test files follow the same structure:
- `test-*.js` - Individual test suites
- `test-utils.js` - Testing framework and utilities
- Each test suite exports a `run*Tests()` function

## Test Categories

- **Core Tests** (`test-core.js`) - PRNG, utilities, basic world functions
- **Colony Tests** (`test-colonies.js`) - Colony creation, validation, relationships
- **Ecosystem Tests** (`test-ecosystem.js`) - Simulation mechanics, balance
- **Environment Tests** (`test-environment.js`) - World generation, noise functions
- **UI Tests** (`test-ui.js`) - Interface components, formatting functions
- **Signal Tests** (`test-signals.js`) - Chemical signaling system
- **Colony State Tests** (`test-colony-states.js`) - Lifecycle state management
- **Trait System Tests** (`test-trait-system.js`) - Modular trait framework
- **Bug Fix Tests** (`test-bugfixes.js`) - Regression prevention tests

## Adding New Tests

1. Create a new `test-*.js` file or add to existing suite
2. Use the `TestRunner` class for consistent test structure:

```javascript
function runMyTests() {
    const runner = new TestRunner();
    
    runner.test('Description of test', () => {
        // Your test code
        runner.assertEqual(actual, expected, 'Error message');
    });
    
    return runner.run();
}
```

3. The CLI runner automatically discovers and runs all test functions

## Real DOM Testing Benefits

- **Authentic Testing**: Canvas rendering, DOM manipulation tested with real browsers
- **No Mock Maintenance**: Tests use actual implementation, no mock synchronization needed
- **Visual Debugging**: When tests fail, you can inspect actual DOM state
- **Performance Testing**: Real browser performance characteristics

## Dependencies

- **Required**: Node.js 14+
- **Optional**: Puppeteer (for CLI testing)
- **Fallback**: Any modern web browser

The framework is designed to work in any environment, with graceful degradation when dependencies are unavailable.