// Initial test to verify Jest setup

// Load custom matchers and utilities inline for now
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeValidColony(received) {
    const pass = received && 
                 typeof received.id === 'number' &&
                 typeof received.x === 'number' &&
                 typeof received.y === 'number' &&
                 typeof received.type === 'string' &&
                 Array.isArray(received.cells);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid colony`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid colony with id, x, y, type, and cells properties`,
        pass: false,
      };
    }
  }
});

// Set up test utilities
global.testUtils = {
  getTestSeed: () => 42,
  waitForTicks: async (page, ticks) => {
    // This will be used in browser tests
    return Promise.resolve();
  },
  resetWorld: async (page) => {
    // This will be used in browser tests
    return Promise.resolve();
  }
};

describe('Jest Setup Verification', () => {
  test('basic Jest functionality works', () => {
    expect(2 + 2).toBe(4);
  });

  test('custom matchers are available', () => {
    expect(5).toBeWithinRange(1, 10);
    expect(-1).not.toBeWithinRange(1, 10);
  });

  test('test utilities are available', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.getTestSeed).toBe('function');
    expect(global.testUtils.getTestSeed()).toBe(42);
  });

  test('test data fixtures load correctly', () => {
    const { TestData, TestUtils } = require('../fixtures/test-data');
    
    expect(TestData).toBeDefined();
    expect(TestData.TEST_SEED).toBe(42);
    expect(TestData.WORLD_DIMENSIONS).toBeDefined();
    expect(TestData.SAMPLE_COLONIES).toBeDefined();
    
    expect(TestUtils).toBeDefined();
    expect(typeof TestUtils.createTestWorld).toBe('function');
    expect(typeof TestUtils.createTestColony).toBe('function');
  });

  test('can create test world configuration', () => {
    const { TestUtils, TestData } = require('../fixtures/test-data');
    
    const world = TestUtils.createTestWorld();
    expect(world).toEqual({
      W: 160,
      H: 90,
      tick: 0,
      paused: true,
      speed: 1.0,
      mutationRate: 0.1,
      capacity: 1.0,
      colonies: [],
      nextId: 1,
      seed: 42
    });
  });

  test('can create test colony configuration', () => {
    const { TestUtils, TestData } = require('../fixtures/test-data');
    
    const colony = TestUtils.createTestColony(TestData.SAMPLE_COLONIES.mat);
    expect(colony).toBeValidColony();
    expect(colony.type).toBe('MAT');
    expect(colony.traits.water_need).toBe(0.8);
  });
});