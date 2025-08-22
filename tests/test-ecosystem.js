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

    return runner.run();
}