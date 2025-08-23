# Slime Colonies: Planetary Evolution
## Game Design Document & Implementation Plan

**Genre:** Survival Rogue-like / Evolution Strategy  
**Theme:** Slime mold-based life on an alien planet  
**Core Concept:** Control and evolve a slime colony through hostile alien environments

---

## 🎮 Game Overview

### Core Gameplay Loop
1. **Survive** - Manage resources, avoid starvation, defend against threats
2. **Explore** - Expand colony into new biomes and discover ancient ruins
3. **Evolve** - Direct trait mutations and unlock new abilities
4. **Adapt** - Face environmental challenges requiring strategic evolution
5. **Ascend** - Progress through planetary zones toward ultimate survival

### Victory Conditions
- **Short-term:** Establish sustainable colony in each biome
- **Long-term:** Discover and activate ancient planetary network
- **Meta:** Unlock all archetype combinations and evolutionary paths

---

## 🧬 Core Systems (Adapted from Existing Simulator)

### 1. Colony Control System
**Current System:** Autonomous colonies with trait-based behavior  
**Game Adaptation:** Player-controlled primary colony with strategic decisions

```javascript
// New PlayerColony class extending existing Colony
PlayerColony {
  - energyReserves: number
  - consciousnessLevel: number  
  - territorySize: number
  - discoveredBiomes: Set<string>
  - availableEvolutions: Array<TraitUpgrade>
  - threatAwareness: Map<string, number>
}
```

**Key Features:**
- Direct expansion control (where to grow next)
- Resource allocation decisions (growth vs defense vs exploration)
- Emergency responses (fragmentation, dormancy, retreat)
- Strategic trait evolution choices

### 2. Survival Mechanics
**Current System:** Starvation balance and carrying capacity  
**Game Adaptation:** Multi-layered survival challenges

**Core Resources:**
- **Energy:** Derived from photosynthesis and predation
- **Biomass:** Colony size and structural integrity
- **Information:** Knowledge of environment and threats
- **Adaptation Points:** Currency for directed evolution

**Threat Categories:**
- **Environmental:** Toxic storms, drought, extreme temperatures
- **Biological:** Competing colonies, parasites, predators  
- **Structural:** Fragmentation risk, network disruption
- **Resource:** Depletion events, seasonal scarcity

### 3. Exploration & Discovery
**Current System:** Static world with environmental layers  
**Game Adaptation:** Progressive revelation of planetary zones

**Biome Progression:**
1. **Starting Pool** - Tutorial area (existing aquatic focus)
2. **Wetland Margins** - Resource-rich but competitive
3. **Crystalline Caves** - High minerals, low light, navigation challenges
4. **Thermal Vents** - Extreme energy but toxic environment
5. **Canopy Networks** - Aerial adaptation required
6. **Ancient Structures** - Endgame areas with technological integration

**Discovery System:**
- Scout-type colonies reveal map areas
- Environmental analysis unlocks adaptation strategies
- Ancient ruins provide permanent upgrades
- Resource nodes require specific trait combinations

### 4. Evolution & Progression
**Current System:** Random mutations with environmental selection  
**Game Adaptation:** Player-directed evolution with strategic choices

**Evolution Mechanics:**
- **Directed Mutations:** Choose trait modification directions
- **Archetype Hybridization:** Combine traits from different base types
- **Environmental Adaptations:** Biome-specific evolutionary responses
- **Meta-Evolution:** Permanent improvements carried between playthroughs

**Progression Trees:**
```
Base Archetypes → Specialized Forms → Hybrid Variants → Master Forms
     ↓              ↓                    ↓               ↓
   MAT → Filterer → AquaMat → DeepSea → AbyssalNetwork
  CORD → Bridger → SkyWire → CloudWeb → PlanetaryGrid
TOWER → Canopy → LightEater → StarReach → SolarMatrix
```

---

## 🎯 Game Flow & Mechanics

### Turn Structure
**Hybrid Real-Time/Turn-Based:**
- Simulation runs in real-time during "growth phases"
- Player pauses for strategic decisions
- Critical events trigger automatic pause
- Emergency responses available during real-time

**Decision Points:**
- **Expansion:** Choose growth direction and territory priorities
- **Evolution:** Select trait modifications and adaptations  
- **Crisis Response:** React to environmental threats or competition
- **Resource Allocation:** Balance immediate survival vs long-term growth

### Difficulty Progression
**Dynamic Adaptation:**
- Environmental hostility increases with colony success
- New threat types introduced in advanced biomes
- Competition intensity scales with player capability
- Resource scarcity events become more frequent

**Player Skill Development:**
- Learn optimal trait combinations for different environments
- Master timing of evolutionary adaptations
- Develop crisis management strategies
- Understand planetary ecosystem interactions

### Meta-Progression
**Between-Run Persistence:**
- **Genetic Memory:** Retain some beneficial mutations
- **Biome Knowledge:** Environmental information carries over
- **Archetype Unlocks:** New starting types become available
- **Ancient Technology:** Permanent upgrades from ruin discoveries

---

## 🔧 Implementation Plan

### Phase 1: Core Game Framework (2-3 weeks)
**Goal:** Convert simulator to playable single-colony game

#### 1.1 Player Colony System
```javascript
// Files to modify/create:
- src/js/player-colony.js (new)
- src/js/colonies.js (extend)
- src/js/ui.js (major updates)
```

**Features:**
- Player colony selection and highlighting
- Basic survival UI (energy, biomass, threat levels)
- Turn-based input system overlay
- Game over/restart mechanics

#### 1.2 Survival Framework
```javascript
// Files to modify:
- src/js/ecosystem.js (extend)
- src/js/game-state.js (new)
```

**Features:**
- Energy/biomass tracking for player colony
- Threat detection and warning systems  
- Colony death = game over condition
- Basic restart with trait inheritance

#### 1.3 Control Interface
```javascript
// Files to modify:
- src/js/ui.js (major expansion)
- src/css/main.css (game UI styles)
```

**Features:**
- Colony expansion targeting system
- Resource allocation controls
- Pause/resume for strategic decisions
- Evolution choice interface

### Phase 2: Exploration & Discovery (2-3 weeks)
**Goal:** Add progression through biomes and discovery mechanics

#### 2.1 Biome System
```javascript
// Files to create/modify:
- src/js/biomes.js (new)
- src/js/environment.js (extend)
- src/js/world.js (biome integration)
```

**Features:**
- Progressive biome unlocking
- Biome-specific environmental challenges
- Adaptation requirements for new areas
- Visual biome differentiation

#### 2.2 Discovery Mechanics
```javascript
// Files to create:
- src/js/discovery.js (new)
- src/js/ruins.js (new)
```

**Features:**
- Ancient ruin placement and interaction
- Technology/upgrade discovery system
- Environmental analysis and information gathering
- Map revelation mechanics

#### 2.3 Threat System
```javascript
// Files to create:
- src/js/threats.js (new)
- src/js/events.js (extend)
```

**Features:**
- Environmental hazard events
- Competing colony AI behavior
- Crisis event system
- Threat prediction and preparation

### Phase 3: Advanced Evolution (2-3 weeks)
**Goal:** Rich trait system and strategic evolution choices

#### 3.1 Directed Evolution
```javascript
// Files to modify/create:
- src/js/evolution.js (new)
- src/js/trait-system.js (extend)
- src/js/archetypes.js (extend)
```

**Features:**
- Evolution choice interface
- Trait combination system
- Hybrid archetype creation
- Evolution cost/benefit analysis

#### 3.2 Adaptation System
```javascript
// Files to create:
- src/js/adaptations.js (new)
```

**Features:**
- Biome-specific evolutionary responses
- Environmental pressure simulation
- Adaptation success/failure feedback
- Long-term evolutionary tracking

### Phase 4: Meta-Progression & Polish (2-3 weeks)
**Goal:** Complete game experience with replayability

#### 4.1 Meta-Progression
```javascript
// Files to create:
- src/js/meta-progression.js (new)
- src/js/save-system.js (extend existing)
```

**Features:**
- Persistent progression between runs
- Archetype unlocking system
- Ancient technology integration
- Achievement/milestone tracking

#### 4.2 Game Balance & Polish
```javascript
// Files to modify:
- All systems (balance tuning)
- src/js/tutorial.js (new)
- src/css/main.css (polish)
```

**Features:**
- Difficulty curve optimization
- Tutorial system for new mechanics
- Visual and audio polish
- Performance optimization for game mode

#### 4.3 Extended Content
```javascript
// Files to create:
- src/js/advanced-biomes.js (new)
- src/js/endgame.js (new)
```

**Features:**
- Additional biome types
- Endgame content and victory conditions
- Advanced threat types
- Extended evolution trees

---

## 📊 Technical Considerations

### Architecture Changes
**Minimal Core Disruption:**
- Existing simulation engine remains largely intact
- Game layer sits on top of current systems
- Backwards compatibility maintained for original simulator
- Modular game components for easy testing

**New File Structure:**
```
slime-world/
├── index.html (simulator mode)
├── game.html (new game mode)
├── src/
│   ├── js/
│   │   ├── game/ (new directory)
│   │   │   ├── player-colony.js
│   │   │   ├── game-state.js
│   │   │   ├── biomes.js
│   │   │   ├── discovery.js
│   │   │   ├── threats.js
│   │   │   ├── evolution.js
│   │   │   ├── adaptations.js
│   │   │   └── meta-progression.js
│   │   └── (existing files)
│   └── css/
│       ├── main.css (existing)
│       └── game.css (new)
└── tests/
    ├── test-game/ (new directory)
    └── (existing test files)
```

### Performance Considerations
- Game mode may require reduced world size for responsiveness
- Turn-based elements reduce real-time computation load
- Player focus allows optimization of non-player colony processing
- Discovery system uses existing environment generation efficiently

### Save System Extensions
- Extend existing JSON save/load for game state
- Add meta-progression persistence
- Biome discovery and technology unlock tracking
- Achievement and milestone data

---

## 🎨 Visual & UX Design

### UI Layout (Game Mode)
```
┌─────────────────────────────────────────┐
│ [Colony Status] [Resources] [Threats]   │
├─────────────────────────────────────────┤
│                                         │
│           Game World View               │
│         (existing renderer +            │
│          game overlays)                 │
│                                         │
├─────────────────────────────────────────┤
│ [Evolution] [Biome Info] [Discovery]    │
└─────────────────────────────────────────┘
```

### Visual Enhancements
- Player colony highlighting and status indicators
- Biome boundary visualization
- Threat warning overlays
- Discovery point markers
- Evolution tree visualization
- Progress indicators for long-term goals

### Audio Design (Future Enhancement)
- Ambient biome soundscapes
- Colony growth and evolution audio feedback
- Threat warning sounds
- Discovery/achievement audio cues
- Adaptive music based on biome and situation

---

## 🧪 Testing Strategy

### Game-Specific Tests
```javascript
// New test files:
- test-player-colony.js
- test-game-mechanics.js  
- test-biomes.js
- test-discovery.js
- test-evolution.js
- test-meta-progression.js
```

**Key Test Areas:**
- Player colony survival mechanics
- Biome progression and unlocking
- Evolution choice consequences
- Discovery system functionality
- Save/load game state integrity
- Balance validation (difficulty curves)

### Integration Testing
- Verify simulator mode still works unchanged
- Test performance with game layer additions
- Validate backwards compatibility
- Cross-browser game functionality

---

## 📈 Success Metrics & Goals

### Player Engagement
- **Learning Curve:** New players survive first biome within 3 attempts
- **Progression:** Average player unlocks 3+ biomes in first session
- **Replayability:** Players attempt 5+ runs exploring different strategies
- **Discovery:** 80% of players discover at least one ancient ruin

### Technical Performance  
- **Responsiveness:** Game decisions process within 100ms
- **Stability:** No crashes during normal 1-hour play session
- **Compatibility:** Works on existing simulator's supported browsers
- **Load Times:** Game mode starts within 2 seconds

### Content Goals
- **Biomes:** 6+ distinct environmental zones
- **Archetypes:** 12+ unlockable forms (base + hybrids)
- **Technologies:** 15+ discoverable ancient upgrades
- **Playtime:** 20+ hours of content for completion-focused players

---

## 🚀 Launch & Future Development

### MVP Launch Features
- 3 biomes (Starting Pool, Wetland Margins, Crystalline Caves)
- 6 base archetypes + basic hybridization
- Core survival and evolution mechanics
- Basic meta-progression system

### Post-Launch Expansion
- **Additional Biomes:** Thermal vents, canopy networks, deep caves
- **Advanced Evolution:** Master forms, specialized adaptations
- **Multiplayer:** Competitive colony evolution
- **Modding Support:** Custom biomes and archetype creation
- **Mobile Version:** Touch-optimized interface

### Community Features
- **Sharing:** Export/import evolved colony designs
- **Leaderboards:** Fastest biome completion, longest survival
- **Challenges:** Weekly scenario events
- **Documentation:** Player strategy guides and evolution wikis

---

This implementation plan leverages your existing sophisticated simulation while adding the strategic depth and progression systems needed for an engaging rogue-like experience. The modular approach ensures the original simulator remains intact while building a complete game on top of its strong foundation.