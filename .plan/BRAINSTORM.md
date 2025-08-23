# BRAINSTORM.md

This doc contains brainstorming ideas that may not be ready to be incorporated into the PLAN.md doc.

# Filament: Myxara — Roguelike Design Document

**Version:** 0.1 (Aug 23, 2025)  
**Theme:** Slime-mold-based life on a distant planet  
**Genre:** Turn-based roguelike (grid or hex)

---

## Elevator Pitch
A turn-based roguelike where you are a sentient slime-mold colony on a foggy alien world. You don’t swing swords—you **grow**: laying protoplasmic tubes, sensing chemical gradients, pumping enzymes, rerouting flow, and pruning your own body to survive droughts, predators, and rival colonies. Each run is a balancing act of exploration, network engineering, and opportunistic evolution.

---

## Core Fantasy
- **Be the network.** Your body is a living graph. Edges (tubes) carry nutrients, moisture, and signals; nodes (nexuses) host organs (modules).
- **Think like a forager.** Smell gradients, extend, test, reinforce what works, prune what doesn’t.
- **Outcompete and adapt.** Rival molds, vent-dwelling grazers, UV flares, shifting seep zones—your shape is your strategy.

---

## Player Goals
1. **Reach the Beacon:** every biome hides a “signal” node; linking your network to it opens the next depth.
2. **Stay hydrated & fed:** maintain Moisture and Glycogen while hazards escalate.
3. **Evolve smartly:** slot modules and traits that match the current biome and threats.
4. **Protect the Nucleus:** if the core node is destroyed or desiccates, the run ends (permadeath).

---

## Turn Structure
1. **Sense:** gradients (nutrients, moisture, heat, toxins) update the map overlay.
2. **Decide:** spend Action Points to:
    - Extend filament (lay a new edge)
    - Reinforce or thin an edge (conductance ↑/↓)
    - Grow a nexus (create a node) / move Nucleus along reinforced path
    - Install/activate a Module on a nexus
    - Pump (burst-flow resources along path)
    - Exude (enzyme/toxin pulse)
    - Prune (reclaim biomass)
3. **Resolve world:** flows, rival moves, predators hunt along scent, events tick.
4. **Autoprune** (optional toggle): trims low-yield dead ends to return biomass.

---

## Key Systems

### Living Network (Body-as-Graph)
- **Edge thickness = Conductance** (affects flow + predator “highways”).
- **Flux** distributes automatically each turn; you can **Pump** to force a burst.
- **Feedback:** edges that carried resources last turn become slightly cheaper to reinforce; starved edges become fragile.

### Resources & Stats
- **Moisture** (0–100): evaporates in dry cells; restored at seeps/mists.
- **Glycogen:** biomass + energy; spent to grow, refunded on prune.
- **Pigments:** specialized metabolites used by certain Modules.
- **Stress:** rises with UV, toxins, starvation; high Stress can trigger mutations (good or bad).

### Modules (slot into nexus nodes)
Each nexus has 1–3 slots; modules can be swapped at cost.

- **Marangoneer:** surge-slide across low-friction tiles; spend Moisture to dash over scCO₂ slicks.
- **Chemosensor:** reveals distant nutrient hotspots / rival pheromones.
- **Enzyme Glands:** dissolve mineral baffles; leaves corrosive residue.
- **Shade Canopy:** local UV shield; creates a safe “hub.”
- **Gyre Spores:** burst sends spores along edges; temporarily blocks predators and scouts ahead.
- **Redox Choir:** converts certain mineral tiles into trickle Glycogen; hums to attract micro-fauna (risk/reward).
- **Memory Ring:** preserves local gradient map through storms; reduces Stress spikes.

### Mutations (Run-Based Build)
Pick **one Archetype** to start; earn more mid-run by completing challenges:
- **Forager:** cheaper extension/prune, better gradient sense.
- **Marangoneer:** superior mobility on slicks; Pump is stronger.
- **Radiotroph:** heals near radiation; UV less harmful, but Moisture burn ↑.
- **Predatory Net:** enzyme pulses entangle small fauna, turning them into nutrient packets.
- **Xeroform:** thrives in dry; edges don’t brittle as fast.

### Rivals & Fauna AI
- **Rival Colonies:** use the same graph logic as you—grow to hotspots, reinforce productive routes, prune weak ones; will **siphon** if their network overlaps yours.
- **Vent Fronds:** stationary sweepers; clear edges every few turns unless stunned by toxins.
- **Slick Skimmers:** ride low-friction bands, snipping thin edges.
- **Shade Nomads:** mobile UV umbrellas; follow pigment noise—can be lured.

---

## World & Biomes (Procedural)
- **Seep Basin** (Intro): gentle gradients, learning predators.
- **Basalt Lace:** labyrinthine mineral baffles; Enzyme play.
- **Slick Fields:** fast lanes with scCO₂; mobility puzzle.
- **Umbra Groves:** patchy UV beams; build Shade hubs / hop between shadows.
- **Vent Lattice:** high heat, rich nutrients; timing & Pump mastery.
- **Reefbones** (Finale): shifting macro-structures; rivals converge on Beacon.

**Generation notes**
- Cellular/Wave-function collapse for macro features (seep lines, baffles).
- Place **Hotspots** (nutrient wells, mists) to form faint, noisy gradients.
- Sprinkle **Hazard Graphs** (UV beams, toxin plumes) that drift over time.
- Guarantee **Multiple Solutions:** at least two viable gradient corridors per stage.

---

## Progression & Meta
- **Run length:** 30–60 minutes (6 biomes).
- **Permadeath** with **Spore Vault:** bank 1–3 persistent boons after notable feats (e.g., start with Chemosensor I, +5% moisture retention, +1 nexus slot on depth 1).
- **Adaptive events:** if you turtle, predators scale; if you speedrun, resources thin—encourages dynamic play.

---

## Combat (Non-Traditional)
You rarely “fight”; you **shape the battlefield**:
- **Enzyme pulses** corrode baffles and damage fauna crossing the edge that turn.
- **Toxin blooms** along select edges deter predators for *N* turns.
- **Strangle Loops:** surround a predator path; when it passes, edges constrict (stun + harvest).
- **Siphon** rival tubes by overlaying your edge; hold longer to flip the path.

---

## UI/UX
- **Map:** clean hex/grid; edge thickness shows conductance; gentle arrows show current flow.
- **Overlays:** toggle Nutrient, Moisture, Heat/UV, Rival Scent.
- **Action bar:** Grow, Reinforce, Pump, Exude, Prune, Module.
- **Network panel:** your top 10 edges by flux; quick-reinforce/prune buttons.
- **Events ribbon:** “UV Flare in 3”, “Skimmer pack detected east”, “Seep migrating”.

---

## Difficulty Levers
Edge decay rate, evaporation rate, rival aggression, predator density, gradient noise.  
**Daily seeds** for leaderboard chasers.

---

## Sample Turn Vignette
You sense a nutrient vein northeast but a UV beam sweeps that corridor every 4 turns. You grow a **Shade Canopy** nexus just shy of the beam, then **Marangoneer-dash** across on turn 3, **Pump** to push Moisture through the new filament, and **Exude** a toxin bloom to deter Skimmers. A rival’s tube snakes in from the north; you overlay for two turns to **Siphon**, flipping their path and starving their backline—opening a safe lane to the Beacon.

---

## Variants & Modes
- **Ascension:** modifiers per depth (permanent drought, migratory seeps, predator queens).
- **Garden** (no permadeath): sandbox to practice network patterns.
- **Race:** two players, same seed, asynchronous turns; first to Beacon wins.

---

## Title Ideas
- **Filament: Myxara**
- **Slick Choir**
- **Redox Bloom**
- **Lattice & Lumen**

---

# One-Pager Pitch (Condensed)

**Tagline:** Be the network. Grow, prune, and reroute a living slime-mold colony across hostile alien biomes in a turn-based roguelike where shape *is* strategy.

**Core pillars**
- **Body-as-graph:** Your colony is nodes (nexuses) and edges (filaments). Thickness = conductance = life.
- **Flow over fight:** Win by steering moisture, nutrients, and signals—then weaponize the map with enzymes, toxins, and siphons.
- **Antagonists that play your game:** Rivals build and prune networks, skimmers cut thin paths, fronds sweep lanes—everyone respects flows.
- **Readable depth:** Clear overlays (nutrient, moisture, UV, scent) and just-enough numbers keep decisions crunchy and legible.

**Run shape**
- **Length:** 30–60 mins. **Depths:** 6 biomes. **Permadeath:** yes, with a light meta (“Spore Vault”).
- **Win:** Link your network to the Beacon in each biome to descend. **Lose:** core (Nucleus) destroyed or colony desiccates.

---

# Gameplay Loop

## Core Turn Loop (Micro)
1. **Sense** (free): Gradients update; overlays toggleable.
2. **Decide** (spend AP & resources):
    - **Extend** filament → new edge.
    - **Reinforce/Thin** edge → conductance ±.
    - **Grow Nexus / Move Nucleus** along reinforced path.
    - **Install/Activate Module** (e.g., Enzyme Glands, Shade Canopy).
    - **Pump** (burst-push moisture/nutrients along selected path).
    - **Exude/Prune** (toxins/enzymes; reclaim biomass).
3. **Resolve:** flows distribute; predators/rivals move; hazards tick; decay/evaporation apply.
4. **Autoprune** (optional): dead ends trimmed, biomass refunded.

## Mid-Run Loop (Meso)
- **Scout → Commit → Reroute.** Probe gradients with thin filaments, thicken profitable corridors and shade them. When hazards drift or rivals siphon, prune and pivot.
- **Module play:** Slot hubs for utility (sensor, canopy), carry mobile tools (marangoneer dash, enzymes) to crack puzzles.
- **Risk/Reward:** Thicker edges are safer but attract skimmers; pump surges solve reach issues but spike moisture burn.

## Meta Loop (Macro)
- **Spore Vault unlocks** from feats (e.g., “Reach a Beacon under a UV flare”) seed new starts: +5% moisture retention, Chemosensor I, extra slot on Depth 1, etc.
- **Daily seed/Ascensions** bend parameters (migrating seeps, predator queens) for replayability.

---

# Lightweight Prototype Plan (Vertical Slice)

**Goal:** 1 biome (“Seep Basin”), 1 rival, 2 predators (Skimmer, Vent Frond), 5 modules, 4 mutations, Beacon win.

**Player verbs implemented**
- Extend, Reinforce/Thin, Grow Nexus, Install/Activate Module, Pump, Prune, Move Nucleus.

**Systems in slice**
- Hex/grid map; gradient fields (nutrient, moisture, UV).
- Flow along edges by conductance.
- Edge decay & moisture evaporation.
- Rival AI (greedy gradient follower + periodic prune).
- Predators with simple rules (Skimmer patrol lanes; Frond sweeps).
- Events: periodic UV flare; migrating micro-seep.
- Overlays & flux arrows.

**Tech (suggested)**
- **Engine:** TypeScript + Canvas/WebGL (PixiJS) or Godot 4.
- **Data-driven content:** JSON for modules/biomes; easy to rebalance.
- **Determinism:** Seeded RNG for fairness and daily seeds.

**Win/Loss (slice)**
- **Win:** establish a continuous network from Nucleus to Beacon and push ≥ X flux for 1 turn.
- **Loss:** Moisture ≤ 0 or Nucleus destroyed.

---

# Data Schema (TypeScript-Style)

```ts
type CellId = number;
type NodeId = number;
type EdgeId = number;

interface Cell {
  id: CellId;
  q: number; r: number; // axial hex coords (or x,y for square grid)
  terrain: "plain" | "baffle" | "slick" | "shade" | "vent";
  baseFriction: number;          // affects marangoneer movement
  evapRate: number;              // moisture loss per turn
  uvExposure: number;            // 0..1
  nutrientYield: number;         // per-turn potential
}

interface GradientField {
  nutrient: number;  // sensed value 0..1
  moisture: number;  // sensed value 0..1
  uv: number;        // 0..1
  rivalScent: number; // 0..1
}

interface Node {
  id: NodeId;
  cell: CellId;
  modules: ModuleInstance[];
  maxSlots: number;
  isNucleus?: boolean;
}

interface Edge {
  id: EdgeId;
  a: NodeId; b: NodeId;
  thickness: number;      // maps to conductance
  integrity: number;      // HP vs hazards/predators
  toxinLevel: number;     // deters predators for N turns
  lastFlux: number;       // for “reinforce cheaper if used”
}

interface ModuleInstance {
  type: ModuleType;
  level: 1|2|3;
  cooldown: number;
}

type ModuleType =
  | "Chemosensor" | "ShadeCanopy" | "EnzymeGlands"
  | "Marangoneer" | "GyreSpores" | "RedoxChoir" | "MemoryRing";

interface PlayerState {
  ap: number;
  moisture: number;   // 0..100
  glycogen: number;   // biomass & energy
  pigments: number;
  stress: number;     // triggers mutations at thresholds
  mutations: MutationType[];
  network: {
    nodes: Record<NodeId, Node>;
    edges: Record<EdgeId, Edge>;
  };
}

type MutationType = "Forager" | "Marangoneer" | "Radiotroph" | "PredatoryNet" | "Xeroform";

interface Actor { // predators & rivals share this
  id: string;
  kind: "Skimmer" | "VentFrond" | "RivalNucleus" | "RivalNexus";
  cell: CellId;
  state: any; // behavior-specific
}

interface BiomeConfig {
  name: string;
  size: { width: number; height: number };
  seepDensity: number;
  baffleDensity: number;
  slickBands: number;
  uvFlarePeriod: number;
  dropTable: Partial<Record<ModuleType|MutationType, number>>;
}
```

---

# Turn Resolver (Pseudocode)

```pseudo
function takeTurn(state):
  // 1) Sense (auto)
  gradients = computeGradients(state.map, state.sources) // nutrients, moisture, uv, rival scent
  updateOverlays(gradients)

  // 2) Player phase (already applied via actions UI)
  assert state.player.ap == 0 or player ends early

  // 3) Flow resolution
  G = buildNetworkGraph(state.player.network)           // nodes, edges, conductances
  flux = distributeResources(G, state.player.moisture, state.player.glycogen)
  applyFluxBonuses(state.player.network, flux)          // cheaper reinforce on used edges
  state.player.moisture += flux.moistureGain - flux.moistureCost
  state.player.glycogen += flux.nutrientGain - flux.maintenance

  // 4) World resolve
  for each actor in predators:
      actor.behave(state, gradients)                    // Skimmer: patrol slicks, cut thin edges
  rivalAI(state.rival, gradients)                       // grow -> reinforce -> prune loop

  // 5) Hazards & decay
  for edge in player.edges:
      uv = avgUVAlong(edge)
      edge.integrity -= uvDamage(uv) + toxinWear(edge)
      if edge.integrity <= 0: delete edge
  state.player.moisture -= evaporate(state.map, state.player.network)
  migrateSeepsAndPlumes(state.map, rng)

  // 6) Events
  if turn % biome.uvFlarePeriod == 0: triggerUVFlare()
  resolveModuleCooldowns(state.player.network)

  // 7) Autoprune (optional)
  if state.settings.autoprune:
      pruneDeadEnds(state.player.network, flux)

  // 8) Check end conditions
  if connectedWithFlux(player.Nucleus, Beacon, thresholdX for 1 turn):
      advanceToNextBiome()
  if state.player.moisture <= 0 or nucleusDestroyed():
      gameOver()
```

**Flux distribution sketch:** treat edges as pipes with conductance `C = f(thickness)` and solve a simple iterative push from sources (seep cells + stored moisture) to sinks (thirsty nodes/edges); cap with per-turn maintenance and pump bursts that temporarily increase pressure on a path.

---

# First-Pass Content Tables (Vertical Slice)

## Biome: Seep Basin
- **Map traits:** gentle baffles (20%), scattered seeps (nutrient 0.6–0.9), light UV (0.2 avg), few slick tiles.
- **Events:** UV flare every 6 turns (beam sweeps 3-wide band for 1 turn).
- **Beacon rule:** deliver `flux ≥ 8` along any continuous path to the Beacon for 1 turn.

## Modules (Level 1 Values)

| Module        | Effect (L1) | Cost | CD | Notes |
|---|---|---:|---:|---|
| Chemosensor   | reveal distant nutrient peaks in radius 6 | 8 glyc | 0 | Passive overlay boost |
| Shade Canopy  | -60% UV in radius 2 around nexus | 10 glyc, 1 pigment | 3 | Stacks weakly with terrain shade |
| Enzyme Glands | corrode baffle tiles in line 3, damage Fronds crossing this turn | 6 glyc | 2 | Leaves -friction residue for 1 turn |
| Marangoneer   | dash 3 tiles on slick/low-friction; pay 5 moisture | 0 | 2 | Also doubles next pump along path |
| Gyre Spores   | spawn block on chosen edge for 1 turn; scout 2 ahead | 6 glyc, 1 pigment | 3 | Stops Skimmers, reveals fog |

## Mutations
- **Forager:** extend/prune −1 AP; slightly stronger gradient sense.
- **Marangoneer:** dash +1 range; pump +25%.
- **Radiotroph:** +0.5 moisture/turn under UV>0.5; evap +10%.
- **Predatory Net:** enzyme pulses entangle small fauna: 50% convert to nutrient packet.
- **Xeroform:** edge integrity decay −30% in dry cells.

## Predators & Rival
- **Skimmer:** moves 3 on slicks, targets thinnest adjacent edge; cuts 1 integrity on pass (2 if < medium thickness).
- **Vent Frond:** stationary; every 3 turns sweeps a 3-tile arc clearing toxin and damaging edges −2 integrity.
- **Rival colony:** greedy gradient follower; every 2 turns: grow toward nearest nutrient peak (thin), reinforce top-flux edges, then prune dead-end length ≥ 3.

**Numbers to start with**
- Edge thickness tiers: Thin=1 (C=1; HP=2), Med=2 (C=2; HP=4), Thick=3 (C=3; HP=6).
- Maintenance per edge tier per turn: 0/1/2 glycogen.
- Pump: +4 effective flux along chosen path; cost 6 moisture; refunds +2 glyc next turn if path delivered nutrients.

---

# UX Notes (Slice)
- **Always-on flux arrows** (small, subtle) and **edge thickness** communicate 90% of the state.
- Overlay hotkeys: `1` Nutrient, `2` Moisture, `3` UV, `4` Rival Scent.
- **Network Panel:** sortable by flux/integrity; 1-click reinforce/thin; hover shows path contribution to Beacon.
- **Action affordances:** show *projected* flux and maintenance delta before confirming growth/reinforce.

---

# Roadmap (4 Milestones)

1) **Core Toy (1–2 weeks)**  
   Map + gradients; build/tear edges and nodes; moisture/glycogen; evaporation & decay; overlays. Minimal flux solver; single predator (Skimmer).

2) **Puzzle Pressure (1–2 weeks)**  
   Modules (Chemosensor, Shade, Enzyme, Marangoneer); UV flare event; Beacon win rule.

3) **Adversaries & Personality (2 weeks)**  
   Rival AI loop; Vent Frond; mutations; autoprune & maintenance economy tuning.

4) **Biomes & Polish (2 weeks)**  
   Umbra Grove variant tiles; two more modules (Gyre Spores, Redox Choir); daily seeds; basic meta unlocks.

---

## Extras (Nice to Have Soon)
- **Strangle loops** (trap predicates on path crossing).
- **Siphon overlay** when overlapping rival edges (hold to flip path ownership).
- **Memory Ring** (retain local gradient post-storm, −Stress spikes).

---
