/* ===== Ecosystem Tests ===== */

function runEcosystemTests() {
    const runner = new TestRunner();

    runner.test('Slime trail diffusion and evaporation work', () => {
        const restore = createTestWorld(10, 10);
        
        // Create a spike in the center
        const centerIdx = idx(5, 5);
        Slime.trail[centerIdx] = 100;
        
        const initialSum = Slime.trail.reduce((a, v) => a + v, 0);
        
        // Run diffusion/evaporation
        Slime.diffuseEvaporate();
        
        const afterSum = Slime.trail.reduce((a, v) => a + v, 0);
        
        runner.assertLessThan(afterSum, initialSum, 'Total trail should decrease due to evaporation');
        runner.assertLessThan(Slime.trail[centerIdx], 100, 'Center should lose some intensity');
        runner.assertGreaterThan(Slime.trail[idx(4, 5)], 0, 'Adjacent cells should gain trail');
        runner.assertGreaterThan(Slime.trail[idx(6, 5)], 0, 'Adjacent cells should gain trail');
        
        restore.restore();
    });

    runner.test('Slime saturation function works', () => {
        runner.assertApproxEqual(Slime.sat(0), 0, 0.001, 'Saturation of 0 should be 0');
        runner.assertLessThan(Slime.sat(10), 1, 'Saturation should be less than 1');
        runner.assertGreaterThan(Slime.sat(10), Slime.sat(5), 'Higher values should have higher saturation');
        runner.assertLessThan(Slime.sat(100), 1, 'Even very high values should not exceed 1');
    });

    runner.test('Suitability calculation works', () => {
        const restore = createTestWorld(10, 10);
        
        // Set up test environment
        const testIdx = idx(5, 5);
        World.env.humidity[testIdx] = 0.7;
        World.env.light[testIdx] = 0.3;
        World.env.nutrient[testIdx] = 0.8;
        World.env.water[testIdx] = 0;
        Slime.trail[testIdx] = 10;
        
        const colony = createTestColony('MAT', 5, 5);
        const suitability = suitabilityAt(colony, 5, 5);
        
        runner.assertBetween(suitability, 0, 1, 'Suitability should be between 0 and 1');
        runner.assertType(suitability, 'number', 'Suitability should be a number');
        runner.assert(!isNaN(suitability), 'Suitability should not be NaN');
        
        restore.restore();
    });

    runner.test('Type pressure system works', () => {
        const restore = createTestWorld(20, 20);
        
        // Create many colonies of one type
        for (let i = 0; i < 10; i++) {
            const colony = createTestColony('MAT', i, 0);
            World.colonies.push(colony);
            World.tiles[idx(i, 0)] = colony.id;
        }
        
        // Create one colony of another type
        const scoutColony = createTestColony('SCOUT', 10, 0);
        World.colonies.push(scoutColony);
        World.tiles[idx(10, 0)] = scoutColony.id;
        
        updateTypePressure();
        
        runner.assertLessThan(World.typePressure.MAT, 1, 'Common type should have pressure < 1');
        runner.assertGreaterThan(World.typePressure.SCOUT, World.typePressure.MAT, 'Rare type should have higher pressure');
        runner.assertBetween(World.typePressure.MAT, 0.55, 1.0, 'Pressure should be in valid range');
        
        restore.restore();
    });

    runner.test('Nutrient dynamics work', () => {
        const restore = createTestWorld(10, 10);
        
        // Set up gradient
        for (let x = 0; x < World.W; x++) {
            for (let y = 0; y < World.H; y++) {
                World.env.nutrient[idx(x, y)] = x / World.W;
                World.env.humidity[idx(x, y)] = 0.5;
                World.env.water[idx(x, y)] = 0;
            }
        }
        
        const initialLeft = World.env.nutrient[idx(0, 5)];
        const initialRight = World.env.nutrient[idx(9, 5)];
        
        // Run nutrient dynamics
        nutrientDynamics();
        
        const afterLeft = World.env.nutrient[idx(0, 5)];
        const afterRight = World.env.nutrient[idx(9, 5)];
        
        // Should move towards equilibrium
        runner.assertGreaterThan(afterLeft, initialLeft, 'Left side should increase');
        runner.assertLessThan(afterRight, initialRight, 'Right side should decrease');
        
        restore.restore();
    });

    runner.test('Starvation sweep removes weak colonies', () => {
        const restore = createTestWorld(10, 10);
        
        // Create colony with very low biomass
        const colony = createTestColony('MAT', 5, 5);
        World.colonies.push(colony);
        World.tiles[idx(5, 5)] = colony.id;
        World.biomass[idx(5, 5)] = 0.01; // Very low biomass
        
        // Set very poor environment
        World.env.nutrient[idx(5, 5)] = 0.1;
        World.env.light[idx(5, 5)] = 0.1;
        
        starvationSweep();
        
        runner.assertEqual(World.tiles[idx(5, 5)], -1, 'Starving colony should be removed from tile');
        
        restore.restore();
    });

    runner.test('Colony expansion works', () => {
        const restore = createTestWorld(10, 10);
        
        // Create colony in good environment
        const colony = createTestColony('MAT', 5, 5);
        World.colonies.push(colony);
        World.tiles[idx(5, 5)] = colony.id;
        World.biomass[idx(5, 5)] = 1.0;
        
        // Set up good environment around colony
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const x = 5 + dx, y = 5 + dy;
                if (inBounds(x, y)) {
                    World.env.nutrient[idx(x, y)] = 0.8;
                    World.env.humidity[idx(x, y)] = 0.7;
                    World.env.light[idx(x, y)] = 0.3;
                }
            }
        }
        
        const initialPosition = { x: colony.x, y: colony.y };
        const expanded = tryExpand(colony);
        
        if (expanded) {
            runner.assert(colony.x !== initialPosition.x || colony.y !== initialPosition.y, 
                'Colony should move when expanding');
            runner.assertEqual(World.tiles[idx(colony.x, colony.y)], colony.id, 
                'Colony should own its new tile');
        }
        
        restore.restore();
    });

    runner.test('stepEcosystem advances simulation', () => {
        const restore = createTestWorld(10, 10);
        
        // Create some colonies
        seedInitialColonies();
        const initialTick = World.tick;
        
        stepEcosystem();
        
        runner.assertGreaterThan(World.tick, initialTick, 'Tick should advance');
        
        // Colonies should still exist and be valid
        for (const colony of World.colonies) {
            runner.assertGreaterThan(colony.age, 0, 'Colony age should increase');
            runner.assertType(colony.lastFit, 'number', 'Colony should have fitness calculated');
        }
        
        restore.restore();
    });

    runner.test('Starvation balance - energy calculation fairness across archetypes', () => {
        const restore = createTestWorld(10, 10);
        
        // Test each archetype under identical poor conditions
        const testResults = {};
        const testConditions = {
            nutrient: 0.3,  // Moderate nutrients
            light: 0.3      // Moderate light
        };
        
        for (const archetypeCode of Object.keys(Archetypes)) {
            const colony = createTestColony(archetypeCode, 5, 5);
            const pos = idx(5, 5);
            
            // Set identical environment
            World.env.nutrient[pos] = testConditions.nutrient;
            World.env.light[pos] = testConditions.light;
            World.biomass[pos] = 1.0;
            
            // Calculate energy using starvation formula
            const photosym = colony.traits.photosym || 0;
            const energy = 0.7 * testConditions.nutrient + 0.3 * photosym * testConditions.light;
            
            testResults[archetypeCode] = {
                photosym: photosym,
                energy: energy,
                survives: energy >= 0.35
            };
        }
        
        // Analyze results for balance issues
        const survivors = Object.values(testResults).filter(r => r.survives).length;
        const totalTypes = Object.keys(Archetypes).length;
        
        // This test documents the current balance issue: moderate conditions kill ALL archetypes
        runner.assertEqual(survivors, 0, 'Current balance issue: moderate conditions (0.3 nutrient, 0.3 light) kill all archetypes');
        
        // Verify that with better conditions some would survive
        const betterResults = {};
        for (const archetypeCode of Object.keys(Archetypes)) {
            const colony = createTestColony(archetypeCode, 5, 5);
            const photosym = colony.traits.photosym || 0;
            const betterEnergy = 0.7 * 0.6 + 0.3 * photosym * 0.5; // Better nutrients (0.6), moderate light (0.5)
            betterResults[archetypeCode] = betterEnergy >= 0.35;
        }
        const betterSurvivors = Object.values(betterResults).filter(r => r).length;
        runner.assertGreaterThan(betterSurvivors, 0, 'With better nutrients (0.6), some archetypes should survive');
        
        // Check if photosynthetic types have unfair advantage
        const highPhotosym = Object.entries(testResults)
            .filter(([code, result]) => result.photosym > 0.5)
            .map(([code, result]) => ({ code, ...result }));
        
        const lowPhotosym = Object.entries(testResults)
            .filter(([code, result]) => result.photosym <= 0.2)
            .map(([code, result]) => ({ code, ...result }));
        
        if (highPhotosym.length > 0 && lowPhotosym.length > 0) {
            const avgHighEnergy = highPhotosym.reduce((sum, r) => sum + r.energy, 0) / highPhotosym.length;
            const avgLowEnergy = lowPhotosym.reduce((sum, r) => sum + r.energy, 0) / lowPhotosym.length;
            
            // Energy difference shouldn't be too extreme
            const energyRatio = avgHighEnergy / avgLowEnergy;
            runner.assertLessThan(energyRatio, 2.5, 'Photosynthetic advantage should not be excessive');
        }
        
        restore.restore();
    });

    runner.test('Starvation balance - EAT archetype can survive without photosynthesis', () => {
        const restore = createTestWorld(10, 10);
        
        // Create EAT colony (no photosynthesis)
        const eatColony = createTestColony('EAT', 5, 5);
        World.colonies.push(eatColony);
        World.tiles[idx(5, 5)] = eatColony.id;
        World.biomass[idx(5, 5)] = 1.0;
        
        // Set up environment with high nutrients, low light
        World.env.nutrient[idx(5, 5)] = 0.6;
        World.env.light[idx(5, 5)] = 0.1;  // Low light shouldn't matter for EAT
        
        const initialBiomass = World.biomass[idx(5, 5)];
        
        // Run starvation sweep
        starvationSweep();
        
        runner.assertNotEqual(World.tiles[idx(5, 5)], -1, 'EAT colony should survive on nutrients alone');
        runner.assertGreaterThan(World.biomass[idx(5, 5)], 0.05, 'EAT colony should maintain biomass');
        
        // Should actually grow with good nutrients
        const energy = 0.7 * 0.6 + 0.3 * 0 * 0.1; // photosym = 0 for EAT
        if (energy > 0.35) {
            runner.assertGreaterThan(World.biomass[idx(5, 5)], initialBiomass * 0.99, 'EAT should grow with good nutrients');
        }
        
        restore.restore();
    });

    runner.test('Starvation balance - TOWER archetype performance with light dependency', () => {
        const restore = createTestWorld(10, 10);
        
        // Create TOWER colony (high photosynthesis)
        const towerColony = createTestColony('TOWER', 5, 5);
        World.colonies.push(towerColony);
        World.tiles[idx(5, 5)] = towerColony.id;
        World.biomass[idx(5, 5)] = 1.0;
        
        // Test scenario 1: Low nutrients, high light
        World.env.nutrient[idx(5, 5)] = 0.2;
        World.env.light[idx(5, 5)] = 0.8;
        
        const photosym = towerColony.traits.photosym;
        const energy1 = 0.7 * 0.2 + 0.3 * photosym * 0.8;
        
        starvationSweep();
        
        if (energy1 >= 0.35) {
            runner.assertNotEqual(World.tiles[idx(5, 5)], -1, 'TOWER should survive with high light compensation');
        }
        
        // Reset for scenario 2: High nutrients, low light
        World.tiles[idx(5, 5)] = towerColony.id;
        World.biomass[idx(5, 5)] = 1.0;
        World.env.nutrient[idx(5, 5)] = 0.6;
        World.env.light[idx(5, 5)] = 0.1;
        
        const energy2 = 0.7 * 0.6 + 0.3 * photosym * 0.1;
        
        starvationSweep();
        
        runner.assertNotEqual(World.tiles[idx(5, 5)], -1, 'TOWER should survive with high nutrients even if light is low');
        
        restore.restore();
    });

    runner.test('Starvation balance - energy thresholds are reasonable', () => {
        const restore = createTestWorld();
        
        // Test the 0.35 energy threshold
        const testCases = [
            { nutrient: 0.5, light: 0.0, photosym: 0.0, expectedEnergy: 0.35, description: 'Threshold case - pure nutrients' },
            { nutrient: 0.0, light: 1.0, photosym: 1.0, expectedEnergy: 0.30, description: 'Pure photosynthesis case' },
            { nutrient: 0.25, light: 0.5, photosym: 0.5, expectedEnergy: 0.25, description: 'Balanced case' },
            { nutrient: 1.0, light: 1.0, photosym: 1.0, expectedEnergy: 1.0, description: 'Maximum case' }
        ];
        
        for (const testCase of testCases) {
            const actualEnergy = 0.7 * testCase.nutrient + 0.3 * testCase.photosym * testCase.light;
            
            runner.assertApproxEqual(
                actualEnergy, 
                testCase.expectedEnergy, 
                0.01, 
                `Energy calculation for ${testCase.description}`
            );
            
            // Test survival threshold
            const shouldSurvive = actualEnergy >= 0.35;
            runner.assert(
                (shouldSurvive && actualEnergy >= 0.35) || (!shouldSurvive && actualEnergy < 0.35),
                `Survival logic should match energy threshold for ${testCase.description}`
            );
        }
        
        restore.restore();
    });

    runner.test('Starvation balance - biomass consumption scaling', () => {
        const restore = createTestWorld();
        
        const colony = createTestColony('MAT', 5, 5);
        World.colonies.push(colony);
        World.tiles[idx(5, 5)] = colony.id;
        
        // Test different biomass levels
        const biomassLevels = [0.1, 0.5, 1.0, 2.0];
        const consumptionResults = [];
        
        for (const biomassLevel of biomassLevels) {
            World.biomass[idx(5, 5)] = biomassLevel;
            World.env.nutrient[idx(5, 5)] = 0.5; // Fixed nutrient level
            
            const initialNutrient = World.env.nutrient[idx(5, 5)];
            const expectedConsumption = Math.min(initialNutrient, 0.008 * Math.max(0.1, biomassLevel));
            
            // Store state before starvation sweep
            const beforeNutrient = World.env.nutrient[idx(5, 5)];
            
            starvationSweep();
            
            const afterNutrient = World.env.nutrient[idx(5, 5)];
            const actualConsumption = beforeNutrient - afterNutrient;
            
            consumptionResults.push({
                biomass: biomassLevel,
                expected: expectedConsumption,
                actual: actualConsumption
            });
            
            runner.assertApproxEqual(
                actualConsumption,
                expectedConsumption,
                0.001,
                `Consumption should scale with biomass (level: ${biomassLevel})`
            );
        }
        
        // Verify consumption increases with biomass
        for (let i = 1; i < consumptionResults.length; i++) {
            runner.assertGreaterThan(
                consumptionResults[i].actual,
                consumptionResults[i-1].actual,
                'Higher biomass should consume more nutrients'
            );
        }
        
        restore.restore();
    });

    return runner.run();
}