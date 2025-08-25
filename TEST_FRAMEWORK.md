# Jest Test Framework Implementation Plan

## Overview

This document outlines the implementation plan for adding Jest tests to the SlimeWorld simulation codebase. The tests will be located in `src/tests/` and will complement the existing browser-based tests in `tests/`.

## Current State Analysis

- **Package.json**: Already has Jest configured with scripts (`test:jest`, `test:jest:watch`, `test:jest:coverage`)
- **Dependencies**: Jest 30.0.5, jest-environment-jsdom, and Puppeteer 21.0.0 are installed
- **Architecture**: Modular JavaScript files in `src/js/` with clear separation of concerns
- **Existing Tests**: Browser-based tests in `tests/` directory will remain unchanged

## Proposed Jest Test Structure

```
src/tests/
├── jest.config.js              # Jest configuration
├── setup/
│   ├── jest.setup.js          # Global Jest setup
│   └── puppeteer.config.js    # Puppeteer configuration
├── unit/
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
│   ├── simulation.test.js     # Full simulation browser tests
│   ├── rendering.test.js      # Canvas rendering with real browser
│   ├── ui-interaction.test.js # UI component interactions
│   └── performance.test.js    # Performance benchmarking
└── fixtures/
    ├── test-worlds.js         # Sample world states for testing
    ├── test-colonies.js       # Sample colony configurations
    └── test-data.js           # Reusable test data
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

### jest.config.js
- **Environment**: Node.js for unit tests, Puppeteer for browser tests
- **Test Pattern Matching**: Separate unit and browser test execution
- **Coverage Configuration**: 80% threshold for core systems
- **Setup Files**: Global Jest setup and Puppeteer configuration
- **Timeout Settings**: Extended timeouts for browser tests

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

### Phase 1: Infrastructure Setup
- Configure Jest for dual environments (Node.js + Puppeteer)
- Set up Puppeteer browser automation
- Create test fixtures and utilities
- Establish CI/CD integration patterns

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

This approach provides comprehensive test coverage while leveraging real browser capabilities and maintaining development efficiency through strategic test organization.