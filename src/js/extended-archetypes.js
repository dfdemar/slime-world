/* ===== Extended Modular Archetypes ===== */

/**
 * Tower/Canopy archetype - optimized for light exploitation
 */
class TowerArchetype extends Archetype {
    constructor() {
        super(
            'TOWER',
            'Tower/Canopy',
            'Light-exploiting organism with high photosynthetic capacity',
            {
                water_need: 0.55,
                light_use: 0.85,
                photosym: 0.75,
                transport: 0.5,
                predation: 0.05,
                spore: 0.4,
                defense: 0.6,
                flow: 0.5
            },
            {
                trailW: 0.15,
                nutrientW: 0.55,
                deposit: 0.30,
                senseR: 3,
                waterPenalty: -0.12
            }
        );
    }

    getTraitWeight(traitName) {
        const weights = {
            light_use: 2.5,
            photosym: 2.0,
            defense: 1.3
        };
        return weights[traitName] || 1.0;
    }

    calculateFitness(traits, environment, position) {
        let fitness = super.calculateFitness(traits, environment, position);
        
        // Tower penalty for water tiles
        if (environment.water[position]) {
            fitness += this.behaviors.waterPenalty || 0;
        }
        
        return clamp(fitness, 0, 1);
    }
}

/**
 * Floater/Raft archetype - aquatic adaptation
 */
class FloaterArchetype extends Archetype {
    constructor() {
        super(
            'FLOAT',
            'Floater/Raft',
            'Aquatic-adapted organism with water affinity',
            {
                water_need: 0.9,
                light_use: 0.5,
                photosym: 0.6,
                transport: 0.55,
                predation: 0.08,
                spore: 0.6,
                defense: 0.45,
                flow: 0.6
            },
            {
                trailW: 0.40,
                nutrientW: 0.70,
                deposit: 0.60,
                senseR: 4,
                waterAffinity: 0.25
            }
        );
    }

    getTraitWeight(traitName) {
        const weights = {
            water_need: 2.0,
            photosym: 1.5,
            spore: 1.3
        };
        return weights[traitName] || 1.0;
    }

    calculateFitness(traits, environment, position) {
        let fitness = super.calculateFitness(traits, environment, position);
        
        // Floater bonus/penalty for water
        if (environment.water[position]) {
            fitness += this.behaviors.waterAffinity || 0;
        } else {
            fitness -= 0.08; // Penalty for non-water tiles
        }
        
        return clamp(fitness, 0, 1);
    }
}

/**
 * Engulfer archetype - predatory specialist
 */
class EngulferArchetype extends Archetype {
    constructor() {
        super(
            'EAT',
            'Engulfer',
            'Predatory organism specialized in competitive displacement',
            {
                water_need: 0.5,
                light_use: 0.05,
                photosym: 0.0,
                transport: 0.7,
                predation: 0.85,
                spore: 0.35,
                defense: 0.7,
                flow: 0.75
            },
            {
                trailW: 0.60,
                nutrientW: 0.45,
                deposit: 0.65,
                senseR: 5
            }
        );
    }

    getTraitWeight(traitName) {
        const weights = {
            predation: 2.5,
            defense: 1.8,
            transport: 1.5,
            photosym: 0.1 // Very low weight for photosynthesis
        };
        return weights[traitName] || 1.0;
    }

    calculateFitness(traits, environment, position) {
        let fitness = super.calculateFitness(traits, environment, position);
        
        // Engulfer prefers areas with higher biomass density (more prey)
        const density = World.biomass[position];
        fitness += 0.1 * clamp(density - 0.5, 0, 1);
        
        return clamp(fitness, 0, 1);
    }
}

/**
 * Scout/Prospector archetype - exploration specialist
 */
class ScoutArchetype extends Archetype {
    constructor() {
        super(
            'SCOUT',
            'Scout/Prospector',
            'Exploration specialist with large sensing range',
            {
                water_need: 0.55,
                light_use: 0.35,
                photosym: 0.25,
                transport: 0.7,
                predation: 0.05,
                spore: 0.55,
                defense: 0.35,
                flow: 0.95
            },
            {
                trailW: 0.35,
                nutrientW: 0.85,
                deposit: 0.25,
                senseR: 8
            }
        );
    }

    getTraitWeight(traitName) {
        const weights = {
            transport: 1.8,
            flow: 2.0,
            spore: 1.5,
            defense: 0.7 // Lower weight for defense
        };
        return weights[traitName] || 1.0;
    }

    calculateFitness(traits, environment, position) {
        let fitness = super.calculateFitness(traits, environment, position);
        
        // Scout bonus for nutrient-rich areas
        const nutrientLevel = environment.nutrient[position];
        fitness += 0.15 * nutrientLevel;
        
        return clamp(fitness, 0, 1);
    }
}

/**
 * Custom trait for specialized behaviors
 */
class SpecializedTrait extends Trait {
    constructor(name, description, calculator, defaultValue = 0.5) {
        super(name, description, defaultValue);
        this.calculator = calculator;
    }

    calculateFitness(value, environment, position) {
        return this.calculator(value, environment, position);
    }
}

/**
 * Trait factory for creating custom traits
 */
class TraitFactory {
    static createEnvironmentalTrait(name, environmentField, optimal = 0.5) {
        return new SpecializedTrait(
            name,
            `Adaptation to ${environmentField} levels`,
            (value, env, pos) => 1.0 - Math.abs(env[environmentField][pos] - value),
            optimal
        );
    }

    static createSynergyTrait(name, partnerTraits, synergyStrength = 0.2) {
        return new SpecializedTrait(
            name,
            `Synergistic interaction with ${partnerTraits.join(', ')}`,
            (value, env, pos, colony) => {
                if (!colony || !colony.traits) return value;
                
                let synergy = 0;
                for (const partner of partnerTraits) {
                    if (colony.traits[partner]) {
                        synergy += colony.traits[partner] * value * synergyStrength;
                    }
                }
                return clamp(value + synergy, 0, 1);
            }
        );
    }

    static createAdaptiveTrait(name, adaptationFunction) {
        return new SpecializedTrait(
            name,
            'Adaptive trait with custom behavior',
            adaptationFunction
        );
    }
}

// Complete the modular archetype registry
Object.assign(ModularArchetypes, {
    TOWER: new TowerArchetype(),
    FLOAT: new FloaterArchetype(),
    EAT: new EngulferArchetype(),
    SCOUT: new ScoutArchetype()
});

/**
 * Archetype evolution system
 */
class ArchetypeEvolution {
    static createHybrid(parent1Type, parent2Type, traits1, traits2) {
        const arch1 = ModularArchetypes[parent1Type];
        const arch2 = ModularArchetypes[parent2Type];
        
        if (!arch1 || !arch2) return null;
        
        // Create hybrid traits by averaging
        const hybridTraits = {};
        for (const traitName of Object.keys(TraitRegistry)) {
            const val1 = traits1[traitName] || 0.5;
            const val2 = traits2[traitName] || 0.5;
            hybridTraits[traitName] = clamp((val1 + val2) / 2, 0, 1);
        }
        
        // Create hybrid behaviors
        const hybridBehaviors = {};
        for (const behaviorName of ['trailW', 'nutrientW', 'deposit', 'senseR']) {
            const val1 = arch1.behaviors[behaviorName] || 0.5;
            const val2 = arch2.behaviors[behaviorName] || 0.5;
            hybridBehaviors[behaviorName] = (val1 + val2) / 2;
        }
        
        return new Archetype(
            `${parent1Type}_${parent2Type}`,
            `${arch1.name} × ${arch2.name} Hybrid`,
            `Hybrid organism combining traits of ${arch1.name} and ${arch2.name}`,
            hybridTraits,
            hybridBehaviors
        );
    }

    static createMutant(baseType, mutationStrength = 0.3) {
        const baseArch = ModularArchetypes[baseType];
        if (!baseArch) return null;
        
        const mutantTraits = {};
        for (const [traitName, value] of Object.entries(baseArch.traitValues)) {
            const mutation = randRange(World.rng, -mutationStrength, mutationStrength);
            mutantTraits[traitName] = clamp(value + mutation, 0, 1);
        }
        
        return new Archetype(
            `${baseType}_MUT`,
            `${baseArch.name} Mutant`,
            `Mutated variant of ${baseArch.name}`,
            mutantTraits,
            {...baseArch.behaviors}
        );
    }
}

/**
 * Integration functions for backward compatibility
 */
function getModularArchetype(type) {
    return ModularArchetypes[type] || null;
}

function isModularArchetype(type) {
    return ModularArchetypes.hasOwnProperty(type);
}

// Export compatibility functions
window.getModularArchetype = getModularArchetype;
window.isModularArchetype = isModularArchetype;
window.ModularArchetypes = ModularArchetypes;
window.TraitFactory = TraitFactory;
window.ArchetypeEvolution = ArchetypeEvolution;