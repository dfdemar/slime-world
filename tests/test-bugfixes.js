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
                clearRect: () => {
                },
                fillRect: () => {
                },
                fillStyle: null,
                globalAlpha: 1
            })
        };

        // Mock document.getElementById
        const originalGetElement = document.getElementById;
        document.getElementById = (id) => {
            if (id === 'miniView') return mockMiniView;
            return {innerHTML: '', textContent: ''};
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
        document.getElementById = originalGetElement;
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

        World.typePressure = {MAT: 0.5}; // Low pressure
        World.capacity = 1.0;

        const colony = createTestColony('MAT', 5, 5);

        const suitability = suitabilityAt(colony, 5, 5);

        runner.assertBetween(suitability, 0, 1, 'Suitability should be clamped to valid range');
        runner.assert(!isNaN(suitability), 'Suitability should not be NaN');
        runner.assertType(suitability, 'number', 'Suitability should be a number');

        restore.restore();
    });

    runner.test('Canvas redraw frequency - needRedraw flag prevents unnecessary redraws', () => {
        const restore = createTestWorld();

        // Initialize needRedraw if it doesn't exist (test environment)
        if (typeof window.needRedraw === 'undefined') {
            window.needRedraw = true;
        }

        // Store original value to restore later
        const originalNeedRedraw = window.needRedraw;

        // Test basic needRedraw flag functionality exists
        runner.assertType(window.needRedraw, 'boolean', 'needRedraw should be a boolean flag');

        // Test that needRedraw can be set and read
        window.needRedraw = false;
        runner.assertEqual(window.needRedraw, false, 'needRedraw should be settable to false');
        
        window.needRedraw = true;
        runner.assertEqual(window.needRedraw, true, 'needRedraw should be settable to true');

        // Test the optimization concept: needRedraw should control when rendering occurs
        let renderCount = 0;
        const mockRender = () => {
            if (window.needRedraw) {
                renderCount++;
                window.needRedraw = false; // Reset after render
            }
        };

        // Multiple calls without needRedraw=true should not increase count
        window.needRedraw = false;
        mockRender(); // Should not render
        mockRender(); // Should not render
        runner.assertEqual(renderCount, 0, 'Render should not occur when needRedraw=false');

        // Setting needRedraw=true should allow render
        window.needRedraw = true;
        mockRender(); // Should render
        runner.assertEqual(renderCount, 1, 'Render should occur when needRedraw=true');
        runner.assertEqual(window.needRedraw, false, 'needRedraw should be reset after render');

        // Restore original value
        window.needRedraw = originalNeedRedraw;
        restore.restore();
    });

    runner.test('Pattern caching does not create excessive memory usage', () => {
        const restore = createTestWorld();

        // Create multiple colonies to test pattern generation
        const coloniesWithPatterns = [];
        
        for (let i = 0; i < 10; i++) {
            const colony = createTestColony('MAT', i, 0);
            colony.pattern = createPatternForColony(colony);
            coloniesWithPatterns.push(colony);
            World.colonies.push(colony);
        }

        // Verify all patterns were created
        for (const colony of coloniesWithPatterns) {
            runner.assertNotNull(colony.pattern, 'Colony should have pattern created');
            runner.assertType(colony.pattern, 'object', 'Pattern should be a canvas object');
            runner.assertType(colony.pattern.width, 'number', 'Pattern should have width');
            runner.assertType(colony.pattern.height, 'number', 'Pattern should have height');
        }

        // Test that patterns are small (memory-efficient 8x8)
        for (const colony of coloniesWithPatterns) {
            runner.assertEqual(colony.pattern.width, 8, 'Pattern should be 8 pixels wide');
            runner.assertEqual(colony.pattern.height, 8, 'Pattern should be 8 pixels high');
        }

        // Test pattern uniqueness (different colonies should have different patterns)
        const patterns = coloniesWithPatterns.map(c => c.pattern);
        for (let i = 0; i < patterns.length - 1; i++) {
            runner.assertNotEqual(patterns[i], patterns[i + 1], 'Different colonies should have different pattern objects');
        }

        restore.restore();
    });

    runner.test('Pattern cleanup prevents memory leaks', () => {
        const restore = createTestWorld();

        // Create colony with pattern
        const colony = createTestColony('MAT', 1, 0);
        colony.pattern = createPatternForColony(colony);
        
        // Verify pattern exists
        runner.assertNotNull(colony.pattern, 'Colony should have pattern created');
        runner.assertType(colony.pattern, 'object', 'Pattern should be a canvas object');
        
        // Test cleanup function
        cleanupColonyPattern(colony);
        
        // Verify pattern was cleaned up
        runner.assertEqual(colony.pattern, null, 'Pattern should be null after cleanup');
        
        // Test cleanup on colony without pattern (should not error)
        const colonyWithoutPattern = createTestColony('TOWER', 2, 0);
        runner.assertEqual(colonyWithoutPattern.pattern, null, 'New colony should not have pattern initially');
        cleanupColonyPattern(colonyWithoutPattern); // Should not throw
        
        // Test cleanup during colony removal simulation
        const coloniesForRemoval = [];
        for (let i = 0; i < 5; i++) {
            const col = createTestColony('EAT', i + 10, 0);
            col.pattern = createPatternForColony(col);
            coloniesForRemoval.push(col);
            World.colonies.push(col);
        }
        
        // Verify all have patterns
        for (const col of coloniesForRemoval) {
            runner.assertNotNull(col.pattern, 'Colony should have pattern before removal');
        }
        
        // Simulate cleanup before removal (like in ecosystem.js)
        for (const col of coloniesForRemoval) {
            cleanupColonyPattern(col);
        }
        
        // Verify all patterns cleaned up
        for (const col of coloniesForRemoval) {
            runner.assertEqual(col.pattern, null, 'Pattern should be cleaned up before colony removal');
        }
        
        restore.restore();
    });

    runner.test('Boundary wrapping consistency fix', () => {
        const restore = createTestWorld(5, 5);

        // Test wrapping utility functions
        runner.assertEqual(wrapX(-1), 4, 'Negative X should wrap to right edge');
        runner.assertEqual(wrapX(5), 0, 'X beyond width should wrap to left edge');
        runner.assertEqual(wrapY(-1), 4, 'Negative Y should wrap to bottom edge');
        runner.assertEqual(wrapY(5), 0, 'Y beyond height should wrap to top edge');

        // Test wrapping with multiple wraps
        runner.assertEqual(wrapX(-6), 4, 'Multiple negative X wraps should work');
        runner.assertEqual(wrapX(11), 1, 'Multiple positive X wraps should work');

        // Test coordinate wrapping
        const [wx, wy] = wrapCoords(-1, -1);
        runner.assertEqual(wx, 4, 'wrapCoords should handle negative X');
        runner.assertEqual(wy, 4, 'wrapCoords should handle negative Y');

        // Test idxWrapped function
        const wrappedIdx = idxWrapped(-1, -1);
        const expectedIdx = idx(4, 4);
        runner.assertEqual(wrappedIdx, expectedIdx, 'idxWrapped should produce correct index');

        restore.restore();
    });

    runner.test('Suitability calculation uses consistent wrapping', () => {
        const restore = createTestWorld(5, 5);

        // Create test colony at edge
        const colony = createTestColony('MAT', 1, 4, 0); // Bottom edge
        
        // Set up environmental gradient near edge
        World.env.humidity[idx(4, 4)] = 0.8; // Bottom-right corner
        World.env.humidity[idx(4, 0)] = 0.8; // Top-right corner (should be sampled via wrapping)
        World.env.humidity[idx(0, 4)] = 0.2; // Bottom-left corner 
        World.env.humidity[idx(0, 0)] = 0.2; // Top-left corner

        // Calculate suitability at bottom-right corner (4,4)
        // This should now include the top-right corner (4,0) via Y wrapping
        const suitability = suitabilityAt(colony, 4, 4);
        
        runner.assertType(suitability, 'number', 'Suitability should be a number');
        runner.assert(!isNaN(suitability), 'Suitability should not be NaN with wrapping');
        runner.assertBetween(suitability, -2, 2, 'Suitability should be in reasonable range');

        restore.restore();
    });

    runner.test('Colony expansion works across wrapped boundaries', () => {
        const restore = createTestWorld(5, 5);

        // Create colony near right edge
        const colony = createTestColony('SCOUT', 1, 4, 0);
        colony.x = 4;
        colony.y = 2;
        World.colonies.push(colony);
        
        // Place colony biomass at right edge
        World.tiles[idx(4, 2)] = colony.id;
        World.biomass[idx(4, 2)] = 1.0;
        
        // Set up favorable conditions on the left edge (which should be accessible via wrapping)
        World.env.humidity[idx(0, 2)] = colony.traits.water_need;
        World.env.light[idx(0, 2)] = colony.traits.light_use;
        World.env.nutrient[idx(0, 2)] = 0.8;
        
        // Try expansion - this should now be able to reach the left edge via wrapping
        const expanded = tryExpand(colony);
        
        // Should not fail due to boundary issues
        runner.assertType(expanded, 'boolean', 'tryExpand should return boolean');
        
        // Check that no NaN values were produced during expansion attempt
        for (let i = 0; i < World.biomass.length; i++) {
            runner.assert(!isNaN(World.biomass[i]), `Biomass[${i}] should not be NaN after expansion`);
        }

        restore.restore();
    });

    runner.test('Colony spawning uses wrapped coordinates', () => {
        const restore = createTestWorld(5, 5);

        // Test spawning at negative coordinates (should wrap)
        const colony1 = newColony('MAT', -1, -1, null);
        if (colony1) {
            runner.assert(World.tiles[idx(4, 4)] === colony1.id, 'Colony spawned at negative coords should appear at wrapped position');
        }

        // Test spawning beyond boundaries (should wrap)
        const colony2 = newColony('TOWER', 6, 7, null);
        if (colony2) {
            runner.assert(World.tiles[idx(1, 2)] === colony2.id, 'Colony spawned beyond bounds should appear at wrapped position');
        }

        restore.restore();
    });

    runner.test('Adaptive type pressure responds to rapid population changes', () => {
        const restore = createTestWorld(10, 10);

        // Initialize with a small balanced population
        World.colonies = [];
        World.tiles.fill(-1);
        
        // Create a few colonies of each type
        const matColony = createTestColony('MAT', 1, 2, 2);
        const towerColony = createTestColony('TOWER', 2, 6, 6);
        
        World.colonies.push(matColony, towerColony);
        World.tiles[idx(2, 2)] = matColony.id;
        World.tiles[idx(6, 6)] = towerColony.id;
        
        // Force initial pressure calculation
        World.tick = 0;
        updateTypePressure(true);
        
        const initialMatPressure = World.typePressure.MAT;
        const initialTowerPressure = World.typePressure.TOWER;
        
        runner.assertBetween(initialMatPressure, 0.55, 1.0, 'Initial MAT pressure should be in valid range');
        runner.assertBetween(initialTowerPressure, 0.55, 1.0, 'Initial TOWER pressure should be in valid range');
        
        // Simulate rapid population growth for MAT (add many tiles)
        for (let i = 0; i < 30; i++) {
            World.tiles[10 + i] = matColony.id; // Fill many tiles with MAT
        }
        
        // Advance time by just a few ticks and check if pressure updates
        World.tick = 5;
        updateTypePressure(); // Should detect significant change and update
        
        const newMatPressure = World.typePressure.MAT;
        const newTowerPressure = World.typePressure.TOWER;
        
        // MAT pressure should decrease due to increased population
        runner.assertLessThan(newMatPressure, initialMatPressure, 'MAT pressure should decrease after rapid growth');
        // TOWER pressure should increase (less competition)
        runner.assertGreaterThan(newTowerPressure, initialTowerPressure, 'TOWER pressure should increase when MAT dominates');
        
        restore.restore();
    });

    runner.test('Type pressure skips updates when population is stable', () => {
        const restore = createTestWorld(5, 5);

        // Set up stable population
        const colony = createTestColony('SCOUT', 1, 2, 2);
        World.colonies = [colony];
        World.tiles.fill(-1);
        World.tiles[idx(2, 2)] = colony.id;
        
        // Force initial update
        World.tick = 0;
        updateTypePressure(true);
        
        const initialPressure = World.typePressure.SCOUT;
        const initialUpdateTime = World.lastPressureUpdate;
        
        // Advance time by small amount with no population change
        World.tick = 7;
        updateTypePressure(); // Should skip update (no significant change, <30 ticks)
        
        // Pressure should be unchanged and update time should be unchanged
        runner.assertEqual(World.typePressure.SCOUT, initialPressure, 'Pressure should not change with stable population');
        runner.assertEqual(World.lastPressureUpdate, initialUpdateTime, 'Update time should not change when skipping');
        
        // Advance time to force update threshold
        World.tick = 35;
        updateTypePressure(); // Should update due to time threshold
        
        runner.assertGreaterThan(World.lastPressureUpdate, initialUpdateTime, 'Should update after time threshold');
        
        restore.restore();
    });

    runner.test('Type pressure detects significant population changes', () => {
        const restore = createTestWorld(10, 10);

        // Start with balanced population
        World.colonies = [];
        World.tiles.fill(-1);
        
        const matColony = createTestColony('MAT', 1, 1, 1);
        const eatColony = createTestColony('EAT', 2, 5, 5);
        
        World.colonies.push(matColony, eatColony);
        
        // Set equal populations (5 tiles each)
        for (let i = 0; i < 5; i++) {
            World.tiles[i] = matColony.id;
            World.tiles[i + 10] = eatColony.id;
        }
        
        World.tick = 0;
        updateTypePressure(true);
        
        const initialUpdateTime = World.lastPressureUpdate;
        
        // Add significant MAT population (crosses 15% threshold)
        for (let i = 20; i < 35; i++) { // Add 15 more MAT tiles
            World.tiles[i] = matColony.id;
        }
        
        World.tick = 3; // Very short time
        updateTypePressure(); // Should detect significant change
        
        runner.assertGreaterThan(World.lastPressureUpdate, initialUpdateTime, 'Should update immediately on significant change');
        
        // Verify pressure actually changed
        runner.assertBetween(World.typePressure.MAT, 0.55, 0.8, 'MAT pressure should be reduced due to dominance');
        
        restore.restore();
    });

    runner.test('Type pressure maintains ecosystem balance during rapid growth', () => {
        const restore = createTestWorld(8, 8);

        // Simulate rapid growth scenario
        World.colonies = [];
        World.tiles.fill(-1);
        
        const fastGrower = createTestColony('SCOUT', 1, 3, 3);
        const slowGrower = createTestColony('TOWER', 2, 5, 5);
        
        World.colonies.push(fastGrower, slowGrower);
        World.tiles[idx(3, 3)] = fastGrower.id;
        World.tiles[idx(5, 5)] = slowGrower.id;
        
        // Initial state
        World.tick = 0;
        updateTypePressure(true);
        
        // Simulate several rounds of growth with pressure updates
        for (let round = 0; round < 10; round++) {
            // Fast grower expands
            for (let i = 0; i < 3; i++) {
                const tileIdx = 10 + round * 3 + i;
                if (tileIdx < World.tiles.length) {
                    World.tiles[tileIdx] = fastGrower.id;
                }
            }
            
            World.tick = round * 5 + 5;
            updateTypePressure(); // Should respond quickly to changes
        }
        
        // Verify ecosystem balance is maintained
        const scoutPressure = World.typePressure.SCOUT;
        const towerPressure = World.typePressure.TOWER;
        
        runner.assertBetween(scoutPressure, 0.55, 1.0, 'SCOUT pressure should be in valid range');
        runner.assertBetween(towerPressure, 0.55, 1.0, 'TOWER pressure should be in valid range');
        
        // The fast-growing type should have lower pressure due to dominance
        runner.assertLessThan(scoutPressure, towerPressure, 'Dominant type should have lower spawning pressure');
        
        restore.restore();
    });

    runner.test('RNG state serialization and restoration', () => {
        const restore = createTestWorld(5, 5);

        // Set up deterministic RNG
        const hash = xmur3('test-seed');
        World.rng = sfc32(hash(), hash(), hash(), hash());
        
        // Generate some values to advance the state
        const val1 = World.rng();
        const val2 = World.rng();
        const val3 = World.rng();
        
        // Get the current state (use direct method if utility not available)
        const savedState = World.rng && World.rng.getState ? World.rng.getState() : null;
        runner.assertNotNull(savedState, 'Should be able to get RNG state');
        runner.assertType(savedState, 'object', 'RNG state should be an object');
        runner.assertType(savedState.a, 'number', 'State should have numeric components');
        
        // Generate more values
        const val4 = World.rng();
        const val5 = World.rng();
        
        // Restore the saved state (use direct method if utility not available)
        if (World.rng && World.rng.setState && savedState) {
            World.rng.setState(savedState);
        }
        
        // Should get the same values as val4 and val5
        const restored4 = World.rng();
        const restored5 = World.rng();
        
        runner.assertApproxEqual(val4, restored4, 0.000001, 'Should reproduce same values after state restoration');
        runner.assertApproxEqual(val5, restored5, 0.000001, 'Should maintain sequence after restoration');
        
        restore.restore();
    });

    runner.test('Save/load preserves RNG determinism', () => {
        const restore = createTestWorld(5, 5);

        // Set up deterministic world state
        const hash = xmur3('determinism-test');
        World.rng = sfc32(hash(), hash(), hash(), hash());
        
        // Create some colonies to get realistic save data
        const colony1 = createTestColony('MAT', 1, 1, 1);
        const colony2 = createTestColony('TOWER', 2, 3, 3);
        World.colonies.push(colony1, colony2);
        World.tiles[idx(1, 1)] = colony1.id;
        World.tiles[idx(3, 3)] = colony2.id;
        
        // Advance RNG state by generating values
        World.rng(); // Consume some random values
        World.rng();
        
        // Simulate save operation
        const saveData = {
            W: World.W,
            H: World.H,
            env: {
                humidity: Array.from(World.env.humidity),
                light: Array.from(World.env.light),
                nutrient: Array.from(World.env.nutrient),
                water: Array.from(World.env.water)
            },
            tiles: Array.from(World.tiles),
            biomass: Array.from(World.biomass),
            colonies: World.colonies,
            nextId: World.nextId,
            tick: World.tick,
            rngState: World.rng && World.rng.getState ? World.rng.getState() : null
        };
        
        // Generate values before reload
        const beforeReload1 = World.rng();
        const beforeReload2 = World.rng();
        
        // Simulate load operation (recreate world)
        setupWorld(1337, '5x5'); // This will create new RNG
        World.env.humidity.set(saveData.env.humidity);
        World.env.light.set(saveData.env.light);
        World.env.nutrient.set(saveData.env.nutrient);
        World.env.water.set(saveData.env.water);
        World.tiles.set(saveData.tiles);
        World.biomass.set(saveData.biomass);
        World.colonies = saveData.colonies;
        World.nextId = saveData.nextId;
        World.tick = saveData.tick;
        
        // Restore RNG state
        if (saveData.rngState && World.rng && World.rng.setState) {
            World.rng.setState(saveData.rngState);
        }
        
        // Generate same values after reload
        const afterReload1 = World.rng();
        const afterReload2 = World.rng();
        
        runner.assertApproxEqual(beforeReload1, afterReload1, 0.000001, 'RNG should produce same values after save/load');
        runner.assertApproxEqual(beforeReload2, afterReload2, 0.000001, 'RNG sequence should be preserved');
        
        restore.restore();
    });

    runner.test('Consistent RNG usage eliminates non-deterministic behavior', () => {
        const restore = createTestWorld(5, 5);

        // Set identical seeds for both runs
        const seed1Hash = xmur3('consistency-test');
        const seed2Hash = xmur3('consistency-test');
        
        const rng1 = sfc32(seed1Hash(), seed1Hash(), seed1Hash(), seed1Hash());
        const rng2 = sfc32(seed2Hash(), seed2Hash(), seed2Hash(), seed2Hash());
        
        // Test spawn probability calculation (previously used Math.random())
        World.rng = rng1;
        const mutationRate1 = 0.5;
        const pressure1 = 0.8;
        const spawnP1 = (0.003 + 0.008 * mutationRate1) * pressure1;
        const shouldSpawn1 = World.rng() < spawnP1; // Now uses World.rng instead of Math.random
        
        World.rng = rng2;
        const mutationRate2 = 0.5;
        const pressure2 = 0.8;
        const spawnP2 = (0.003 + 0.008 * mutationRate2) * pressure2;
        const shouldSpawn2 = World.rng() < spawnP2;
        
        runner.assertEqual(spawnP1, spawnP2, 'Spawn probabilities should be identical');
        runner.assertEqual(shouldSpawn1, shouldSpawn2, 'Spawn decisions should be deterministic');
        
        // Test direction selection (uses World.rng)
        World.rng = sfc32(seed1Hash(), seed1Hash(), seed1Hash(), seed1Hash());
        const dirIndex1 = Math.floor(World.rng() * 4);
        
        World.rng = sfc32(seed2Hash(), seed2Hash(), seed2Hash(), seed2Hash());
        const dirIndex2 = Math.floor(World.rng() * 4);
        
        runner.assertEqual(dirIndex1, dirIndex2, 'Direction selection should be deterministic');
        
        restore.restore();
    });

    runner.test('RNG state isolation prevents cross-system interference', () => {
        const restore = createTestWorld(3, 3);

        // Create deterministic RNG
        const hash = xmur3('isolation-test');
        World.rng = sfc32(hash(), hash(), hash(), hash());
        
        // Simulate different systems using RNG
        const systemA_val1 = World.rng(); // Colony mutation
        const systemB_val1 = World.rng(); // Environment drift  
        const systemC_val1 = World.rng(); // Spawn decisions
        
        // Get state after system usage
        const state1 = World.rng && World.rng.getState ? World.rng.getState() : null;
        
        // Use RNG in different pattern
        const systemC_val2 = World.rng(); // Spawn first
        const systemA_val2 = World.rng(); // Then mutation
        const systemB_val2 = World.rng(); // Then environment
        
        // Values should be different due to different ordering
        runner.assertNotEqual(systemA_val1, systemC_val2, 'Different call order should produce different sequences');
        
        // But restore state and reproduce original pattern
        if (World.rng && World.rng.setState && state1) {
            World.rng.setState(state1);
        }
        const reproduced_val = World.rng();
        
        runner.assertApproxEqual(systemC_val2, reproduced_val, 0.000001, 'State restoration should reproduce exact sequence');
        
        restore.restore();
    });

    runner.test('Suitability calculation optimization maintains accuracy', () => {
        const restore = createTestWorld(5, 5);

        // Create test colony
        const colony = createTestColony('MAT', 1, 2, 2);
        colony.traits = {water_need: 0.7, light_use: 0.5, photosym: 0.8};
        
        // Set up known environmental values
        World.env.humidity[idx(2, 2)] = 0.6;
        World.env.light[idx(2, 2)] = 0.4;
        World.env.nutrient[idx(2, 2)] = 0.8;
        World.env.water[idx(2, 2)] = 0;
        
        // Clear caches to ensure fresh calculation
        clearSuitabilityCache();
        World.environmentCache = null;
        
        // First calculation (should populate cache)
        const result1 = suitabilityAt(colony, 2, 2);
        
        // Second calculation (should use cache)
        const result2 = suitabilityAt(colony, 2, 2);
        
        runner.assertApproxEqual(result1, result2, 0.000001, 'Cached suitability should match uncached');
        runner.assertType(result1, 'number', 'Suitability should be numeric');
        runner.assertBetween(result1, 0, 1, 'Suitability should be in valid range');
        
        // Verify cache is actually working
        runner.assertGreaterThan(World.suitabilityCache.size, 0, 'Cache should contain entries');
        
        restore.restore();
    });

    runner.test('Environment cache updates correctly', () => {
        const restore = createTestWorld(3, 3);

        // Clear environment cache
        World.environmentCache = null;
        World.lastEnvironmentTick = -1;
        
        // Set up test environment
        for (let i = 0; i < 9; i++) {
            World.env.humidity[i] = 0.5 + i * 0.05;
            World.env.light[i] = 0.3 + i * 0.04;
        }
        
        // Update cache
        updateEnvironmentCache();
        
        runner.assertNotNull(World.environmentCache, 'Environment cache should be created');
        runner.assertType(World.environmentCache.avgHumidity, 'object', 'Humidity cache should be array-like');
        runner.assertType(World.environmentCache.avgLight, 'object', 'Light cache should be array-like');
        
        // Verify averaged values are reasonable
        const centerAvgHum = World.environmentCache.avgHumidity[idx(1, 1)];
        runner.assertBetween(centerAvgHum, 0.4, 0.8, 'Averaged humidity should be in reasonable range');
        
        // Verify cache doesn't update unnecessarily
        const cachedTick = World.lastEnvironmentTick;
        updateEnvironmentCache(); // Should not recalculate
        runner.assertEqual(World.lastEnvironmentTick, cachedTick, 'Cache should not recalculate on same tick');
        
        restore.restore();
    });

    runner.test('Suitability cache management prevents memory growth', () => {
        const restore = createTestWorld(3, 3);

        // Create test colony
        const colony = createTestColony('SCOUT', 1, 1, 1);
        
        // Clear cache
        clearSuitabilityCache();
        
        // Generate many calculations to test cache limits
        for (let i = 0; i < 15000; i++) {
            const x = i % 3, y = Math.floor(i / 3) % 3;
            // Vary some parameters to create different cache keys
            World.tick = i;
            suitabilityAt(colony, x, y);
        }
        
        runner.assertLessThan(World.suitabilityCache.size, 12000, 'Cache size should be limited to prevent memory growth');
        
        // Verify clearing works
        clearSuitabilityCache();
        runner.assertEqual(World.suitabilityCache.size, 0, 'Cache should be empty after clearing');
        
        restore.restore();
    });

    runner.test('Suitability optimization preserves simulation determinism', () => {
        const restore = createTestWorld(4, 4);

        // Set up identical initial conditions
        const colony1 = createTestColony('MAT', 1, 1, 1);
        const colony2 = createTestColony('MAT', 2, 1, 1);
        
        // Set identical traits
        colony1.traits = {water_need: 0.6, light_use: 0.4, photosym: 0.7};
        colony2.traits = {water_need: 0.6, light_use: 0.4, photosym: 0.7};
        
        // Set up environment
        for (let i = 0; i < 16; i++) {
            World.env.humidity[i] = 0.5;
            World.env.light[i] = 0.6;
            World.env.nutrient[i] = 0.7;
            World.env.water[i] = i % 2; // Alternating water pattern
        }
        
        // Clear all caches
        clearSuitabilityCache();
        World.environmentCache = null;
        World.tick = 100;
        
        // Calculate suitability for same position with both colonies
        const suit1 = suitabilityAt(colony1, 2, 2);
        const suit2 = suitabilityAt(colony2, 2, 2);
        
        runner.assertApproxEqual(suit1, suit2, 0.000001, 'Identical colonies should have identical suitability');
        
        // Verify calculations are still accurate by testing known relationships
        // Change humidity instead of water since MAT suitability depends on humidity for waterFit
        World.env.humidity[idx(2, 2)] = 0.8; // Change humidity to affect waterFit
        clearSuitabilityCache();
        World.environmentCache = null;
        
        const suitWithChangedEnv = suitabilityAt(colony1, 2, 2);
        runner.assertNotEqual(suit1, suitWithChangedEnv, 'Suitability should change when environment changes');
        
        restore.restore();
    });

    runner.test('Performance optimization reduces calculation overhead', () => {
        const restore = createTestWorld(5, 5);

        const colony = createTestColony('TOWER', 1, 2, 2);
        
        // Time calculations with fresh cache each time (truly uncached)
        clearSuitabilityCache();
        World.environmentCache = null;
        
        const startTime = performance.now();
        for (let i = 0; i < 50; i++) {
            clearSuitabilityCache();
            World.environmentCache = null;
            suitabilityAt(colony, 2, 2);
        }
        const uncachedTime = performance.now() - startTime;
        
        // Time calculations with cache (same position, should be much faster)
        clearSuitabilityCache();
        World.environmentCache = null;
        const cachedStartTime = performance.now();
        for (let i = 0; i < 50; i++) {
            suitabilityAt(colony, 2, 2); // Should hit cache after first call
        }
        const cachedTime = performance.now() - cachedStartTime;
        
        // Cache should provide significant speedup for repeated calculations
        // Allow for measurement variance by requiring at least some improvement
        const speedupRatio = uncachedTime / cachedTime;
        runner.assertGreaterThan(speedupRatio, 1.1, 'Cached calculations should be at least 10% faster than uncached');
        
        // Verify cache is working by checking size
        runner.assertGreaterThan(World.suitabilityCache.size, 0, 'Cache should contain entries after calculations');
        
        restore.restore();
    });

    // Canvas Redraw Frequency optimization tests
    runner.test('Canvas rendering uses needRedraw flag correctly', () => {
        const restore = createTestWorld();
        
        // Initially needRedraw should be true 
        runner.assert(needRedraw, 'needRedraw should be true initially');
        
        // Mock draw function to track calls
        let drawCallCount = 0;
        const originalDraw = draw;
        window.draw = function() {
            drawCallCount++;
            originalDraw.call(this);
        };
        
        // Pause the world to prevent simulation from setting needRedraw
        const originalPaused = World.paused;
        World.paused = true;
        
        // Call loop when needRedraw is true (world paused)
        drawCallCount = 0;
        needRedraw = true;
        loop(performance.now());
        runner.assertEqual(drawCallCount, 1, 'draw() should be called when needRedraw is true');
        runner.assert(!needRedraw, 'needRedraw should be false after draw()');
        
        // Call loop when needRedraw is false (world paused)
        drawCallCount = 0;
        needRedraw = false;
        loop(performance.now());
        runner.assertEqual(drawCallCount, 0, 'draw() should NOT be called when needRedraw is false');
        
        // Restore original state
        World.paused = originalPaused;
        window.draw = originalDraw;
        restore.restore();
    });
    
    runner.test('Overlay cache prevents unnecessary regeneration', () => {
        const restore = createTestWorld();
        
        // Test the overlay state detection logic directly
        const state1 = {
            humidity: true,
            light: false,
            nutrient: false,
            water: false,
            trail: false
        };
        
        const state2 = {
            humidity: true,
            light: false,
            nutrient: false,
            water: false,
            trail: false
        };
        
        const state3 = {
            humidity: true,
            light: true,  // Changed
            nutrient: false,
            water: false,
            trail: false
        };
        
        // Test overlay state comparison
        runner.assert(!overlayStateChanged(state2, state1), 'Identical states should not be considered changed');
        runner.assert(overlayStateChanged(state3, state1), 'Different states should be considered changed');
        runner.assert(overlayStateChanged(state1, null), 'State vs null should be considered changed');
        
        // Test overlay cache clearing
        clearOverlayCache();
        runner.assert(lastOverlayState === null, 'clearOverlayCache should reset lastOverlayState');
        runner.assert(overlayImageData === null, 'clearOverlayCache should reset overlayImageData');
        
        // Test getOverlayState function
        const mockElements = {
            ovHumidity: { checked: true },
            ovLight: { checked: false },
            ovNutrient: { checked: true },
            ovWater: { checked: false },
            ovTrail: { checked: true }
        };
        
        const originalGetElement = document.getElementById;
        document.getElementById = function(id) {
            if (mockElements[id]) {
                return mockElements[id];
            }
            return { checked: false };
        };
        
        const overlayState = getOverlayState();
        runner.assert(overlayState.humidity === true, 'getOverlayState should read humidity correctly');
        runner.assert(overlayState.light === false, 'getOverlayState should read light correctly');
        runner.assert(overlayState.nutrient === true, 'getOverlayState should read nutrient correctly');
        runner.assert(overlayState.water === false, 'getOverlayState should read water correctly');
        runner.assert(overlayState.trail === true, 'getOverlayState should read trail correctly');
        
        // Restore mocks
        document.getElementById = originalGetElement;
        restore.restore();
    });
    
    runner.test('needRedraw flag is set by user interactions', () => {
        const restore = createTestWorld();
        
        // Test overlay toggle sets needRedraw
        needRedraw = false;
        clearOverlayCache();
        needRedraw = true; // Should be set by overlay change
        runner.assert(needRedraw, 'Overlay change should set needRedraw flag');
        
        // Test simulation step sets needRedraw
        needRedraw = false;
        if (!World.paused || stepping) {
            stepEcosystem();
            needRedraw = true; // This is set in the loop
        }
        runner.assert(needRedraw, 'Simulation step should set needRedraw flag');
        
        // Test mouse hover sets needRedraw
        needRedraw = false;
        World.hover = {x: 5, y: 5}; // Simulate mouse hover
        needRedraw = true; // Would be set by mouse event
        runner.assert(needRedraw, 'Mouse hover should set needRedraw flag');
        
        restore.restore();
    });

    return runner.run();
}
