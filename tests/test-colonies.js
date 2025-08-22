/* ===== Colony System Tests ===== */

function runColonyTests() {
    const runner = new TestRunner();

    runner.test('Colony validation functions work correctly', () => {
        runner.assert(isValidType('MAT'), 'MAT should be valid type');
        runner.assert(isValidType('SCOUT'), 'SCOUT should be valid type');
        runner.assert(!isValidType('INVALID'), 'INVALID should not be valid type');
        runner.assert(!isValidType(''), 'Empty string should not be valid type');
        runner.assert(!isValidType(null), 'null should not be valid type');
    });

    runner.test('Color generation functions work', () => {
        const restore = createTestWorld();
        World.rng = sfc32(1, 2, 3, 4); // Deterministic
        
        const color1 = randomColorVivid();
        const color2 = randomColorVivid();
        
        runner.assertType(color1, 'string', 'Should return string');
        runner.assert(color1.startsWith('hsl('), 'Should return HSL color');
        runner.assert(color1 !== color2, 'Should generate different colors');
        
        const jittered = jitterColor(color1, 10);
        runner.assertType(jittered, 'string', 'Jittered color should be string');
        runner.assert(jittered.startsWith('hsl('), 'Jittered color should be HSL');
        
        restore.restore();
    });

    runner.test('Species name generation works', () => {
        const restore = createTestWorld();
        World.rng = sfc32(1, 2, 3, 4); // Deterministic
        
        const name1 = genSpeciesName('MAT');
        const name2 = genSpeciesName('SCOUT');
        
        runner.assertType(name1, 'string', 'Should return string');
        runner.assertType(name2, 'string', 'Should return string');
        runner.assert(name1.includes('matta'), 'MAT species should include type hint');
        runner.assert(name2.includes('cursor'), 'SCOUT species should include type hint');
        runner.assert(name1.includes(' '), 'Should include space between genus and epithet');
        runner.assert(name1.includes('-'), 'Should include dash before type hint');
        
        restore.restore();
    });

    runner.test('newColony creates valid colonies', () => {
        const restore = createTestWorld();
        World.rng = sfc32(1, 2, 3, 4); // Deterministic
        
        const colony = newColony('MAT', 5, 5, null);
        
        runner.assertNotNull(colony, 'Should create colony');
        runner.assertEqual(colony.type, 'MAT', 'Should have correct type');
        runner.assertEqual(colony.x, 5, 'Should have correct x position');
        runner.assertEqual(colony.y, 5, 'Should have correct y position');
        runner.assertType(colony.id, 'number', 'Should have numeric ID');
        runner.assertType(colony.traits, 'object', 'Should have traits object');
        runner.assertType(colony.color, 'string', 'Should have color');
        runner.assertType(colony.species, 'string', 'Should have species name');
        runner.assertEqual(colony.age, 0, 'New colony should have age 0');
        runner.assertEqual(colony.gen, 0, 'New colony should have generation 0');
        runner.assertEqual(colony.parent, null, 'New colony should have no parent');
        runner.assertArrayLength(colony.kids, 0, 'New colony should have no kids');
        
        // Check that colony was placed in world
        runner.assertEqual(World.tiles[idx(5, 5)], colony.id, 'Colony should own its tile');
        runner.assertGreaterThan(World.biomass[idx(5, 5)], 0, 'Tile should have biomass');
        runner.assertGreaterThan(Slime.trail[idx(5, 5)], 0, 'Tile should have slime trail');
        
        restore.restore();
    });

    runner.test('newColony rejects invalid types', () => {
        const restore = createTestWorld();
        
        const bogus = newColony('INVALID', 5, 5, null);
        runner.assertEqual(bogus, null, 'Should return null for invalid type');
        
        restore.restore();
    });

    runner.test('Colony trait mutation works', () => {
        const restore = createTestWorld();
        World.mutationRate = 0.5; // High mutation rate for testing
        World.rng = sfc32(1, 2, 3, 4); // Deterministic
        
        const originalTraits = { ...Archetypes.MAT.base };
        const mutated = mutateTraits(originalTraits);
        
        runner.assertType(mutated, 'object', 'Should return object');
        
        // Check that traits are still in valid range
        for (const key in mutated) {
            runner.assertBetween(mutated[key], 0, 1, `Mutated ${key} should be in valid range`);
        }
        
        // With high mutation rate, some traits should change
        let changed = false;
        for (const key in originalTraits) {
            if (Math.abs(mutated[key] - originalTraits[key]) > 0.001) {
                changed = true;
                break;
            }
        }
        runner.assert(changed, 'Some traits should change with high mutation rate');
        
        restore.restore();
    });

    runner.test('Colony parent-child relationships work', () => {
        const restore = createTestWorld();
        World.rng = sfc32(1, 2, 3, 4); // Deterministic
        
        const parent = newColony('MAT', 3, 3, null);
        const child = newColony('MAT', 4, 4, parent);
        
        runner.assertNotNull(child, 'Should create child colony');
        runner.assertEqual(child.parent, parent.id, 'Child should reference parent ID');
        runner.assertEqual(child.gen, 1, 'Child should have generation 1');
        runner.assertEqual(child.species, parent.species, 'Child should have same species');
        runner.assert(parent.kids.includes(child.id), 'Parent should reference child ID');
        
        restore.restore();
    });

    runner.test('seedInitialColonies creates colonies', () => {
        const restore = createTestWorld();
        World.rng = sfc32(1, 2, 3, 4); // Deterministic
        
        seedInitialColonies();
        
        runner.assertEqual(World.colonies.length, 8, 'Should create 8 initial colonies');
        
        // Check that each colony is valid
        for (const colony of World.colonies) {
            runner.assert(isValidType(colony.type), `Colony ${colony.id} should have valid type`);
            runner.assert(inBounds(colony.x, colony.y), `Colony ${colony.id} should be in bounds`);
            runner.assertEqual(colony.gen, 0, `Initial colony ${colony.id} should have generation 0`);
        }
        
        restore.restore();
    });

    return runner.run();
}