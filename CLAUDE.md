# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

This is a modular HTML5/JavaScript simulation that runs entirely in the browser. No build process, package manager, or server is required.

**Running the Application:**
- Open `index.html` directly in a modern browser
- No installation or compilation steps needed

**Testing:**
- **Jest Framework**: Primary testing framework with `npm test`, `npm run test:watch`, and `npm run test:coverage`
- **Real Behavior Testing**: Tests load actual source code without mocks or simulated behavior
- **Comprehensive Test Suites**: Core, colonies, ecosystem, environment, trait system, UI, signals, colony states, and bug fix tests
- **Legacy Web Runner**: `tests/test-runner.html` still available for interactive browser testing
- **Built-in Diagnostics**: `runTests()`, `validateSlimeTrails()`, and `validateNutrientBalance()` functions
- **Test Coverage**: Covers core systems, edge cases, starvation balance, boundary conditions, and bug fixes
- **CI/CD Ready**: Jest configuration supports automated testing and coverage reporting

## Architecture Overview

### File Structure
```
slime-world/
├── index.html              # Main application entry point
├── src/
│   ├── css/
│   │   └── main.css        # Extracted CSS styles
│   └── js/
│       ├── utils.js        # PRNG, helpers, noise generation
│       ├── archetypes.js   # Legacy archetype definitions
│       ├── world.js        # Core world system and slime mechanics
│       ├── environment.js  # Procedural world generation
│       ├── colonies.js     # Colony creation and management
│       ├── ecosystem.js    # Balance, starvation, and growth
│       ├── renderer.js     # Canvas rendering and patterns
│       ├── ui.js          # User interface and interactions
│       ├── events.js       # Event listeners and initialization
│       ├── diagnostics.js  # Testing and debugging functions
│       ├── trait-system.js # New modular trait framework
│       ├── extended-archetypes.js # Specialized archetype classes
│       ├── integration.js  # Legacy/modular compatibility layer
│       └── main.js         # Application initialization
├── tests/
│   ├── test-runner.html    # Web-based test runner
│   ├── test-utils.js       # Testing framework and utilities
│   ├── test-core.js        # Core system tests
│   ├── test-colonies.js    # Colony system tests
│   ├── test-ecosystem.js   # Ecosystem and simulation tests
│   ├── test-environment.js # Environment generation tests
│   ├── test-trait-system.js # New trait system tests  
│   └── test-bugfixes.js    # Bug fix regression tests
├── README.md               # Comprehensive user documentation
├── CLAUDE.md              # This development guide
├── BUGS.md                # Known issues tracking
├── CHANGELOG.md           # Project change history
└── LICENSE                # MIT license
```

### Core Systems

**World System (`World` object):**
- Grid-based simulation (configurable sizes: 128×72 to 256×144)
- Environmental layers: humidity, light, nutrients, water
- Colony management with unique IDs and type-based behaviors
- Deterministic PRNG using SFC32 algorithm with seed control

**Legacy Colony Archetypes (`Archetypes` object):**
Six distinct organism types with specialized traits:
- `MAT` - Foraging Mat (high water need, moderate transport)
- `CORD` - Cord/Creeper (high transport, moderate predation)  
- `TOWER` - Tower/Canopy (high photosynthesis, low predation)
- `FLOAT` - Floater/Raft (water affinity, moderate all-around)
- `EAT` - Engulfer (high predation, no photosynthesis)
- `SCOUT` - Scout/Prospector (high sensing range, high nutrient weight)

**Modular Trait System (NEW):**
- `Trait` base class with validation, mutation, and fitness calculation
- Specialized trait classes: `WaterNeedTrait`, `LightUseTrait`, `PhotosynthesisTrait`, etc.
- `TraitRegistry` for centralized trait management
- `Archetype` class for modular organism definitions
- `TraitFactory` for creating custom traits
- `ArchetypeEvolution` for creating hybrids and mutants

**Enhanced Archetype Classes (NEW):**
- `ForagingMatArchetype`, `CordArchetype`, `TowerArchetype`, etc.
- Specialized fitness calculations and trait weighting
- Extensible behavior system with custom modifiers
- Backward compatibility with legacy system

**Slime Trail System (`Slime` object):**
- Chemical trail diffusion and evaporation
- Influences colony expansion decisions
- Double-buffered for stable computation
- Exponential saturation curves for realistic perception

**Rendering Engine:**
- Canvas-based visualization with pixelated scaling
- Per-colony procedural pattern generation for visual distinction
- Real-time overlay system for environmental data
- Responsive scaling based on viewport size

### Key Algorithms

**Legacy Suitability Calculation (`suitabilityAt`):**
Evaluates locations for colony expansion based on:
- Environmental compatibility (water, light, nutrients)
- Trait matching (water_need, light_use, photosym)  
- Chemical signals (slime trails)
- Type-specific bonuses/penalties
- Population pressure balancing

**Modular Suitability Calculation (`calculateModularSuitability`):**
Enhanced fitness evaluation using:
- Archetype-specific trait weighting
- Specialized fitness functions per trait
- Chemical trail influence integration
- Capacity and type pressure application

**Unified Ecosystem Simulation:**
- Multi-step per-frame execution for performance scaling
- Colony expansion attempts with competitive displacement
- Mutation and reproduction based on fitness thresholds
- Environmental drift and seasonal pulses
- Periodic cleanup of extinct colonies
- Integration layer supporting both legacy and modular systems

## Development Guidelines

**Code Organization (Modular):**
- Functionality split into logical modules with clear dependencies
- JavaScript organized by system: utils, world, colonies, traits, etc.
- CSS extracted to separate file with custom properties
- Test coverage for all major systems and components

**Code Organization (Legacy):**
- All functionality contained in `index.html` with clear section markers
- JavaScript organized into logical blocks: PRNG, World, Colonies, Rendering, etc.
- CSS uses CSS custom properties for consistent theming

**Trait System Development:**
- Extend `Trait` base class for new trait types
- Use `TraitFactory` for common trait patterns
- Implement specialized archetype classes for complex behaviors
- Maintain backward compatibility through integration layer

**Testing Guidelines:**
- Write tests for all new functionality
- Use `TestRunner` class for consistent test structure
- Test both legacy and modular systems when applicable
- Validate performance implications of new features

**Simulation Parameters:**
- Mutation rates, carrying capacity, and speed are user-configurable
- Environmental generation uses fractal noise with multiple octaves
- Balance maintained through type pressure system preventing monocultures
- New trait-specific parameters configurable per archetype

**Performance Considerations:**
- Typed arrays used for large data structures (Float32Array, Uint8Array)
- Efficient neighbor sampling in suitability calculations
- Pattern caching with size limits to prevent memory leaks
- Proper buffer swapping in slime trail diffusion
- Periodic cleanup to prevent value accumulation
- Performance comparison tools for legacy vs modular systems

**Interactive Features:**
- Real-time inspector with mini-map for selected colonies
- Manual colony spawning with archetype selection
- Save/load system using JSON serialization
- Environmental overlay toggles for debugging
- Dynamic nutrient hotspots that drift to prevent stagnation

**Configuration:**
- `SystemConfig` for enabling/disabling modular features
- Simulation parameters configurable through UI
- Environmental generation uses fractal noise with configurable scales
- Migration utilities for switching between systems

## Current State (August 2025)

**Architecture:**
- **Modular Structure**: Code organized into logical modules with clear separation of concerns
- **Comprehensive Testing**: Full test suite with web-based runner and automated validation
- **Real-time Inspector**: Live colony statistics and mini-map updates during simulation
- **Bug Tracking**: Documented issues with test coverage and resolution status
- **Performance Optimization**: Enhanced rendering and simulation efficiency

**Recent Improvements (v2.4):**
- Fixed Inspector panel real-time updates in main animation loop
- Corrected mini-map coordinate calculation bug  
- Enhanced test infrastructure with comprehensive DOM mocking
- Added starvation balance investigation and documentation
- Improved error handling and test isolation

**Testing Framework:**
- **Interactive Test Runner**: `tests/test-runner.html` with real-time results
- **Comprehensive Coverage**: Core, colonies, ecosystem, environment, and bug fix tests
- **Automated Validation**: Regression prevention and edge case verification
- **Performance Benchmarking**: Simulation consistency and behavior validation
- **DOM Mocking**: Robust test environment for UI components

**Known Issues (Tracked in BUGS.md):**
- ✅ Mini-map division error - **FIXED**
- 🔍 Nutrient starvation balance - **INVESTIGATED** (EAT archetype disadvantage documented)
- ⚠️ Potential memory leaks in pattern caching (low priority, test coverage added)
- ⚠️ Type pressure calculation timing (low priority, test coverage added)

**Migration Status:**
- Legacy system fully preserved and functional
- Modular system implemented with full feature parity
- Integration layer provides seamless transition
- Performance testing shows comparable or improved efficiency

## Development Workflow

**Adding New Features:**
1. Write tests first (TDD approach)
2. Implement in modular system with backward compatibility
3. Update integration layer if needed
4. Validate performance impact
5. Update documentation and changelog

**Bug Fixes:**
1. Add test case reproducing the bug
2. Fix in both systems if applicable
3. Validate fix with test suite
4. Update BUGS.md status

**System Extensions:**
1. Use trait system for new organism types
2. Extend archetype classes for specialized behaviors
3. Create custom traits with TraitFactory
4. Test hybrid and mutation capabilities

**Performance Optimization:**
1. Use performance comparison tools
2. Profile both legacy and modular systems
3. Optimize bottlenecks while maintaining compatibility
4. Validate improvements with benchmarks

## Integration Guidelines

**Legacy Compatibility:**
- All legacy functions preserved and working
- Original `index.html` unchanged and functional
- Seamless migration path between systems
- Performance parity or improvement

**Modular System Benefits:**
- Extensible trait and archetype framework
- Better code organization and maintainability
- Comprehensive test coverage
- Enhanced debugging and profiling tools

**Switching Between Systems:**
- Use `SystemConfig.useModularTraits = true/false`
- Migration utilities handle data conversion
- Hybrid mode allows side-by-side comparison
- Debug mode provides detailed system insights

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
**NEVER** create files unless they're absolutely necessary for achieving your goal.
**ALWAYS** prefer editing an existing file to creating a new one.
**NEVER** proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
**NEVER** use mocks or simulated behavior in tests
**NEVER** rewrite tests using mocks to get them to pass
**ALWAYS** test actual behavior
**ALWAYS** run the tests after writing them
**NEVER** assume that a test failure is irrelevant or unrelated to your changes
