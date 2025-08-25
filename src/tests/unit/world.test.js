// Unit tests for world.js - World state management and operations

// Load test fixtures  
const { TestData, TestUtils } = require('../fixtures/test-data');

// Load required modules in correct order
const fs = require('fs');
const path = require('path');

// Load utils.js first (dependency)
const utilsPath = path.resolve(__dirname, '../../js/utils.js');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');
eval(utilsContent);

// Load world.js 
const worldPath = path.resolve(__dirname, '../../js/world.js');
const worldContent = fs.readFileSync(worldPath, 'utf8');
eval(worldContent);

// Mock buildEnvironment function to avoid environment.js dependency
global.buildEnvironment = function() {
    // Fill environment arrays with test data
    const size = World.W * World.H;
    for (let i = 0; i < size; i++) {
        World.env.humidity[i] = 0.5;
        World.env.light[i] = 0.5;
        World.env.nutrient[i] = 0.3;
        World.env.water[i] = Math.random() > 0.5 ? 1 : 0;
    }
};

describe('World - Core Objects', () => {
  test('World object has required properties', () => {
    expect(World).toBeDefined();
    expect(typeof World.W).toBe('number');
    expect(typeof World.H).toBe('number');
    expect(Array.isArray(World.colonies)).toBe(true);
    expect(typeof World.nextId).toBe('number');
    expect(typeof World.tick).toBe('number');
    expect(typeof World.paused).toBe('boolean');
    expect(typeof World.speed).toBe('number');
    expect(typeof World.mutationRate).toBe('number');
    expect(typeof World.capacity).toBe('number');
  });

  test('World environment arrays are properly defined', () => {
    expect(World.env).toBeDefined();
    expect(Array.isArray(World.env.humidity)).toBe(true);
    expect(Array.isArray(World.env.light)).toBe(true);
    expect(Array.isArray(World.env.nutrient)).toBe(true);
    expect(Array.isArray(World.env.water)).toBe(true);
  });

  test('Slime object has required properties and methods', () => {
    expect(Slime).toBeDefined();
    expect(typeof Slime.params).toBe('object');
    expect(typeof Slime.clear).toBe('function');
    expect(typeof Slime.sat).toBe('function');
    expect(typeof Slime.diffuseEvaporate).toBe('function');
  });

  test('Signals object has required properties and methods', () => {
    expect(Signals).toBeDefined();
    expect(typeof Signals.params).toBe('object');
    expect(typeof Signals.clear).toBe('function');
    expect(typeof Signals.satStress).toBe('function');
    expect(typeof Signals.satAggregation).toBe('function');
    expect(typeof Signals.diffuseEvaporate).toBe('function');
  });
});

describe('World - Coordinate Functions', () => {
  beforeEach(() => {
    // Set up a known world size for testing
    World.W = 160;
    World.H = 90;
  });

  test('idx converts coordinates to array index', () => {
    expect(idx(0, 0)).toBe(0);
    expect(idx(1, 0)).toBe(1);
    expect(idx(0, 1)).toBe(160);
    expect(idx(5, 3)).toBe(3 * 160 + 5);
  });

  test('clampX restricts x coordinates to world bounds', () => {
    expect(clampX(-5)).toBe(0);
    expect(clampX(0)).toBe(0);
    expect(clampX(80)).toBe(80);
    expect(clampX(159)).toBe(159);
    expect(clampX(200)).toBe(159);
  });

  test('clampY restricts y coordinates to world bounds', () => {
    expect(clampY(-5)).toBe(0);
    expect(clampY(0)).toBe(0);
    expect(clampY(45)).toBe(45);
    expect(clampY(89)).toBe(89);
    expect(clampY(150)).toBe(89);
  });

  test('clampCoords restricts both coordinates', () => {
    expect(clampCoords(-5, -5)).toEqual([0, 0]);
    expect(clampCoords(50, 45)).toEqual([50, 45]);
    expect(clampCoords(200, 150)).toEqual([159, 89]);
    expect(clampCoords(-1, 100)).toEqual([0, 89]);
  });

  test('idxClamped combines clamping with index calculation', () => {
    expect(idxClamped(-5, -5)).toBe(0); // (0, 0)
    expect(idxClamped(0, 0)).toBe(0);
    expect(idxClamped(1, 1)).toBe(161);
    expect(idxClamped(200, 150)).toBe(89 * 160 + 159); // (159, 89)
  });

  test('inBounds checks coordinate validity', () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(159, 89)).toBe(true);
    expect(inBounds(160, 89)).toBe(false);
    expect(inBounds(159, 90)).toBe(false);
    expect(inBounds(80, 45)).toBe(true);
  });
});

describe('World - Setup and Initialization', () => {
  test('setupWorld initializes world with correct dimensions', () => {
    const testSeed = TestData.TEST_SEED;
    setupWorld(testSeed, '128x72');
    
    expect(World.W).toBe(128);
    expect(World.H).toBe(72);
    expect(World.tiles.length).toBe(128 * 72);
    expect(World.biomass.length).toBe(128 * 72);
    expect(World.env.humidity.length).toBe(128 * 72);
    expect(World.env.light.length).toBe(128 * 72);
    expect(World.env.nutrient.length).toBe(128 * 72);
    expect(World.env.water.length).toBe(128 * 72);
  });

  test('setupWorld resets state properly', () => {
    // Set up some state first
    World.colonies = [{id: 1}, {id: 2}];
    World.nextId = 5;
    World.tick = 100;
    
    setupWorld(TestData.TEST_SEED, '160x90');
    
    expect(World.colonies.length).toBe(0);
    expect(World.nextId).toBe(1);
    expect(World.tick).toBe(0);
  });

  test('setupWorld initializes typed arrays with correct types', () => {
    setupWorld(TestData.TEST_SEED, '160x90');
    
    expect(World.tiles).toBeInstanceOf(Int32Array);
    expect(World.biomass).toBeInstanceOf(Float32Array);
    expect(World.env.humidity).toBeInstanceOf(Float32Array);
    expect(World.env.light).toBeInstanceOf(Float32Array);
    expect(World.env.nutrient).toBeInstanceOf(Float32Array);
    expect(World.env.water).toBeInstanceOf(Uint8Array);
  });

  test('setupWorld initializes RNG with deterministic seed', () => {
    setupWorld(TestData.TEST_SEED, '160x90');
    
    expect(typeof World.rng).toBe('function');
    expect(typeof World.field).toBe('object');
    
    // RNG should produce deterministic sequence
    const val1 = World.rng();
    
    // Reset with same seed
    setupWorld(TestData.TEST_SEED, '160x90');
    const val2 = World.rng();
    
    expect(val1).toBe(val2);
  });

  test('setupWorld sets up RNG state management', () => {
    setupWorld(TestData.TEST_SEED, '160x90');
    
    expect(typeof World.getRNGState).toBe('function');
    expect(typeof World.setRNGState).toBe('function');
    
    // Test state management
    World.rng(); // Change state
    const state = World.getRNGState();
    expect(state).toBeTruthy();
    
    World.rng(); // Change state more
    World.setRNGState(state); // Restore
    
    const restoredVal = World.rng();
    
    // Reset and get to same point
    setupWorld(TestData.TEST_SEED, '160x90');
    World.rng();
    const expectedVal = World.rng();
    
    expect(restoredVal).toBe(expectedVal);
  });

  test('setupWorld handles different world sizes', () => {
    const sizes = ['128x72', '160x90', '192x108', '256x144'];
    
    sizes.forEach(sizeStr => {
      setupWorld(TestData.TEST_SEED, sizeStr);
      const [W, H] = sizeStr.split('x').map(n => parseInt(n, 10));
      
      expect(World.W).toBe(W);
      expect(World.H).toBe(H);
      expect(World.tiles.length).toBe(W * H);
      expect(World.biomass.length).toBe(W * H);
    });
  });
});

describe('World - Slime Trail System', () => {
  beforeEach(() => {
    setupWorld(TestData.TEST_SEED, '160x90');
    // Initialize slime trails
    Slime.trail = new Float32Array(World.W * World.H);
    Slime.trailNext = new Float32Array(World.W * World.H);
  });

  test('Slime clear function works', () => {
    // Fill with some values
    Slime.trail.fill(0.5);
    
    Slime.clear();
    
    expect(Slime.trail.every(val => val === 0)).toBe(true);
  });

  test('Slime saturation function produces expected values', () => {
    expect(Slime.sat(0)).toBe(0);
    expect(Slime.sat(100)).toBeWithinRange(0.9, 1.0);
    
    // Test saturation curve properties
    const val1 = Slime.sat(10);
    const val2 = Slime.sat(20);
    expect(val2).toBeGreaterThan(val1);
    expect(val1).toBeWithinRange(0, 1);
    expect(val2).toBeWithinRange(0, 1);
  });

  test('Slime diffusion preserves total mass approximately', () => {
    // Set up initial distribution
    const centerIdx = idx(World.W / 2, World.H / 2);
    Slime.trail[centerIdx] = 100;
    
    const initialSum = Array.from(Slime.trail).reduce((a, b) => a + b, 0);
    
    // Run diffusion
    Slime.diffuseEvaporate();
    
    const finalSum = Array.from(Slime.trail).reduce((a, b) => a + b, 0);
    
    // Should lose some mass due to evaporation but not all
    expect(finalSum).toBeLessThan(initialSum);
    expect(finalSum).toBeGreaterThan(initialSum * 0.5);
  });

  test('Slime diffusion spreads values to neighbors', () => {
    const centerX = Math.floor(World.W / 2);
    const centerY = Math.floor(World.H / 2);
    const centerIdx = idx(centerX, centerY);
    
    // Clear and set center point
    Slime.trail.fill(0);
    Slime.trail[centerIdx] = 100;
    
    Slime.diffuseEvaporate();
    
    // Check neighbors have received some value
    const neighbors = [
      idx(centerX - 1, centerY),
      idx(centerX + 1, centerY),
      idx(centerX, centerY - 1),
      idx(centerX, centerY + 1)
    ];
    
    neighbors.forEach(neighborIdx => {
      expect(Slime.trail[neighborIdx]).toBeGreaterThan(0);
    });
  });
});

describe('World - Signal System', () => {
  beforeEach(() => {
    setupWorld(TestData.TEST_SEED, '160x90');
    // Initialize signal arrays
    World.signals.stress = new Float32Array(World.W * World.H);
    World.signals.aggregation = new Float32Array(World.W * World.H);
    World.signals.stressBuf = new Float32Array(World.W * World.H);
    World.signals.aggregationBuf = new Float32Array(World.W * World.H);
  });

  test('Signals clear function works', () => {
    World.signals.stress.fill(0.5);
    World.signals.aggregation.fill(0.3);
    
    Signals.clear();
    
    expect(World.signals.stress.every(val => val === 0)).toBe(true);
    expect(World.signals.aggregation.every(val => val === 0)).toBe(true);
  });

  test('Signals saturation functions work correctly', () => {
    expect(Signals.satStress(0)).toBe(0);
    expect(Signals.satAggregation(0)).toBe(0);
    
    const stressVal = Signals.satStress(50);
    const aggVal = Signals.satAggregation(50);
    
    expect(stressVal).toBeWithinRange(0, 1);
    expect(aggVal).toBeWithinRange(0, 1);
    expect(stressVal).toBeGreaterThan(0);
    expect(aggVal).toBeGreaterThan(0);
  });

  test('Signals diffusion works without errors', () => {
    // Set up some initial values
    const centerIdx = idx(World.W / 2, World.H / 2);
    World.signals.stress[centerIdx] = 10;
    World.signals.aggregation[centerIdx] = 15;
    
    // Should not throw
    expect(() => Signals.diffuseEvaporate()).not.toThrow();
    
    // Values should have changed
    const newStress = Array.from(World.signals.stress).reduce((a, b) => a + b, 0);
    const newAgg = Array.from(World.signals.aggregation).reduce((a, b) => a + b, 0);
    
    expect(newStress).toBeGreaterThan(0);
    expect(newAgg).toBeGreaterThan(0);
  });

  test('Signals diffusion handles uninitialized state gracefully', () => {
    // Clear signals
    World.signals.stress = null;
    World.signals.aggregation = null;
    
    // Should not throw
    expect(() => Signals.diffuseEvaporate()).not.toThrow();
  });
});

describe('World - State Management', () => {
  test('World maintains colony list correctly', () => {
    setupWorld(TestData.TEST_SEED, '160x90');
    
    expect(World.colonies).toEqual([]);
    expect(World.nextId).toBe(1);
    
    // Add some colonies
    World.colonies.push({id: 1, x: 10, y: 10});
    World.colonies.push({id: 2, x: 20, y: 20});
    World.nextId = 3;
    
    expect(World.colonies.length).toBe(2);
    expect(World.nextId).toBe(3);
  });

  test('World tick counter works', () => {
    setupWorld(TestData.TEST_SEED, '160x90');
    
    expect(World.tick).toBe(0);
    
    World.tick++;
    expect(World.tick).toBe(1);
    
    World.tick += 10;
    expect(World.tick).toBe(11);
  });

  test('World simulation parameters are configurable', () => {
    expect(typeof World.speed).toBe('number');
    expect(typeof World.mutationRate).toBe('number');
    expect(typeof World.capacity).toBe('number');
    
    World.speed = 2.0;
    World.mutationRate = 0.5;
    World.capacity = 1.5;
    
    expect(World.speed).toBe(2.0);
    expect(World.mutationRate).toBe(0.5);
    expect(World.capacity).toBe(1.5);
  });
});