/* ===== Modular Trait System ===== */

/**
 * Base trait class that defines the interface for all traits
 */
class Trait {
    constructor(name, description, defaultValue = 0.5, min = 0, max = 1) {
        this.name = name;
        this.description = description;
        this.defaultValue = defaultValue;
        this.min = min;
        this.max = max;
    }

    /**
     * Validate trait value is within bounds
     */
    validate(value) {
        return clamp(value, this.min, this.max);
    }

    /**
     * Calculate fitness contribution for this trait
     */
    calculateFitness(value, environment, position) {
        // Base implementation - override in subclasses
        return value;
    }

    /**
     * Apply mutation to trait value
     */
    mutate(value, mutationRate, rng) {
        const sigma = 0.12 * mutationRate;
        const mutated = value + randRange(rng, -sigma, sigma);
        return this.validate(mutated);
    }
}

/**
 * Water dependency trait
 */
class WaterNeedTrait extends Trait {
    constructor() {
        super('water_need', 'Dependency on humid environments', 0.5, 0, 1);
    }

    calculateFitness(value, environment, position) {
        const humidity = environment.humidity[position];
        return 1.0 - Math.abs(humidity - value);
    }
}

/**
 * Light utilization trait
 */
class LightUseTrait extends Trait {
    constructor() {
        super('light_use', 'Optimal light level for photosynthesis', 0.5, 0, 1);
    }

    calculateFitness(value, environment, position) {
        const light = environment.light[position];
        return 1.0 - Math.abs(light - value);
    }
}

/**
 * Photosynthetic capacity trait
 */
class PhotosynthesisTrait extends Trait {
    constructor() {
        super('photosym', 'Photosynthetic capacity', 0.3, 0, 1);
    }

    calculateFitness(value, environment, position) {
        const light = environment.light[position];
        if (value > 0) {
            return 0.55 * (1.0 - Math.abs(light - 0.7)) + 0.45 * value * light;
        } else {
            return 1.0 - 0.6 * light; // Prefers darker areas
        }
    }
}

/**
 * Transport/mobility trait
 */
class TransportTrait extends Trait {
    constructor() {
        super('transport', 'Efficiency of resource transport and mobility', 0.6, 0, 1);
    }

    calculateFitness(value, environment, position) {
        // Higher transport helps with expansion
        return value;
    }
}

/**
 * Predation capability trait
 */
class PredationTrait extends Trait {
    constructor() {
        super('predation', 'Ability to displace competing colonies', 0.1, 0, 1);
    }

    calculateFitness(value, environment, position) {
        // Predation fitness depends on competition density
        return value;
    }
}

/**
 * Defensive capability trait
 */
class DefenseTrait extends Trait {
    constructor() {
        super('defense', 'Resistance to predation and displacement', 0.5, 0, 1);
    }

    calculateFitness(value, environment, position) {
        // Defense provides passive protection
        return value;
    }
}

/**
 * Reproduction rate trait
 */
class SporeTrait extends Trait {
    constructor() {
        super('spore', 'Rate of reproduction and colony splitting', 0.5, 0, 1);
    }

    calculateFitness(value, environment, position) {
        // Higher spore rate increases expansion potential
        return value;
    }
}

/**
 * Chemical flow efficiency trait
 */
class FlowTrait extends Trait {
    constructor() {
        super('flow', 'Efficiency of chemical trail deposition', 0.7, 0, 1);
    }

    calculateFitness(value, environment, position) {
        // Flow affects trail strength and communication
        return value;
    }
}

/**
 * Registry of all available traits
 */
const TraitRegistry = {
    water_need: new WaterNeedTrait(),
    light_use: new LightUseTrait(),
    photosym: new PhotosynthesisTrait(),
    transport: new TransportTrait(),
    predation: new PredationTrait(),
    defense: new DefenseTrait(),
    spore: new SporeTrait(),
    flow: new FlowTrait()
};

/**
 * Modular archetype system
 */
class Archetype {
    constructor(code, name, description, traitValues = {}, behaviors = {}) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.traitValues = traitValues;
        this.behaviors = behaviors;
    }

    /**
     * Create base traits for this archetype
     */
    createTraits() {
        const traits = {};
        for (const [traitName, trait] of Object.entries(TraitRegistry)) {
            if (this.traitValues.hasOwnProperty(traitName)) {
                traits[traitName] = trait.validate(this.traitValues[traitName]);
            } else {
                traits[traitName] = trait.defaultValue;
            }
        }
        return traits;
    }

    /**
     * Calculate overall fitness for a colony with these traits
     */
    calculateFitness(traits, environment, position) {
        let totalFitness = 0;
        let weightSum = 0;
        
        for (const [traitName, trait] of Object.entries(TraitRegistry)) {
            if (traits.hasOwnProperty(traitName)) {
                const fitness = trait.calculateFitness(traits[traitName], environment, position);
                const weight = this.getTraitWeight(traitName);
                totalFitness += fitness * weight;
                weightSum += weight;
            }
        }
        
        return weightSum > 0 ? totalFitness / weightSum : 0;
    }

    /**
     * Get the importance weight for a specific trait
     */
    getTraitWeight(traitName) {
        // Default equal weighting, can be overridden by archetypes
        return 1.0;
    }

    /**
     * Apply mutations to traits
     */
    mutateTraits(traits, mutationRate, rng) {
        const mutated = {};
        for (const [traitName, value] of Object.entries(traits)) {
            const trait = TraitRegistry[traitName];
            if (trait) {
                mutated[traitName] = trait.mutate(value, mutationRate, rng);
            } else {
                mutated[traitName] = value; // Keep unknown traits unchanged
            }
        }
        return mutated;
    }
}

/**
 * Specialized archetype for foraging mats
 */
class ForagingMatArchetype extends Archetype {
    constructor() {
        super(
            'MAT',
            'Foraging Mat',
            'Resource-harvesting organism optimized for nutrient processing',
            {
                water_need: 0.7,
                light_use: 0.2,
                photosym: 0.15,
                transport: 0.6,
                predation: 0.1,
                spore: 0.5,
                defense: 0.5,
                flow: 0.8
            },
            {
                trailW: 0.30,
                nutrientW: 0.70,
                deposit: 0.50,
                senseR: 3
            }
        );
    }

    getTraitWeight(traitName) {
        const weights = {
            water_need: 1.5,
            nutrient: 2.0,
            flow: 1.3
        };
        return weights[traitName] || 1.0;
    }
}

/**
 * Specialized archetype for cord/creeper
 */
class CordArchetype extends Archetype {
    constructor() {
        super(
            'CORD',
            'Cord/Creeper',
            'Network-building organism with high transport efficiency',
            {
                water_need: 0.6,
                light_use: 0.25,
                photosym: 0.2,
                transport: 0.85,
                predation: 0.15,
                spore: 0.45,
                defense: 0.55,
                flow: 0.9
            },
            {
                trailW: 0.55,
                nutrientW: 0.60,
                deposit: 0.80,
                senseR: 7
            }
        );
    }

    getTraitWeight(traitName) {
        const weights = {
            transport: 2.0,
            flow: 1.8,
            defense: 1.2
        };
        return weights[traitName] || 1.0;
    }
}

// Create modular archetype registry
const ModularArchetypes = {
    MAT: new ForagingMatArchetype(),
    CORD: new CordArchetype(),
    // Add more archetypes as needed
};

/**
 * Enhanced colony creation using modular system
 */
function createModularColony(archetypeCode, x, y, parent = null) {
    const archetype = ModularArchetypes[archetypeCode];
    if (!archetype) {
        console.warn('createModularColony: invalid archetype', archetypeCode);
        return null;
    }

    const traits = parent ? 
        archetype.mutateTraits(parent.traits, World.mutationRate, World.rng) :
        archetype.createTraits();

    const colony = {
        id: World.nextId++,
        type: archetypeCode,
        archetype: archetype,
        name: archetype.name,
        species: parent ? parent.species : genSpeciesName(archetypeCode),
        x, y,
        color: parent ? jitterColor(parent.color) : randomColorVivid(),
        traits,
        age: 0,
        biomass: 1.0,
        gen: parent ? (parent.gen + 1) : 0,
        parent: parent ? parent.id : null,
        kids: [],
        lastFit: 0
    };

    return colony;
}

/**
 * Enhanced suitability calculation using modular traits
 */
function calculateModularSuitability(colony, x, y) {
    const position = idx(x, y);
    const environment = World.env;
    
    // Use the colony's archetype to calculate fitness
    const baseFitness = colony.archetype.calculateFitness(colony.traits, environment, position);
    
    // Apply chemical trail influence
    const trailSaturation = Slime.sat(Slime.trail[position]);
    const behaviors = colony.archetype.behaviors;
    const chemicalFitness = (behaviors.nutrientW * environment.nutrient[position] + 
                            behaviors.trailW * trailSaturation) / 
                           (behaviors.nutrientW + behaviors.trailW);
    
    // Combine base fitness with chemical signals
    const combinedFitness = 0.6 * baseFitness + 0.4 * chemicalFitness;
    
    // Apply capacity pressure
    const density = World.biomass[position];
    const capPenalty = -0.35 * clamp((density - World.capacity), 0, 1);
    
    // Apply type pressure
    const pressure = World.typePressure[colony.type] ?? 1;
    
    return clamp(combinedFitness * pressure + capPenalty, 0, 1);
}