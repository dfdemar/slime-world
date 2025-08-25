// Trait System Tests - Loads modules dynamically for testing
const { utils } = require('../setup/puppeteer.config');

describe('Trait System - Dynamically Loaded', () => {
  let page;

  beforeAll(async () => {
    page = await browser.newPage();
    await utils.navigateToApp(page);
    await utils.setupTestEnvironment(page);
    
    // Dynamically load trait system modules for testing
    await page.addScriptTag({ path: './src/js/trait-system.js' });
    await page.addScriptTag({ path: './src/js/extended-archetypes.js' });
    await page.addScriptTag({ path: './src/js/integration.js' });
    
    // Enable trait system temporarily for tests
    await page.evaluate(() => {
      window.originalUseModularTraits = SystemConfig.useModularTraits;
      SystemConfig.useModularTraits = true;
    });
  });

  afterAll(async () => {
    if (page) {
      // Restore original state
      await page.evaluate(() => {
        SystemConfig.useModularTraits = window.originalUseModularTraits;
      });
      await utils.cleanupTestEnvironment(page);
      await page.close();
    }
  });

  describe('Base Trait Class', () => {
    test('Trait class creates instances with correct properties', async () => {
      const traitData = await page.evaluate(() => {
        const trait = new Trait('test_trait', 'Test trait', 0.7, 0.2, 0.9);
        return {
          name: trait.name,
          description: trait.description,
          defaultValue: trait.defaultValue,
          min: trait.min,
          max: trait.max
        };
      });

      expect(traitData.name).toBe('test_trait');
      expect(traitData.description).toBe('Test trait');
      expect(traitData.defaultValue).toBe(0.7);
      expect(traitData.min).toBe(0.2);
      expect(traitData.max).toBe(0.9);
    });

    test('Trait validation clamps values to bounds', async () => {
      const validationResults = await page.evaluate(() => {
        const trait = new Trait('test', 'Test', 0.5, 0.1, 0.9);
        return {
          tooLow: trait.validate(-0.5),
          tooHigh: trait.validate(1.5),
          valid: trait.validate(0.6),
          boundary: trait.validate(0.1)
        };
      });

      expect(validationResults.tooLow).toBe(0.1);
      expect(validationResults.tooHigh).toBe(0.9);
      expect(validationResults.valid).toBe(0.6);
      expect(validationResults.boundary).toBe(0.1);
    });

    test('Trait mutation produces valid values', async () => {
      const mutationResults = await page.evaluate(() => {
        const trait = new Trait('test', 'Test', 0.5, 0, 1);
        const results = [];
        
        // Use deterministic seed for consistent testing
        const testRng = sfc32(xmur3('trait-test')());
        
        for (let i = 0; i < 20; i++) {
          const mutated = trait.mutate(0.5, 0.2, testRng);
          results.push(mutated);
        }
        
        return {
          results,
          allInBounds: results.every(v => v >= 0 && v <= 1),
          hasVariation: results.some(v => v !== 0.5),
          avgValue: results.reduce((a, b) => a + b, 0) / results.length
        };
      });

      expect(mutationResults.allInBounds).toBe(true);
      expect(mutationResults.hasVariation).toBe(true);
      expect(mutationResults.avgValue).toBeWithinRange(0.4, 0.6); // Should cluster around 0.5
    });
  });

  describe('Specialized Trait Classes', () => {
    test('WaterNeedTrait calculates fitness based on humidity match', async () => {
      const fitnessResults = await page.evaluate(() => {
        const trait = new WaterNeedTrait();
        const mockEnv = { humidity: [0.2, 0.8, 0.5] };
        
        return {
          perfectMatch: trait.calculateFitness(0.5, mockEnv, 2), // value=0.5, humidity=0.5
          goodMatch: trait.calculateFitness(0.6, mockEnv, 2),    // value=0.6, humidity=0.5
          poorMatch: trait.calculateFitness(0.2, mockEnv, 1)     // value=0.2, humidity=0.8
        };
      });

      expect(fitnessResults.perfectMatch).toBeCloseTo(1.0); // Perfect match
      expect(fitnessResults.goodMatch).toBeCloseTo(0.9);    // Close match
      expect(fitnessResults.poorMatch).toBeCloseTo(0.4);    // Poor match
    });

    test('PhotosynthesisTrait handles light-dependent fitness', async () => {
      const photosynthesisResults = await page.evaluate(() => {
        const trait = new PhotosynthesisTrait();
        const darkEnv = { light: [0.1] };
        const brightEnv = { light: [0.9] };
        const mediumEnv = { light: [0.7] };
        
        return {
          highPhotosynthesisInBright: trait.calculateFitness(0.8, brightEnv, 0),
          highPhotosynthesisInDark: trait.calculateFitness(0.8, darkEnv, 0),
          lowPhotosynthesisInDark: trait.calculateFitness(0.1, darkEnv, 0),
          optimalLight: trait.calculateFitness(0.5, mediumEnv, 0)
        };
      });

      // Test the general fitness trends rather than exact values
      expect(photosynthesisResults.highPhotosynthesisInBright).toBeGreaterThan(0.5);
      expect(photosynthesisResults.lowPhotosynthesisInDark).toBeGreaterThan(0.2);
      
      // Ensure results are reasonable numbers
      expect(typeof photosynthesisResults.highPhotosynthesisInBright).toBe('number');
      expect(typeof photosynthesisResults.highPhotosynthesisInDark).toBe('number');
      expect(typeof photosynthesisResults.lowPhotosynthesisInDark).toBe('number');
      expect(typeof photosynthesisResults.optimalLight).toBe('number');
    });
  });

  describe('TraitRegistry', () => {
    test('TraitRegistry contains all expected traits', async () => {
      const registryInfo = await page.evaluate(() => {
        return {
          keys: Object.keys(TraitRegistry),
          waterNeedExists: TraitRegistry.water_need instanceof WaterNeedTrait,
          photosymExists: TraitRegistry.photosym instanceof PhotosynthesisTrait,
          traitCount: Object.keys(TraitRegistry).length
        };
      });

      expect(registryInfo.keys).toContain('water_need');
      expect(registryInfo.keys).toContain('light_use');
      expect(registryInfo.keys).toContain('photosym');
      expect(registryInfo.keys).toContain('transport');
      expect(registryInfo.keys).toContain('predation');
      expect(registryInfo.waterNeedExists).toBe(true);
      expect(registryInfo.photosymExists).toBe(true);
      expect(registryInfo.traitCount).toBe(8);
    });
  });

  describe('Archetype Class', () => {
    test('Archetype creates traits correctly', async () => {
      const archetypeData = await page.evaluate(() => {
        const archetype = new Archetype('TEST', 'Test Type', 'Test archetype', {
          water_need: 0.8,
          photosym: 0.3,
          transport: 0.6
        });
        
        const traits = archetype.createTraits();
        
        return {
          code: archetype.code,
          name: archetype.name,
          traitKeys: Object.keys(traits),
          waterNeed: traits.water_need,
          photosym: traits.photosym,
          transport: traits.transport,
          defaultTrait: traits.predation // Should use default value
        };
      });

      expect(archetypeData.code).toBe('TEST');
      expect(archetypeData.name).toBe('Test Type');
      expect(archetypeData.traitKeys).toHaveLength(8);
      expect(archetypeData.waterNeed).toBe(0.8);
      expect(archetypeData.photosym).toBe(0.3);
      expect(archetypeData.transport).toBe(0.6);
      expect(archetypeData.defaultTrait).toBe(0.1); // Default predation value
    });
  });

  describe('Integration with World System', () => {
    test('Modular suitability calculation works when enabled', async () => {
      const suitabilityTest = await page.evaluate(() => {
        // Create a test modular colony
        const testColony = {
          type: 'MAT',
          traits: {
            water_need: 0.7,
            light_use: 0.4,
            photosym: 0.6,
            transport: 0.5,
            predation: 0.1,
            defense: 0.5,
            spore: 0.5,
            flow: 0.7
          },
          archetype: ModularArchetypes.MAT
        };
        
        // Test suitability calculation
        const suitability = calculateModularSuitability(testColony, 50, 25);
        
        return {
          suitabilityValue: suitability,
          isValidNumber: typeof suitability === 'number' && !isNaN(suitability),
          isInValidRange: suitability >= 0 && suitability <= 1
        };
      });

      expect(suitabilityTest.isValidNumber).toBe(true);
      expect(suitabilityTest.isInValidRange).toBe(true);
    });
  });
});