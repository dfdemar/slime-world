/* ===== Colonies ===== */
function randomColorVivid() {
    const h = randRange(World.rng, 0, 360);
    const s = randRange(World.rng, 70, 95);
    const l = randRange(World.rng, 45, 60);
    return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

function jitterColor(hsl, amt = 8) {
    const m = /hsl\(([-\d.]+) ([\d.]+)% ([\d.]+)%\)/.exec(hsl);
    if (!m) return randomColorVivid();
    let [_, h, s, l] = m;
    h = parseFloat(h);
    s = parseFloat(s);
    l = parseFloat(l);
    h = (h + randRange(World.rng, -amt, amt) + 360) % 360;
    s = clamp(s + randRange(World.rng, -5, 5), 60, 98);
    l = clamp(l + randRange(World.rng, -5, 5), 35, 68);
    return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

function genSpeciesName(type) {
    const genusParts = ['Myxo', 'Physa', 'Plasmo', 'Dicty', 'Fuligo', 'Arcyria', 'Lepto', 'Stemo', 'Lampro', 'Lycog', 'Cratera', 'Stemon'];
    const epithetParts = ['luminis', 'hydra', 'nutrix', 'vias', 'silvae', 'aqua', 'tenebrae', 'celer', 'retis', 'spora', 'flumen', 'saxum'];
    const hints = {MAT: 'matta', CORD: 'funis', TOWER: 'turris', FLOAT: 'ratis', EAT: 'vorax', SCOUT: 'cursor'};
    const g = genusParts[Math.floor(World.rng() * genusParts.length)];
    const e = epithetParts[Math.floor(World.rng() * epithetParts.length)];
    return g + ' ' + e + '-' + (hints[type] || 'forma');
}

function isValidType(type) {
    return Object.prototype.hasOwnProperty.call(Archetypes, type)
}

function newColony(type, x, y, parent = null) {
    if (!isValidType(type)) {
        console.warn('newColony: invalid type', type);
        notify(`Invalid archetype: ${type}`, 'error');
        return null;
    }
    const arch = Archetypes[type];
    const traits = {...arch.base};
    for (const k in traits) {
        traits[k] = clamp(traits[k] + randRange(World.rng, -0.05, 0.05), 0, 1)
    }
    const color = parent ? jitterColor(parent.color) : randomColorVivid();
    const id = World.nextId++;
    const species = parent ? parent.species : genSpeciesName(type);
    const c = {
        id,
        type,
        name: arch.name,
        species,
        x,
        y,
        color,
        traits,
        age: 0,
        biomass: 1.0,
        gen: parent ? (parent.gen + 1) : 0,
        parent: parent ? parent.id : null,
        kids: [],
        lastFit: 0
    };
    if (parent) parent.kids.push(id);
    // per-colony pattern
    c.pattern = createPatternForColony(c);
    World.colonies.push(c);
    const X = wrapX(x), Y = wrapY(y);
    const i = idx(X, Y);
    World.tiles[i] = id;
    World.biomass[i] = Math.max(World.biomass[i] || 0, 0.4);
    Slime.trail[i] = (Slime.trail[i] || 0) + (TypeBehavior[type]?.deposit || 0.5);
    return c;
}

function seedInitialColonies() {
    const {W, H} = World;
    const types = Object.keys(Archetypes);
    const count = 8;
    for (let i = 0; i < count; i++) {
        const t = types[Math.floor(World.rng() * types.length)];
        const x = Math.floor(World.rng() * W), y = Math.floor(World.rng() * H);
        newColony(t, x, y, null);
    }
}

function mutateTraits(traits) {
    const t = {...traits};
    const keys = Object.keys(t);
    const m = World.mutationRate;
    for (const k of keys) {
        const sigma = 0.12 * m;
        t[k] = clamp(t[k] + randRange(World.rng, -sigma, sigma), 0, 1);
    }
    return t;
}
