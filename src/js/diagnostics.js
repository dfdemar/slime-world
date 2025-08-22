/* ===== Diagnostics (lightweight) ===== */
function runTests() {
    const out = [];
    // names
    out.push(Archetypes.MAT?.name ? '✅ Archetypes have names' : '❌ Archetype names');
    // newColony type guard
    const before = World.nextId;
    const bogus = newColony('BOGUS', 0, 0, null);
    out.push((bogus === null) ? '✅ newColony invalid type returns null' : '❌ newColony invalid guard');
    // valid colony creates tile ownership
    const c1 = newColony('MAT', 0, 0, null);
    out.push(World.tiles[idx(0, 0)] === c1.id ? '✅ newColony creates colonies for valid types' : '❌ newColony creates colonies for valid types -> tile not owned');
    // TypeBehavior profiles present
    out.push(TypeBehavior.CORD?.senseR ? '✅ TypeBehavior profiles present' : '❌ TypeBehavior profiles present');
    // Slime diffusion+evap stability
    const T0 = Slime.trail.reduce((a, v) => a + v, 0);
    Slime.diffuseEvaporate();
    const T1 = Slime.trail.reduce((a, v) => a + v, 0);
    out.push(Number.isFinite(T1) ? '✅ Slime diffusion+evap behaves' : '❌ Slime diffusion+evap behaves -> NaN');
    // Suitability monotonic chemo (left-center-right on flat fields w/ nutrient gradient)
    const tmpCol = {id: undefined, type: 'MAT', traits: Archetypes.MAT.base};
    const i = Math.floor(World.H / 2);
    const saveN = World.env.nutrient.slice();
    for (let x = 0; x < World.W; x++) {
        World.env.nutrient[idx(x, i)] = x / World.W;
    }
    const L = suitabilityAt(tmpCol, Math.floor(World.W * 0.25), i);
    const C = suitabilityAt(tmpCol, Math.floor(World.W * 0.5), i);
    const R = suitabilityAt(tmpCol, Math.floor(World.W * 0.75), i);
    out.push((L <= C && C <= R) ? '✅ Suitability follows nutrient+trail chemo' : `❌ Suitability follows nutrient+trail chemo -> Not monotonic: L=${L.toFixed(3)} C=${C.toFixed(3)} R=${R.toFixed(3)}`);
    World.env.nutrient.set(saveN);
    // Simulation loop tick
    const tick0 = World.tick;
    stepEcosystem();
    out.push((World.tick > tick0) ? '✅ Simulation loop advances tick' : '❌ Simulation loop did not advance');
    document.getElementById('testResults').innerText = out.join('\n');
}

// Additional validation functions
function validateSlimeTrails() {
    // Test trail diffusion and evaporation
    const testTrail = new Float32Array(World.W * World.H);
    testTrail[Math.floor(testTrail.length / 2)] = 100; // Add a spike

    const originalTrail = Slime.trail;
    const originalNext = Slime.trailNext;

    Slime.trail = testTrail;
    Slime.trailNext = new Float32Array(World.W * World.H);

    const initialSum = Slime.trail.reduce((a, v) => a + v, 0);
    Slime.diffuseEvaporate();
    const afterSum = Slime.trail.reduce((a, v) => a + v, 0);

    // Restore original state
    Slime.trail = originalTrail;
    Slime.trailNext = originalNext;

    return {
        initialSum,
        afterSum,
        evaporated: initialSum > afterSum,
        diffused: afterSum > 0
    };
}

function validateNutrientBalance() {
    // Test nutrient consumption and regeneration
    const testNutrient = new Float32Array(World.env.nutrient);
    const initialSum = testNutrient.reduce((a, v) => a + v, 0);

    // Run a few nutrient dynamics cycles
    for (let i = 0; i < 10; i++) {
        nutrientDynamics();
    }

    const finalSum = World.env.nutrient.reduce((a, v) => a + v, 0);

    return {
        initialSum,
        finalSum,
        changed: Math.abs(initialSum - finalSum) > 0.001,
        stable: Math.abs(initialSum - finalSum) < initialSum * 0.1
    };
}
