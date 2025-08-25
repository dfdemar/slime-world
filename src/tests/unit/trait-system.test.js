// Unit tests for trait-system.js - Trait framework validation

// Load test fixtures
const { TestData, TestUtils } = require('../fixtures/test-data');

// Load required modules
const fs = require('fs');
const path = require('path');

// Load utils.js first (dependency for clamp, randRange functions)
const utilsPath = path.resolve(__dirname, '../../js/utils.js');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');
eval(utilsContent);

// Load trait-system.js
const traitPath = path.resolve(__dirname, '../../js/trait-system.js');
const traitContent = fs.readFileSync(traitPath, 'utf8');
eval(traitContent);

describe('Trait System - Base Trait Class', () => {
  test('Trait constructor sets properties correctly', () => {
    const trait = new Trait('test', 'Test trait', 0.3, 0.1, 0.9);
    
    expect(trait.name).toBe('test');
    expect(trait.description).toBe('Test trait');
    expect(trait.defaultValue).toBe(0.3);
    expect(trait.min).toBe(0.1);
    expect(trait.max).toBe(0.9);
  });

  test('Trait constructor uses default parameters', () => {
    const trait = new Trait('simple', 'Simple trait');
    
    expect(trait.name).toBe('simple');
    expect(trait.description).toBe('Simple trait');
    expect(trait.defaultValue).toBe(0.5);
    expect(trait.min).toBe(0);
    expect(trait.max).toBe(1);
  });

  test('Trait validate method clamps values correctly', () => {
    const trait = new Trait('test', 'Test trait', 0.5, 0.2, 0.8);
    
    expect(trait.validate(0.1)).toBe(0.2); // Below min
    expect(trait.validate(0.5)).toBe(0.5); // Within range
    expect(trait.validate(0.9)).toBe(0.8); // Above max
    expect(trait.validate(0.2)).toBe(0.2); // At min
    expect(trait.validate(0.8)).toBe(0.8); // At max
  });

  test('Trait calculateFitness returns base implementation', () => {
    const trait = new Trait('test', 'Test trait');
    
    expect(trait.calculateFitness(0.7)).toBe(0.7);
    expect(trait.calculateFitness(0.3)).toBe(0.3);
  });

  test('Trait mutate method works with RNG', () => {
    const trait = new Trait('test', 'Test trait', 0.5, 0, 1);
    const rng = TestUtils.createTestRNG(TestData.TEST_SEED);
    
    const original = 0.5;
    const mutated1 = trait.mutate(original, 0.1, rng);
    const mutated2 = trait.mutate(original, 0.1, rng);
    
    // Should be different values due to mutation
    expect(mutated1).not.toBe(original);
    expect(mutated2).not.toBe(original);
    expect(mutated1).not.toBe(mutated2);
    
    // Should be within bounds
    expect(mutated1).toBeWithinRange(0, 1);
    expect(mutated2).toBeWithinRange(0, 1);
  });

  test('Trait mutate with zero mutation rate', () => {
    const trait = new Trait('test', 'Test trait', 0.5, 0, 1);
    const rng = TestUtils.createTestRNG(TestData.TEST_SEED);
    
    const original = 0.5;
    const mutated = trait.mutate(original, 0.0, rng);
    
    // Should be very close to original with zero mutation
    expect(Math.abs(mutated - original)).toBeLessThan(0.001);
  });

  test('Trait mutate respects bounds', () => {
    const trait = new Trait('test', 'Test trait', 0.5, 0.3, 0.7);
    const rng = TestUtils.createTestRNG(TestData.TEST_SEED);
    
    // Test many mutations to ensure bounds are respected
    for (let i = 0; i < 50; i++) {
      const mutated = trait.mutate(0.5, 1.0, rng); // High mutation rate
      expect(mutated).toBeWithinRange(0.3, 0.7);
    }
  });
});

describe('Trait System - WaterNeedTrait', () => {
  test('WaterNeedTrait constructor sets correct properties', () => {
    const trait = new WaterNeedTrait();
    
    expect(trait.name).toBe('water_need');
    expect(trait.description).toBe('Dependency on humid environments');
    expect(trait.defaultValue).toBe(0.5);
    expect(trait.min).toBe(0);
    expect(trait.max).toBe(1);
  });

  test('WaterNeedTrait calculateFitness works correctly', () => {
    const trait = new WaterNeedTrait();
    const environment = { humidity: [0.8] };
    const position = 0;
    
    // Perfect match should give high fitness
    const perfectFitness = trait.calculateFitness(0.8, environment, position);
    expect(perfectFitness).toBe(1.0);
    
    // Mismatch should give lower fitness
    const mismatchFitness = trait.calculateFitness(0.2, environment, position);
    expect(mismatchFitness).toBe(0.4); // 1.0 - |0.8 - 0.2|
    
    // Partial match
    const partialFitness = trait.calculateFitness(0.6, environment, position);
    expect(partialFitness).toBe(0.8); // 1.0 - |0.8 - 0.6|
  });
});

describe('Trait System - LightUseTrait', () => {
  test('LightUseTrait constructor sets correct properties', () => {
    const trait = new LightUseTrait();
    
    expect(trait.name).toBe('light_use');
    expect(trait.description).toBe('Efficiency in bright environments');
    expect(trait.defaultValue).toBe(0.5);
    expect(trait.min).toBe(0);
    expect(trait.max).toBe(1);
  });

  test('LightUseTrait calculateFitness works correctly', () => {
    const trait = new LightUseTrait();
    const environment = { light: [0.9] };
    const position = 0;
    
    // High light use with high light should give high fitness
    const highFitness = trait.calculateFitness(0.9, environment, position);
    expect(highFitness).toBeWithinRange(0.8, 1.0);
    
    // Low light use with high light should give lower fitness
    const lowFitness = trait.calculateFitness(0.1, environment, position);
    expect(lowFitness).toBeLessThan(0.5);
  });
});

describe('Trait System - PhotosynthesisTrait', () => {
  test('PhotosynthesisTrait constructor sets correct properties', () => {
    const trait = new PhotosynthesisTrait();
    
    expect(trait.name).toBe('photosym');
    expect(trait.description).toBe('Photosynthetic capability');
    expect(trait.defaultValue).toBe(0.5);
    expect(trait.min).toBe(0);
    expect(trait.max).toBe(1);
  });

  test('PhotosynthesisTrait calculateFitness works correctly', () => {
    const trait = new PhotosynthesisTrait();
    const environment = { light: [0.7] };
    const position = 0;
    
    // High photosynthesis with light should give good fitness
    const fitness = trait.calculateFitness(0.8, environment, position);
    expect(fitness).toBeGreaterThan(0.5);
    expect(fitness).toBeWithinRange(0, 1);
  });
});

describe('Trait System - TransportTrait', () => {
  test('TransportTrait constructor sets correct properties', () => {
    const trait = new TransportTrait();
    
    expect(trait.name).toBe('transport');
    expect(trait.description).toBe('Nutrient and resource transport efficiency');
    expect(trait.defaultValue).toBe(0.5);
    expect(trait.min).toBe(0);
    expect(trait.max).toBe(1);
  });

  test('TransportTrait calculateFitness is baseline', () => {
    const trait = new TransportTrait();
    
    // Transport provides baseline fitness
    const fitness = trait.calculateFitness(0.7);
    expect(fitness).toBe(0.7);
  });
});

describe('Trait System - SensingTrait', () => {
  test('SensingTrait constructor sets correct properties', () => {
    const trait = new SensingTrait();
    
    expect(trait.name).toBe('sensing');
    expect(trait.description).toBe('Environmental sensing and navigation');
    expect(trait.defaultValue).toBe(0.5);
    expect(trait.min).toBe(0);
    expect(trait.max).toBe(1);
  });

  test('SensingTrait calculateFitness is baseline', () => {
    const trait = new SensingTrait();
    
    // Sensing provides baseline fitness
    const fitness = trait.calculateFitness(0.4);
    expect(fitness).toBe(0.4);
  });
});

describe('Trait System - PredationTrait', () => {
  test('PredationTrait constructor sets correct properties', () => {
    const trait = new PredationTrait();
    
    expect(trait.name).toBe('predation');
    expect(trait.description).toBe('Aggressive competitive behavior');
    expect(trait.defaultValue).toBe(0.3);
    expect(trait.min).toBe(0);
    expect(trait.max).toBe(1);
  });

  test('PredationTrait calculateFitness is baseline', () => {
    const trait = new PredationTrait();
    
    // Predation provides baseline fitness
    const fitness = trait.calculateFitness(0.6);
    expect(fitness).toBe(0.6);
  });
});

describe('Trait System - TraitRegistry', () => {
  test('TraitRegistry contains all expected traits', () => {
    expect(TraitRegistry).toBeDefined();
    expect(typeof TraitRegistry).toBe('object');
    
    // Check that all main traits are registered
    expect(TraitRegistry.water_need).toBeInstanceOf(WaterNeedTrait);
    expect(TraitRegistry.light_use).toBeInstanceOf(LightUseTrait);
    expect(TraitRegistry.photosym).toBeInstanceOf(PhotosynthesisTrait);
    expect(TraitRegistry.transport).toBeInstanceOf(TransportTrait);
    expect(TraitRegistry.sensing).toBeInstanceOf(SensingTrait);
    expect(TraitRegistry.predation).toBeInstanceOf(PredationTrait);
  });

  test('TraitRegistry traits have correct names', () => {
    Object.keys(TraitRegistry).forEach(key => {
      expect(TraitRegistry[key].name).toBe(key);
    });
  });
});

describe('Trait System - Archetype Class', () => {
  test('Archetype constructor works correctly', () => {
    const traits = {
      water_need: 0.8,
      light_use: 0.4,
      photosym: 0.6
    };
    const archetype = new Archetype('TEST', traits);
    
    expect(archetype.name).toBe('TEST');
    expect(archetype.traits).toEqual(traits);
  });

  test('Archetype calculateFitness works', () => {
    const traits = {
      water_need: 0.5,
      light_use: 0.5
    };
    const archetype = new Archetype('TEST', traits);
    const environment = {
      humidity: [0.5],
      light: [0.7]
    };
    
    const fitness = archetype.calculateFitness(environment, 0);
    expect(typeof fitness).toBe('number');
    expect(fitness).toBeWithinRange(0, 1);
  });

  test('Archetype mutate creates new archetype', () => {
    const traits = {
      water_need: 0.5,
      light_use: 0.5,
      photosym: 0.3
    };
    const archetype = new Archetype('TEST', traits);
    const rng = TestUtils.createTestRNG(TestData.TEST_SEED);
    
    const mutated = archetype.mutate(0.1, rng);
    
    expect(mutated).toBeInstanceOf(Archetype);
    expect(mutated.name).toBe('TEST');
    expect(mutated.traits).not.toEqual(traits); // Should be different due to mutation
    
    // Check that mutated traits are still within bounds
    Object.keys(mutated.traits).forEach(key => {
      expect(mutated.traits[key]).toBeWithinRange(0, 1);
    });
  });
});

describe('Trait System - TraitFactory', () => {
  test('TraitFactory createRandomTraits generates valid traits', () => {
    const rng = TestUtils.createTestRNG(TestData.TEST_SEED);
    const traits = TraitFactory.createRandomTraits(rng);
    
    expect(typeof traits).toBe('object');
    
    // Check all expected traits exist
    expect(typeof traits.water_need).toBe('number');
    expect(typeof traits.light_use).toBe('number');
    expect(typeof traits.photosym).toBe('number');
    expect(typeof traits.transport).toBe('number');
    expect(typeof traits.sensing).toBe('number');
    expect(typeof traits.predation).toBe('number');
    
    // Check all values are within bounds
    Object.values(traits).forEach(value => {
      expect(value).toBeWithinRange(0, 1);
    });
  });

  test('TraitFactory createBalancedTraits generates balanced traits', () => {
    const rng = TestUtils.createTestRNG(TestData.TEST_SEED);
    const traits = TraitFactory.createBalancedTraits(rng);
    
    expect(typeof traits).toBe('object');
    
    // Balanced traits should have reasonable values
    Object.values(traits).forEach(value => {
      expect(value).toBeWithinRange(0, 1);
      expect(value).toBeWithinRange(0.2, 0.8); // Should be reasonably balanced
    });
  });
});

describe('Trait System - Integration', () => {
  test('All trait classes extend base Trait class', () => {
    expect(new WaterNeedTrait()).toBeInstanceOf(Trait);
    expect(new LightUseTrait()).toBeInstanceOf(Trait);
    expect(new PhotosynthesisTrait()).toBeInstanceOf(Trait);
    expect(new TransportTrait()).toBeInstanceOf(Trait);
    expect(new SensingTrait()).toBeInstanceOf(Trait);
    expect(new PredationTrait()).toBeInstanceOf(Trait);
  });

  test('Trait validation works across all trait types', () => {
    const traitTypes = [
      WaterNeedTrait,
      LightUseTrait, 
      PhotosynthesisTrait,
      TransportTrait,
      SensingTrait,
      PredationTrait
    ];
    
    traitTypes.forEach(TraitClass => {
      const trait = new TraitClass();
      
      // Test validation
      expect(trait.validate(-0.5)).toBe(trait.min);
      expect(trait.validate(1.5)).toBe(trait.max);
      expect(trait.validate(0.5)).toBeWithinRange(trait.min, trait.max);
    });
  });

  test('Trait mutation works consistently across all trait types', () => {
    const rng = TestUtils.createTestRNG(TestData.TEST_SEED);
    const traitTypes = [
      WaterNeedTrait,
      LightUseTrait,
      PhotosynthesisTrait,
      TransportTrait,
      SensingTrait,
      PredationTrait
    ];
    
    traitTypes.forEach(TraitClass => {
      const trait = new TraitClass();
      const original = trait.defaultValue;
      
      const mutated = trait.mutate(original, 0.2, rng);
      
      expect(mutated).toBeWithinRange(trait.min, trait.max);
      expect(typeof mutated).toBe('number');
    });
  });
});