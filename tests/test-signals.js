/* ===== Chemical Signaling Tests ===== */

function runSignalTests() {
    const runner = new TestRunner();

    runner.test('Signals object exists and has required methods', () => {
        runner.assertType(Signals, 'object', 'Signals should be defined');
        runner.assertType(Signals.clear, 'function', 'Signals.clear should exist');
        runner.assertType(Signals.diffuseEvaporate, 'function', 'Signals.diffuseEvaporate should exist');
        runner.assertType(Signals.satStress, 'function', 'Signals.satStress should exist');
        runner.assertType(Signals.satAggregation, 'function', 'Signals.satAggregation should exist');
    });

    runner.test('Signal arrays are properly initialized', () => {
        setupWorld(12345, '64x36');
        
        runner.assertType(World.signals.stress, 'object', 'Stress signal array should be initialized');
        runner.assertType(World.signals.aggregation, 'object', 'Aggregation signal array should be initialized');
        runner.assertType(World.signals.stressBuf, 'object', 'Stress buffer should be initialized');
        runner.assertType(World.signals.aggregationBuf, 'object', 'Aggregation buffer should be initialized');
        
        runner.assertEqual(World.signals.stress.length, 64 * 36, 'Stress array should match world size');
        runner.assertEqual(World.signals.aggregation.length, 64 * 36, 'Aggregation array should match world size');
    });

    runner.test('Signal diffusion works without errors', () => {
        setupWorld(12345, '64x36');
        
        // Add some signal values
        World.signals.stress[100] = 1.0;
        World.signals.aggregation[200] = 0.8;
        
        const initialStress = World.signals.stress[100];
        const initialAggregation = World.signals.aggregation[200];
        
        // Should not throw errors
        try {
            Signals.diffuseEvaporate();
            runner.assert(true, 'Signal diffusion should not throw errors');
        } catch (e) {
            runner.assert(false, `Signal diffusion threw error: ${e.message}`);
        }
        
        // Values should have changed (evaporated and diffused)
        runner.assertNotEqual(World.signals.stress[100], initialStress, 'Stress should have diffused/evaporated');
        runner.assertNotEqual(World.signals.aggregation[200], initialAggregation, 'Aggregation should have diffused/evaporated');
    });

    runner.test('Signal saturation functions work correctly', () => {
        runner.assertType(Signals.satStress(1.0), 'number', 'Stress saturation should return number');
        runner.assertType(Signals.satAggregation(1.0), 'number', 'Aggregation saturation should return number');
        
        const stressSat = Signals.satStress(1.0);
        const aggregationSat = Signals.satAggregation(1.0);
        runner.assert(stressSat > 0 && stressSat < 1, 'Stress saturation should be in range (0,1)');
        runner.assert(aggregationSat > 0 && aggregationSat < 1, 'Aggregation saturation should be in range (0,1)');
        
        runner.assertGreaterThan(Signals.satStress(10.0), Signals.satStress(1.0), 'Higher input should give higher saturation');
    });

    return runner.run();
}