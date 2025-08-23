# Known Bugs and Issues

This file tracks suspected bugs and issues in the Slimeworld Evolution Simulator.

## Confirmed Bugs

*No confirmed bugs at this time - all identified issues have been fixed or addressed.*

## Potential Issues

### 1. Random Number Generator State
**Location:** Global `World.rng` usage  
**Issue:** Single global RNG state shared across all systems  
**Details:** Could cause reproduction in deterministic scenarios if save/load affects RNG state  
**Impact:** Non-deterministic behavior in edge cases  
**Priority:** Low  
**Test Coverage:** ✅ Tests added to verify RNG determinism

## Performance Considerations

### 1. Suitability Calculation Overhead
**Location:** `suitabilityAt()` function  
**Issue:** Called frequently with neighbor sampling  
**Details:** Could benefit from spatial caching or optimization  
**Impact:** Performance degradation with large worlds  
**Priority:** Medium  
**Test Coverage:** ✅ Tests added to verify suitability calculation edge cases

### 2. Canvas Redraw Frequency
**Location:** Rendering system  
**Issue:** Full canvas redraw on every frame  
**Details:** Could implement dirty region tracking  
**Impact:** CPU usage on large worlds  
**Priority:** Low  
**Test Coverage:** ✅ Tests added to verify needRedraw optimization flag

## Fixed Issues

### 1. Type Pressure Calculation Timing ✅ FIXED
**Location:** `updateTypePressure()` function (ecosystem.js:11, integration.js:322)  
**Issue:** Called every 30 ticks, allowing rapid population changes to create temporary monocultures before pressure adjustment  
**Details:** Fixed-interval updates were too slow to respond to rapid population explosions, allowing single archetypes to dominate temporarily and disrupt ecosystem balance  
**Fix Applied:** Implemented adaptive pressure system with intelligent update timing:
- Checks population every 5 ticks but only calculates pressure when needed
- Detects significant population changes (>15% share difference) and updates immediately
- Falls back to 30-tick maximum interval if no changes detected
- Tracks population history to compare changes efficiently
- Added force parameter for initialization
**Impact:** Prevents temporary monocultures by responding quickly to population explosions while maintaining performance during stable periods  
**Status:** Fixed in v2.6 - comprehensive tests verify responsive pressure updates and ecosystem balance maintenance

### 2. Boundary Wrapping Inconsistency ✅ FIXED
**Location:** Various functions using modulo operations (world.js, ecosystem.js, colonies.js, integration.js)  
**Issue:** Some boundary calculations used wrapping while others used clamping, creating inconsistent toroidal topology  
**Details:** Chemical diffusion (slime trails, nutrients) wrapped around edges while colony suitability and expansion stopped at boundaries, preventing colonies from following their chemical signals across world edges  
**Fix Applied:** Implemented consistent wrapping throughout the simulation:
- Added wrapping utility functions: `wrapX()`, `wrapY()`, `wrapCoords()`, `idxWrapped()`
- Updated suitability calculation to use wrapped neighbor sampling instead of bounds checking
- Changed colony expansion logic to use wrapping coordinates instead of clamping
- Updated colony spawning and coordinate calculations to use wrapping
- Applied fixes to both legacy (`ecosystem.js`, `colonies.js`) and modular (`integration.js`) systems
**Impact:** Eliminates artificial edge effects, creates consistent toroidal world topology where organisms can interact seamlessly across boundaries
**Status:** Fixed in v2.6 - comprehensive tests verify consistent wrapping behavior and prevent regression

### 2. Memory Leak in Pattern Caching ✅ FIXED
**Location:** Pattern generation system (renderer.js:92)  
**Issue:** No explicit cleanup mechanism for colony patterns when colonies are removed  
**Details:** While patterns are small (8x8), long-running simulations with many colony births/deaths could accumulate memory  
**Fix Applied:** Added `cleanupColonyPattern()` function that properly cleans up canvas patterns and sets pattern property to null. Integrated cleanup calls in all colony removal locations:
- `ecosystem.js:244-250` - During periodic cleanup sweep
- `ui.js:319-320` - During manual colony removal
- `integration.js:322-330` - During modular system cleanup
**Impact:** Prevents gradual memory accumulation over time  
**Status:** Fixed in v2.6 - comprehensive tests verify fix and prevent regression

---
*Last updated: 2025-08-23*
