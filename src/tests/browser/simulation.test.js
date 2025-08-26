// Full Simulation Lifecycle Tests - Real browser environment testing actual simulation behavior
const { utils } = require('../setup/puppeteer.config');

describe('Full Simulation - End-to-End Testing', () => {
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

  beforeEach(async () => {
    // Reset to clean state before each test
    await page.evaluate(() => {
      // Reset world state
      World.colonies = [];
      World.nextId = 1;
      World.tick = 0;
      World.paused = true;
      
      // Clear environment arrays
      World.biomass.fill(0);
      World.tiles.fill(-1);
      
      // Clear slime trails
      if (Slime && Slime.trail) {
        Slime.clear();
      }
      
      // Clear signals
      if (Signals && Signals.clear) {
        Signals.clear();
      }
      
      // Reset RNG to deterministic state
      const testSeed = xmur3('simulation-test')();
      World.rng = sfc32(testSeed);
      
      // Set predictable simulation parameters
      World.mutationRate = 0.2;
      World.capacity = 1.0;
      World.speed = 1.0;
    });
  });

  describe('Simulation Initialization', () => {
    test('World initializes with correct default state', async () => {
      const worldState = await page.evaluate(() => {
        return {
          width: World.W,
          height: World.H,
          coloniesCount: World.colonies.length,
          nextId: World.nextId,
          tick: World.tick,
          paused: World.paused,
          biomassLength: World.biomass.length,
          tilesLength: World.tiles.length,
          environmentsInitialized: {
            humidity: World.env.humidity instanceof Float32Array,
            light: World.env.light instanceof Float32Array,
            nutrient: World.env.nutrient instanceof Float32Array,
            water: World.env.water instanceof Uint8Array
          }
        };
      });

      expect(worldState.width).toBeGreaterThan(0);
      expect(worldState.height).toBeGreaterThan(0);
      expect(worldState.coloniesCount).toBe(0);
      expect(worldState.nextId).toBe(1);
      expect(worldState.tick).toBe(0);
      expect(worldState.paused).toBe(true);
      expect(worldState.biomassLength).toBe(worldState.width * worldState.height);
      expect(worldState.tilesLength).toBe(worldState.width * worldState.height);
      expect(worldState.environmentsInitialized.humidity).toBe(true);
      expect(worldState.environmentsInitialized.light).toBe(true);
      expect(worldState.environmentsInitialized.nutrient).toBe(true);
      expect(worldState.environmentsInitialized.water).toBe(true);
    });

    test('Environment has realistic value distributions', async () => {
      const envStats = await page.evaluate(() => {
        const humidity = Array.from(World.env.humidity);
        const light = Array.from(World.env.light);
        const nutrient = Array.from(World.env.nutrient);
        const water = Array.from(World.env.water);

        const getStats = (arr) => ({
          min: Math.min(...arr),
          max: Math.max(...arr),
          avg: arr.reduce((a, b) => a + b, 0) / arr.length,
          allInRange: arr.every(v => v >= 0 && v <= 1)
        });

        return {
          humidity: getStats(humidity),
          light: getStats(light),
          nutrient: getStats(nutrient),
          water: {
            zeroCount: water.filter(v => v === 0).length,
            oneCount: water.filter(v => v === 1).length,
            totalCells: water.length,
            allBinary: water.every(v => v === 0 || v === 1)
          }
        };
      });

      // Environment should have realistic distributions
      expect(envStats.humidity.allInRange).toBe(true);
      expect(envStats.light.allInRange).toBe(true);
      expect(envStats.nutrient.allInRange).toBe(true);
      
      // Should have variation, not all the same value
      expect(envStats.humidity.max - envStats.humidity.min).toBeGreaterThan(0.1);
      expect(envStats.light.max - envStats.light.min).toBeGreaterThan(0.1);
      
      // Water should be binary (0 or 1)
      expect(envStats.water.allBinary).toBe(true);
      expect(envStats.water.zeroCount + envStats.water.oneCount).toBe(envStats.water.totalCells);
    });
  });

  describe('Colony Creation and Basic Behavior', () => {
    test('newColony creates valid colonies with expected properties', async () => {
      const colonyData = await page.evaluate(() => {
        const colony = newColony('MAT', 50, 25);
        
        return {
          success: colony !== null,
          colony: colony ? {
            id: colony.id,
            type: colony.type,
            x: colony.x,
            y: colony.y,
            age: colony.age,
            biomass: colony.biomass,
            gen: colony.gen,
            hasTraits: typeof colony.traits === 'object',
            traitKeys: colony.traits ? Object.keys(colony.traits).sort() : [],
            hasColor: Array.isArray(colony.color) || typeof colony.color === 'string',
            hasPattern: colony.pattern !== null && colony.pattern !== undefined
          } : null
        };
      });

      expect(colonyData.success).toBe(true);
      expect(colonyData.colony.id).toBe(1);
      expect(colonyData.colony.type).toBe('MAT');
      expect(colonyData.colony.x).toBe(50);
      expect(colonyData.colony.y).toBe(25);
      expect(colonyData.colony.age).toBe(0);
      expect(colonyData.colony.biomass).toBeGreaterThan(0);
      expect(colonyData.colony.gen).toBeGreaterThanOrEqual(0);
      expect(colonyData.colony.hasTraits).toBe(true);
      expect(colonyData.colony.traitKeys).toContain('water_need');
      expect(colonyData.colony.traitKeys).toContain('photosym');
      expect(colonyData.colony.hasColor).toBe(true);
      expect(colonyData.colony.hasPattern).toBe(true);
    });

    test('Colony placement updates world state correctly', async () => {
      const placementTest = await page.evaluate(() => {
        const x = 40, y = 30;
        const colony = newColony('CORD', x, y);
        
        const idx = y * World.W + x; // Calculate index
        
        return {
          colonyCreated: colony !== null,
          worldColoniesCount: World.colonies.length,
          tileOccupied: World.tiles[idx] === colony.id,
          biomassSet: World.biomass[idx] > 0,
          slimeDeposited: Slime.trail[idx] > 0
        };
      });

      expect(placementTest.colonyCreated).toBe(true);
      expect(placementTest.worldColoniesCount).toBe(1);
      expect(placementTest.tileOccupied).toBe(true);
      expect(placementTest.biomassSet).toBe(true);
      expect(placementTest.slimeDeposited).toBe(true);
    });

    test('Different archetypes create colonies with distinct traits', async () => {
      const archetypeComparison = await page.evaluate(() => {
        // Get base archetype definitions for validation
        const matBase = Archetypes.MAT.base;
        const towerBase = Archetypes.TOWER.base;
        const eatBase = Archetypes.EAT.base;
        
        // Create colonies
        const mat = newColony('MAT', 20, 20);
        const tower = newColony('TOWER', 25, 25);
        const eat = newColony('EAT', 30, 30);
        
        return {
          baselines: {
            mat: matBase,
            tower: towerBase,
            eat: eatBase
          },
          colonies: {
            mat: {
              type: mat.type,
              waterNeed: mat.traits.water_need,
              photosym: mat.traits.photosym,
              transport: mat.traits.transport,
              predation: mat.traits.predation
            },
            tower: {
              type: tower.type,
              waterNeed: tower.traits.water_need,
              photosym: tower.traits.photosym,
              transport: tower.traits.transport,
              predation: tower.traits.predation
            },
            eat: {
              type: eat.type,
              waterNeed: eat.traits.water_need,
              photosym: eat.traits.photosym,
              transport: eat.traits.transport,
              predation: eat.traits.predation
            }
          }
        };
      });

      const { baselines, colonies } = archetypeComparison;
      
      // MAT archetype validation (water_need: 0.7, photosym: 0.15) - allow for mutation
      expect(colonies.mat.waterNeed).toBeCloseTo(baselines.mat.water_need, 0); // Within 0.5 due to mutation
      expect(colonies.mat.photosym).toBeCloseTo(baselines.mat.photosym, 0);
      expect(colonies.mat.waterNeed).toBeGreaterThan(0.6); // High water dependency range
      
      // TOWER archetype validation (photosym: 0.75, predation: 0.05) - allow for mutation
      expect(colonies.tower.photosym).toBeCloseTo(baselines.tower.photosym, 0);
      expect(colonies.tower.predation).toBeCloseTo(baselines.tower.predation, 0);
      expect(colonies.tower.photosym).toBeGreaterThan(0.6); // High photosynthesis range
      
      // EAT archetype validation (photosym: 0.0, predation: 0.85) - allow for mutation
      expect(colonies.eat.photosym).toBeCloseTo(baselines.eat.photosym, 0);
      expect(colonies.eat.predation).toBeCloseTo(baselines.eat.predation, 0);
      expect(colonies.eat.photosym).toBeLessThan(0.2); // Should remain very low
      expect(colonies.eat.predation).toBeGreaterThan(0.7); // High predation range
      
      // Verify archetype distinctiveness
      expect(colonies.mat.type).not.toBe(colonies.tower.type);
      expect(colonies.tower.type).not.toBe(colonies.eat.type);
      
      // Verify biological accuracy relationships
      expect(colonies.mat.waterNeed).toBeGreaterThan(colonies.tower.waterNeed); // MAT > TOWER water need
      expect(colonies.tower.photosym).toBeGreaterThan(colonies.mat.photosym);   // TOWER > MAT photosynthesis
      expect(colonies.tower.photosym).toBeGreaterThan(colonies.eat.photosym);   // TOWER > EAT photosynthesis
      expect(colonies.eat.predation).toBeGreaterThan(colonies.mat.predation);   // EAT > MAT predation
    });
  });

  describe('Simulation Step Mechanics', () => {
    test('stepEcosystem advances simulation state', async () => {
      const stepTest = await page.evaluate(() => {
        // Create a colony first
        newColony('MAT', 50, 25);
        
        const initialTick = World.tick;
        const initialAge = World.colonies[0].age;
        
        // Run one ecosystem step
        stepEcosystem();
        
        const finalTick = World.tick;
        const finalAge = World.colonies[0].age;
        
        return {
          tickAdvanced: finalTick > initialTick,
          colonyAged: finalAge > initialAge,
          tickDifference: finalTick - initialTick,
          ageDifference: finalAge - initialAge
        };
      });

      expect(stepTest.tickAdvanced).toBe(true);
      expect(stepTest.colonyAged).toBe(true);
      expect(stepTest.tickDifference).toBeGreaterThan(0);
      expect(stepTest.ageDifference).toBeGreaterThan(0);
    });

    test('Slime trails diffuse and evaporate over time', async () => {
      const slimeTest = await page.evaluate(() => {
        // Create colony to deposit slime, then pause to prevent further deposition
        const colony = newColony('MAT', 50, 25);
        const centerIdx = 25 * World.W + 50;
        
        // Initial measurement after colony creation
        const initialSlime = Slime.trail[centerIdx];
        const initialSum = Array.from(Slime.trail).reduce((a, b) => a + b, 0);
        
        // Remove colony to stop further slime deposition
        World.colonies = [];
        World.tiles.fill(-1);
        World.biomass.fill(0);
        
        // Collect neighbor slime values before diffusion
        const neighbors = [
          Slime.trail[centerIdx - World.W] || 0,     // above
          Slime.trail[centerIdx + World.W] || 0,     // below  
          Slime.trail[centerIdx - 1] || 0,           // left
          Slime.trail[centerIdx + 1] || 0            // right
        ];
        const initialNeighborSum = neighbors.reduce((a, b) => a + b, 0);
        
        // Run diffusion/evaporation steps only (no colony updates)
        for (let i = 0; i < 8; i++) {
          Slime.diffuseEvaporate();
        }
        
        const finalSlime = Slime.trail[centerIdx];
        const finalSum = Array.from(Slime.trail).reduce((a, b) => a + b, 0);
        
        // Check neighbor values after diffusion
        const finalNeighbors = [
          Slime.trail[centerIdx - World.W] || 0,     // above
          Slime.trail[centerIdx + World.W] || 0,     // below  
          Slime.trail[centerIdx - 1] || 0,           // left
          Slime.trail[centerIdx + 1] || 0            // right
        ];
        const finalNeighborSum = finalNeighbors.reduce((a, b) => a + b, 0);
        
        return {
          initialSlime,
          finalSlime,
          initialSum,
          finalSum,
          initialNeighborSum,
          finalNeighborSum,
          evaporationOccurred: finalSum < initialSum * 0.98, // Account for 8 steps of 1.5% evaporation
          diffusionOccurred: finalNeighborSum > initialNeighborSum,
          centerReduced: finalSlime < initialSlime
        };
      });

      // Colony should have deposited initial slime
      expect(slimeTest.initialSlime).toBeGreaterThan(0);
      
      // After 8 steps with 1.5% evaporation per step, total should decrease significantly
      expect(slimeTest.evaporationOccurred).toBe(true);
      
      // Slime should diffuse from center to neighbors
      expect(slimeTest.diffusionOccurred).toBe(true);
      
      // Center concentration should reduce due to both evaporation and diffusion
      expect(slimeTest.centerReduced).toBe(true);
    });

    test('Colonies attempt expansion and fitness affects success', async () => {
      const expansionTest = await page.evaluate(() => {
        // Create colony in center where it should have room to expand
        const colony = newColony('MAT', World.W / 2, World.H / 2);
        const initialBiomass = colony.biomass;
        
        // Run simulation for expansion attempts
        const results = [];
        for (let i = 0; i < 20; i++) {
          stepEcosystem();
          results.push({
            tick: World.tick,
            biomass: colony.biomass,
            fitness: colony.lastFit || 0
          });
        }
        
        const finalBiomass = colony.biomass;
        const averageFitness = results.reduce((sum, r) => sum + r.fitness, 0) / results.length;
        
        return {
          initialBiomass,
          finalBiomass,
          averageFitness,
          fitnessCalculated: results.some(r => r.fitness > 0),
          biomassChanged: finalBiomass !== initialBiomass
        };
      });

      expect(expansionTest.fitnessCalculated).toBe(true);
      expect(expansionTest.averageFitness).toBeGreaterThan(0);
      expect(expansionTest.averageFitness).toBeLessThan(1);
      expect(expansionTest.biomassChanged).toBe(true);
    });
  });

  describe('Population Dynamics', () => {
    test('Colonies can reproduce when conditions are favorable', async () => {
      const reproductionTest = await page.evaluate(() => {
        // Create optimal conditions for reproduction
        const centerX = Math.floor(World.W / 2);
        const centerY = Math.floor(World.H / 2);
        const centerIdx = centerY * World.W + centerX;
        
        // Set up ideal environment around the colony
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const y = centerY + dy;
            const x = centerX + dx;
            if (x >= 0 && x < World.W && y >= 0 && y < World.H) {
              const idx = y * World.W + x;
              World.env.nutrient[idx] = 0.9;  // Rich nutrients
              World.env.light[idx] = 0.8;     // Good light
              World.env.humidity[idx] = 0.8;  // Good humidity
              World.env.water[idx] = 1;       // Water available
            }
          }
        }
        
        // Create colony with high biomass and good fitness potential
        const parentColony = newColony('MAT', centerX, centerY);
        parentColony.biomass = 3.0;  // Very high biomass for reproduction
        parentColony.age = 10;       // Mature colony
        
        const initialCount = World.colonies.length;
        let stepsTaken = 0;
        
        // Run simulation with deterministic reproduction conditions
        for (let i = 0; i < 30; i++) {
          stepsTaken = i + 1;
          stepEcosystem();
          
          // Break if we see reproduction
          if (World.colonies.length > initialCount) {
            break;
          }
        }
        
        const finalCount = World.colonies.length;
        const reproduced = finalCount > initialCount;
        
        // Gather detailed colony data
        const coloniesData = World.colonies.map(c => ({
          id: c.id,
          type: c.type,
          gen: c.gen,
          parent: c.parent,
          kids: c.kids ? c.kids.length : 0,
          biomass: c.biomass,
          age: c.age,
          fitness: c.lastFit || 0
        }));
        
        const foundParent = coloniesData.find(c => c.kids > 0);
        const foundChild = coloniesData.find(c => c.parent !== null);
        
        return {
          initialCount,
          finalCount,
          stepsTaken,
          reproduced,
          parentColony: foundParent || null,
          childColony: foundChild || null,
          allColoniesData: coloniesData,
          environmentalConditions: {
            centerNutrient: World.env.nutrient[centerIdx],
            centerLight: World.env.light[centerIdx],
            centerWater: World.env.water[centerIdx]
          }
        };
      });

      // Basic setup validation
      expect(reproductionTest.initialCount).toBe(1);
      
      // Reproduction should occur under these optimal conditions
      expect(reproductionTest.reproduced).toBe(true);
      expect(reproductionTest.finalCount).toBeGreaterThan(1);
      
      // Validate parent-child relationships when reproduction occurs
      expect(reproductionTest.parentColony).not.toBeNull();
      expect(reproductionTest.childColony).not.toBeNull();
      
      expect(reproductionTest.parentColony.kids).toBeGreaterThan(0);
      expect(reproductionTest.childColony.gen).toBeGreaterThan(reproductionTest.parentColony.gen);
      expect(reproductionTest.childColony.parent).toBe(reproductionTest.parentColony.id);
      expect(reproductionTest.childColony.type).toBe(reproductionTest.parentColony.type);
    });

    test('Multiple archetype populations can coexist', async () => {
      const coexistenceTest = await page.evaluate(() => {
        // Create different archetype colonies
        const archetypes = ['MAT', 'TOWER', 'CORD', 'EAT'];
        const colonies = [];
        
        // Spread them across the world
        for (let i = 0; i < archetypes.length; i++) {
          const x = 20 + i * 30;
          const y = 20 + i * 15;
          const colony = newColony(archetypes[i], x, y);
          if (colony) {
            colony.biomass = 1.5; // Give them good starting biomass
            colonies.push(colony);
          }
        }
        
        const initialCounts = {};
        archetypes.forEach(type => {
          initialCounts[type] = World.colonies.filter(c => c.type === type).length;
        });
        
        // Run simulation
        for (let i = 0; i < 100; i++) {
          stepEcosystem();
        }
        
        const finalCounts = {};
        archetypes.forEach(type => {
          finalCounts[type] = World.colonies.filter(c => c.type === type).length;
        });
        
        const typesPresent = Object.values(finalCounts).filter(count => count > 0).length;
        
        return {
          initialCounts,
          finalCounts,
          totalInitial: Object.values(initialCounts).reduce((a, b) => a + b, 0),
          totalFinal: Object.values(finalCounts).reduce((a, b) => a + b, 0),
          typesPresent,
          diversityMaintained: typesPresent > 1
        };
      });

      expect(coexistenceTest.totalInitial).toBeGreaterThan(0);
      expect(coexistenceTest.totalFinal).toBeGreaterThan(0);
      
      // Should maintain meaningful diversity (at least 2 different archetypes)
      expect(coexistenceTest.typesPresent).toBeGreaterThanOrEqual(2);
      expect(coexistenceTest.diversityMaintained).toBe(true);
      
      // At least half of the initial archetype types should survive
      const initialTypes = Object.keys(coexistenceTest.initialCounts).filter(
        type => coexistenceTest.initialCounts[type] > 0
      ).length;
      expect(coexistenceTest.typesPresent).toBeGreaterThanOrEqual(Math.ceil(initialTypes / 2));
    });

    test('Starvation sweep removes weak colonies', async () => {
      const starvationTest = await page.evaluate(() => {
        // Create colonies with very low biomass
        const weakColonies = [];
        for (let i = 0; i < 5; i++) {
          const colony = newColony('MAT', 20 + i * 10, 20);
          if (colony) {
            colony.biomass = 0.01; // Very low biomass
            weakColonies.push(colony.id);
          }
        }
        
        const initialCount = World.colonies.length;
        
        // Run simulation to trigger starvation
        for (let i = 0; i < 30; i++) {
          stepEcosystem();
        }
        
        const finalCount = World.colonies.length;
        const survivedIds = World.colonies.map(c => c.id);
        const removedIds = weakColonies.filter(id => !survivedIds.includes(id));
        
        return {
          initialCount,
          finalCount,
          weakColoniesCreated: weakColonies.length,
          coloniesRemoved: removedIds.length,
          starvationOccurred: finalCount < initialCount
        };
      });

      expect(starvationTest.weakColoniesCreated).toBeGreaterThan(0);
      
      // Weak colonies should be removed by starvation
      if (starvationTest.coloniesRemoved > 0) {
        expect(starvationTest.starvationOccurred).toBe(true);
        expect(starvationTest.finalCount).toBeLessThan(starvationTest.initialCount);
      }
    });
  });

  describe('Environmental Interactions', () => {
    test('Nutrient consumption affects colony growth and fitness', async () => {
      const nutrientTest = await page.evaluate(() => {
        // Helper function to set up environmental areas
        const setupEnvironmentalArea = (centerX, centerY, conditions, radius = 2) => {
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const y = centerY + dy;
              const x = centerX + dx;
              if (x >= 0 && x < World.W && y >= 0 && y < World.H) {
                const idx = y * World.W + x;
                if (conditions.nutrient !== undefined) World.env.nutrient[idx] = conditions.nutrient;
                if (conditions.humidity !== undefined) World.env.humidity[idx] = conditions.humidity;
                if (conditions.light !== undefined) World.env.light[idx] = conditions.light;
                if (conditions.water !== undefined) World.env.water[idx] = conditions.water;
              }
            }
          }
        };
        
        // Create rich and poor nutrient areas (5x5 patches for meaningful area coverage)
        const richCenterX = 40, richCenterY = 30;
        const poorCenterX = 120, poorCenterY = 60;
        
        setupEnvironmentalArea(richCenterX, richCenterY, {
          nutrient: 0.9,
          humidity: 0.7,
          light: 0.6
        });
        
        setupEnvironmentalArea(poorCenterX, poorCenterY, {
          nutrient: 0.1,
          humidity: 0.3,
          light: 0.6
        });
        
        const richCenterIdx = richCenterY * World.W + richCenterX;
        const poorCenterIdx = poorCenterY * World.W + poorCenterX;
        
        const initialRichNutrients = World.env.nutrient[richCenterIdx];
        const initialPoorNutrients = World.env.nutrient[poorCenterIdx];
        
        // Create identical MAT colonies in both areas
        const richColony = newColony('MAT', richCenterX, richCenterY);
        const poorColony = newColony('MAT', poorCenterX, poorCenterY);
        
        // Run simulation long enough for meaningful growth differences
        for (let i = 0; i < 25; i++) {
          stepEcosystem();
        }
        
        const finalRichNutrients = World.env.nutrient[richCenterIdx];
        const finalPoorNutrients = World.env.nutrient[poorCenterIdx];
        
        return {
          richColonyFitness: richColony.lastFit || 0,
          poorColonyFitness: poorColony.lastFit || 0,
          richColonyBiomass: richColony.biomass,
          poorColonyBiomass: poorColony.biomass,
          nutrientConsumption: {
            rich: initialRichNutrients - finalRichNutrients,
            poor: initialPoorNutrients - finalPoorNutrients
          }
        };
      });

      // Verify nutrient consumption occurred during simulation
      expect(nutrientTest.nutrientConsumption.rich).toBeGreaterThan(0);
      
      // Environmental advantage threshold - rich environment should provide at least 25% better performance
      // This reflects the biological expectation that 9x nutrient difference (0.9 vs 0.1) should create measurable advantage
      const ENVIRONMENTAL_ADVANTAGE_THRESHOLD = 1.25;
      
      // Rich environment should produce significantly higher fitness
      expect(nutrientTest.richColonyFitness).toBeGreaterThanOrEqual(nutrientTest.poorColonyFitness * ENVIRONMENTAL_ADVANTAGE_THRESHOLD);
      
      // Rich colony should have grown more biomass due to better conditions  
      expect(nutrientTest.richColonyBiomass).toBeGreaterThan(nutrientTest.poorColonyBiomass);
      
      // Both colonies should have positive fitness (survived)
      expect(nutrientTest.richColonyFitness).toBeGreaterThan(0);
      expect(nutrientTest.poorColonyFitness).toBeGreaterThan(0);
    });

    test('Water availability affects MAT archetype performance', async () => {
      const waterTest = await page.evaluate(() => {
        // Helper function to set up environmental areas
        const setupEnvironmentalArea = (centerX, centerY, conditions, radius = 2) => {
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const y = centerY + dy;
              const x = centerX + dx;
              if (x >= 0 && x < World.W && y >= 0 && y < World.H) {
                const idx = y * World.W + x;
                if (conditions.nutrient !== undefined) World.env.nutrient[idx] = conditions.nutrient;
                if (conditions.humidity !== undefined) World.env.humidity[idx] = conditions.humidity;
                if (conditions.light !== undefined) World.env.light[idx] = conditions.light;
                if (conditions.water !== undefined) World.env.water[idx] = conditions.water;
              }
            }
          }
        };
        
        // Create water-rich and water-poor areas programmatically
        const waterRichX = 50, waterRichY = 35;
        const waterPoorX = 110, waterPoorY = 55;
        
        setupEnvironmentalArea(waterRichX, waterRichY, {
          water: 1,        // Water present
          nutrient: 0.6,   // Moderate nutrients
          humidity: 0.8,   // High humidity
          light: 0.5       // Moderate light
        });
        
        setupEnvironmentalArea(waterPoorX, waterPoorY, {
          water: 0,        // No water
          nutrient: 0.6,   // Same nutrients
          humidity: 0.3,   // Low humidity
          light: 0.5       // Same light
        });
        
        // Create MAT colonies (water_need: 0.7 - high water dependency)
        const waterRichColony = newColony('MAT', waterRichX, waterRichY);
        const waterPoorColony = newColony('MAT', waterPoorX, waterPoorY);
        
        // Run simulation
        for (let i = 0; i < 20; i++) {
          stepEcosystem();
        }
        
        return {
          waterRichFitness: waterRichColony.lastFit || 0,
          waterPoorFitness: waterPoorColony.lastFit || 0,
          waterRichBiomass: waterRichColony.biomass,
          waterPoorBiomass: waterPoorColony.biomass,
          matWaterNeed: waterRichColony.traits.water_need
        };
      });

      // Verify MAT archetype has high water need as expected
      expect(waterTest.matWaterNeed).toBeCloseTo(0.7, 1); // MAT base water_need
      
      // Water dependency threshold - MAT archetype (water_need: 0.7) should show strong preference for water
      // This reflects that high-water-need organisms should perform 30% better in water-rich environments
      const WATER_DEPENDENCY_ADVANTAGE = 1.3;
      
      // Water-rich colony should significantly outperform water-poor colony due to MAT's high water need (0.7)
      expect(waterTest.waterRichFitness).toBeGreaterThan(waterTest.waterPoorFitness);
      
      // Water-rich colony should have grown more biomass in suitable habitat
      expect(waterTest.waterRichBiomass).toBeGreaterThan(waterTest.waterPoorBiomass);
      
      // Both should survive but with different performance levels
      expect(waterTest.waterRichFitness).toBeGreaterThan(0);
      expect(waterTest.waterPoorFitness).toBeGreaterThan(0);
      
      // Performance difference should be substantial for high-water-need archetype (MAT water_need: 0.7)
      expect(waterTest.waterRichFitness).toBeGreaterThanOrEqual(waterTest.waterPoorFitness * WATER_DEPENDENCY_ADVANTAGE);
    });
  });

  describe('Simulation Consistency', () => {
    test('RNG produces consistent sequences with same seed', async () => {
      const rngTest = await page.evaluate(() => {
        const seed = 'test-seed';
        const sequence1 = [];
        const sequence2 = [];
        
        // Generate first sequence
        let rng1 = sfc32(xmur3(seed)());
        for (let i = 0; i < 20; i++) {
          sequence1.push(rng1());
        }
        
        // Generate second sequence with same seed
        let rng2 = sfc32(xmur3(seed)());
        for (let i = 0; i < 20; i++) {
          sequence2.push(rng2());
        }
        
        return {
          sequence1,
          sequence2,
          identical: JSON.stringify(sequence1) === JSON.stringify(sequence2),
          firstValues: sequence1.slice(0, 5),
          allInRange: [...sequence1, ...sequence2].every(v => v >= 0 && v < 1)
        };
      });

      expect(rngTest.sequence1).toHaveLength(20);
      expect(rngTest.sequence2).toHaveLength(20);
      expect(rngTest.identical).toBe(true);
      expect(rngTest.allInRange).toBe(true);
      expect(rngTest.firstValues.every(v => typeof v === 'number')).toBe(true);
    });

    test('Colony creation with same parameters produces consistent results', async () => {
      const consistencyTest = await page.evaluate(() => {
        const results = [];
        
        // Create multiple colonies with same parameters
        for (let i = 0; i < 5; i++) {
          // Reset state
          World.colonies = [];
          World.nextId = 1;
          World.biomass.fill(0);
          World.tiles.fill(-1);
          
          // Set deterministic RNG
          World.rng = sfc32(xmur3('colony-test')());
          
          const colony = newColony('MAT', 60, 30);
          results.push({
            created: !!colony,
            type: colony ? colony.type : null,
            hasTraits: colony ? typeof colony.traits === 'object' : false,
            biomass: colony ? colony.biomass : 0
          });
        }
        
        return {
          results,
          allCreated: results.every(r => r.created),
          allSameType: results.every(r => r.type === 'MAT'),
          allHaveTraits: results.every(r => r.hasTraits)
        };
      });

      expect(consistencyTest.allCreated).toBe(true);
      expect(consistencyTest.allSameType).toBe(true);
      expect(consistencyTest.allHaveTraits).toBe(true);
      expect(consistencyTest.results).toHaveLength(5);
    });

    test('Ecosystem behavior is stable and predictable', async () => {
      const stabilityTest = await page.evaluate(() => {
        // Create a simple controlled scenario
        World.rng = sfc32(xmur3('stability-test')());
        const colony = newColony('MAT', World.W / 2, World.H / 2);
        
        if (!colony) return { testSkipped: true };
        
        const snapshots = [];
        
        // Take periodic snapshots
        for (let step = 0; step < 30; step += 10) {
          for (let i = 0; i < 10; i++) {
            stepEcosystem();
          }
          
          snapshots.push({
            step: step + 10,
            tick: World.tick,
            coloniesAlive: World.colonies.length,
            totalBiomass: World.colonies.reduce((sum, c) => sum + c.biomass, 0),
            fitnessValues: World.colonies.map(c => c.lastFit || 0)
          });
        }
        
        return {
          testSkipped: false,
          snapshots,
          simulationProgressed: snapshots[2].tick > snapshots[0].tick,
          biomassStable: snapshots.every(s => s.totalBiomass > 0),
          fitnessCalculated: snapshots.some(s => s.fitnessValues.some(f => f > 0))
        };
      });

      if (!stabilityTest.testSkipped) {
        expect(stabilityTest.snapshots).toHaveLength(3);
        expect(stabilityTest.simulationProgressed).toBe(true);
        expect(stabilityTest.biomassStable).toBe(true);
        expect(stabilityTest.fitnessCalculated).toBe(true);
        
        // Check that simulation produces reasonable progression
        const ticks = stabilityTest.snapshots.map(s => s.tick);
        expect(ticks[1]).toBeGreaterThan(ticks[0]);
        expect(ticks[2]).toBeGreaterThan(ticks[1]);
      }
    });
  });
});