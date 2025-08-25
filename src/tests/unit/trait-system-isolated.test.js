// Isolated Trait System Unit Tests - Load modules manually in Node.js
const fs = require('fs');
const path = require('path');

describe('Trait System - Isolated Unit Tests', () => {
  let traitSystemCode;
  let evaluateCode;

  beforeAll(() => {
    // Read the trait system files
    const utilsPath = path.resolve(__dirname, '../../../src/js/utils.js');
    const traitSystemPath = path.resolve(__dirname, '../../../src/js/trait-system.js');
    
    const utilsCode = fs.readFileSync(utilsPath, 'utf8');
    traitSystemCode = fs.readFileSync(traitSystemPath, 'utf8');
    
    // Create evaluation function that includes necessary utilities
    evaluateCode = (code) => {
      const fullCode = `
        ${utilsCode}
        ${traitSystemCode}
        ${code}
      `;
      return eval(fullCode);
    };
  });

  describe('Pure Trait Logic', () => {
    test('Trait validation works independently', () => {
      const result = evaluateCode(`
        const trait = new Trait('test', 'Test trait', 0.5, 0.1, 0.9);
        ({
          tooLow: trait.validate(-0.2),
          tooHigh: trait.validate(1.2),
          valid: trait.validate(0.6)
        });
      `);

      expect(result.tooLow).toBe(0.1);
      expect(result.tooHigh).toBe(0.9);
      expect(result.valid).toBe(0.6);
    });

    test('Trait mutation produces consistent results with seeded RNG', () => {
      const result = evaluateCode(`
        const trait = new Trait('test', 'Test', 0.5, 0, 1);
        const testRng = sfc32(xmur3('consistent-seed')());
        
        const mutations = [];
        for (let i = 0; i < 10; i++) {
          mutations.push(trait.mutate(0.5, 0.3, testRng));
        }
        
        ({
          mutations,
          allInBounds: mutations.every(v => v >= 0 && v <= 1),
          hasVariation: mutations.some(v => Math.abs(v - 0.5) > 0.01)
        });
      `);

      expect(result.allInBounds).toBe(true);
      expect(result.hasVariation).toBe(true);
      expect(result.mutations).toHaveLength(10);
      
      // Test determinism - same seed should produce same results
      const result2 = evaluateCode(`
        const trait = new Trait('test', 'Test', 0.5, 0, 1);
        const testRng = sfc32(xmur3('consistent-seed')());
        
        const mutations = [];
        for (let i = 0; i < 10; i++) {
          mutations.push(trait.mutate(0.5, 0.3, testRng));
        }
        
        mutations;
      `);

      expect(result2).toEqual(result.mutations);
    });

    test('WaterNeedTrait fitness calculation is pure function', () => {
      const result = evaluateCode(`
        const trait = new WaterNeedTrait();
        const mockEnv = { humidity: [0.3, 0.7, 0.5, 0.9] };
        
        ({
          fitness1: trait.calculateFitness(0.5, mockEnv, 2), // Perfect match
          fitness2: trait.calculateFitness(0.3, mockEnv, 0), // Perfect match
          fitness3: trait.calculateFitness(0.5, mockEnv, 3), // Poor match
          fitness4: trait.calculateFitness(0.9, mockEnv, 1)  // Good match
        });
      `);

      expect(result.fitness1).toBeCloseTo(1.0); // Perfect match: 0.5 vs 0.5
      expect(result.fitness2).toBeCloseTo(1.0); // Perfect match: 0.3 vs 0.3
      expect(result.fitness3).toBeCloseTo(0.6); // Poor match: 0.5 vs 0.9
      expect(result.fitness4).toBeCloseTo(0.8); // Good match: 0.9 vs 0.7
    });

    test('PhotosynthesisTrait handles edge cases correctly', () => {
      const result = evaluateCode(`
        const trait = new PhotosynthesisTrait();
        
        ({
          zeroPhotosynthesis: trait.calculateFitness(0, { light: [0.8] }, 0),
          maxPhotosynthesis: trait.calculateFitness(1, { light: [0.9] }, 0),
          noLight: trait.calculateFitness(0.5, { light: [0] }, 0),
          fullLight: trait.calculateFitness(0.5, { light: [1] }, 0)
        });
      `);

      expect(result.zeroPhotosynthesis).toBeGreaterThan(0);
      expect(result.maxPhotosynthesis).toBeGreaterThan(result.noLight);
      expect(typeof result.noLight).toBe('number');
      expect(typeof result.fullLight).toBe('number');
    });
  });

  describe('TraitRegistry Structure', () => {
    test('TraitRegistry contains expected traits with correct types', () => {
      const result = evaluateCode(`
        ({
          keys: Object.keys(TraitRegistry).sort(),
          types: Object.keys(TraitRegistry).map(key => ({
            name: key,
            isTraitInstance: TraitRegistry[key] instanceof Trait,
            hasCalculateFitness: typeof TraitRegistry[key].calculateFitness === 'function'
          }))
        });
      `);

      const expectedTraits = [
        'defense', 'flow', 'light_use', 'photosym', 
        'predation', 'spore', 'transport', 'water_need'
      ];

      expect(result.keys).toEqual(expectedTraits);
      
      result.types.forEach(traitInfo => {
        expect(traitInfo.isTraitInstance).toBe(true);
        expect(traitInfo.hasCalculateFitness).toBe(true);
      });
    });
  });

  describe('Archetype System', () => {
    test('Archetype creates complete trait sets', () => {
      const result = evaluateCode(`
        const testArchetype = new Archetype('TEST', 'Test Type', 'Description', {
          water_need: 0.8,
          photosym: 0.2,
          transport: 0.9
        });
        
        const traits = testArchetype.createTraits();
        
        ({
          archetype: {
            code: testArchetype.code,
            name: testArchetype.name
          },
          traits: {
            keys: Object.keys(traits).sort(),
            waterNeed: traits.water_need,
            photosym: traits.photosym,
            transport: traits.transport,
            hasDefaults: traits.predation === TraitRegistry.predation.defaultValue
          }
        });
      `);

      expect(result.archetype.code).toBe('TEST');
      expect(result.archetype.name).toBe('Test Type');
      expect(result.traits.keys).toHaveLength(8);
      expect(result.traits.waterNeed).toBe(0.8);
      expect(result.traits.photosym).toBe(0.2);
      expect(result.traits.transport).toBe(0.9);
      expect(result.traits.hasDefaults).toBe(true);
    });
  });
});