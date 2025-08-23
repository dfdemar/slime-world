# Known Bugs and Issues

This file tracks suspected bugs and issues in the Slimeworld Evolution Simulator.

## Confirmed Bugs

*No confirmed bugs at this time - all identified issues have been fixed or addressed.*

## Potential Issues

### 1. Memory Leak in Pattern Caching
**Location:** Pattern generation system  
**Issue:** No explicit cleanup mechanism for colony patterns when colonies are removed  
**Details:** While patterns are small (8x8), long-running simulations with many colony births/deaths could accumulate memory  
**Impact:** Gradual memory increase over time  
**Priority:** Low  
**Test Coverage:** ✅ Test added to verify pattern cleanup behavior

### 2. Nutrient Starvation Balance ✅ FIXED
**Location:** `starvationSweep()` function (ecosystem.js:42)  
**Issue:** EAT archetype lacked advantage in nutrient-rich environments despite no photosynthesis  
**Details:** Original energy formula `0.7*nutrient + 0.3*photosym*light` required 0.5 nutrients for ALL archetypes to survive without light. EAT (photosym=0) had no compensation mechanism for its photosynthesis limitation.  
**Fix Applied:** Enhanced energy formula with non-photosynthetic bonus:
```javascript
const NON_PHOTOSYNTHETIC_BONUS = 0.5; // Configurable constant
const nonPhotoBonus = ps < 0.1 ? NON_PHOTOSYNTHETIC_BONUS * (1 - ps * 10) : 0;
const energy = 0.7 * n + 0.3 * ps * l + nonPhotoBonus * n;
```
**Results:**
- EAT archetype now receives 50% bonus nutrient efficiency  
- Balance maintained: bonus decreases as photosynthesis increases
- EAT can now survive moderate conditions (0.3 nutrient, 0.3 light)
- Non-photosynthetic types are competitive in nutrient-rich environments
**Impact:** EAT archetype now properly excels in nutrient-rich, low-light environments  
**Priority:** ✅ RESOLVED  
**Test Coverage:** ✅ Updated tests verify fix and prevent regression

### 3. Boundary Wrapping Inconsistency
**Location:** Various functions using modulo operations  
**Issue:** Some boundary calculations use wrapping while others don't  
**Details:** May cause inconsistent behavior at world edges  
**Impact:** Edge effects in simulation  
**Priority:** Low  
**Test Coverage:** ✅ Tests added to verify boundary wrapping consistency

### 4. Type Pressure Calculation Timing
**Location:** `updateTypePressure()` function  
**Issue:** Called every 30 ticks, may not respond quickly enough to rapid population changes  
**Details:** Could allow temporary monocultures before pressure adjustment kicks in  
**Impact:** Temporary ecosystem imbalance  
**Priority:** Low  
**Test Coverage:** ✅ Tests added to verify type pressure edge cases

### 5. Random Number Generator State
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

## Fixed Issues

### 1. Mini-map Division Error ✅ FIXED
**Location:** `src/js/ui.js` (formerly `index.html:627`)  
**Issue:** Wrong divisor used in mini-map rendering calculation  
**Details:** `y=Math.floor(i/World.H)` should be `y=Math.floor(i/World.W)`  
**Impact:** Mini-map colony visualization was incorrectly positioned  
**Fix:** Removed the incorrect line that was commented as a bug, kept the correct implementation
**Status:** Fixed in refactoring - comprehensive tests added to prevent regression

---
*Last updated: 2025-08-22*
