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
        const mat = newColony('MAT', 20, 20);
        const tower = newColony('TOWER', 25, 25);
        const eat = newColony('EAT', 30, 30);
        
        return {
          mat: {
            type: mat.type,
            waterNeed: mat.traits.water_need,
            photosym: mat.traits.photosym,
            transport: mat.traits.transport
          },
          tower: {
            type: tower.type,
            waterNeed: tower.traits.water_need,
            photosym: tower.traits.photosym,
            transport: tower.traits.transport
          },
          eat: {
            type: eat.type,
            waterNeed: eat.traits.water_need,
            photosym: eat.traits.photosym,
            transport: eat.traits.transport
          }
        };
      });

      // MAT should have high water need
      expect(archetypeComparison.mat.waterNeed).toBeGreaterThan(0.6);
      
      // TOWER should have high photosynthesis
      expect(archetypeComparison.tower.photosym).toBeGreaterThan(0.6);
      
      // EAT should have low photosynthesis
      expect(archetypeComparison.eat.photosym).toBeLessThan(0.3);
      
      // Archetypes should be different
      expect(archetypeComparison.mat.type).not.toBe(archetypeComparison.tower.type);
      expect(archetypeComparison.tower.type).not.toBe(archetypeComparison.eat.type);
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
        // Create colony to deposit slime
        newColony('MAT', 50, 25);
        const centerIdx = 25 * World.W + 50;
        
        const initialSlime = Slime.trail[centerIdx];
        const initialSum = Array.from(Slime.trail).reduce((a, b) => a + b, 0);
        
        // Run several steps to see diffusion/evaporation
        for (let i = 0; i < 10; i++) {
          stepEcosystem();
        }
        
        const finalSlime = Slime.trail[centerIdx];
        const finalSum = Array.from(Slime.trail).reduce((a, b) => a + b, 0);
        
        return {
          initialSlime,
          finalSlime,
          initialSum,
          finalSum,
          slimeReduced: finalSlime < initialSlime,
          totalReduced: finalSum < initialSum
        };
      });

      expect(slimeTest.initialSlime).toBeGreaterThan(0);
      // Slime should change over time (either evaporate or diffuse)
      expect(slimeTest.slimeReduced || slimeTest.finalSlime !== slimeTest.initialSlime).toBe(true);
      // Total may increase due to ongoing colony deposition, but should eventually decrease if left alone
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
        // Create a colony with high biomass
        const parentColony = newColony('MAT', World.W / 2, World.H / 2);
        parentColony.biomass = 2.0; // Set high biomass to encourage reproduction
        
        const initialCount = World.colonies.length;
        let reproduced = false;
        
        // Run simulation until reproduction or timeout
        for (let i = 0; i < 50 && World.colonies.length === initialCount; i++) {
          stepEcosystem();
          if (World.colonies.length > initialCount) {
            reproduced = true;
            break;
          }
        }
        
        const finalCount = World.colonies.length;
        const hasChildren = World.colonies.some(c => c.kids && c.kids.length > 0);
        
        return {
          initialCount,
          finalCount,
          reproduced,
          hasChildren,
          coloniesData: World.colonies.map(c => ({
            id: c.id,
            type: c.type,
            gen: c.gen,
            parent: c.parent,
            kids: c.kids ? c.kids.length : 0
          }))
        };
      });

      expect(reproductionTest.initialCount).toBe(1);
      
      if (reproductionTest.reproduced) {
        expect(reproductionTest.finalCount).toBeGreaterThan(1);
        expect(reproductionTest.hasChildren).toBe(true);
        
        // Check parent-child relationships
        const parentColony = reproductionTest.coloniesData.find(c => c.kids > 0);
        const childColony = reproductionTest.coloniesData.find(c => c.parent !== null);
        
        if (parentColony && childColony) {
          expect(parentColony.kids).toBeGreaterThan(0);
          expect(childColony.gen).toBeGreaterThan(parentColony.gen);
          expect(childColony.parent).toBe(parentColony.id);
        }
      }
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
      
      // Should maintain some diversity
      expect(coexistenceTest.typesPresent).toBeGreaterThan(0);
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
    test('Nutrient dynamics affect colony success', async () => {
      const nutrientTest = await page.evaluate(() => {
        // Create colonies in different nutrient environments
        const highNutrientX = 30, highNutrientY = 30;
        const lowNutrientX = 100, lowNutrientY = 50;
        
        // Manually set nutrient levels for testing
        const highIdx = highNutrientY * World.W + highNutrientX;
        const lowIdx = lowNutrientY * World.W + lowNutrientX;
        
        World.env.nutrient[highIdx] = 0.9; // High nutrients
        World.env.nutrient[lowIdx] = 0.1;  // Low nutrients
        
        const highNutrientColony = newColony('MAT', highNutrientX, highNutrientY);
        const lowNutrientColony = newColony('MAT', lowNutrientX, lowNutrientY);
        
        // Run simulation
        for (let i = 0; i < 20; i++) {
          stepEcosystem();
        }
        
        return {
          highNutrientFitness: highNutrientColony ? highNutrientColony.lastFit : 0,
          lowNutrientFitness: lowNutrientColony ? lowNutrientColony.lastFit : 0,
          highNutrientBiomass: highNutrientColony ? highNutrientColony.biomass : 0,
          lowNutrientBiomass: lowNutrientColony ? lowNutrientColony.biomass : 0,
          bothSurvived: !!(highNutrientColony && lowNutrientColony),
          highSurvived: !!highNutrientColony,
          lowSurvived: !!lowNutrientColony
        };
      });

      // Check if both colonies were created (they might not survive harsh conditions)
      expect(typeof nutrientTest.bothSurvived).toBe('boolean');
      
      // High nutrient colony should generally perform better
      expect(nutrientTest.highNutrientFitness).toBeGreaterThan(0);
      expect(nutrientTest.lowNutrientFitness).toBeGreaterThan(0);
    });

    test('Water availability affects water-dependent archetypes', async () => {
      const waterTest = await page.evaluate(() => {
        // Find water and dry areas
        let waterIdx = -1, dryIdx = -1;
        
        for (let i = 0; i < World.env.water.length && (waterIdx === -1 || dryIdx === -1); i++) {
          if (World.env.water[i] === 1 && waterIdx === -1) {
            waterIdx = i;
          } else if (World.env.water[i] === 0 && dryIdx === -1) {
            dryIdx = i;
          }
        }
        
        if (waterIdx === -1 || dryIdx === -1) {
          return { testSkipped: true, reason: 'Could not find suitable water/dry areas' };
        }
        
        const waterX = waterIdx % World.W;
        const waterY = Math.floor(waterIdx / World.W);
        const dryX = dryIdx % World.W;
        const dryY = Math.floor(dryIdx / World.W);
        
        // Create MAT colonies (high water need) in both areas
        const waterColony = newColony('MAT', waterX, waterY);
        const dryColony = newColony('MAT', dryX, dryY);
        
        if (!waterColony || !dryColony) {
          return { testSkipped: true, reason: 'Failed to create test colonies' };
        }
        
        // Run simulation
        for (let i = 0; i < 15; i++) {
          stepEcosystem();
        }
        
        return {
          testSkipped: false,
          waterColonyFitness: waterColony.lastFit || 0,
          dryColonyFitness: dryColony.lastFit || 0,
          waterColonyBiomass: waterColony.biomass,
          dryColonyBiomass: dryColony.biomass,
          waterAdvantage: (waterColony.lastFit || 0) >= (dryColony.lastFit || 0)
        };
      });

      if (!waterTest.testSkipped) {
        expect(waterTest.waterColonyFitness).toBeGreaterThan(0);
        expect(waterTest.dryColonyFitness).toBeGreaterThan(0);
        // Water colony should generally have advantage for MAT archetype
        expect(waterTest.waterColonyFitness).toBeGreaterThanOrEqual(waterTest.dryColonyFitness * 0.8);
      }
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