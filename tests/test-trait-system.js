/* ===== Trait System Tests ===== */

function runTraitSystemTests() {
    const runner = new TestRunner();

    runner.test('Trait class works correctly', () => {
        const testTrait = new Trait('test', 'Test trait', 0.5, 0, 1);
        
        runner.assertEqual(testTrait.name, 'test', 'Trait should have correct name');
        runner.assertEqual(testTrait.defaultValue, 0.5, 'Trait should have correct default value');
        
        // Test validation
        runner.assertEqual(testTrait.validate(0.5), 0.5, 'Valid value should be unchanged');
        runner.assertEqual(testTrait.validate(-0.1), 0, 'Negative value should be clamped to min');
        runner.assertEqual(testTrait.validate(1.1), 1, 'Excessive value should be clamped to max');
        
        // Test mutation
        const restore = createTestWorld();
        World.rng = sfc32(1, 2, 3, 4);
        const mutated = testTrait.mutate(0.5, 0.5, World.rng);
        runner.assertBetween(mutated, 0, 1, 'Mutated value should be in valid range');
        restore.restore();
    });

    runner.test('Specialized traits calculate fitness correctly', () => {
        const waterTrait = new WaterNeedTrait();
        const lightTrait = new LightUseTrait();
        const photoTrait = new PhotosynthesisTrait();
        
        const mockEnv = {
            humidity: [0.7],
            light: [0.8],
            nutrient: [0.6]
        };
        
        // Test water trait fitness
        const waterFitness = waterTrait.calculateFitness(0.7, mockEnv, 0);
        runner.assertApproxEqual(waterFitness, 1.0, 0.001, 'Perfect water match should give fitness 1.0');
        
        const waterMismatch = waterTrait.calculateFitness(0.3, mockEnv, 0);
        runner.assertLessThan(waterMismatch, waterFitness, 'Water mismatch should reduce fitness');
        
        // Test light trait fitness  
        const lightFitness = lightTrait.calculateFitness(0.8, mockEnv, 0);
        runner.assertApproxEqual(lightFitness, 1.0, 0.001, 'Perfect light match should give fitness 1.0');
        
        // Test photosynthesis trait
        const photoFitness = photoTrait.calculateFitness(0.5, mockEnv, 0);
        runner.assertGreaterThan(photoFitness, 0, 'Photosynthesis should provide positive fitness');
        runner.assertLessThan(photoFitness, 1, 'Photosynthesis fitness should be less than 1');
    });

    runner.test('TraitRegistry contains all expected traits', () => {
        const expectedTraits = ['water_need', 'light_use', 'photosym', 'transport', 'predation', 'defense', 'spore', 'flow'];
        
        for (const traitName of expectedTraits) {
            runner.assert(TraitRegistry[traitName], `TraitRegistry should contain ${traitName}`);
            runner.assert(TraitRegistry[traitName] instanceof Trait, `${traitName} should be a Trait instance`);
        }
    });

    runner.test('Archetype class creates traits correctly', () => {
        const testArchetype = new Archetype(
            'TEST',
            'Test Archetype',
            'Test description',
            { water_need: 0.8, light_use: 0.3 },
            { trailW: 0.5, senseR: 5 }
        );
        
        const traits = testArchetype.createTraits();
        
        runner.assertEqual(traits.water_need, 0.8, 'Should use specified trait value');
        runner.assertEqual(traits.light_use, 0.3, 'Should use specified trait value');
        runner.assertEqual(traits.photosym, TraitRegistry.photosym.defaultValue, 'Should use default for unspecified traits');
        
        // Test fitness calculation
        const mockEnv = {
            humidity: [0.8],
            light: [0.3],
            nutrient: [0.5]
        };
        
        const fitness = testArchetype.calculateFitness(traits, mockEnv, 0);
        runner.assertBetween(fitness, 0, 1, 'Fitness should be between 0 and 1');
        runner.assertType(fitness, 'number', 'Fitness should be a number');
    });

    runner.test('ModularArchetypes are properly defined', () => {
        const expectedArchetypes = ['MAT', 'CORD', 'TOWER', 'FLOAT', 'EAT', 'SCOUT'];
        
        for (const archetype of expectedArchetypes) {
            runner.assert(ModularArchetypes[archetype], `Should have ${archetype} archetype`);
            runner.assert(ModularArchetypes[archetype] instanceof Archetype, `${archetype} should be Archetype instance`);
            
            const arch = ModularArchetypes[archetype];
            runner.assertType(arch.code, 'string', `${archetype} should have code`);
            runner.assertType(arch.name, 'string', `${archetype} should have name`);
            runner.assertType(arch.description, 'string', `${archetype} should have description`);
            runner.assertType(arch.traitValues, 'object', `${archetype} should have trait values`);
            runner.assertType(arch.behaviors, 'object', `${archetype} should have behaviors`);
            
            // Test trait creation
            const traits = arch.createTraits();
            runner.assertType(traits, 'object', `${archetype} should create traits object`);
            
            for (const traitName of Object.keys(TraitRegistry)) {
                runner.assertType(traits[traitName], 'number', `${archetype} should have ${traitName} trait`);
                runner.assertBetween(traits[traitName], 0, 1, `${archetype}.${traitName} should be in valid range`);
            }
        }
    });

    runner.test('createModularColony works correctly', () => {
        const restore = createTestWorld();
        World.rng = sfc32(1, 2, 3, 4);
        
        const colony = createModularColony('MAT', 5, 5, null);
        
        runner.assertNotNull(colony, 'Should create colony');
        runner.assertEqual(colony.type, 'MAT', 'Should have correct type');
        runner.assert(colony.archetype instanceof Archetype, 'Should have archetype instance');
        runner.assertType(colony.traits, 'object', 'Should have traits object');
        
        // Test with parent
        const child = createModularColony('MAT', 6, 6, colony);
        runner.assertNotNull(child, 'Should create child colony');
        runner.assertEqual(child.parent, colony.id, 'Child should reference parent');
        runner.assertEqual(child.gen, 1, 'Child should have generation 1');
        
        restore.restore();
    });

    runner.test('calculateModularSuitability works', () => {
        const restore = createTestWorld();
        
        // Set up test environment
        World.env.humidity[idx(5, 5)] = 0.7;
        World.env.light[idx(5, 5)] = 0.3;
        World.env.nutrient[idx(5, 5)] = 0.8;
        World.env.water[idx(5, 5)] = 0;
        Slime.trail[idx(5, 5)] = 5;
        World.biomass[idx(5, 5)] = 0.5;
        World.typePressure = { MAT: 1.0 };
        
        World.rng = sfc32(1, 2, 3, 4);
        const colony = createModularColony('MAT', 5, 5, null);
        
        const suitability = calculateModularSuitability(colony, 5, 5);
        
        runner.assertBetween(suitability, 0, 1, 'Suitability should be between 0 and 1');
        runner.assertType(suitability, 'number', 'Suitability should be a number');
        runner.assert(!isNaN(suitability), 'Suitability should not be NaN');
        
        restore.restore();
    });

    runner.test('Specialized archetypes have unique behaviors', () => {
        const restore = createTestWorld();
        
        // Set up water environment
        World.env.water[idx(5, 5)] = 1;
        World.env.humidity[idx(5, 5)] = 0.9;
        World.env.light[idx(5, 5)] = 0.5;
        World.env.nutrient[idx(5, 5)] = 0.7;
        
        World.rng = sfc32(1, 2, 3, 4);
        
        const floater = createModularColony('FLOAT', 5, 5, null);
        const tower = createModularColony('TOWER', 5, 5, null);
        
        const floaterFitness = calculateModularSuitability(floater, 5, 5);
        const towerFitness = calculateModularSuitability(tower, 5, 5);
        
        runner.assertGreaterThan(floaterFitness, towerFitness, 'Floater should prefer water more than Tower');
        
        restore.restore();
    });

    runner.test('TraitFactory creates custom traits', () => {
        const customTrait = TraitFactory.createEnvironmentalTrait('custom_field', 'humidity', 0.6);
        
        runner.assertEqual(customTrait.name, 'custom_field', 'Should have correct name');
        runner.assertEqual(customTrait.defaultValue, 0.6, 'Should have correct default value');
        
        const mockEnv = { humidity: [0.6] };
        const fitness = customTrait.calculateFitness(0.6, mockEnv, 0);
        runner.assertApproxEqual(fitness, 1.0, 0.001, 'Perfect match should give fitness 1.0');
    });

    runner.test('ArchetypeEvolution creates hybrids', () => {
        const restore = createTestWorld();
        World.rng = sfc32(1, 2, 3, 4);
        
        const mat = createModularColony('MAT', 5, 5, null);
        const scout = createModularColony('SCOUT', 6, 6, null);
        
        const hybrid = ArchetypeEvolution.createHybrid('MAT', 'SCOUT', mat.traits, scout.traits);
        
        runner.assertNotNull(hybrid, 'Should create hybrid archetype');
        runner.assertEqual(hybrid.code, 'MAT_SCOUT', 'Should have correct hybrid code');
        runner.assert(hybrid.name.includes('Hybrid'), 'Should have hybrid in name');
        
        // Test that hybrid traits are averages
        for (const traitName of Object.keys(TraitRegistry)) {
            const expectedAverage = (mat.traits[traitName] + scout.traits[traitName]) / 2;
            runner.assertApproxEqual(hybrid.traitValues[traitName], expectedAverage, 0.001, 
                `Hybrid ${traitName} should be average of parents`);
        }
        
        restore.restore();
    });

    runner.test('ArchetypeEvolution creates mutants', () => {
        const mutant = ArchetypeEvolution.createMutant('MAT', 0.2);
        
        runner.assertNotNull(mutant, 'Should create mutant archetype');
        runner.assertEqual(mutant.code, 'MAT_MUT', 'Should have correct mutant code');
        runner.assert(mutant.name.includes('Mutant'), 'Should have mutant in name');
        
        const original = ModularArchetypes.MAT;
        
        // Test that some traits are different (but not necessarily all)
        let differences = 0;
        for (const traitName of Object.keys(original.traitValues)) {
            if (Math.abs(mutant.traitValues[traitName] - original.traitValues[traitName]) > 0.001) {
                differences++;
            }
        }
        
        runner.assertGreaterThan(differences, 0, 'Mutant should have some different traits');
        
        // All traits should still be in valid range
        for (const traitName of Object.keys(mutant.traitValues)) {
            runner.assertBetween(mutant.traitValues[traitName], 0, 1, 
                `Mutant ${traitName} should be in valid range`);
        }
    });

    return runner.run();
}