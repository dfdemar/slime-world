# Slime Mold Aggregation System - Design & Implementation Plan

## Project Overview

This document outlines the design and implementation plan for enhancing the Slimeworld Evolution Simulator with realistic slime mold aggregation behavior, modeling the transition from individual amoeba to coordinated multicellular masses.

## Design Document

### Current State Analysis

**Existing System:**
- Individual colonies expand continuously when conditions are favorable
- No inter-colony communication or aggregation mechanics
- Colony behavior is purely local (based on immediate environmental conditions)
- No distinction between individual cellular phase and collective multicellular phase

### Biological Inspiration

Real slime molds exhibit a fascinating lifecycle:
- **Individual Phase**: When food is plentiful, amoebas exist and feed separately
- **Stress Response**: When food becomes scarce, they release chemical signals
- **Aggregation**: Cells clump together following chemical gradients to form multicellular masses  
- **Collective Behavior**: The mass behaves as a coordinated unit, moving collectively to find better locations
- **Fruiting**: Individual cells can develop into stalked fruiting bodies to release spores

### Proposed System Architecture

#### 1. Dual-Phase Lifecycle System

**Individual Amoeba Phase:**
- New base state where colonies exist as small, dispersed individual cells
- Cells move independently and feed separately
- Low coordination, high individual mobility
- Triggered by high nutrient availability

**Aggregated Mass Phase:**
- Occurs when multiple colonies detect nutrient scarcity
- Forms larger, coordinated multicellular structures
- Enhanced collective movement and resource sensing
- Can eventually develop into spore-producing fruiting bodies

#### 2. Chemical Signaling Network

**Stress Signal System:**
- New chemical layer: `World.signals.stress` (similar to existing slime trail system)
- Emitted by colonies experiencing nutrient deficiency
- Diffuses and evaporates over time like slime trails
- Concentration indicates local food scarcity levels

**Aggregation Pheromone System:**
- Secondary signal: `World.signals.aggregation`
- Released when colonies detect stress signals above threshold
- Creates chemical gradients that guide cell movement toward aggregation sites
- Higher concentration = stronger aggregation attraction

#### 3. Dynamic Colony States

**State Enumeration:**
```javascript
const ColonyStates = {
    INDIVIDUAL: 'individual',    // Separate feeding cells
    AGGREGATING: 'aggregating',  // Moving toward aggregation site
    COLLECTIVE: 'collective',    // Coordinated multicellular mass
    FRUITING: 'fruiting'        // Spore-producing structure
};
```

**State Transition Logic:**
- `INDIVIDUAL � AGGREGATING`: Triggered by detecting stress/aggregation signals
- `AGGREGATING � COLLECTIVE`: When multiple colonies merge at aggregation point
- `COLLECTIVE � FRUITING`: After successful relocation or prolonged collective phase
- `FRUITING � INDIVIDUAL`: Spore dispersal creates new individual colonies

#### 4. Enhanced Environmental Response

**Nutrient Scarcity Detection:**
- Track local nutrient depletion rate over time windows
- Calculate "stress level" based on nutrient availability vs consumption
- Stress threshold determines when to initiate aggregation signaling

**Collective Sensing:**
- Aggregated masses have enhanced sensing range (larger than individual cells)
- Can detect nutrient gradients and optimal migration directions
- Coordinated movement toward better environmental conditions

#### 5. Modified Suitability Calculations

**Phase-Dependent Behavior:**
- Individual phase: Original suitability calculation (local optimization)
- Aggregating phase: Weighted toward aggregation pheromone gradients
- Collective phase: Long-range environmental gradient following
- Fruiting phase: Optimal spore dispersal site selection

**New Suitability Components:**
- `stress_signal_influence`: Attraction to stress signals during individual phase
- `aggregation_influence`: Following aggregation pheromones during aggregating phase
- `collective_mobility`: Enhanced movement range and coordination during collective phase

#### 6. Technical Considerations

**Performance Impact:**
- Additional chemical signal layers require memory similar to existing slime trails
- State transition calculations add computational overhead
- Colony merging/splitting operations need efficient data structure updates

**Backward Compatibility:**
- New behavior can be toggled via configuration flags
- Existing colony types maintain original behavior when aggregation is disabled
- Save/load system needs to handle new state and signal data

**UI Enhancements:**
- New overlay options for stress and aggregation signals
- Colony inspector shows current state and transition triggers
- Visual indicators for different lifecycle phases

## Implementation Status

### Current Progress: Phase 1 Complete ✅
- **Completed:** Foundation infrastructure with chemical signaling and colony state systems
- **Branch:** `behavior-it1` ready for merge
- **Next:** Phase 2 stress detection and aggregation mechanics
- **Timeline:** ~15% complete of total implementation plan

### Key Accomplishments
- Chemical signaling framework (`Signals` object) fully implemented
- Colony lifecycle state machine with validation
- Performance-optimized with proper buffer management

## Technical Implementation Plan

### Phase 1: Foundation Infrastructure ✅ **COMPLETED** (behavior-it1 branch)

#### 1.1 Chemical Signaling System
**Files modified:** `world.js`, `ecosystem.js`

**Tasks:**
- [x] Add `World.signals` object with stress and aggregation layers
- [x] Implement signal diffusion mechanics (similar to `Slime` object)
- [x] Add signal evaporation and decay functions
- [x] Create signal initialization in `setupWorld()`
- [x] Add signal reset functionality for world reseeding
- [x] Integrate signal diffusion into main ecosystem step

**Technical Details:**
```javascript
World.signals = {
    stress: new Float32Array(World.W * World.H),
    aggregation: new Float32Array(World.W * World.H),
    stressBuf: new Float32Array(World.W * World.H),
    aggregationBuf: new Float32Array(World.W * World.H)
};

const Signals = {
    params: {evap: 0.98, diff: 0.25, stressScale: 0.02, aggregationScale: 0.035},
    clear(), satStress(), satAggregation(), diffuseEvaporate()
};
```

#### 1.2 Colony State System
**Files modified:** `colonies.js`, `ui.js`

**Tasks:**
- [x] Add `state` property to colony objects in `newColony()`
- [x] Define `ColonyStates` enum constants
- [x] Create state transition validation functions (`canTransitionState`, `transitionColonyState`)
- [x] Add state-specific behavior modifiers (aggregationTarget, stressLevel)
- [x] Update colony creation to default to `INDIVIDUAL` state
- [x] Add UI enhancement for colony appearance randomization

**Additional Infrastructure:**
- [x] Comprehensive test coverage with `test-signals.js` and `test-colony-states.js`
- [x] Integration with existing test runner framework
- [x] State transition validation with error handling

**Implementation Notes:**
- All Phase 1 infrastructure is now in place and fully tested
- Chemical signaling system parallels existing slime trail mechanics
- Colony lifecycle states are validated and enforced
- Foundation ready for Phase 2 stress detection and aggregation logic
- No breaking changes to existing simulation behavior

### Phase 2: Core Aggregation Mechanics (Estimated: 3-4 days) 🚧 **NEXT**

#### 2.1 Stress Detection and Signaling
**Files to modify:** `ecosystem.js`, `integration.js`

**Tasks:**
- [ ] Implement nutrient scarcity calculation per colony
- [ ] Add stress level computation based on consumption vs availability
- [ ] Create stress signal emission when threshold exceeded
- [x] ~~Modify `stepEcosystem()` to include signal diffusion step~~ *(Already completed in Phase 1)*
- [ ] Add signal strength based on colony biomass and desperation level

**Dependencies:** ✅ Chemical signaling system (Phase 1) complete

#### 2.2 State Transition Logic
**Files to modify:** `ecosystem.js`, `colonies.js`

**Tasks:**
- [ ] Implement `INDIVIDUAL → AGGREGATING` transition logic
- [ ] Add aggregation pheromone detection and following behavior
- [ ] Create colony proximity detection for merger candidates
- [ ] Implement basic colony merging functionality
- [ ] Add `AGGREGATING → COLLECTIVE` transition when colonies meet

**Dependencies:** ✅ Colony state system (Phase 1) complete
**Available Infrastructure:** State validation, transition functions, lifecycle constants

### Phase 3: Collective Behavior (Estimated: 2-3 days)

#### 3.1 Enhanced Suitability Calculations
**Files to modify:** `ecosystem.js`

**Tasks:**
- [ ] Create state-specific suitability calculation functions
- [ ] Add signal gradient following for aggregating colonies
- [ ] Implement enhanced sensing range for collective masses
- [ ] Create long-range environmental gradient detection
- [ ] Add collective movement coordination mechanics

#### 3.2 Colony Merging System
**Files to modify:** `colonies.js`, `ecosystem.js`

**Tasks:**
- [ ] Implement efficient colony data merging (traits, biomass, age)
- [ ] Create merged colony pattern generation
- [ ] Handle parent-child relationships during merges
- [ ] Add collective mass size and coordination calculations
- [ ] Update world tiles and biomass arrays for merged entities

### Phase 4: Advanced Lifecycle (Estimated: 3-4 days)

#### 4.1 Fruiting Body Development
**Files to modify:** `ecosystem.js`, `colonies.js`

**Tasks:**
- [ ] Implement `COLLECTIVE � FRUITING` transition conditions
- [ ] Create fruiting body visual representation and patterns
- [ ] Add spore production mechanics and timing
- [ ] Implement optimal dispersal site selection algorithms
- [ ] Create spore release and new colony generation

#### 4.2 Spore Dispersal System
**Files to modify:** `colonies.js`, `environment.js`

**Tasks:**
- [ ] Implement long-distance spore dispersal patterns
- [ ] Create new colony generation from spores with genetic variation
- [ ] Add environmental factors affecting spore survival
- [ ] Implement `FRUITING � INDIVIDUAL` lifecycle completion
- [ ] Add spore dormancy and activation conditions

### Phase 5: User Interface & Visualization (Estimated: 2-3 days)

#### 5.1 Signal Visualization
**Files to modify:** `renderer.js`, `ui.js`

**Tasks:**
- [ ] Add stress and aggregation signal overlay rendering
- [ ] Create color schemes for different signal types
- [ ] Add toggle controls for signal visibility
- [ ] Implement signal intensity visualization (heatmaps)
- [ ] Add real-time signal strength indicators

#### 5.2 Enhanced Inspector
**Files to modify:** `ui.js`

**Tasks:**
- [ ] Add colony state display in inspector panel
- [ ] Show stress level and aggregation status
- [ ] Display merger history and collective mass information
- [ ] Add state transition triggers and timers
- [ ] Create visual indicators for different lifecycle phases

### Phase 6: Configuration & Testing (Estimated: 2-3 days)

#### 6.1 System Configuration
**Files to modify:** `world.js`, `ui.js`

**Tasks:**
- [ ] Add configuration flags for aggregation system enable/disable
- [ ] Create tunable parameters for signal strength, thresholds, timing
- [ ] Implement backward compatibility mode preserving original behavior
- [ ] Add aggregation system controls to UI panels
- [ ] Create preset configurations for different behavior modes

#### 6.2 Comprehensive Testing
**Files to modify:** `tests/` directory

**Tasks:**
- [ ] Create unit tests for state transitions and signal mechanics
- [ ] Add integration tests for multi-colony aggregation scenarios
- [ ] Implement performance benchmarks for additional computational overhead
- [ ] Create visual validation tests for realistic aggregation patterns
- [ ] Add regression tests ensuring existing functionality remains intact

### Phase 7: Documentation & Finalization (Estimated: 1-2 days)

#### 7.1 Documentation Updates
**Files to modify:** `README.md`, `CLAUDE.md`, `CHANGELOG.md`

**Tasks:**
- [ ] Update README with new aggregation system features
- [ ] Document new configuration options and controls
- [ ] Add aggregation system to CLAUDE.md development guide
- [ ] Create comprehensive changelog entry for new version
- [ ] Add user guide for understanding colony lifecycle phases

#### 7.2 Performance Optimization
**Files to modify:** Various core files

**Tasks:**
- [ ] Profile system performance with aggregation enabled
- [ ] Optimize signal diffusion algorithms for better performance
- [ ] Implement spatial optimization for colony proximity detection
- [ ] Add memory management for signal buffers
- [ ] Fine-tune parameters for optimal simulation performance

### Expected Outcomes

This implementation will create emergent behaviors where:

1. **Dynamic Resource Response**: Colonies naturally shift between independent and collective phases based on resource availability
2. **Coordinated Migration**: Resource-depleted areas trigger coordinated migration to better locations
3. **Reproductive Cycles**: Successful aggregations can colonize new areas through spore dispersal
4. **Ecosystem Realism**: Overall ecosystem exhibits more realistic slime mold lifecycle dynamics

### Success Metrics

**Phase 1 (Foundation) - ✅ Complete:**
- [x] Chemical signaling system implemented and tested
- [x] Colony lifecycle states defined and validated
- [x] State transition system working correctly
- [x] System performance remains acceptable with additional computational overhead
- [x] Original simulation behavior is preserved (no breaking changes)

**Phase 2+ (Remaining):**
- [ ] Colonies successfully transition between all four lifecycle states
- [ ] Aggregation occurs reliably in response to nutrient scarcity
- [ ] Collective masses demonstrate coordinated movement toward better environments
- [ ] Spore dispersal creates viable new colonies with genetic variation

---

*This plan represents approximately 15-20 days of development work, depending on complexity and testing requirements.*
