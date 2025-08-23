/* ===== Balance & Starvation ===== */

// Energy calculation constants
window.NON_PHOTOSYNTHETIC_BONUS = 0.5; // Bonus nutrient efficiency for non-photosynthetic archetypes
const NON_PHOTOSYNTHETIC_BONUS = window.NON_PHOTOSYNTHETIC_BONUS;
function updateTypePressure() {
    const counts = {MAT: 0, CORD: 0, TOWER: 0, FLOAT: 0, EAT: 0, SCOUT: 0};
    const idToType = new Map();
    for (const c of World.colonies) {
        idToType.set(c.id, c.type)
    }
    let filled = 0;
    for (let i = 0; i < World.tiles.length; i++) {
        const id = World.tiles[i];
        if (id === -1) continue;
        filled++;
        const t = idToType.get(id);
        if (t) {
            counts[t] = (counts[t] || 0) + 1;
        }
    }
    const total = Math.max(1, filled);
    World.typePressure = {};
    for (const t of Object.keys(Archetypes)) {
        const share = (counts[t] || 0) / total;
        const pressure = clamp(1 - 0.7 * share, 0.55, 1.0);
        World.typePressure[t] = pressure;
    }
}

function starvationSweep() {
    const {nutrient, light} = World.env;
    const idToCol = new Map();
    for (const c of World.colonies) {
        idToCol.set(c.id, c);
    }
    for (let i = 0; i < World.tiles.length; i++) {
        const id = World.tiles[i];
        if (id === -1) continue;
        const col = idToCol.get(id);
        if (!col) {
            World.tiles[i] = -1;
            continue;
        }
        const n = nutrient[i], l = light[i], ps = col.traits.photosym || 0;
        // Enhanced energy formula: give non-photosynthetic archetypes bonus nutrient efficiency
        const nonPhotoBonus = ps < 0.1 ? NON_PHOTOSYNTHETIC_BONUS * (1 - ps * 10) : 0; // Bonus decreases as photosym increases
        const energy = 0.7 * n + 0.3 * ps * l + nonPhotoBonus * n;
        const cons = Math.min(n, 0.008 * Math.max(0.1, World.biomass[i]));
        nutrient[i] = clamp(n - cons, 0, 1);
        if (energy < 0.35) {
            const deficit = (0.35 - energy);
            const factor = 1 - Math.min(0.8 * deficit, 0.28);
            World.biomass[i] *= factor;
        } else {
            const cap = World.capacity;
            if (World.biomass[i] < cap) {
                World.biomass[i] = Math.min(cap, World.biomass[i] + 0.005 * (energy - 0.35));
            }
        }
        if (World.biomass[i] < 0.05) {
            World.tiles[i] = -1;
        }
    }
}

function nutrientDynamics() {
    const {nutrient, humidity, water} = World.env;
    const Nn = World._nutrientNext;
    const W = World.W, H = World.H;
    const diff = 0.12, regen = 0.01;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const n = nutrient[i];
            const l = nutrient[y * W + ((x - 1 + W) % W)], r = nutrient[y * W + ((x + 1) % W)],
                u = nutrient[((y - 1 + H) % H) * W + x], d = nutrient[((y + 1 + H) % H) * W + x];
            const mixed = (1 - diff) * n + (diff * 0.25) * (l + r + u + d);
            const target = clamp(0.2 + 0.6 * humidity[i] + 0.2 * water[i], 0, 1);
            Nn[i] = clamp(mixed + regen * (target - mixed), 0, 1);
        }
    }
    nutrient.set(Nn);
}

/* ===== Suitability & Growth ===== */
function suitabilityAt(col, x, y) {
    const {humidity, light, nutrient, water} = World.env;
    const i = idx(x, y);

    function s(field) {
        let sum = field[i];
        let count = 1;
        // Use wrapping for consistent toroidal topology
        sum += field[idxWrapped(x - 1, y)];
        count++;
        sum += field[idxWrapped(x + 1, y)];
        count++;
        sum += field[idxWrapped(x, y - 1)];
        count++;
        sum += field[idxWrapped(x, y + 1)];
        count++;
        return sum / count;
    }

    const h = s(humidity), l = s(light), n = nutrient[i], w = water[i];
    const T = col.traits;
    const B = TypeBehavior[col.type] || TypeBehavior.MAT;
    const waterFit = 1.0 - Math.abs(h - T.water_need);
    const lightFit = T.photosym > 0 ? (0.55 * (1.0 - Math.abs(l - T.light_use)) + 0.45 * T.photosym * l) : (1.0 - 0.6 * l);
    const trSat = Slime.sat(Slime.trail[i]);
    const denom = Math.max(1e-6, (B.nutrientW || 0) + (B.trailW || 0));
    const chemo = ((B.nutrientW || 0) * n + (B.trailW || 0) * trSat) / denom;
    // Bonuses/penalties
    let raftBonus = (col.type === 'FLOAT') ? (w ? 0.25 : -0.08) : 0;
    raftBonus += (B.waterAffinity && w) ? B.waterAffinity : 0;
    let towerPenalty = (col.type === 'TOWER' && w) ? -0.12 : 0;
    const base = clamp(0.06 * waterFit + 0.06 * lightFit + 0.88 * chemo + raftBonus + towerPenalty, 0, 1);
    // Capacity pressure
    const cap = World.capacity;
    const density = World.biomass[i];
    const capPenalty = -0.35 * clamp((density - cap), 0, 1);
    const pressure = World.typePressure[col.type] ?? 1;
    return clamp(base * pressure + capPenalty, 0, 1);
}

function tryExpand(col) {
    const B = TypeBehavior[col.type] || TypeBehavior.MAT;
    const cx = col.x, cy = col.y;
    const r = B.senseR || 5;
    let best = null, bestScore = -1, bestI = -1;
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const [x, y] = wrapCoords(cx + dx, cy + dy);
            const i = idx(x, y);
            if (World.tiles[i] !== col.id) continue;
            for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const [nx, ny] = wrapCoords(x + sx, y + sy);
                const j = idx(nx, ny);
                const foe = World.tiles[j];
                const s = suitabilityAt(col, nx, ny);
                let ok = false;
                if (foe === -1) ok = true; else if (foe === col.id) ok = false; else {
                    const enemy = World.colonies.find(c => c.id === foe);
                    if (!enemy) ok = true; else {
                        const pred = col.traits.predation - (enemy.traits.defense * 0.7);
                        const comp = s - suitabilityAt(enemy, nx, ny);
                        ok = (pred + comp) > randRange(World.rng, -0.15, 0.1);
                    }
                }
                if (ok) {
                    const trailBias = 0.06 * Slime.sat(Slime.trail[j]);
                    const score = s + trailBias + (foe === -1 ? 0.05 : 0) + World.rng() * 0.02;
                    if (score > bestScore) {
                        bestScore = score;
                        best = {x: nx, y: ny};
                        bestI = j
                    }
                }
            }
        }
    }
    if (best) {
        World.tiles[bestI] = col.id;
        World.biomass[bestI] = clamp(World.biomass[bestI] + 0.2, 0, 2.5);
        col.x = best.x;
        col.y = best.y;
        const dep = (TypeBehavior[col.type]?.deposit || 0.5) * (0.5 + 0.5 * col.traits.flow);
        Slime.trail[bestI] += dep;
        World.env.nutrient[bestI] = clamp(World.env.nutrient[bestI] - 0.03, 0, 1);
        return true;
    }
    return false;
}

function stepEcosystem() {
    const steps = Math.max(1, Math.floor(8 * World.speed));
    for (let s = 0; s < steps; s++) {
        World.tick++;
        if (World.tick % 5 === 0) {
            const drift = 0.002 * World.speed;
            for (let i = 0; i < World.env.humidity.length; i++) {
                World.env.humidity[i] = clamp(World.env.humidity[i] + randRange(World.rng, -drift, drift), 0, 1);
                World.env.light[i] = clamp(World.env.light[i] + randRange(World.rng, -drift, drift), 0, 1);
            }
        }
        const cols = World.colonies;
        if (cols.length > 0) {
            for (let k = 0; k < cols.length; k++) {
                const c = cols[(k + (World.tick % cols.length)) % cols.length];
                if (!c) continue;
                c.age++;
                c.lastFit = suitabilityAt(c, wrapX(Math.round(c.x)), wrapY(Math.round(c.y)));
                if (!tryExpand(c)) {
                    const decay = (c.lastFit < 0.4) ? 0.985 : 0.992;
                    c.biomass *= decay;
                } else {
                    c.biomass = clamp(c.biomass + 0.01, 0, 3);
                }
                const pressure = World.typePressure[c.type] ?? 1;
                const spawnP = (0.003 + 0.008 * World.mutationRate) * pressure;
                if (c.biomass > 0.8 && c.lastFit > 0.55 && Math.random() < spawnP) {
                    const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(World.rng() * 4)];
                    const bx = wrapX(Math.round(c.x + dir[0] * 2));
                    const by = wrapY(Math.round(c.y + dir[1] * 2));
                    const child = {...c};
                    child.id = World.nextId++;
                    child.parent = c.id;
                    child.gen = c.gen + 1;
                    child.kids = [];
                    child.age = 0;
                    child.x = bx;
                    child.y = by;
                    child.biomass = 0.6;
                    child.traits = mutateTraits(c.traits);
                    child.color = jitterColor(c.color, 14);
                    child.pattern = createPatternForColony(child);
                    World.colonies.push(child);
                    c.kids.push(child.id);
                    const bi = idx(bx, by);
                    if (World.tiles[bi] === -1) {
                        World.tiles[bi] = child.id;
                        World.biomass[bi] = 0.4;
                        Slime.trail[bi] += (TypeBehavior[c.type]?.deposit || 0.5);
                    }
                }
            }
        }
        Slime.diffuseEvaporate();
        starvationSweep();
        nutrientDynamics();
        if (World.tick % 30 === 0) updateTypePressure();
        if (World.tick % 60 === 0) {
            const alive = new Set(World.tiles);
            // Clean up patterns before removing colonies
            for (const colony of World.colonies) {
                if (!alive.has(colony.id)) {
                    cleanupColonyPattern(colony);
                }
            }
            World.colonies = World.colonies.filter(c => alive.has(c.id));
        }
    }
}
