# Changelog

All notable changes to the Slimeworld Evolution Simulator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive README with technical architecture and usage details
- BUGS.md file for tracking known issues and performance considerations
- CHANGELOG.md for tracking project changes
- Modular code organization with separate JavaScript files
- Organized directory structure (src/js/, src/css/)

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
- Documented mini-map division error (line 627 in original code)

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
