# Slimeworld Evolution Simulator

A sophisticated ecosystem simulation inspired by slime mold behavior, featuring emergent evolution, competitive dynamics, and adaptive traits. Watch colonies of different archetypes compete, cooperate, and evolve in a dynamic environment with realistic resource constraints.

![Version](https://img.shields.io/badge/version-2.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange)

## Features

### 🧬 Evolution & Genetics
- **Six distinct archetypes** with unique ecological niches and behaviors
- **Dynamic trait mutation** with configurable rates and inheritance
- **Competitive displacement** based on predation vs defense dynamics
- **Multi-generational tracking** with parent-child relationships
- **Adaptive fitness** calculations based on environmental compatibility

### 🌍 Dynamic Ecosystem
- **Procedural world generation** using fractal noise with deterministic seeds
- **Realistic water systems** with connected pools and drainage basins
- **Environmental gradients** for humidity, light, and nutrients
- **Seasonal dynamics** with environmental drift and pulse events
- **Resource scarcity** with consumption, diffusion, and regeneration

### 🕸️ Slime Trail Chemistry
- **Chemical communication** through pheromone-like trail systems
- **Diffusion and evaporation** with realistic decay patterns
- **Trail reinforcement** guiding colony expansion decisions
- **Species-specific** trail deposition and sensing behaviors

### 🎨 Advanced Visualization
- **Per-colony pattern generation** for visual distinction
- **Real-time environmental overlays** (humidity, light, nutrients, water, trails)
- **Live colony inspector** with detailed trait analysis and mini-map
- **Procedural color palettes** with genetic color inheritance
- **Performance-optimized rendering** with pixelated scaling

### ⚙️ Simulation Controls
- **Deterministic seeding** for reproducible experiments
- **Variable world sizes** (128×72 to 256×144)
- **Adjustable speed, mutation rates, and carrying capacity**
- **Manual colony spawning** with archetype selection
- **Save/load system** with JSON serialization

## Archetype Overview

Each archetype represents a different ecological strategy with specialized traits and behaviors:

| Archetype | Strategy | Key Traits | Ecological Niche |
|-----------|----------|------------|------------------|
| **Foraging Mat** | Resource harvesting | High water need, moderate transport | Aquatic margins, nutrient processing |
| **Cord/Creeper** | Network building | High transport, strong trail deposition | Connecting habitats, resource highways |
| **Tower/Canopy** | Light exploitation | High photosynthesis, low predation | Bright areas, primary production |
| **Floater/Raft** | Aquatic adaptation | Water affinity, balanced traits | Water bodies, amphibious zones |
| **Engulfer** | Predatory | High predation, no photosynthesis | Competition-heavy areas, population control |
| **Scout/Prospector** | Exploration | Large sensing range, high nutrient weight | Edge exploration, resource discovery |

## Technical Architecture

### Core Systems

#### World System (`World` object)
- **Grid-based simulation** with configurable dimensions
- **Environmental layers** stored as typed arrays for performance
- **Colony management** with unique IDs and spatial indexing
- **Deterministic PRNG** using SFC32 algorithm with seed control

#### Trait System (`Archetypes` & `TypeBehavior`)
- **Base trait profiles** defining archetype characteristics
- **Behavioral parameters** controlling sensing range and chemical deposition
- **Mutation mechanics** with Gaussian noise and clamping
- **Fitness calculations** integrating multiple environmental factors

#### Chemical System (`Slime` object)
- **Double-buffered diffusion** for stable numerical computation
- **Exponential saturation** curves for realistic trail perception
- **Evaporation dynamics** preventing infinite accumulation
- **Species-specific** deposition rates and sensing weights

#### Rendering Engine
- **Canvas-based visualization** with WebGL-compatible pixel operations
- **Procedural pattern generation** using deterministic algorithms
- **Overlay compositing** for environmental data visualization
- **Responsive scaling** with device pixel ratio support

### Performance Optimizations

- **Typed arrays** (Float32Array, Uint8Array) for memory efficiency
- **Spatial locality** in neighbor sampling algorithms
- **Pattern caching** with automatic cleanup to prevent memory leaks
- **Multi-step per-frame** execution for smooth animation
- **Efficient buffer swapping** in diffusion calculations

### Simulation Balance

- **Type pressure system** prevents monocultures by adjusting spawn rates
- **Carrying capacity** limits population density
- **Starvation mechanics** remove unfit colonies
- **Competitive displacement** based on trait combinations
- **Environmental regeneration** maintains resource availability

## Getting Started

### Requirements
- Modern web browser with HTML5 Canvas support
- No installation, build process, or external dependencies required

### Running the Simulation
1. Open `index.html` directly in your browser
2. Adjust simulation parameters in the left panel
3. Use environmental overlays to visualize different data layers
4. Click colonies to inspect their traits and genealogy
5. Spawn new colonies manually using the archetype buttons

### Controls

| Key | Action |
|-----|--------|
| `Space` | Step one simulation tick |
| `P` | Toggle pause/play |
| `R` | Reset simulation with new random seed |
| `S` | Save PNG screenshot |
| `Esc` | Cancel colony spawning mode |

### Configuration

Simulation parameters can be adjusted in real-time:

- **Seed**: Deterministic world generation (integer)
- **World Size**: Grid dimensions (128×72 to 256×144)
- **Speed**: Simulation rate multiplier (0.1× to 4.0×)
- **Mutation Rate**: Trait variation intensity (0% to 100%)
- **Carrying Capacity**: Population density limit (0.1× to 2.0×)

## Advanced Usage

### Experimental Design
- Use deterministic seeds for reproducible experiments
- Compare different mutation rates and carrying capacities
- Study archetype interactions by selective spawning
- Analyze long-term evolution patterns through save/load

### Environmental Manipulation
- **Reseed Environment**: Generate new terrain with same parameters
- **Season Pulse**: Apply sudden environmental changes
- **Overlay Analysis**: Study resource distribution patterns

### Data Export
- **PNG Export**: High-quality simulation snapshots
- **JSON Save/Load**: Complete simulation state preservation
- **Inspector Data**: Real-time colony statistics and genealogy

## Scientific Basis

The simulation incorporates several biological and computational concepts:

- **Physarum polycephalum** behavior as inspiration for trail-following algorithms
- **Metaheuristic optimization** through collective intelligence
- **Evolutionary algorithms** with mutation and selection pressure
- **Reaction-diffusion systems** for chemical signal propagation
- **Spatial ecology** with habitat heterogeneity and resource competition

## Development

### File Structure
```
slime-world/
├── index.html          # Complete simulation (HTML + CSS + JS)
├── app.js              # Alternative implementation (unused)
├── style.css           # External CSS (unused)
├── README.md           # This documentation
├── CLAUDE.md           # Development guidelines
├── BUGS.md             # Known issues tracking
└── LICENSE             # MIT license
```

### Testing
Built-in diagnostic functions validate core mechanics:
- `validateSlimeTrails()` - Trail diffusion and evaporation
- `validateNutrientBalance()` - Resource consumption and regeneration
- Browser console provides debugging access to World object

### Contributing
See `CLAUDE.md` for development guidelines and architectural decisions. The codebase uses embedded JavaScript within HTML for maximum portability.

## License

MIT License - see `LICENSE` file for details.

## Acknowledgments

Inspired by the fascinating behavior of slime molds and the rich field of artificial life research. Special thanks to the biological systems that demonstrate how simple rules can generate complex, adaptive behaviors.

---

*For technical details and development guidelines, see `CLAUDE.md`*