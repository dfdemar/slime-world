/* ===== Archetypes & Type Behavior ===== */
const Archetypes = {
    MAT:   { name:"Foraging Mat",   code:"MAT",   base:{water_need:0.7, light_use:0.2,  photosym:0.15, transport:0.6,  predation:0.1,  spore:0.5,  defense:0.5, flow:0.8}},
    CORD:  { name:"Cord/Creeper",   code:"CORD",  base:{water_need:0.6, light_use:0.25, photosym:0.2,  transport:0.85, predation:0.15, spore:0.45, defense:0.55,flow:0.9}},
    TOWER: { name:"Tower/Canopy",   code:"TOWER", base:{water_need:0.55,light_use:0.85, photosym:0.75,transport:0.5,  predation:0.05, spore:0.4,  defense:0.6, flow:0.5}},
    FLOAT: { name:"Floater/Raft",   code:"FLOAT", base:{water_need:0.9, light_use:0.5,  photosym:0.6,  transport:0.55, predation:0.08, spore:0.6,  defense:0.45,flow:0.6}},
    EAT:   { name:"Engulfer",       code:"EAT",   base:{water_need:0.5, light_use:0.05, photosym:0.0,  transport:0.7,  predation:0.85, spore:0.35, defense:0.7, flow:0.75}},
    SCOUT: { name:"Scout/Prospector",code:"SCOUT", base:{water_need:0.55,light_use:0.35, photosym:0.25, transport:0.7,  predation:0.05, spore:0.55, defense:0.35,flow:0.95}},
};
const TypeBehavior = {
    MAT:   { trailW:0.30, nutrientW:0.70, deposit:0.50, senseR:3 },
    CORD:  { trailW:0.55, nutrientW:0.60, deposit:0.80, senseR:7 },
    TOWER: { trailW:0.15, nutrientW:0.55, deposit:0.30, senseR:3 },
    FLOAT: { trailW:0.40, nutrientW:0.70, deposit:0.60, senseR:4, waterAffinity:0.25 },
    EAT:   { trailW:0.60, nutrientW:0.45, deposit:0.65, senseR:5 },
    SCOUT: { trailW:0.35, nutrientW:0.85, deposit:0.25, senseR:8 },
};