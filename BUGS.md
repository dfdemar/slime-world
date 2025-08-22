# Known Bugs and Issues

This file tracks suspected bugs and issues in the Slimeworld Evolution Simulator.

## Confirmed Bugs

### 1. Mini-map Division Error (line 627)
**Location:** `index.html:627`  
**Issue:** Wrong divisor used in mini-map rendering calculation  
**Details:** `y=Math.floor(i/World.H)` should be `y=Math.floor(i/World.W)`  
**Impact:** Mini-map colony visualization may be incorrectly positioned  
**Status:** Identified in code comments but not fixed

## Potential Issues

### 1. Memory Leak in Pattern Caching
**Location:** Pattern generation system  
**Issue:** No explicit cleanup mechanism for colony patterns when colonies are removed  
**Details:** While patterns are small (8x8), long-running simulations with many colony births/deaths could accumulate memory  
**Impact:** Gradual memory increase over time  
**Priority:** Low

### 2. Nutrient Starvation Balance
**Location:** `starvationSweep()` function  
**Issue:** Energy calculation and starvation thresholds may need fine-tuning  
**Details:** Some colony types might be disadvantaged by current energy/consumption balance  
**Impact:** Potential ecosystem imbalance  
**Priority:** Medium

### 3. Boundary Wrapping Inconsistency
**Location:** Various functions using modulo operations  
**Issue:** Some boundary calculations use wrapping while others don't  
**Details:** May cause inconsistent behavior at world edges  
**Impact:** Edge effects in simulation  
**Priority:** Low

### 4. Type Pressure Calculation Timing
**Location:** `updateTypePressure()` function  
**Issue:** Called every 30 ticks, may not respond quickly enough to rapid population changes  
**Details:** Could allow temporary monocultures before pressure adjustment kicks in  
**Impact:** Temporary ecosystem imbalance  
**Priority:** Low

### 5. Random Number Generator State
**Location:** Global `World.rng` usage  
**Issue:** Single global RNG state shared across all systems  
**Details:** Could cause reproduction in deterministic scenarios if save/load affects RNG state  
**Impact:** Non-deterministic behavior in edge cases  
**Priority:** Low

## Performance Considerations

### 1. Suitability Calculation Overhead
**Location:** `suitabilityAt()` function  
**Issue:** Called frequently with neighbor sampling  
**Details:** Could benefit from spatial caching or optimization  
**Impact:** Performance degradation with large worlds  
**Priority:** Medium

### 2. Canvas Redraw Frequency
**Location:** Rendering system  
**Issue:** Full canvas redraw on every frame  
**Details:** Could implement dirty region tracking  
**Impact:** CPU usage on large worlds  
**Priority:** Low

## Fixed Issues
*None yet - this is the initial bug tracking file*

---
*Last updated: 2025-01-22*