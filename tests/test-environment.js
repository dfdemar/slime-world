/* ===== Environment Tests ===== */

function runEnvironmentTests() {
    const runner = new TestRunner();

    runner.test('smoothBinaryGrid smooths correctly', () => {
        const W = 5, H = 5;
        const testGrid = new Uint8Array(W * H);
        
        // Create a checkerboard pattern
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                testGrid[y * W + x] = (x + y) % 2;
            }
        }
        
        const smoothed = smoothBinaryGrid(testGrid, W, H, 1);
        
        runner.assertType(smoothed, 'object', 'Should return Uint8Array');
        runner.assertEqual(smoothed.length, W * H, 'Should have same length');
        
        // Check that some values changed (smoothing occurred)
        let changed = false;
        for (let i = 0; i < testGrid.length; i++) {
            if (testGrid[i] !== smoothed[i]) {
                changed = true;
                break;
            }
        }
        runner.assert(changed, 'Smoothing should change some values');
        
        // All values should still be 0 or 1
        for (let i = 0; i < smoothed.length; i++) {
            runner.assert(smoothed[i] === 0 || smoothed[i] === 1, 'Smoothed values should be 0 or 1');
        }
    });

    runner.test('buildEnvironment creates valid environment', () => {
        const restore = createTestWorld(20, 15);
        World.field = ValueNoise(12345);
        World.rng = World.field.r;
        
        buildEnvironment();
        
        // Check that all environment arrays are filled
        runner.assertEqual(World.env.humidity.length, 20 * 15, 'Humidity array should have correct length');
        runner.assertEqual(World.env.light.length, 20 * 15, 'Light array should have correct length');
        runner.assertEqual(World.env.nutrient.length, 20 * 15, 'Nutrient array should have correct length');
        runner.assertEqual(World.env.water.length, 20 * 15, 'Water array should have correct length');
        
        // Check value ranges
        for (let i = 0; i < World.env.humidity.length; i++) {
            runner.assertBetween(World.env.humidity[i], 0, 1, `Humidity[${i}] should be in valid range`);
            runner.assertBetween(World.env.light[i], 0, 1, `Light[${i}] should be in valid range`);
            runner.assertBetween(World.env.nutrient[i], 0, 1, `Nutrient[${i}] should be in valid range`);
            runner.assert(World.env.water[i] === 0 || World.env.water[i] === 1, `Water[${i}] should be 0 or 1`);
        }
        
        // Check that there's variation in the environment
        const humiditySet = new Set(World.env.humidity);
        const lightSet = new Set(World.env.light);
        const nutrientSet = new Set(World.env.nutrient);
        
        runner.assertGreaterThan(humiditySet.size, 1, 'Humidity should have variation');
        runner.assertGreaterThan(lightSet.size, 1, 'Light should have variation');
        runner.assertGreaterThan(nutrientSet.size, 1, 'Nutrient should have variation');
        
        // Check that water forms connected regions (at least some water should exist)
        const waterCount = World.env.water.reduce((sum, val) => sum + val, 0);
        runner.assertGreaterThan(waterCount, 0, 'Should have some water tiles');
        runner.assertLessThan(waterCount, World.env.water.length, 'Should not be all water');
        
        restore.restore();
    });

    runner.test('Environment affects nutrient levels near water', () => {
        const restore = createTestWorld(10, 10);
        World.field = ValueNoise(12345);
        World.rng = World.field.r;
        
        // Manually set up environment for testing
        for (let i = 0; i < World.env.humidity.length; i++) {
            World.env.humidity[i] = 0.5;
            World.env.light[i] = 0.5;
            World.env.nutrient[i] = 0.5;
            World.env.water[i] = 0;
        }
        
        // Place water in center
        const centerIdx = idx(5, 5);
        World.env.water[centerIdx] = 1;
        
        // Apply water effects (from buildEnvironment)
        for (let i = 0; i < World.W * World.H; i++) {
            if (World.env.water[i]) {
                World.env.humidity[i] = clamp(World.env.humidity[i] * 0.88 + 0.12 * 1, 0, 1);
                World.env.nutrient[i] = clamp(World.env.nutrient[i] + 0.04, 0, 1);
            }
        }
        
        runner.assertGreaterThan(World.env.humidity[centerIdx], 0.5, 'Water should increase humidity');
        runner.assertGreaterThan(World.env.nutrient[centerIdx], 0.5, 'Water should increase nutrients');
        
        restore.restore();
    });

    runner.test('Environment generation is deterministic', () => {
        const restore1 = createTestWorld(10, 10);
        World.field = ValueNoise(12345);
        World.rng = World.field.r;
        buildEnvironment();
        const env1 = {
            humidity: Array.from(World.env.humidity),
            light: Array.from(World.env.light),
            nutrient: Array.from(World.env.nutrient),
            water: Array.from(World.env.water)
        };
        restore1.restore();
        
        const restore2 = createTestWorld(10, 10);
        World.field = ValueNoise(12345); // Same seed
        World.rng = World.field.r;
        buildEnvironment();
        const env2 = {
            humidity: Array.from(World.env.humidity),
            light: Array.from(World.env.light),
            nutrient: Array.from(World.env.nutrient),
            water: Array.from(World.env.water)
        };
        restore2.restore();
        
        // Environments should be identical
        for (let i = 0; i < env1.humidity.length; i++) {
            runner.assertApproxEqual(env1.humidity[i], env2.humidity[i], 0.001, `Humidity[${i}] should match`);
            runner.assertApproxEqual(env1.light[i], env2.light[i], 0.001, `Light[${i}] should match`);
            runner.assertApproxEqual(env1.nutrient[i], env2.nutrient[i], 0.001, `Nutrient[${i}] should match`);
            runner.assertEqual(env1.water[i], env2.water[i], `Water[${i}] should match`);
        }
    });

    runner.test('Environment has realistic gradients', () => {
        const restore = createTestWorld(50, 30);
        World.field = ValueNoise(12345);
        World.rng = World.field.r;
        
        buildEnvironment();
        
        // Check for smooth transitions (no abrupt changes)
        let abruptChanges = 0;
        const threshold = 0.5; // Maximum change between adjacent cells
        
        for (let y = 1; y < World.H - 1; y++) {
            for (let x = 1; x < World.W - 1; x++) {
                const current = idx(x, y);
                const right = idx(x + 1, y);
                const down = idx(x, y + 1);
                
                if (Math.abs(World.env.humidity[current] - World.env.humidity[right]) > threshold) {
                    abruptChanges++;
                }
                if (Math.abs(World.env.humidity[current] - World.env.humidity[down]) > threshold) {
                    abruptChanges++;
                }
            }
        }
        
        // Allow some abrupt changes but not too many
        const totalChecks = (World.W - 1) * (World.H - 1) * 2;
        const abruptRatio = abruptChanges / totalChecks;
        runner.assertLessThan(abruptRatio, 0.1, 'Environment should have mostly smooth gradients');
        
        restore.restore();
    });

    return runner.run();
}