# Jest Test Framework Implementation Plan

## Overview

This document outlines the implementation plan for adding Jest tests to the SlimeWorld simulation codebase. The tests will be located in `src/tests/` and will complement the existing browser-based tests in `tests/`.

## Current State Analysis

- **Package.json**: Already has Jest configured with scripts (`test:jest`, `test:jest:watch`, `test:jest:coverage`)
- **Dependencies**: Jest 30.0.5, jest-environment-jsdom, and Puppeteer 21.0.0 are installed
- **Architecture**: Modular JavaScript files in `src/js/` with clear separation of concerns
- **Existing Tests**: Browser-based tests in `tests/` directory will remain unchanged

## Current Jest Test Structure

```
/
├── jest.config.js              # Main Jest configuration (multi-project)
├── jest-puppeteer.config.js    # Puppeteer-specific configuration
└── src/tests/
    ├── setup/
    │   ├── jest.setup.js          # Global Jest setup and utilities
    │   └── puppeteer.config.js    # Puppeteer launch configuration
    ├── unit/
    │   ├── setup.test.js          # ✅ Jest setup verification tests
    │   ├── utils.test.js          # PRNG, helpers, noise generation
    │   ├── world.test.js          # World system and slime mechanics
    │   ├── colonies.test.js       # Colony management and expansion
    │   ├── archetypes.test.js     # Legacy archetype definitions
    │   ├── trait-system.test.js   # Modular trait framework
    │   ├── extended-archetypes.test.js # Specialized archetype classes
    │   ├── environment.test.js    # Procedural world generation
    │   ├── ecosystem.test.js      # Balance, starvation, growth
    │   ├── integration.test.js    # Legacy/modular compatibility
    │   └── diagnostics.test.js    # Testing and debugging functions
    ├── browser/
    │   ├── setup.test.js          # ✅ Puppeteer setup verification tests
    │   ├── simulation.test.js     # Full simulation browser tests
    │   ├── rendering.test.js      # Canvas rendering with real browser
    │   ├── ui-interaction.test.js # UI component interactions
    │   └── performance.test.js    # Performance benchmarking
    └── fixtures/
        └── test-data.js           # ✅ Reusable test data and utilities
```

## Test Coverage Priorities

### High Priority (Core Logic)
1. **utils.test.js**: PRNG determinism, seeding, noise functions, math utilities
2. **world.test.js**: Grid operations, environmental layers, colony management  
3. **trait-system.test.js**: Trait validation, fitness calculations, mutations
4. **colonies.test.js**: Colony creation, expansion, suitability calculations
5. **ecosystem.test.js**: Population dynamics, carrying capacity, extinction

### Medium Priority (System Integration)
6. **environment.test.js**: Fractal noise generation, environmental parameters
7. **integration.test.js**: Legacy/modular system compatibility
8. **archetypes.test.js**: Legacy archetype behavior validation
9. **extended-archetypes.test.js**: Specialized archetype functionality

### Browser Tests (Headless Puppeteer)
10. **simulation.test.js**: Full simulation lifecycle in real browser
11. **rendering.test.js**: Canvas operations with real 2D context
12. **ui-interaction.test.js**: User interface interactions and state updates
13. **performance.test.js**: Simulation performance and memory usage

### Lower Priority (Utilities)
14. **diagnostics.test.js**: Test utilities and debugging functions

## Jest Configuration Strategy

### jest.config.js (Root Configuration)
- **Multi-Project Setup**: Separate environments for unit and browser tests
- **Unit Tests**: Node.js environment for pure JavaScript testing
- **Browser Tests**: jest-puppeteer preset for real browser testing
- **Coverage Configuration**: 70% threshold for core systems (disabled initially)
- **Timeout Settings**: 30 second timeout for browser operations

### Puppeteer Integration
- **Headless Browser**: Chrome/Chromium for real browser environment
- **Page Setup**: Load index.html with full application context
- **Module Access**: Inject test code and access internal objects
- **Performance Monitoring**: Real memory usage and execution timing
- **Screenshot Capability**: Visual regression testing support

## Test Organization Principles

1. **Pure Function Focus**: Unit test algorithmic functions without side effects
2. **Real Browser Environment**: Browser tests run in actual Chrome instance
3. **Deterministic Behavior**: Use seeded PRNG for reproducible tests
4. **Edge Cases**: Test boundary conditions, empty states, extreme values
5. **Integration Validation**: Test compatibility between legacy and modular systems
6. **Performance Benchmarking**: Real-world performance measurement

## Implementation Strategy

### ✅ Phase 1: Infrastructure Setup (COMPLETE)
- ✅ Configure Jest for dual environments (Node.js + Puppeteer)  
- ✅ Set up Puppeteer browser automation with real Chrome
- ✅ Create test fixtures and utilities (`test-data.js`)
- ✅ Establish working test pipeline with 11 passing tests
- ✅ Consolidate to single root Jest configuration

**Status**: All 11 tests passing (6 unit + 5 browser tests)

### Phase 2: Core Unit Tests
- **utils.test.js**: PRNG, mathematical functions, utilities
- **world.test.js**: World state management and operations
- **trait-system.test.js**: Trait framework validation

### Phase 3: System Integration Tests
- **colonies.test.js**: Colony management and expansion logic
- **ecosystem.test.js**: Population dynamics and balance
- **integration.test.js**: Legacy/modular system compatibility

### Phase 4: Browser Integration Tests
- **simulation.test.js**: Full simulation in headless browser
- **rendering.test.js**: Canvas rendering with real 2D context
- **ui-interaction.test.js**: User interface testing

### Phase 5: Performance and Regression Tests
- **performance.test.js**: Benchmarking and memory profiling
- Visual regression testing with screenshots
- Long-running stability tests

## Headless Browser Testing Strategy

### Test Environment Setup
```javascript
// Browser test setup
beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.goto(`file://${path.resolve('index.html')}`);
});
```

### Module Testing Approach
```javascript
// Access internal modules in browser
const worldState = await page.evaluate(() => {
  return {
    colonies: World.colonies.length,
    tick: World.tick,
    biomass: World.biomass.reduce((a, b) => a + b, 0)
  };
});
```

### Canvas Testing
```javascript
// Test canvas rendering without mocking
const canvasData = await page.evaluate(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, 10, 10).data;
});
```

## Benefits of Headless Browser Approach

1. **Real Environment**: Tests run in actual browser with real APIs
2. **No Mocking Complexity**: Eliminates need for extensive Canvas/DOM mocks
3. **Visual Testing**: Capability for screenshot-based regression tests
4. **Performance Reality**: True performance characteristics measurement
5. **Integration Confidence**: Tests full application stack including HTML/CSS
6. **Debugging Capability**: Can enable headed mode for visual debugging

## Test Execution Strategy

- **Unit Tests**: Fast execution in Node.js environment
- **Browser Tests**: Slower but comprehensive in Puppeteer
- **Parallel Execution**: Run unit and browser tests concurrently where possible
- **CI/CD Integration**: Separate test suites for different pipeline stages
- **Development Workflow**: Watch mode for rapid unit test feedback

# important-instruction-reminders
Do what has been asked; nothing more, nothing less
**NEVER** use mocks or simulated behavior in tests
**NEVER** rewrite tests using mocks to get them to pass
**ALWAYS** test actual behavior
**ALWAYS** run the tests after writing them
**NEVER** assume that a test failure is irrelevant or unrelated to your changes
