/* ===== Colony State System Tests ===== */

function runColonyStateTests() {
    const runner = new TestRunner();

    runner.test('ColonyStates enum is properly defined', () => {
        runner.assertType(ColonyStates, 'object', 'ColonyStates should be defined');
        runner.assertEqual(ColonyStates.INDIVIDUAL, 'individual', 'INDIVIDUAL state should be defined');
        runner.assertEqual(ColonyStates.AGGREGATING, 'aggregating', 'AGGREGATING state should be defined');
        runner.assertEqual(ColonyStates.COLLECTIVE, 'collective', 'COLLECTIVE state should be defined');
        runner.assertEqual(ColonyStates.FRUITING, 'fruiting', 'FRUITING state should be defined');
    });

    runner.test('New colonies have proper state initialization', () => {
        setupWorld(12345, '64x36');
        const colony = newColony('MAT', 10, 10);
        
        runner.assertEqual(colony.state, ColonyStates.INDIVIDUAL, 'New colony should start in INDIVIDUAL state');
        runner.assertEqual(colony.stressLevel, 0, 'New colony should have zero stress level');
        runner.assertEqual(colony.aggregationTarget, null, 'New colony should have no aggregation target');
    });

    runner.test('State transition validation works correctly', () => {
        setupWorld(12345, '64x36');
        const colony = newColony('MAT', 10, 10);
        
        // Valid transitions
        runner.assert(canTransitionState(colony, ColonyStates.AGGREGATING), 'INDIVIDUAL -> AGGREGATING should be valid');
        
        // Invalid transitions
        runner.assert(!canTransitionState(colony, ColonyStates.COLLECTIVE), 'INDIVIDUAL -> COLLECTIVE should be invalid');
        runner.assert(!canTransitionState(colony, ColonyStates.FRUITING), 'INDIVIDUAL -> FRUITING should be invalid');
        
        // Change state and test more transitions
        colony.state = ColonyStates.AGGREGATING;
        runner.assert(canTransitionState(colony, ColonyStates.COLLECTIVE), 'AGGREGATING -> COLLECTIVE should be valid');
        runner.assert(canTransitionState(colony, ColonyStates.INDIVIDUAL), 'AGGREGATING -> INDIVIDUAL should be valid');
    });

    runner.test('State transitions work correctly', () => {
        setupWorld(12345, '64x36');
        const colony = newColony('MAT', 10, 10);
        
        // Valid transition
        const validResult = transitionColonyState(colony, ColonyStates.AGGREGATING);
        runner.assert(validResult === true, 'Valid transition should succeed');
        runner.assertEqual(colony.state, ColonyStates.AGGREGATING, 'Colony state should be updated');
        
        // Invalid transition should fail and not change state
        const invalidResult = transitionColonyState(colony, ColonyStates.FRUITING);
        runner.assert(invalidResult === false, 'Invalid transition should fail');
        runner.assertEqual(colony.state, ColonyStates.AGGREGATING, 'State should not change on invalid transition');
    });

    return runner.run();
}