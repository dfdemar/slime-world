# Changelog

Notable changes to Slimeworld will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

## [2.4] - 2025-08-22

### Added
- Comprehensive README with technical architecture and usage details
- BUGS.md file for tracking known issues and performance considerations
- CHANGELOG.md for tracking project changes
- Modular code organization with separate JavaScript files
- Organized directory structure (src/js/, src/css/)
- Comprehensive test suite with web-based test runner
- Bug fix verification tests (`test-bugfixes.js`)
- Starvation balance investigation and test coverage

### Updated
- **README.md**: Updated file structure to reflect modular architecture, enhanced testing section, version bump to 2.4
- **CLAUDE.md**: Updated development environment, file structure, testing framework details, and current state to August 2025
- **Documentation**: All references to monolithic architecture updated to reflect current modular structure

### Changed
- Refactored monolithic index.html into multiple organized files
- Split JavaScript code into logical modules:
  - `utils.js` - PRNG, helpers, and noise generation
  - `archetypes.js` - Colony type definitions and behaviors
  - `world.js` - Core world system and slime trail mechanics
  - `environment.js` - Procedural world generation
  - `colonies.js` - Colony creation and management
  - `ecosystem.js` - Balance, starvation, and growth mechanics
  - `renderer.js` - Canvas rendering and visual patterns
  - `ui.js` - User interface and interaction handling
  - `events.js` - Event listeners and initialization
  - `diagnostics.js` - Testing and debugging functions
- Extracted CSS into separate `main.css` file

### Fixed
- **Inspector Panel Real-time Updates**: Added missing `refreshInspectorRealtime()` call to main animation loop
- **Mini-map Division Bug**: Corrected coordinate calculation in `ui.js` (removed incorrect `y=Math.floor(i/World.H)` calculation)
- **Test Suite Failures**: Resolved 12 test failures including missing functions, DOM mocking, and array initialization
- **Test Infrastructure**: Added `assertNotEqual` method, enhanced DOM element mocking, fixed global references
- Added comprehensive test coverage for boundary wrapping consistency, type pressure edge cases, and RNG determinism

### Investigated
- **Nutrient Starvation Balance**: Confirmed energy formula imbalance affecting EAT archetype
  - Issue: EAT (no photosynthesis) lacks compensation in nutrient-rich, low-light environments  
  - Formula `0.7*nutrient + 0.3*photosym*light` requires 0.5 nutrients for ALL archetypes without light
  - Analysis shows photosynthetic types (TOWER) have advantage with light availability
  - Added comprehensive test coverage to document current behavior

## [2.3] - Previous Version
### Features
- Real-time inspector with live colony statistics
- Per-colony procedural pattern generation
- Six distinct organism archetypes with specialized behaviors
- Dynamic environmental overlays (humidity, light, nutrients, water, trails)
- Chemical trail system with diffusion and evaporation
- Competitive displacement and evolutionary mechanics
- Save/load functionality with JSON serialization
- Manual colony spawning and interactive controls

---

*Note: This changelog starts from the refactoring milestone. Previous version history was not formally tracked.*
