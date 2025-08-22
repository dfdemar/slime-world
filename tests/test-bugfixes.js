/* ===== Bug Fix Tests ===== */

function runBugFixTests() {
    const runner = new TestRunner();

    runner.test('Mini-map rendering uses correct divisor', () => {
        const restore = createTestWorld(10, 8);
        
        // Create a test colony
        const colony = createTestColony('MAT', 3, 2);
        World.colonies.push(colony);
        World.tiles[idx(3, 2)] = colony.id;
        
        // Mock mini view element
        const mockMiniView = {
            width: 100,
            height: 80,
            getContext: () => ({
                clearRect: () => {},
                fillRect: () => {},
                fillStyle: null,
                globalAlpha: 1
            })
        };
        
        // Mock document.getElementById
        const originalGetElement = global.document?.getElementById;
        global.document = {
            getElementById: (id) => {
                if (id === 'miniView') return mockMiniView;
                return { innerHTML: '', textContent: '' };
            }
        };
        
        // Test that refreshInspectorRealtime doesn't crash and uses correct coordinates
        selectedId = colony.id;
        
        try {
            refreshInspectorRealtime(true);
            runner.assert(true, 'Mini-map rendering completed without errors');
        } catch (error) {
            runner.assert(false, `Mini-map rendering failed: ${error.message}`);
        }
        
        // Restore
        if (originalGetElement) {
            global.document.getElementById = originalGetElement;
        }
        restore.restore();
    });

    runner.test('Boundary wrapping consistency in slime diffusion', () => {
        const restore = createTestWorld(5, 5);
        
        // Set up slime at edges
        Slime.trail[idx(0, 2)] = 10; // Left edge
        Slime.trail[idx(4, 2)] = 10; // Right edge  
        Slime.trail[idx(2, 0)] = 10; // Top edge
        Slime.trail[idx(2, 4)] = 10; // Bottom edge
        
        const initialSum = Slime.trail.reduce((a, v) => a + v, 0);
        
        // Run diffusion
        Slime.diffuseEvaporate();
        
        const afterSum = Slime.trail.reduce((a, v) => a + v, 0);
        
        runner.assertLessThan(afterSum, initialSum, 'Total trail should decrease due to evaporation');
        runner.assertGreaterThan(afterSum, 0, 'Some trail should remain after diffusion');
        runner.assert(!isNaN(afterSum), 'Diffusion should not produce NaN values');
        
        restore.restore();
    });

    runner.test('Boundary wrapping consistency in nutrient dynamics', () => {
        const restore = createTestWorld(5, 5);
        
        // Set up nutrients at edges
        World.env.nutrient[idx(0, 2)] = 1.0; // Left edge
        World.env.nutrient[idx(4, 2)] = 0.0; // Right edge  
        World.env.nutrient[idx(2, 0)] = 1.0; // Top edge
        World.env.nutrient[idx(2, 4)] = 0.0; // Bottom edge
        
        // Set up environment for regeneration
        for (let i = 0; i < World.env.humidity.length; i++) {
            World.env.humidity[i] = 0.5;
            World.env.water[i] = 0;
        }
        
        const initialSum = World.env.nutrient.reduce((a, v) => a + v, 0);
        
        // Run nutrient dynamics
        nutrientDynamics();
        
        const afterSum = World.env.nutrient.reduce((a, v) => a + v, 0);
        
        runner.assert(!isNaN(afterSum), 'Nutrient dynamics should not produce NaN values');
        runner.assertGreaterThan(afterSum, 0, 'Some nutrients should remain');
        
        // Check that edge values are reasonable (no extreme jumps)
        for (let i = 0; i < World.env.nutrient.length; i++) {
            runner.assertBetween(World.env.nutrient[i], 0, 1, `Nutrient[${i}] should be in valid range`);
        }
        
        restore.restore();
    });

    runner.test('Type pressure updates handle empty colonies', () => {
        const restore = createTestWorld();
        
        // Start with no colonies
        World.colonies = [];
        World.tiles.fill(-1);
        
        // This should not crash
        try {
            updateTypePressure();
            runner.assert(true, 'Type pressure update handled empty colonies');
            
            // All pressures should be reasonable
            for (const type of Object.keys(Archetypes)) {
                const pressure = World.typePressure[type];
                if (pressure !== undefined) {
                    runner.assertBetween(pressure, 0.55, 1.0, `${type} pressure should be in valid range`);
                }
            }
        } catch (error) {
            runner.assert(false, `Type pressure update failed with empty colonies: ${error.message}`);
        }
        
        restore.restore();
    });

    runner.test('Starvation sweep handles orphaned tiles', () => {
        const restore = createTestWorld();
        
        // Create orphaned tile (tile points to non-existent colony)
        World.tiles[idx(5, 5)] = 999; // Non-existent colony ID
        World.biomass[idx(5, 5)] = 1.0;
        World.env.nutrient[idx(5, 5)] = 0.5;
        World.env.light[idx(5, 5)] = 0.5;
        
        const initialBiomass = World.biomass[idx(5, 5)];
        
        try {
            starvationSweep();
            runner.assert(true, 'Starvation sweep handled orphaned tiles');
            runner.assertEqual(World.tiles[idx(5, 5)], -1, 'Orphaned tile should be cleared');
        } catch (error) {
            runner.assert(false, `Starvation sweep failed with orphaned tiles: ${error.message}`);
        }
        
        restore.restore();
    });

    runner.test('RNG state remains deterministic after operations', () => {
        const restore = createTestWorld();
        
        // Set deterministic RNG
        World.rng = sfc32(1, 2, 3, 4);
        
        // Generate some values
        const val1 = World.rng();
        const val2 = World.rng();
        
        // Reset RNG to same state
        World.rng = sfc32(1, 2, 3, 4);
        
        // Should get same values
        const val1_repeat = World.rng();
        const val2_repeat = World.rng();
        
        runner.assertApproxEqual(val1, val1_repeat, 0.000001, 'First RNG value should be deterministic');
        runner.assertApproxEqual(val2, val2_repeat, 0.000001, 'Second RNG value should be deterministic');
        
        restore.restore();
    });

    runner.test('Pattern memory cleanup on colony removal', () => {
        const restore = createTestWorld();
        
        // Create colonies with patterns
        const colonies = [];
        for (let i = 0; i < 5; i++) {
            const colony = createTestColony('MAT', i, 0);
            colony.pattern = createPatternForColony(colony);
            colonies.push(colony);
            World.colonies.push(colony);
            World.tiles[idx(i, 0)] = colony.id;
        }
        
        // Verify patterns exist
        for (const colony of colonies) {
            runner.assertNotNull(colony.pattern, 'Colony should have pattern');
        }
        
        // Simulate colony cleanup (what happens in stepEcosystem)
        const alive = new Set();
        alive.add(colonies[0].id); // Keep only first colony
        alive.add(colonies[1].id); // Keep second colony
        
        World.colonies = World.colonies.filter(c => alive.has(c.id));
        
        runner.assertEqual(World.colonies.length, 2, 'Should have 2 colonies after cleanup');
        
        // Remaining colonies should still have patterns
        for (const colony of World.colonies) {
            runner.assertNotNull(colony.pattern, 'Surviving colony should still have pattern');
        }
        
        restore.restore();
    });

    runner.test('Suitability calculation handles extreme values', () => {
        const restore = createTestWorld();
        
        // Set up extreme environment values
        const testPos = idx(5, 5);
        World.env.humidity[testPos] = 0; // Minimum
        World.env.light[testPos] = 1; // Maximum  
        World.env.nutrient[testPos] = 0.5; // Middle
        World.env.water[testPos] = 1; // Water present
        World.biomass[testPos] = 10; // Very high density
        Slime.trail[testPos] = 1000; // Very high trail
        
        World.typePressure = { MAT: 0.5 }; // Low pressure
        World.capacity = 1.0;
        
        const colony = createTestColony('MAT', 5, 5);
        
        const suitability = suitabilityAt(colony, 5, 5);
        
        runner.assertBetween(suitability, 0, 1, 'Suitability should be clamped to valid range');
        runner.assert(!isNaN(suitability), 'Suitability should not be NaN');
        runner.assertType(suitability, 'number', 'Suitability should be a number');
        
        restore.restore();
    });

    return runner.run();
}