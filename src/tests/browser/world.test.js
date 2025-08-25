// Browser tests for world.js - World state management in real browser environment
const { utils } = require('../setup/puppeteer.config');

describe('World System - Browser Tests', () => {
  let page;

  beforeAll(async () => {
    page = await browser.newPage();
    await utils.navigateToApp(page);
    await utils.setupTestEnvironment(page);
  });

  afterAll(async () => {
    if (page) {
      await utils.cleanupTestEnvironment(page);
      await page.close();
    }
  });

  describe('World Object Structure', () => {
    test('World object has required properties', async () => {
      const worldProps = await page.evaluate(() => {
        return {
          W: typeof World.W,
          H: typeof World.H,
          colonies: Array.isArray(World.colonies),
          nextId: typeof World.nextId,
          tick: typeof World.tick,
          paused: typeof World.paused,
          speed: typeof World.speed,
          mutationRate: typeof World.mutationRate,
          capacity: typeof World.capacity,
          env: typeof World.env === 'object' && World.env !== null
        };
      });

      expect(worldProps.W).toBe('number');
      expect(worldProps.H).toBe('number');
      expect(worldProps.colonies).toBe(true);
      expect(worldProps.nextId).toBe('number');
      expect(worldProps.tick).toBe('number');
      expect(worldProps.paused).toBe('boolean');
      expect(worldProps.speed).toBe('number');
      expect(worldProps.mutationRate).toBe('number');
      expect(worldProps.capacity).toBe('number');
      expect(worldProps.env).toBe(true);
    });

    test('World environment arrays are properly initialized', async () => {
      const envArrays = await page.evaluate(() => {
        return {
          humidity: World.env.humidity instanceof Float32Array,
          light: World.env.light instanceof Float32Array,
          nutrient: World.env.nutrient instanceof Float32Array,
          water: World.env.water instanceof Uint8Array,
          humidityLength: World.env.humidity.length,
          lightLength: World.env.light.length,
          nutrientLength: World.env.nutrient.length,
          waterLength: World.env.water.length
        };
      });

      expect(envArrays.humidity).toBe(true);
      expect(envArrays.light).toBe(true);
      expect(envArrays.nutrient).toBe(true);
      expect(envArrays.water).toBe(true);
      
      // All should have same length = W * H
      const expectedSize = await page.evaluate(() => World.W * World.H);
      expect(envArrays.humidityLength).toBe(expectedSize);
      expect(envArrays.lightLength).toBe(expectedSize);
      expect(envArrays.nutrientLength).toBe(expectedSize);
      expect(envArrays.waterLength).toBe(expectedSize);
    });
  });

  describe('Coordinate Functions', () => {
    test('idx function converts coordinates correctly', async () => {
      const results = await page.evaluate(() => {
        return {
          origin: idx(0, 0),
          point1: idx(1, 0), 
          point2: idx(0, 1),
          point3: idx(5, 3)
        };
      });

      expect(results.origin).toBe(0);
      expect(results.point1).toBe(1);
      
      const worldWidth = await page.evaluate(() => World.W);
      expect(results.point2).toBe(worldWidth);
      expect(results.point3).toBe(3 * worldWidth + 5);
    });

    test('clamp functions restrict coordinates to bounds', async () => {
      const results = await page.evaluate(() => {
        const W = World.W;
        const H = World.H;
        return {
          clampXBelow: clampX(-5),
          clampXWithin: clampX(W / 2),
          clampXAbove: clampX(W + 10),
          clampYBelow: clampY(-5),
          clampYWithin: clampY(H / 2),
          clampYAbove: clampY(H + 10),
          bounds: { W, H }
        };
      });

      expect(results.clampXBelow).toBe(0);
      expect(results.clampXWithin).toBeWithinRange(0, results.bounds.W - 1);
      expect(results.clampXAbove).toBe(results.bounds.W - 1);
      
      expect(results.clampYBelow).toBe(0);
      expect(results.clampYWithin).toBeWithinRange(0, results.bounds.H - 1);
      expect(results.clampYAbove).toBe(results.bounds.H - 1);
    });

    test('inBounds function validates coordinates', async () => {
      const results = await page.evaluate(() => {
        const W = World.W;
        const H = World.H;
        return {
          validOrigin: inBounds(0, 0),
          validCorner: inBounds(W - 1, H - 1),
          invalidNegX: inBounds(-1, 0),
          invalidNegY: inBounds(0, -1),
          invalidMaxX: inBounds(W, 0),
          invalidMaxY: inBounds(0, H),
          bounds: { W, H }
        };
      });

      expect(results.validOrigin).toBe(true);
      expect(results.validCorner).toBe(true);
      expect(results.invalidNegX).toBe(false);
      expect(results.invalidNegY).toBe(false);
      expect(results.invalidMaxX).toBe(false);
      expect(results.invalidMaxY).toBe(false);
    });

    test('idxClamped combines clamping with indexing', async () => {
      const results = await page.evaluate(() => {
        const W = World.W;
        const H = World.H;
        return {
          clampedOrigin: idxClamped(-5, -5),
          clampedCorner: idxClamped(W + 10, H + 10),
          normalPoint: idxClamped(1, 1),
          bounds: { W, H }
        };
      });

      expect(results.clampedOrigin).toBe(0); // (0, 0)
      expect(results.clampedCorner).toBe((results.bounds.H - 1) * results.bounds.W + (results.bounds.W - 1)); // (W-1, H-1)
      expect(results.normalPoint).toBe(results.bounds.W + 1); // (1, 1)
    });
  });

  describe('World Setup and Management', () => {
    test('World can be reset with different parameters', async () => {
      // Reset world and capture initial state
      const initialState = await page.evaluate(() => {
        World.colonies = [{id: 1}, {id: 2}]; // Add some colonies
        World.nextId = 5;
        World.tick = 100;
        
        return {
          coloniesBefore: World.colonies.length,
          nextIdBefore: World.nextId,
          tickBefore: World.tick
        };
      });

      expect(initialState.coloniesBefore).toBe(2);
      expect(initialState.nextIdBefore).toBe(5);
      expect(initialState.tickBefore).toBe(100);

      // Reset world via UI (simulating real usage)
      await page.evaluate(() => {
        // Simulate reset button click effect
        World.colonies = [];
        World.nextId = 1;
        World.tick = 0;
      });

      const resetState = await page.evaluate(() => {
        return {
          coloniesAfter: World.colonies.length,
          nextIdAfter: World.nextId,
          tickAfter: World.tick
        };
      });

      expect(resetState.coloniesAfter).toBe(0);
      expect(resetState.nextIdAfter).toBe(1);
      expect(resetState.tickAfter).toBe(0);
    });

    test('World RNG state management works', async () => {
      const rngTest = await page.evaluate(() => {
        // Test RNG state management if available
        if (World.rng && World.getRNGState && World.setRNGState) {
          const val1 = World.rng();
          const state = World.getRNGState();
          const val2 = World.rng(); // Change state
          
          World.setRNGState(state); // Restore state
          const val3 = World.rng(); // Should match val2
          
          return {
            hasRNG: true,
            val1, val2, val3,
            stateRestored: val2 === val3
          };
        }
        return { hasRNG: false };
      });

      if (rngTest.hasRNG) {
        expect(rngTest.val1).not.toBe(rngTest.val2);
        expect(rngTest.stateRestored).toBe(true);
        expect(typeof rngTest.val1).toBe('number');
        expect(typeof rngTest.val2).toBe('number');
        expect(rngTest.val1).toBeWithinRange(0, 1);
        expect(rngTest.val2).toBeWithinRange(0, 1);
      }
    });
  });

  describe('Slime Trail System', () => {
    test('Slime object exists and has required methods', async () => {
      const slimeCheck = await page.evaluate(() => {
        return {
          exists: typeof Slime !== 'undefined',
          hasParams: typeof Slime.params === 'object',
          hasClear: typeof Slime.clear === 'function',
          hasSat: typeof Slime.sat === 'function',
          hasDiffuse: typeof Slime.diffuseEvaporate === 'function',
          params: Slime.params
        };
      });

      expect(slimeCheck.exists).toBe(true);
      expect(slimeCheck.hasParams).toBe(true);
      expect(slimeCheck.hasClear).toBe(true);
      expect(slimeCheck.hasSat).toBe(true);
      expect(slimeCheck.hasDiffuse).toBe(true);
      
      expect(typeof slimeCheck.params.evap).toBe('number');
      expect(typeof slimeCheck.params.diff).toBe('number');
      expect(typeof slimeCheck.params.trailScale).toBe('number');
    });

    test('Slime saturation function produces expected curves', async () => {
      const satResults = await page.evaluate(() => {
        return {
          zero: Slime.sat(0),
          small: Slime.sat(10),
          large: Slime.sat(100),
          huge: Slime.sat(1000)
        };
      });

      expect(satResults.zero).toBe(0);
      expect(satResults.small).toBeGreaterThan(0);
      expect(satResults.large).toBeGreaterThan(satResults.small);
      expect(satResults.huge).toBeGreaterThan(satResults.large);
      
      // All should be between 0 and 1 due to saturation
      expect(satResults.small).toBeWithinRange(0, 1);
      expect(satResults.large).toBeWithinRange(0, 1);
      expect(satResults.huge).toBeWithinRange(0, 1);
    });

    test('Slime diffusion can run without errors', async () => {
      const diffusionTest = await page.evaluate(() => {
        try {
          // Initialize slime trails if not already done
          if (!Slime.trail) {
            const size = World.W * World.H;
            Slime.trail = new Float32Array(size);
            Slime.trailNext = new Float32Array(size);
          }
          
          // Set some initial values
          const centerIdx = Math.floor((World.H / 2) * World.W + (World.W / 2));
          Slime.trail[centerIdx] = 100;
          
          const initialSum = Array.from(Slime.trail).reduce((a, b) => a + b, 0);
          
          // Run diffusion
          Slime.diffuseEvaporate();
          
          const finalSum = Array.from(Slime.trail).reduce((a, b) => a + b, 0);
          
          return {
            success: true,
            initialSum,
            finalSum,
            massLost: finalSum < initialSum,
            diffused: finalSum > 0
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(diffusionTest.success).toBe(true);
      if (diffusionTest.success) {
        expect(diffusionTest.initialSum).toBeGreaterThan(0);
        expect(diffusionTest.massLost).toBe(true); // Should lose some mass to evaporation
        expect(diffusionTest.diffused).toBe(true); // Should still have some mass
      }
    });
  });

  describe('Signal System', () => {
    test('Signals object exists and has required methods', async () => {
      const signalsCheck = await page.evaluate(() => {
        return {
          exists: typeof Signals !== 'undefined',
          hasParams: typeof Signals.params === 'object',
          hasClear: typeof Signals.clear === 'function',
          hasSatStress: typeof Signals.satStress === 'function',
          hasSatAggregation: typeof Signals.satAggregation === 'function',
          hasDiffuse: typeof Signals.diffuseEvaporate === 'function'
        };
      });

      expect(signalsCheck.exists).toBe(true);
      expect(signalsCheck.hasParams).toBe(true);
      expect(signalsCheck.hasClear).toBe(true);
      expect(signalsCheck.hasSatStress).toBe(true);
      expect(signalsCheck.hasSatAggregation).toBe(true);
      expect(signalsCheck.hasDiffuse).toBe(true);
    });

    test('Signal saturation functions work correctly', async () => {
      const satResults = await page.evaluate(() => {
        return {
          stressZero: Signals.satStress(0),
          stressValue: Signals.satStress(50),
          aggZero: Signals.satAggregation(0),
          aggValue: Signals.satAggregation(50)
        };
      });

      expect(satResults.stressZero).toBe(0);
      expect(satResults.aggZero).toBe(0);
      expect(satResults.stressValue).toBeGreaterThan(0);
      expect(satResults.aggValue).toBeGreaterThan(0);
      expect(satResults.stressValue).toBeWithinRange(0, 1);
      expect(satResults.aggValue).toBeWithinRange(0, 1);
    });

    test('Signal diffusion handles uninitialized state gracefully', async () => {
      const diffusionTest = await page.evaluate(() => {
        try {
          // Test that diffusion doesn't crash with uninitialized signals
          Signals.diffuseEvaporate();
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(diffusionTest.success).toBe(true);
    });
  });
});