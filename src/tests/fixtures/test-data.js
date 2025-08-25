// Test fixtures and utilities for SlimeWorld tests

const TestData = {
  // Standard test seed for reproducible results
  TEST_SEED: 42,
  
  // World dimensions for testing
  WORLD_DIMENSIONS: {
    small: { W: 128, H: 72 },
    medium: { W: 160, H: 90 },
    large: { W: 256, H: 144 }
  },
  
  // Sample colony configurations
  SAMPLE_COLONIES: {
    mat: {
      type: 'MAT',
      x: 50, y: 25,
      traits: {
        water_need: 0.8,
        light_use: 0.4,
        photosym: 0.6,
        transport: 0.5,
        sensing: 0.3,
        predation: 0.2
      }
    },
    
    tower: {
      type: 'TOWER',
      x: 100, y: 50,
      traits: {
        water_need: 0.3,
        light_use: 0.9,
        photosym: 0.8,
        transport: 0.2,
        sensing: 0.4,
        predation: 0.1
      }
    },
    
    eat: {
      type: 'EAT',
      x: 75, y: 35,
      traits: {
        water_need: 0.5,
        light_use: 0.1,
        photosym: 0.0,
        transport: 0.6,
        sensing: 0.7,
        predation: 0.9
      }
    }
  },
  
  // Environment test configurations
  ENVIRONMENT_CONFIGS: {
    uniform: {
      humidity: 0.5,
      light: 0.5,
      nutrient: 0.5,
      water: 0.5
    },
    
    diverse: {
      humidity: { min: 0.2, max: 0.8 },
      light: { min: 0.3, max: 0.9 },
      nutrient: { min: 0.1, max: 0.7 },
      water: { min: 0.4, max: 0.6 }
    }
  },
  
  // Simulation test parameters
  SIMULATION_PARAMS: {
    fast: {
      speed: 4.0,
      mutationRate: 0.05,
      capacity: 1.0
    },
    
    standard: {
      speed: 1.2,
      mutationRate: 0.18,
      capacity: 1.0
    },
    
    slow: {
      speed: 0.5,
      mutationRate: 0.3,
      capacity: 0.5
    }
  }
};

// Utility functions for test data generation
const TestUtils = {
  // Generate deterministic random values using test seed
  createTestRNG(seed = TestData.TEST_SEED) {
    if (typeof xmur3 !== 'undefined' && typeof sfc32 !== 'undefined') {
      const seedFunc = xmur3(seed.toString());
      return sfc32(seedFunc(), seedFunc(), seedFunc(), seedFunc());
    }
    // Fallback for Node.js environment
    return Math.random;
  },
  
  // Create test world state
  createTestWorld(dimensions = TestData.WORLD_DIMENSIONS.medium, seed = TestData.TEST_SEED) {
    return {
      W: dimensions.W,
      H: dimensions.H,
      tick: 0,
      paused: true,
      speed: 1.0,
      mutationRate: 0.1,
      capacity: 1.0,
      colonies: [],
      nextId: 1,
      seed: seed
    };
  },
  
  // Create test colony with specified traits
  createTestColony(config) {
    const colony = {
      id: config.id || 1,
      type: config.type || 'MAT',
      x: config.x || 50,
      y: config.y || 25,
      cells: [[config.x || 50, config.y || 25]],
      biomass: config.biomass || 1.0,
      age: config.age || 0,
      generation: config.generation || 0,
      traits: { ...config.traits }
    };
    
    return colony;
  },
  
  // Generate test environment data
  generateTestEnvironment(W, H, config = TestData.ENVIRONMENT_CONFIGS.uniform) {
    const size = W * H;
    const env = {
      humidity: new Float32Array(size),
      light: new Float32Array(size),
      nutrient: new Float32Array(size),
      water: new Uint8Array(size)
    };
    
    // Fill with uniform or random values based on config
    for (let i = 0; i < size; i++) {
      env.humidity[i] = typeof config.humidity === 'number' 
        ? config.humidity 
        : Math.random() * (config.humidity.max - config.humidity.min) + config.humidity.min;
      
      env.light[i] = typeof config.light === 'number'
        ? config.light
        : Math.random() * (config.light.max - config.light.min) + config.light.min;
        
      env.nutrient[i] = typeof config.nutrient === 'number'
        ? config.nutrient
        : Math.random() * (config.nutrient.max - config.nutrient.min) + config.nutrient.min;
        
      env.water[i] = typeof config.water === 'number'
        ? (config.water > 0.5 ? 1 : 0)
        : (Math.random() > 0.5 ? 1 : 0);
    }
    
    return env;
  },
  
  // Validate colony structure
  isValidColony(colony) {
    return colony &&
           typeof colony.id === 'number' &&
           typeof colony.x === 'number' &&
           typeof colony.y === 'number' &&
           typeof colony.type === 'string' &&
           Array.isArray(colony.cells) &&
           colony.cells.length > 0 &&
           typeof colony.traits === 'object';
  }
};

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestData, TestUtils };
} else {
  window.TestData = TestData;
  window.TestUtils = TestUtils;
}