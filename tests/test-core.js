/* ===== Core System Tests ===== */

function runCoreTests() {
    const runner = new TestRunner();

    // PRNG Tests
    runner.test('PRNG produces deterministic results', () => {
        const hash1 = xmur3('test');
        const hash2 = xmur3('test');
        const rng1 = sfc32(hash1(), hash1(), hash1(), hash1());
        const rng2 = sfc32(hash2(), hash2(), hash2(), hash2());
        
        runner.assertEqual(rng1(), rng2(), 'Same seed should produce same random values');
        runner.assertEqual(rng1(), rng2(), 'Subsequent values should also match');
    });

    runner.test('Utility functions work correctly', () => {
        runner.assertEqual(clamp(5, 0, 10), 5, 'Clamp should not modify value in range');
        runner.assertEqual(clamp(-5, 0, 10), 0, 'Clamp should limit to minimum');
        runner.assertEqual(clamp(15, 0, 10), 10, 'Clamp should limit to maximum');
        
        runner.assertApproxEqual(lerp(0, 10, 0.5), 5, 0.001, 'Lerp should interpolate correctly');
        runner.assertApproxEqual(smoothstep(0.5), 0.5, 0.001, 'Smoothstep at 0.5 should be 0.5');
    });

    // ValueNoise Tests
    runner.test('ValueNoise produces valid outputs', () => {
        const noise = ValueNoise(12345);
        
        runner.assertType(noise.r, 'function', 'Should return RNG function');
        runner.assertType(noise.noise2D, 'function', 'Should return noise2D function');
        runner.assertType(noise.fractal2D, 'function', 'Should return fractal2D function');
        
        const val = noise.noise2D(0.5, 0.5);
        runner.assertBetween(val, 0, 1, 'Noise value should be between 0 and 1');
        
        const fractal = noise.fractal2D(0.5, 0.5, 4, 2.0, 0.5);
        runner.assertBetween(fractal, 0, 1, 'Fractal noise should be between 0 and 1');
    });

    // World coordinate functions
    runner.test('World coordinate functions work correctly', () => {
        const restore = createTestWorld(10, 8);
        
        runner.assertEqual(idx(3, 2), 23, 'idx should calculate correct linear index');
        runner.assert(inBounds(5, 4), 'Should recognize valid coordinates as in bounds');
        runner.assert(!inBounds(-1, 4), 'Should recognize negative x as out of bounds');
        runner.assert(!inBounds(5, -1), 'Should recognize negative y as out of bounds');
        runner.assert(!inBounds(10, 4), 'Should recognize x >= width as out of bounds');
        runner.assert(!inBounds(5, 8), 'Should recognize y >= height as out of bounds');
        
        restore.restore();
    });

    // Archetype validation
    runner.test('Archetypes are properly defined', () => {
        const expectedTypes = ['MAT', 'CORD', 'TOWER', 'FLOAT', 'EAT', 'SCOUT'];
        
        for (const type of expectedTypes) {
            runner.assert(Archetypes[type], `Archetype ${type} should exist`);
            runner.assertType(Archetypes[type].name, 'string', `${type} should have name`);
            runner.assertType(Archetypes[type].code, 'string', `${type} should have code`);
            runner.assertType(Archetypes[type].base, 'object', `${type} should have base traits`);
            
            // Check required traits
            const traits = Archetypes[type].base;
            const requiredTraits = ['water_need', 'light_use', 'photosym', 'transport', 'predation', 'spore', 'defense', 'flow'];
            for (const trait of requiredTraits) {
                runner.assertType(traits[trait], 'number', `${type} should have ${trait} trait`);
                runner.assertBetween(traits[trait], 0, 1, `${type}.${trait} should be between 0 and 1`);
            }
        }
    });

    runner.test('TypeBehavior is properly defined', () => {
        const expectedTypes = ['MAT', 'CORD', 'TOWER', 'FLOAT', 'EAT', 'SCOUT'];
        
        for (const type of expectedTypes) {
            runner.assert(TypeBehavior[type], `TypeBehavior ${type} should exist`);
            
            const behavior = TypeBehavior[type];
            runner.assertType(behavior.trailW, 'number', `${type} should have trailW`);
            runner.assertType(behavior.nutrientW, 'number', `${type} should have nutrientW`);
            runner.assertType(behavior.deposit, 'number', `${type} should have deposit`);
            runner.assertType(behavior.senseR, 'number', `${type} should have senseR`);
            
            runner.assertBetween(behavior.trailW, 0, 1, `${type}.trailW should be between 0 and 1`);
            runner.assertBetween(behavior.nutrientW, 0, 1, `${type}.nutrientW should be between 0 and 1`);
            runner.assertBetween(behavior.deposit, 0, 1, `${type}.deposit should be between 0 and 1`);
            runner.assertGreaterThan(behavior.senseR, 0, `${type}.senseR should be positive`);
        }
    });

    return runner.run();
}