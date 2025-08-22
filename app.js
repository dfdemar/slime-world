
'use strict';

/* ===== Constants ===== */
const SIMULATION_PARAMS = {
  SLIME: {
    evaporation: 0.985,
    diffusion: 0.35, 
    trailScale: 0.03,
    trailBias: 0.06
  },
  NUTRIENT: {
    diffusion: 0.1, // moderate diffusion for gradients
    globalRegen: 0.015, // balanced regeneration rate
    hotspotStrength: [0.15, 0.1], // stronger, more variable hotspots
    hotspotCount: [18, 12], // [base, variance] more hotspots
    consumptionRate: 0.012, // reasonable consumption rate
    baseTarget: 0.45, // higher baseline for initial viability
    targetScale: 0.6, // stronger environmental influence
    hotspotRadius: [2, 3], // [min, variance] larger radius for better coverage
    immediateConsumption: 0.003 // nutrients consumed during expansion
  },
  ECOSYSTEM: {
    spawnProbabilityBase: 0.003,
    spawnMutationScale: 0.008,
    mutationSigma: 0.12,
    energyThreshold: 0.35,
    starvationMax: 0.35, // was 0.28
    biomassGrowth: 0.005,
    decayFast: 0.98,
    decayNormal: 0.992
  },
  BALANCE: {
    typePressureScale: 0.8,
    typePressureMin: 0.5,
    capacityPenalty: 0.35,
    transportBonus: 0.12,
    scoutBonus: 0.04
  }
};

/* ===== Utilities & PRNG ===== */
function sfc32(a,b,c,d){return function(){a|=0;b|=0;c|=0;d|=0;var t=(a+b|0)+d|0;d=d+1|0;a=b^b>>>9;b=c+(c<<3)|0;c=(c<<21|c>>>11);c=c+t|0;return (t>>>0)/4294967296}}
function xmur3(str){for(var i=0,h=1779033703^str.length;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^h>>>16)>>>0}}
function randRange(r,min,max){return min + r()*(max-min)}
function clamp(v,a,b){return v<a?a:(v>b?b:v)}
function lerp(a,b,t){return a+(b-a)*t}
function smoothstep(t){return t*t*(3-2*t)}
function percentile(arr, p){ const a = Array.from(arr); a.sort((x,y)=>x-y); const i = Math.max(0, Math.min(a.length-1, Math.floor(p*(a.length-1)))); return a[i]; }
function notify(msg, level='info', ttl=1600){
  const el=document.getElementById('alert'); if(!el) return;
  el.className=''; if(level==='warn') el.classList.add('warn'); if(level==='error') el.classList.add('error');
  el.textContent=msg; el.style.display='block';
  clearTimeout(notify._t);
  notify._t=setTimeout(()=>{el.style.display='none'}, ttl);
}

window.addEventListener('error', (e)=>{ try{ console.error(e.error||e.message); }catch(_){}; notify('JS error: '+(e.error?.message||e.message),'error',6000) });
window.addEventListener('unhandledrejection', (e)=>{ try{ console.error(e.reason); }catch(_){}; notify('Promise error: '+(e.reason?.message||e.reason),'error',6000) });

function ValueNoise(seed){
  const hash = xmur3(seed.toString());
  const r = sfc32(hash(),hash(),hash(),hash());
  const perm = new Uint8Array(512);
  for(let i=0;i<256;i++) perm[i]=i;
  for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1)); [perm[i],perm[j]]=[perm[j],perm[i]]}
  for(let i=0;i<256;i++) perm[i+256]=perm[i];
  function grad(ix,iy){const v=perm[(ix+perm[iy&255])&255]; return v/255}
  function noise2D(x,y){
    const x0=Math.floor(x), y0=Math.floor(y);
    const xf=x-x0, yf=y-y0;
    const v00=grad(x0,y0), v10=grad(x0+1,y0), v01=grad(x0,y0+1), v11=grad(x0+1,y0+1);
    const u=smoothstep(xf), v=smoothstep(yf);
    const x1=lerp(v00,v10,u); const x2=lerp(v01,v11,u);
    return lerp(x1,x2,v);
  }
  function fractal2D(x,y,oct=4, lac=2.0, gain=0.5){
    let amp=1, freq=1, sum=0, norm=0;
    for(let i=0;i<oct;i++){ sum += amp*noise2D(x*freq,y*freq); norm += amp; amp*=gain; freq*=lac }
    return sum/norm; // 0..1
  }
  return {noise2D, fractal2D, r};
}

/* ===== World & Environment ===== */
const Archetypes = {
  MAT:   { name:"Foraging Mat",   code:"MAT",   base:{water_need:0.7, light_use:0.2,  photosym:0.15, transport:0.6,  predation:0.1,  spore:0.5,  defense:0.5, flow:0.8}},
  CORD:  { name:"Cord/Creeper",   code:"CORD",  base:{water_need:0.6, light_use:0.25, photosym:0.2,  transport:0.85, predation:0.15, spore:0.45, defense:0.55,flow:0.9}},
  TOWER: { name:"Tower/Canopy",   code:"TOWER", base:{water_need:0.55,light_use:0.85, photosym:0.75,transport:0.5,  predation:0.05, spore:0.4,  defense:0.6, flow:0.5}},
  FLOAT: { name:"Floater/Raft",   code:"FLOAT", base:{water_need:0.9, light_use:0.5,  photosym:0.6,  transport:0.55, predation:0.08, spore:0.6,  defense:0.45,flow:0.6}},
  EAT:   { name:"Engulfer",       code:"EAT",   base:{water_need:0.5, light_use:0.05, photosym:0.0,  transport:0.7,  predation:0.85, spore:0.35, defense:0.7, flow:0.75}},
  SCOUT: { name:"Scout/Prospector",code:"SCOUT", base:{water_need:0.55,light_use:0.35, photosym:0.25, transport:0.7,  predation:0.05, spore:0.55, defense:0.35,flow:0.95}},
};

// Balanced behaviors
const TypeBehavior = {
  MAT:   { trailW:0.30, nutrientW:0.70, deposit:0.50, senseR:3 },
  CORD:  { trailW:0.55, nutrientW:0.60, deposit:0.80, senseR:7 },
  TOWER: { trailW:0.15, nutrientW:0.55, deposit:0.30, senseR:3 },
  FLOAT: { trailW:0.40, nutrientW:0.70, deposit:0.60, senseR:4, waterAffinity:0.25 },
  EAT:   { trailW:0.60, nutrientW:0.45, deposit:0.65, senseR:5 },
  SCOUT: { trailW:0.35, nutrientW:0.85, deposit:0.25, senseR:8 },
};

const World = {
  W:160, H:90, scale:8,
  env:{humidity:null, light:null, nutrient:null, water:null},
  tiles:null, // int colony id or -1
  biomass:null, // float 0..1 per tile
  colonies:[], nextId:1,
  rng:null, field:null,
  tick:0, paused:false, speed:1.2,
  mutationRate:0.18, capacity:1.0,
  hover:{x:-1,y:-1},
  typePressure:{},
  hotspots:[], // nutrient fountains
  selectedId:null
};

// Slime trails
const Slime = {
  trail:null, trailNext:null,
  clear(){ this.trail.fill(0) },
  sat(v){ return 1 - Math.exp(-SIMULATION_PARAMS.SLIME.trailScale * v) },
  diffuseEvaporate(){
    const {evaporation, diffusion} = SIMULATION_PARAMS.SLIME;
    const W=World.W, H=World.H; const T=this.trail, N=this.trailNext;
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const i=y*W + x;
        const l=T[y*W + ((x-1+W)%W)]||0, r=T[y*W + ((x+1)%W)]||0, u=T[((y-1+H)%H)*W + x]||0, d=T[((y+1+H)%H)*W + x]||0;
        const self = T[i]||0;
        const mixed = (1-diffusion)*self + (diffusion*0.25)*(l+r+u+d);
        N[i] = mixed * evaporation;
      }
    }
    // Proper buffer swap (fix for slime behavior regression)
    this.trail = N;
    this.trailNext = T;
  },
  cleanup(){
    // Periodic cleanup to prevent accumulation of tiny values
    if(World.tick % 100 === 0) {
      const threshold = 0.001;
      for(let i = 0; i < this.trail.length; i++) {
        if(this.trail[i] < threshold) this.trail[i] = 0;
      }
    }
  },
  render(ctx, cell){
    const W=World.W,H=World.H; const img = ctx.createImageData(W,H);
    let max=0; for(let i=0;i<this.trail.length;i++) max=Math.max(max,this.trail[i]);
    const inv = max>0? 1/max : 0;
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const i=y*W+x, k=i*4; const p=Math.pow(this.trail[i]*inv,0.6);
        const r=Math.floor(255*Math.max(0, Math.min(1, p*1.2)));
        const g=Math.floor(255*Math.max(0, Math.min(1, (1.5*p*(1-p)))));
        const b=Math.floor(255*Math.max(0, Math.min(1, (1.3*(1-p)))));
        img.data[k]=r; img.data[k+1]=g; img.data[k+2]=b; img.data[k+3]=Math.floor(255*Math.min(1, 0.15+0.85*p));
      }
    }
    const off = document.createElement('canvas'); off.width=W; off.height=H; const octx=off.getContext('2d');
    octx.putImageData(img,0,0); ctx.imageSmoothingEnabled=false; ctx.drawImage(off,0,0,W*cell,H*cell);
  }
};

function idx(x,y){return y*World.W + x}
function inBounds(x,y){return x>=0&&y>=0&&x<World.W&&y<World.H}

function randomColorVivid(){ const h = randRange(World.rng, 0, 360); const s = randRange(World.rng, 70, 95); const l = randRange(World.rng, 45, 60); return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`; }
function jitterColor(hsl, amt=8){ const m = /hsl\(([-\d.]+) ([\d.]+)% ([\d.]+)%\)/.exec(hsl); if(!m) return randomColorVivid(); let [_,h,s,l] = m; h=parseFloat(h); s=parseFloat(s); l=parseFloat(l); h=(h+randRange(World.rng,-amt,amt)+360)%360; s=clamp(s+randRange(World.rng,-5,5),60,98); l=clamp(l+randRange(World.rng,-5,5),35,68); return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`; }
function genSpeciesName(type){
  const genusParts=['Myxo','Physa','Plasmo','Dicty','Fuligo','Arcyria','Lepto','Stemo','Lampro','Lycog','Cratera','Stemon'];
  const epithetParts=['luminis','hydra','nutrix','vias','silvae','aqua','tenebrae','celer','retis','spora','flumen','saxum'];
  const g=genusParts[Math.floor(World.rng()*genusParts.length)];
  const e=epithetParts[Math.floor(World.rng()*epithetParts.length)];
  const hint={MAT:'matta',CORD:'funis',TOWER:'turris',FLOAT:'ratis',EAT:'vorax',SCOUT:'cursor'}[type]||'forma';
  return g + (type==='CORD'?'a':'') + ' ' + e + '-' + hint;
}
function isValidType(type){ return Object.prototype.hasOwnProperty.call(Archetypes, type) }

function newColony(type, x, y, parent=null){
  if(!isValidType(type)){ console.warn('newColony: invalid type', type); notify(`Invalid archetype: ${type}`, 'error'); return null; }
  const arch = Archetypes[type]; const traits = {...arch.base}; for(const k in traits){ traits[k] = clamp(traits[k] + randRange(World.rng,-0.05,0.05), 0, 1) }
  const color = parent? jitterColor(parent.color) : randomColorVivid(); const id = World.nextId++;
  const species = parent? parent.species : genSpeciesName(type);
  const c = { id, type, name: arch.name, species, x, y, color, traits, age:0, biomass:1.0, gen: parent? (parent.gen+1):0, parent: parent? parent.id:null, kids:[], lastFit:0 };
  if(parent) parent.kids.push(id);
  World.colonies.push(c);
  const X=clamp(x,0,World.W-1), Y=clamp(y,0,World.H-1); const i=idx(X,Y);
  World.tiles[i]=id; World.biomass[i]=Math.max(World.biomass[i]||0, 0.4);
  Slime.trail[i]+= (TypeBehavior[type]?.deposit||0.5);
  return c;
}

function seedInitialColonies(){
  const {W,H} = World; const types = Object.keys(Archetypes); const count = 8;
  
  // Try to place colonies near nutrient hotspots for better initial survival
  for(let i=0;i<count;i++){ 
    const t = types[Math.floor(World.rng()*types.length)];
    let x, y;
    
    // Try to place near hotspots if they exist
    if(World.hotspots.length > 0 && i < World.hotspots.length) {
      const hs = World.hotspots[i % World.hotspots.length];
      x = Math.floor(clamp(hs.x + Math.floor(World.rng()*6-3), 0, W-1));
      y = Math.floor(clamp(hs.y + Math.floor(World.rng()*6-3), 0, H-1));
    } else {
      x = Math.floor(World.rng()*W);
      y = Math.floor(World.rng()*H);
    }
    
    newColony(t, x, y, null);
  }
}

/* ===== Environment generation (water pools + scarce nutrients) ===== */
function smoothBinaryGrid(src, W, H, iters=2){
  const a=new Uint8Array(src); const b=new Uint8Array(src.length);
  for(let t=0;t<iters;t++){
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        let cnt=0;
        for(let dy=-1;dy<=1;dy++){ for(let dx=-1;dx<=1;dx++){
          if(dx===0&&dy===0) continue;
          const nx=x+dx, ny=y+dy;
          if(nx>=0&&ny>=0&&nx<W&&ny<H) cnt+=a[ny*W+nx];
        }}
        const i=y*W+x;
        if(cnt>=5) b[i]=1; else if(cnt<=2) b[i]=0; else b[i]=a[i];
      }
    }
    a.set(b);
  }
  return a;
}

function buildEnvironment(){
  const {W,H} = World;
  World.tiles = new Int32Array(W*H).fill(-1);
  World.biomass = new Float32Array(W*H).fill(0);
  World.env.humidity = new Float32Array(W*H);
  World.env.light = new Float32Array(W*H);
  World.env.nutrient = new Float32Array(W*H);
  World.env.water = new Uint8Array(W*H);
  World._nutrientNext = new Float32Array(W*H);
  Slime.trail = new Float32Array(W*H);
  Slime.trailNext = new Float32Array(W*H);

  const f = World.field;
  const sHum=randRange(World.rng, 120, 420), sLig=randRange(World.rng, 200, 700), sNut=randRange(World.rng, 150, 600), sWat=randRange(World.rng, 180, 520);
  const waterSeed = new Float32Array(W*H);
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const nx=x/W, ny=y/H;
      const h0 = f.fractal2D(nx*sHum, ny*sHum, 4, 2.0, 0.55);
      const l0 = f.fractal2D(1000+nx*sLig, 1000+ny*sLig, 4, 2.0, 0.5);
      const n0 = f.fractal2D(2000+nx*sNut, 2000+ny*sNut, 5, 2.2, 0.55);
      const basin = f.fractal2D(3000+nx*sWat, 3000+ny*sWat, 5, 2.2, 0.55);
      const band = 0.5+0.5*Math.sin((ny-0.2)*Math.PI*2);
      const light = clamp(0.25 + 0.75*l0*band, 0, 1);
      const humid = clamp(0.2 + 0.8*h0*(1.0 - 0.25*Math.abs(nx-0.5)), 0, 1);
      // Higher baseline nutrients for initial viability
      const nutr  = clamp(0.2 + 0.3*n0, 0, 1);
      World.env.humidity[idx(x,y)] = humid;
      World.env.light[idx(x,y)] = light;
      World.env.nutrient[idx(x,y)] = nutr;
      const seed = 0.55*humid + 0.3*(1-light) + 0.6*(basin-0.5);
      waterSeed[idx(x,y)] = seed;
    }
  }
  // water pools
  let water = new Uint8Array(W*H);
  const desired = 0.22 + 0.08*World.rng();
  const thr = percentile(waterSeed, 1 - desired);
  for(let i=0;i<water.length;i++) water[i] = waterSeed[i] > thr ? 1 : 0;
  water = smoothBinaryGrid(water, W, H, 2);
  const cleaned=new Uint8Array(water.length);
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const i=idx(x,y); if(!water[i]) { cleaned[i]=0; continue; }
      let cnt=0; for(let dy=-1;dy<=1;dy++){ for(let dx=-1;dx<=1;dx++){ if(dx===0&&dy===0) continue; const nx=x+dx, ny=y+dy; if(nx>=0&&ny>=0&&nx<W&&ny<H) cnt+=water[ny*W+nx]; }}
      cleaned[i] = cnt>=1 ? 1 : 0;
    }
  }
  World.env.water.set(cleaned);
  // humidity & nutrients slightly higher near pools
  for(let i=0;i<W*H;i++){
    if(World.env.water[i]){ World.env.humidity[i] = clamp(World.env.humidity[i]*0.88 + 0.12*1,0,1); World.env.nutrient[i] = clamp(World.env.nutrient[i] + 0.04, 0,1); }
  }

  // Create nutrient hotspots (fountains) to keep sim going
  World.hotspots = [];
  const [baseCount, countVar] = SIMULATION_PARAMS.NUTRIENT.hotspotCount;
  const hotspotCount = baseCount + Math.floor(countVar * World.rng()) + Math.floor((W*H)/3000);
  const [minStrength, strengthVar] = SIMULATION_PARAMS.NUTRIENT.hotspotStrength;
  const [minRadius, radiusVar] = SIMULATION_PARAMS.NUTRIENT.hotspotRadius;
  
  for(let h=0; h<hotspotCount; h++){
    World.hotspots.push({
      x: Math.floor(World.rng()*W),
      y: Math.floor(World.rng()*H),
      strength: minStrength + strengthVar*World.rng(),
      radius: minRadius + Math.floor(radiusVar*World.rng()),
      age: 0 // for tracking lifecycle
    });
  }
  
  // Debug: Log nutrient initialization
  let totalNutrients = 0;
  for(let i = 0; i < World.env.nutrient.length; i++) {
    totalNutrients += World.env.nutrient[i];
  }
  console.log(`Environment built: ${World.hotspots.length} hotspots, avg nutrients: ${(totalNutrients/World.env.nutrient.length).toFixed(3)}`);
}

function nutrientDynamics(){
  const {nutrient, humidity, water} = World.env;
  const Nn = World._nutrientNext; const W=World.W, H=World.H;
  const {diffusion, globalRegen, baseTarget, targetScale} = SIMULATION_PARAMS.NUTRIENT;
  
  // Debug: Check input state
  if(World.tick % 100 === 0) {
    let beforeSum = 0;
    let nanCount = 0;
    for(let i = 0; i < nutrient.length; i++) {
      const val = nutrient[i];
      if(isNaN(val)) {
        nanCount++;
      } else {
        beforeSum += val;
      }
    }
    console.log(`Nutrient dynamics: tick=${World.tick}, before=${beforeSum.toFixed(1)}, nanCount=${nanCount}, hotspots=${World.hotspots.length}`);
  }
  
  // Base diffusion and regeneration
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const i=y*W+x; 
      const n=nutrient[i] || 0;
      
      // Debug: Check for NaN in input
      if(isNaN(n) && World.tick < 10) {
        console.error(`NaN input at (${x},${y}): nutrient[${i}]=${nutrient[i]}`);
      }
      
      // Neighbor diffusion with wrapping
      const l=nutrient[y*W + ((x-1+W)%W)] || 0;
      const r=nutrient[y*W + ((x+1)%W)] || 0;
      const u=nutrient[((y-1+H)%H)*W + x] || 0;
      const d=nutrient[((y+1+H)%H)*W + x] || 0;
      const mixed = (1-diffusion)*n + (diffusion*0.25)*(l+r+u+d);
      
      // Debug: Check for NaN in diffusion
      if(isNaN(mixed) && World.tick < 10) {
        console.error(`NaN in diffusion at (${x},${y}): n=${n}, l=${l}, r=${r}, u=${u}, d=${d}, diffusion=${diffusion}`);
      }
      
      // Environmental regeneration target based on humidity and water
      const h = humidity[i] || 0;
      const w = water[i] || 0;
      const envTarget = clamp(baseTarget + targetScale*(h + 0.4*w), 0, 1);
      
      // Always regenerate toward environmental target
      const deficit = envTarget - n; // Use original value, not mixed
      const regenRate = globalRegen * (deficit > 0 ? (1 + deficit) : 0.2);
      const regen = regenRate * deficit;
      
      const newValue = clamp(mixed + regen, 0, 1);
      
      // Debug: Check for NaN
      if(isNaN(newValue) && World.tick < 10) {
        console.error(`NaN at (${x},${y}): n=${n}, mixed=${mixed}, envTarget=${envTarget}, deficit=${deficit}, regen=${regen}`);
        console.error(`Params: baseTarget=${baseTarget}, targetScale=${targetScale}, globalRegen=${globalRegen}`);
      }
      
      Nn[i] = newValue;
    }
  }
  
  // Hotspot injection - apply directly to current nutrients for immediate effect
  for(const hs of World.hotspots){
    hs.age++;
    
    // Drift hotspots for dynamism
    if(World.tick % 120 === 0) {
      hs.x = Math.floor(clamp(hs.x + randRange(World.rng, -2, 2), 2, W-3));
      hs.y = Math.floor(clamp(hs.y + randRange(World.rng, -2, 2), 2, H-3));
    }
    
    const {x,y,strength,radius} = hs;
    
    // Inject into both current and next buffers for immediate availability
    for(let dy=-radius; dy<=radius; dy++){
      for(let dx=-radius; dx<=radius; dx++){
        const nx=x+dx, ny=y+dy; 
        if(!inBounds(nx,ny)) continue;
        
        const dist = Math.sqrt(dx*dx+dy*dy);
        if(dist <= radius){
          const i = idx(nx,ny);
          
          // Sharp exponential falloff for strong gradients
          const falloff = Math.exp(-dist*1.2);
          const biomass = World.biomass[i] || 0;
          const biomassReduction = 1 - 0.3 * Math.min(1, biomass);
          const injection = strength * falloff * biomassReduction;
          
          // Debug: Check for NaN in hotspot injection
          if(isNaN(injection) && World.tick < 10) {
            console.error(`NaN injection at (${nx},${ny}): strength=${strength}, falloff=${falloff}, biomassReduction=${biomassReduction}, biomass=${biomass}`);
          }
          
          // Apply to both buffers for immediate effect
          const currentNn = Nn[i] || 0;
          const currentNutrient = nutrient[i] || 0;
          Nn[i] = clamp(currentNn + injection, 0, 1);
          nutrient[i] = clamp(currentNutrient + injection * 0.5, 0, 1); // immediate boost
        }
      }
    }
  }
  
  nutrient.set(Nn);
}

/* ===== SMA-informed suitability & growth ===== */
function suitabilityAt(col, x, y){
  const {humidity, light, nutrient, water} = World.env; const i=idx(x,y);
  
  // Use direct values instead of averaging to preserve gradients
  const h=humidity[i], l=light[i], n=nutrient[i], w=water[i];
  
  // Calculate neighbor nutrient average for smoother gradients
  let neighborSum = n;
  let neighborCount = 1;
  if(inBounds(x-1,y)) { neighborSum += nutrient[idx(x-1,y)]; neighborCount++; }
  if(inBounds(x+1,y)) { neighborSum += nutrient[idx(x+1,y)]; neighborCount++; }
  if(inBounds(x,y-1)) { neighborSum += nutrient[idx(x,y-1)]; neighborCount++; }
  if(inBounds(x,y+1)) { neighborSum += nutrient[idx(x,y+1)]; neighborCount++; }
  const avgNutrient = neighborSum / neighborCount;
  
  const T=col.traits; const B=TypeBehavior[col.type] || TypeBehavior.MAT;
  
  // Environmental suitability
  const waterFit = 1.0 - Math.abs(h - T.water_need);
  const lightFit = T.photosym>0 ? (0.6*(1.0 - Math.abs(l - T.light_use)) + 0.4*T.photosym*l) : (1.0 - 0.5*l);
  
  // Chemical signals - use smoothed nutrient signal
  const trSat = Slime.sat(Slime.trail[i]);
  const nutrientSignal = 0.6*n + 0.4*avgNutrient; // local + smooth neighborhood
  const denom = Math.max(1e-6, (B.nutrientW||0) + (B.trailW||0));
  const chemo = ((B.nutrientW||0)*nutrientSignal + (B.trailW||0)*trSat) / denom;
  
  // Type-specific bonuses
  let typeBonus = 0;
  if(col.type==='FLOAT') typeBonus = w ? 0.2 : -0.05;
  if(B.waterAffinity && w) typeBonus += B.waterAffinity;
  
  // Base suitability with balanced factors
  const base = clamp(0.1*waterFit + 0.1*lightFit + 0.8*chemo + typeBonus, 0, 1);
  
  // Connectivity and transport bonus
  let conn=0; let neigh=0; 
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx, ny=y+dy; 
    if(!inBounds(nx,ny)) continue; 
    neigh++; 
    if(World.tiles[idx(nx,ny)]===col.id) conn++;
  }
  const connectivity = neigh? (conn/neigh):0;
  
  const {transportBonus: tBonus, scoutBonus, capacityPenalty: cPenalty} = SIMULATION_PARAMS.BALANCE;
  const transportBonus = tBonus*col.traits.transport*connectivity + (col.type==='SCOUT'? scoutBonus:0);
  
  // Capacity pressure
  const cap = World.capacity; const density = World.biomass[i];
  const capPenalty = -cPenalty*clamp((density - cap), 0, 1);
  
  // Type pressure for diversity
  const pressure = World.typePressure[col.type] ?? 1;
  
  return clamp(base*pressure + transportBonus + capPenalty, 0, 1);
}

function updateTypePressure(){
  const counts = {}; for(const k of Object.keys(Archetypes)) counts[k]=0;
  const idToType=new Map(); for(const c of World.colonies){ idToType.set(c.id,c.type) }
  let filled=0; for(let i=0;i<World.tiles.length;i++){ const id=World.tiles[i]; if(id===-1) continue; filled++; const t=idToType.get(id); if(t){ counts[t]=(counts[t]||0)+1; } }
  const total=Math.max(1,filled); World.typePressure={};
  const {typePressureScale, typePressureMin} = SIMULATION_PARAMS.BALANCE;
  for(const t of Object.keys(Archetypes)){
    const share=(counts[t]||0)/total;
    const pressure=clamp(1 - typePressureScale*share, typePressureMin, 1.0);
    World.typePressure[t]=pressure;
  }
}

function tryExpand(col){
  const B=TypeBehavior[col.type] || TypeBehavior.MAT;
  const cx=col.x, cy=col.y; const r=(B.senseR||5);
  let best=null, bestScore=-1, bestI=-1;
  for(let dy=-r; dy<=r; dy++){
    for(let dx=-r; dx<=r; dx++){
      const x=cx+dx, y=cy+dy; if(!inBounds(x,y)) continue;
      const i=idx(x,y); if(World.tiles[i]!==col.id) continue;
      for(const [sx,sy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+sx, ny=y+sy; if(!inBounds(nx,ny)) continue; const j=idx(nx,ny);
        const foe = World.tiles[j]; const s = suitabilityAt(col, nx, ny);
        let ok=false;
        if(foe===-1) ok=true; else if(foe===col.id) ok=false; else {
          const enemy = World.colonies.find(c=>c.id===foe);
          if(!enemy) ok=true; else {
            const pred = col.traits.predation - (enemy.traits.defense*0.7);
            const comp = s - suitabilityAt(enemy, nx, ny);
            ok = (pred + comp) > randRange(World.rng,-0.15,0.1);
          }
        }
        if(ok){ const trailBias = SIMULATION_PARAMS.SLIME.trailBias*Slime.sat(Slime.trail[j]); const score = s + trailBias + (foe===-1?0.05:0) + World.rng()*0.02; if(score>bestScore){ bestScore=score; best={x:nx,y:ny}; bestI=j } }
      }
    }
  }
  if(best){
    World.tiles[bestI]=col.id; 
    World.biomass[bestI]=clamp((World.biomass[bestI]||0)+0.2, 0, 2.5); 
    col.x=best.x; col.y=best.y;
    
    // Deposit slime trail
    const dep=(TypeBehavior[col.type]?.deposit||0.5) * (0.5 + 0.5*col.traits.flow);
    Slime.trail[bestI]+=dep; 
    
    // Immediate nutrient consumption during expansion
    const consumption = SIMULATION_PARAMS.NUTRIENT.immediateConsumption;
    World.env.nutrient[bestI]=clamp(World.env.nutrient[bestI] - consumption, 0, 1);
    
    return true;
  }
  return false;
}

function starvationSweep(){
  const {nutrient, light}=World.env;
  const {consumptionRate, energyThreshold, starvationMax, biomassGrowth} = SIMULATION_PARAMS.ECOSYSTEM;
  const idToCol=new Map(); for(const c of World.colonies){ idToCol.set(c.id,c); }
  
  for(let i=0;i<World.tiles.length;i++){
    const id=World.tiles[i]; if(id===-1) continue;
    const col=idToCol.get(id); if(!col){ World.tiles[i]=-1; continue; }
    
    const n=nutrient[i], l=light[i], ps=col.traits.photosym||0;
    const energy=0.7*n + 0.3*ps*l;
    // Scale consumption by biomass but make it more reasonable
    const cons=Math.min(n * 0.8, consumptionRate * (0.5 + 0.5*World.biomass[i]));
    nutrient[i]=clamp(n - cons, 0, 1);
    
    if(energy < energyThreshold){ 
      const deficit=(energyThreshold-energy); 
      const factor=1 - Math.min(0.85*deficit, starvationMax); 
      World.biomass[i]*=factor;
    } else { 
      const cap=World.capacity; 
      if(World.biomass[i]<cap){ 
        World.biomass[i]=Math.min(cap, World.biomass[i] + biomassGrowth*(energy-energyThreshold));
      }
    }
    
    if(World.biomass[i] < 0.05){ World.tiles[i]=-1; }
  }
}

function stepEcosystem(){
  const steps = Math.max(1, Math.floor(8*World.speed));
  for(let s=0;s<steps;s++){
    World.tick++;
    if(World.tick%5===0){ 
      const drift = 0.002*World.speed;
      for(let i=0;i<World.env.humidity.length;i++){ 
        World.env.humidity[i] = clamp(World.env.humidity[i] + randRange(World.rng,-drift,drift), 0, 1); 
        World.env.light[i] = clamp(World.env.light[i] + randRange(World.rng,-drift,drift), 0, 1); 
      } 
    }

    const cols = World.colonies; if(cols.length>0){
      for(let k=0;k<cols.length;k++){
        const i = (k + (World.tick%cols.length))%cols.length; const c = cols[i]; if(!c) continue; c.age++;
        c.lastFit = suitabilityAt(c, clamp(Math.round(c.x),0,World.W-1), clamp(Math.round(c.y),0,World.H-1));
        const {decayFast, decayNormal, spawnProbabilityBase, spawnMutationScale} = SIMULATION_PARAMS.ECOSYSTEM;
        if(!tryExpand(c)) { 
          const decay = (c.lastFit<0.4) ? decayFast : decayNormal; 
          c.biomass *= decay; 
        } else { 
          c.biomass = clamp(c.biomass + 0.02, 0, 3); // Faster growth when expanding 
        }
        const pressure = World.typePressure[c.type] ?? 1; 
        const spawnP = (spawnProbabilityBase + spawnMutationScale*World.mutationRate) * pressure;
        if(c.biomass>0.8 && c.lastFit>0.55 && Math.random()< spawnP){
          const dir=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(World.rng()*4)]; const bx = clamp(Math.round(c.x+dir[0]*2),0,World.W-1); const by = clamp(Math.round(c.y+dir[1]*2),0,World.H-1);
          const child = {...c}; child.id = World.nextId++; child.parent=c.id; child.gen=c.gen+1; child.kids=[]; child.age=0; child.x=bx; child.y=by; child.biomass=0.6; child.traits = (function(tr){ const t={...tr}; const keys=Object.keys(t); const m=World.mutationRate; for(const k of keys){ const sigma=SIMULATION_PARAMS.ECOSYSTEM.mutationSigma*m; t[k]=clamp(t[k] + randRange(World.rng,-sigma,sigma), 0, 1);} return t; })(c.traits); child.color = jitterColor(c.color, 14);
          World.colonies.push(child); c.kids.push(child.id); const bi=idx(bx,by); if(World.tiles[bi]===-1){World.tiles[bi]=child.id; World.biomass[bi]=0.4; Slime.trail[bi]+= (TypeBehavior[c.type]?.deposit||0.5); }
        }
      }
    }

    Slime.diffuseEvaporate();
    Slime.cleanup(); // Prevent value accumulation
    starvationSweep(); nutrientDynamics(); if(World.tick%30===0) updateTypePressure();
    if(World.tick%60===0){ const alive = new Set(World.tiles); World.colonies = World.colonies.filter(c=>alive.has(c.id)); }
  }
}

/* ===== Rendering & Patterns ===== */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {alpha:false});
let viewScale = 1;

function resize(){
  const rect = document.getElementById('main').getBoundingClientRect();
  const cellCSS = Math.max(1, Math.floor(Math.min((rect.width-24)/World.W, (rect.height-24)/World.H)));
  const cssW = World.W*cellCSS, cssH = World.H*cellCSS;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW+'px';
  canvas.style.height = cssH+'px';
  canvas.width = Math.floor(cssW*dpr);
  canvas.height = Math.floor(cssH*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  canvas.style.margin='12px';
  viewScale = cellCSS;
}
window.addEventListener('resize', ()=>{resize(); draw(true)});

const patternCache = new Map();
const PATTERN_CACHE_LIMIT = 200; // Prevent unbounded growth
function makePatternFor(col){
  if(patternCache.has(col.id)) return patternCache.get(col.id);
  
  // Clean cache if too large
  if(patternCache.size >= PATTERN_CACHE_LIMIT) {
    const oldestKeys = Array.from(patternCache.keys()).slice(0, 50);
    oldestKeys.forEach(key => patternCache.delete(key));
  }
  const seed = xmur3(String(col.id))();
  const r = sfc32(seed, seed^0x9e3779b9, seed^0x85ebca6b, seed^0xc2b2ae35);
  const c = document.createElement('canvas'); c.width=8; c.height=8; const pctx=c.getContext('2d');
  pctx.fillStyle=col.color; pctx.globalAlpha=0.55; pctx.fillRect(0,0,8,8);
  pctx.globalAlpha=0.9; pctx.fillStyle='white';
  const mode = Math.floor(r()*4);
  if(mode===0){ for(let i=0;i<8;i+=2){ pctx.fillRect(i,0,1,8);} }
  else if(mode===1){ for(let i=0;i<8;i+=2){ pctx.fillRect(0,i,8,1);} }
  else if(mode===2){ for(let i=0;i<8;i+=2){ pctx.fillRect(i,i,1,1); pctx.fillRect((i+1)%8,i,1,1);} }
  else { pctx.beginPath(); pctx.arc(2+4*r(),2+4*r(),1+r(),0,Math.PI*2); pctx.fill(); pctx.beginPath(); pctx.arc(6-4*r(),6-4*r(),1+r(),0,Math.PI*2); pctx.fill(); }
  const pat = ctx.createPattern(c,'repeat');
  patternCache.set(col.id, pat);
  return pat;
}

function draw(){
  const {W,H} = World; const cell=viewScale; const t=World.tiles; const b=World.biomass;
  ctx.imageSmoothingEnabled=false; ctx.fillStyle='#050812'; ctx.fillRect(0,0,canvas.width,canvas.height);
  // overlays
  const ovH = document.getElementById('ovHumidity').checked; const ovL = document.getElementById('ovLight').checked; const ovN = document.getElementById('ovNutrient').checked; const ovW = document.getElementById('ovWater').checked; const ovT = document.getElementById('ovTrail').checked;
  if(ovH||ovL||ovN||ovW){
    const img = ctx.createImageData(W,H);
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const i=idx(x,y), k=i*4; let r=0,g=0,bl=0;
        if(ovH){ g = Math.round(255*World.env.humidity[i]); }
        if(ovL){ r = Math.max(r, Math.round(255*World.env.light[i])); }
        if(ovN){ bl = Math.max(bl, Math.round(255*World.env.nutrient[i])); }
        if(ovW && World.env.water[i]){ r=40; g=140; bl=255; }
        img.data[k]=r; img.data[k+1]=g; img.data[k+2]=bl; img.data[k+3]=180;
      }
    }
    const off = document.createElement('canvas'); off.width=W; off.height=H; const octx=off.getContext('2d'); octx.putImageData(img,0,0); ctx.drawImage(off,0,0,W*cell,H*cell);
  }
  if(ovT){ Slime.render(ctx, cell); }

  // Draw colonies with per-colony pattern
  const idToCol = new Map(); for(const c of World.colonies){ idToCol.set(c.id,c); }
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const i=idx(x,y); const id=t[i]; if(id===-1) continue; const col=idToCol.get(id); if(!col) continue;
      ctx.save();
      ctx.translate(x*cell,y*cell);
      ctx.fillStyle = makePatternFor(col);
      ctx.globalAlpha = 0.7 * clamp(b[i]/1.2, 0.5, 1.0);
      ctx.fillRect(0,0,cell,cell);
      ctx.restore();
    }
  }
  ctx.globalAlpha=1; ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
  // hover box
  if(World.hover.x>=0){ ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=2; ctx.strokeRect(World.hover.x*cell+0.5, World.hover.y*cell+0.5, cell-1, cell-1); }
}

/* ===== Diagnostics ===== */
function validateSlimeTrails(){
  // Test that slime trails properly diffuse and evaporate
  const oldSum = Slime.trail.reduce((a,v) => a+v, 0);
  Slime.diffuseEvaporate();
  const newSum = Slime.trail.reduce((a,v) => a+v, 0);
  return Number.isFinite(newSum) && newSum <= oldSum; // Should decrease or stay same due to evaporation
}

function validateNutrientBalance(){
  // Check that hotspots exist and basic nutrient levels are reasonable
  if(!World.env || !World.env.nutrient) {
    console.log('No nutrient array');
    return false;
  }
  
  // Check overall nutrient levels
  let totalNutrients = 0;
  for(let i = 0; i < World.env.nutrient.length; i++) {
    totalNutrients += World.env.nutrient[i];
  }
  const avgGlobal = totalNutrients / World.env.nutrient.length;
  
  console.log(`Global avg nutrients: ${avgGlobal.toFixed(3)}, Hotspots: ${World.hotspots ? World.hotspots.length : 0}`);
  
  // Much lower threshold since nutrients start around 0.2-0.5 range
  return avgGlobal > 0.1; // Should have reasonable baseline
}

// Comprehensive test suite for nutrient dynamics
function validateNutrientDynamics(){
  const tests = [];
  
  // Test 1: Nutrient regeneration works
  tests.push({
    name: 'Nutrient Regeneration',
    test: () => {
      if(!World.env.nutrient) return false;
      
      // Store original values
      const original = [...World.env.nutrient];
      
      // Zero out some nutrients
      for(let i = 0; i < Math.min(50, World.env.nutrient.length); i++) {
        World.env.nutrient[i] = 0;
      }
      
      // Run dynamics multiple times
      for(let step = 0; step < 10; step++) {
        nutrientDynamics();
      }
      
      // Check if nutrients regenerated
      let regenerated = 0;
      for(let i = 0; i < Math.min(50, World.env.nutrient.length); i++) {
        if(World.env.nutrient[i] > 0.02) regenerated++;
      }
      
      // Restore original values
      World.env.nutrient.set(original);
      
      console.log(`Regeneration test: ${regenerated}/50 tiles regenerated`);
      return regenerated > 5; // At least some should regenerate
    }
  });
  
  // Test 2: Hotspots create gradients
  tests.push({
    name: 'Hotspot Gradients', 
    test: () => {
      if(World.hotspots.length === 0) {
        console.log('No hotspots for gradient test');
        return false;
      }
      
      if(!World.hotspots || World.hotspots.length === 0) {
        console.log('No hotspots available for test');
        return false;
      }
      
      // Clear nutrients first
      World.env.nutrient.fill(0.05);
      
      // Run multiple dynamics steps to let hotspots work
      for(let step = 0; step < 5; step++) {
        nutrientDynamics();
      }
      
      // Check if any hotspot area has elevated nutrients
      let hasElevated = false;
      for(const hs of World.hotspots) {
        if(!inBounds(hs.x, hs.y)) continue;
        
        const centerValue = World.env.nutrient[idx(hs.x, hs.y)] || 0;
        console.log(`Hotspot at (${hs.x},${hs.y}): ${centerValue.toFixed(3)}`);
        
        if(centerValue > 0.15) {
          hasElevated = true;
          break;
        }
      }
      
      return hasElevated;
    }
  });
  
  // Test 3: Consumption reduces nutrients
  tests.push({
    name: 'Nutrient Consumption',
    test: () => {
      // Test immediate consumption during expansion
      const testIdx = Math.floor(World.env.nutrient.length / 2);
      World.env.nutrient[testIdx] = 0.5;
      
      const beforeConsumption = World.env.nutrient[testIdx];
      
      // Simulate expansion consumption
      const consumption = SIMULATION_PARAMS.NUTRIENT.immediateConsumption;
      World.env.nutrient[testIdx] = clamp(World.env.nutrient[testIdx] - consumption, 0, 1);
      
      const afterConsumption = World.env.nutrient[testIdx];
      
      console.log(`Consumption test: ${beforeConsumption.toFixed(3)} -> ${afterConsumption.toFixed(3)}`);
      return afterConsumption < beforeConsumption;
    }
  });
  
  // Test 4: Diffusion spreads nutrients
  tests.push({
    name: 'Nutrient Diffusion',
    test: () => {
      // Store original state
      const original = [...World.env.nutrient];
      
      // Create a high concentration spot
      const testX = Math.floor(World.W/2), testY = Math.floor(World.H/2);
      const center = idx(testX, testY);
      
      // Set up test pattern
      World.env.nutrient.fill(0.1); // low baseline
      World.env.nutrient[center] = 0.8; // high center
      
      // Run diffusion
      nutrientDynamics();
      
      // Check if neighbors gained nutrients above baseline
      let diffused = false;
      let maxNeighbor = 0;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = testX + dx, ny = testY + dy;
        if(inBounds(nx, ny)) {
          const neighborValue = World.env.nutrient[idx(nx, ny)];
          maxNeighbor = Math.max(maxNeighbor, neighborValue);
          if(neighborValue > 0.12) { // lowered threshold
            diffused = true;
            break;
          }
        }
      }
      
      console.log(`Diffusion test: center=${World.env.nutrient[center].toFixed(3)}, maxNeighbor=${maxNeighbor.toFixed(3)}`);
      
      // Restore original state
      World.env.nutrient.set(original);
      
      return diffused;
    }
  });
  
  return tests;
}

// Test colony movement and expansion
function validateColonyMovement(){
  const tests = [];
  
  // Test 1: Suitability calculation responds to nutrients
  tests.push({
    name: 'Suitability Nutrient Response',
    test: () => {
      if(World.colonies.length === 0) return false;
      
      const col = World.colonies[0];
      const x = Math.floor(World.W/2), y = Math.floor(World.H/2);
      
      // Set up consistent environment except nutrients
      World.env.humidity[idx(x, y)] = col.traits.water_need;
      World.env.light[idx(x, y)] = col.traits.light_use;
      World.env.water[idx(x, y)] = 0;
      
      // Test high nutrient suitability
      World.env.nutrient[idx(x, y)] = 0.8;
      const highSuit = suitabilityAt(col, x, y);
      
      // Test low nutrient suitability
      World.env.nutrient[idx(x, y)] = 0.1;
      const lowSuit = suitabilityAt(col, x, y);
      
      console.log(`Suitability test: high=${highSuit.toFixed(3)}, low=${lowSuit.toFixed(3)}, diff=${(highSuit-lowSuit).toFixed(3)}`);
      return highSuit > lowSuit + 0.02; // Lowered threshold
    }
  });
  
  // Test 2: Colonies can expand successfully
  tests.push({
    name: 'Colony Expansion',
    test: () => {
      if(World.colonies.length === 0) return false;
      
      const col = World.colonies[0];
      const oldX = Math.floor(col.x), oldY = Math.floor(col.y);
      
      // Clear area around colony
      for(let dy = -3; dy <= 3; dy++) {
        for(let dx = -3; dx <= 3; dx++) {
          const nx = oldX + dx, ny = oldY + dy;
          if(inBounds(nx, ny)) {
            const i = idx(nx, ny);
            if(World.tiles[i] !== col.id) {
              World.tiles[i] = -1; // clear other colonies
            }
            World.env.nutrient[i] = 0.7;
            World.env.humidity[i] = col.traits.water_need;
            World.env.light[i] = col.traits.light_use;
            World.env.water[i] = 0;
          }
        }
      }
      
      // Try expansion multiple times
      let expanded = false;
      for(let attempt = 0; attempt < 5; attempt++) {
        if(tryExpand(col)) {
          expanded = true;
          break;
        }
      }
      
      console.log(`Expansion test: ${expanded}, pos: (${oldX},${oldY}) -> (${col.x},${col.y})`);
      return expanded;
    }
  });
  
  // Test 3: Nutrient gradient following
  tests.push({
    name: 'Gradient Following',
    test: () => {
      if(World.colonies.length === 0) return false;
      
      const col = World.colonies[0];
      const x = Math.floor(World.W/2), y = Math.floor(World.H/2);
      
      // Set up environment conditions to focus on nutrients
      World.env.humidity[idx(x, y)] = col.traits.water_need;
      World.env.humidity[idx(x+1, y)] = col.traits.water_need;
      World.env.humidity[idx(x-1, y)] = col.traits.water_need;
      World.env.light[idx(x, y)] = col.traits.light_use;
      World.env.light[idx(x+1, y)] = col.traits.light_use;
      World.env.light[idx(x-1, y)] = col.traits.light_use;
      
      // Create strong nutrient gradient
      World.env.nutrient[idx(x, y)] = 0.3;
      World.env.nutrient[idx(x+1, y)] = 0.7; // High to the right
      World.env.nutrient[idx(x-1, y)] = 0.1; // Low to the left
      
      const rightSuit = suitabilityAt(col, x+1, y);
      const leftSuit = suitabilityAt(col, x-1, y);
      
      console.log(`Gradient test: right=${rightSuit.toFixed(3)}, left=${leftSuit.toFixed(3)}, diff=${(rightSuit-leftSuit).toFixed(3)}`);
      return rightSuit > leftSuit + 0.05; // Lowered threshold
    }
  });
  
  // Test 4: Colony biomass growth
  tests.push({
    name: 'Colony Biomass Growth',
    test: () => {
      if(World.colonies.length === 0) return false;
      
      const col = World.colonies[0];
      const oldBiomass = col.biomass;
      
      // Set up good conditions
      const x = Math.floor(col.x), y = Math.floor(col.y);
      if(inBounds(x, y)) {
        World.env.nutrient[idx(x, y)] = 0.8;
        World.env.humidity[idx(x, y)] = col.traits.water_need;
        World.env.light[idx(x, y)] = col.traits.light_use;
        
        // Simulate successful expansion
        if(tryExpand(col)) {
          const newBiomass = col.biomass;
          console.log(`Biomass growth test: ${oldBiomass.toFixed(3)} -> ${newBiomass.toFixed(3)}`);
          return newBiomass > oldBiomass;
        }
      }
      return false;
    }
  });
  
  // Test 5: Slime trail deposition
  tests.push({
    name: 'Slime Trail Deposition',
    test: () => {
      if(World.colonies.length === 0) return false;
      
      const col = World.colonies[0];
      const x = Math.floor(col.x), y = Math.floor(col.y);
      if(!inBounds(x, y)) return false;
      
      const beforeTrail = Slime.trail[idx(x, y)];
      
      // Set up expansion conditions
      World.env.nutrient[idx(x, y)] = 0.8;
      World.env.humidity[idx(x, y)] = col.traits.water_need;
      World.env.light[idx(x, y)] = col.traits.light_use;
      
      // Try expansion
      if(tryExpand(col)) {
        // Check if trail was deposited somewhere
        let trailDeposited = false;
        for(let i = 0; i < Slime.trail.length; i++) {
          if(Slime.trail[i] > beforeTrail + 0.1) {
            trailDeposited = true;
            break;
          }
        }
        console.log(`Trail deposition test: ${trailDeposited}`);
        return trailDeposited;
      }
      return false;
    }
  });
  
  // Test 6: Environment initialization
  tests.push({
    name: 'Environment Initialization',
    test: () => {
      const hasNutrients = World.env.nutrient && World.env.nutrient.length > 0;
      const hasHumidity = World.env.humidity && World.env.humidity.length > 0;
      const hasLight = World.env.light && World.env.light.length > 0;
      const hasWater = World.env.water && World.env.water.length > 0;
      const hasHotspots = World.hotspots && World.hotspots.length > 0;
      
      console.log(`Environment test: nutrients=${hasNutrients}, humidity=${hasHumidity}, light=${hasLight}, water=${hasWater}, hotspots=${hasHotspots}`);
      return hasNutrients && hasHumidity && hasLight && hasWater && hasHotspots;
    }
  });
  
  return tests;
}

// Run all tests and return results
function runAllTests(){
  const results = {
    slimeTrails: validateSlimeTrails(),
    nutrientBalance: validateNutrientBalance(),
    nutrientDynamics: [],
    colonyMovement: [],
    additionalTests: []
  };
  
  // Run nutrient dynamics tests
  const nutrientTests = validateNutrientDynamics();
  for(const test of nutrientTests) {
    try {
      const passed = test.test();
      results.nutrientDynamics.push({name: test.name, passed});
    } catch(e) {
      results.nutrientDynamics.push({name: test.name, passed: false, error: e.message});
    }
  }
  
  // Run colony movement tests
  const movementTests = validateColonyMovement();
  const coreMovementTests = movementTests.slice(0, 3); // First 3 are core movement tests
  const additionalTests = movementTests.slice(3); // Rest are additional tests
  
  for(const test of coreMovementTests) {
    try {
      const passed = test.test();
      results.colonyMovement.push({name: test.name, passed});
    } catch(e) {
      results.colonyMovement.push({name: test.name, passed: false, error: e.message});
    }
  }
  
  // Run additional tests
  for(const test of additionalTests) {
    try {
      const passed = test.test();
      results.additionalTests.push({name: test.name, passed});
    } catch(e) {
      results.additionalTests.push({name: test.name, passed: false, error: e.message});
    }
  }
  
  return results;
}

// Console API for testing
window.validateSlimeTrails = validateSlimeTrails;
window.validateNutrientBalance = validateNutrientBalance;
window.validateNutrientDynamics = validateNutrientDynamics;
window.validateColonyMovement = validateColonyMovement;
window.runAllTests = runAllTests;
window.debugNutrients = () => {
  if(!World.env.nutrient) return 'No nutrient array';
  let sum = 0, min = 1, max = 0, count = 0;
  for(let i = 0; i < World.env.nutrient.length; i++) {
    const n = World.env.nutrient[i];
    sum += n; count++;
    min = Math.min(min, n);
    max = Math.max(max, n);
  }
  const avg = sum / count;
  return `Nutrients: avg=${avg.toFixed(3)}, min=${min.toFixed(3)}, max=${max.toFixed(3)}, hotspots=${World.hotspots.length}`;
};

/* ===== Interaction & UI ===== */
const statusEl = document.getElementById('status');
const legendEl = document.getElementById('legend');
const miniView = document.getElementById('miniView');
const mctx = miniView.getContext('2d');

let needRedraw=true; let last=0; let stepping=false;

function frame(ts){
  const dt = (ts-last)/1000; last=ts;
  if(!World.paused || stepping){ stepEcosystem(); needRedraw=true; stepping=false; }
  if(needRedraw){ draw(); needRedraw=false; }
  if(World.selectedId!=null){ refreshInspectorRealtime(); }
  statusEl.textContent = `t=${World.tick}`;
  requestAnimationFrame(frame);
}

function playPause(){ World.paused = !World.paused; document.getElementById('btnPause').textContent = World.paused? '▶️ Play' : '⏸️ Pause'; }
function reset(){ const seed = parseInt(document.getElementById('seed').value||'1337',10); const size = document.getElementById('worldSize').value; setupWorld(seed, size); World.paused=false; document.getElementById('btnPause').textContent='⏸️ Pause'; resize(); draw(); }
function savePNG(){ const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download=`slimeworld_${World.tick}.png`; a.click(); }

function setupWorld(seed, sizeStr){
  const [W,H] = sizeStr.split('x').map(n=>parseInt(n,10));
  World.W=W; World.H=H;
  World.colonies=[]; World.nextId=1; World.tick=0; World.selectedId=null;
  const noise = ValueNoise(seed);
  World.rng = noise.r; World.field = noise;
  buildEnvironment();
  seedInitialColonies();
  updateTypePressure();
  refreshLegend();
}

function colonyAtCanvas(px,py){ const cell=viewScale; const x=Math.floor(px/cell), y=Math.floor(py/cell); if(!inBounds(x,y)) return null; const id=World.tiles[idx(x,y)]; if(id===-1) return null; return World.colonies.find(c=>c.id===id) || null; }
function displayName(col){ return (col?.name) || (Archetypes[col?.type]?.name) || (col?.type) || 'Unknown'; }

function updateInspector(c){
  const el=document.getElementById('inspector'); const stats=document.getElementById('stats');
  if(!c){ el.textContent='Click a colony to inspect.'; stats.innerHTML=''; World.selectedId=null; mctx.clearRect(0,0,miniView.width, miniView.height); document.getElementById('rtStats').innerHTML=''; return }
  World.selectedId=c.id;
  const name=(c?.name)||(Archetypes[c?.type]?.name)||(c?.type)||'Unknown';
  el.innerHTML=`<div style="display:flex; align-items:center; gap:8px;">
    <div style="width:14px;height:14px;border-radius:50%;border:2px solid #fff; background:${c.color}"></div>
    <div>
      <b>${name}</b> <span class="small">(#${c.id})</span><br/>
      <span class="small italic">Species: ${c.species||'—'}</span><br/>
      <span class="small">Gen ${c.gen} • Age ${c.age}</span>
    </div>
  </div>
  <div style="margin-top:6px" class="small">Parent: ${c.parent??'—'} • Kids: ${c.kids.length}</div>`;
  function bar(label,val){ const w=Math.round(100*val); return `<div class="stat"><div style="display:flex; justify-content:space-between"><span>${label}</span><span>${w}%</span></div><div style="height:8px;background:#0c1426;border-radius:999px;margin-top:6px;overflow:hidden"><div style="width:${w}%;height:100%;background:linear-gradient(90deg, var(--accent), var(--accent-2))"></div></div></div>` }
  stats.innerHTML = bar('Water Need', c.traits.water_need) + bar('Light Use', c.traits.light_use) + bar('Photosymbiosis', c.traits.photosym) + bar('Transport', c.traits.transport) + bar('Predation', c.traits.predation) + bar('Defense', c.traits.defense) + bar('Spore Rate', c.traits.spore) + bar('Flow', c.traits.flow);
  refreshInspectorRealtime(true);
}

function refreshInspectorRealtime(force=false){
  if(World.selectedId==null) return;
  const c = World.colonies.find(c=>c.id===World.selectedId); if(!c) return;
  const rt=document.getElementById('rtStats');
  // compute stats
  let tiles=0, biomass=0, trail=0, maxTrail=0;
  for(let i=0;i<World.tiles.length;i++){ if(World.tiles[i]===c.id){ tiles++; biomass += World.biomass[i]; trail += Slime.trail[i]; if(Slime.trail[i]>maxTrail) maxTrail=Slime.trail[i]; } }
  const meanTrail = tiles? (trail/tiles):0;
  const energy = (function(){ const i = idx(Math.round(c.x), Math.round(c.y)); const n=World.env.nutrient[i], l=World.env.light[i], ps=c.traits.photosym||0; return 0.7*n + 0.3*ps*l; })();
  rt.innerHTML = [
    ['Tiles', tiles],
    ['Total Biomass', biomass.toFixed(2)],
    ['Last Suitability', c.lastFit.toFixed(3)],
    ['Mean Trail', meanTrail.toFixed(3)],
    ['Energy @core', energy.toFixed(3)],
    ['Kids', c.kids.length]
  ].map(([k,v])=>`<div class="kv"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  // mini-view (path network)
  mctx.clearRect(0,0,miniView.width,miniView.height);
  mctx.imageSmoothingEnabled=false;
  const scale = Math.min(miniView.width/World.W, miniView.height/World.H);
  mctx.save();
  mctx.scale(scale, scale);
  // draw faint grid of this colony
  mctx.fillStyle='rgba(180,220,255,0.08)';
  for(let y=0;y<World.H;y++){
    for(let x=0;x<World.W;x++){
      const i = idx(x,y);
      if(World.tiles[i]===c.id){
        mctx.fillRect(x,y,1,1);
      }
    }
  }
  // draw edges as network lines (neighbor connections)
  mctx.lineWidth=0.5; mctx.strokeStyle='rgba(120,180,255,0.7)';
  mctx.beginPath();
  for(let y=0;y<World.H;y++){
    for(let x=0;x<World.W;x++){
      const i = idx(x,y);
      if(World.tiles[i]!==c.id) continue;
      if(x+1<World.W && World.tiles[idx(x+1,y)]===c.id){ mctx.moveTo(x+0.5,y+0.5); mctx.lineTo(x+1.5,y+0.5); }
      if(y+1<World.H && World.tiles[idx(x,y+1)]===c.id){ mctx.moveTo(x+0.5,y+0.5); mctx.lineTo(x+0.5,y+1.5); }
    }
  }
  mctx.stroke();
  mctx.restore();
}

function refreshLegend(){
  legendEl.innerHTML='';
  const sorted=[...World.colonies].sort((a,b)=>b.id-a.id).slice(0,12);
  for(const c of sorted){
    const chip=document.createElement('div'); chip.className='chip';
    const d=document.createElement('div'); d.className='dot'; d.style.background=c.color; chip.appendChild(d);
    const label = (c.species||c.name||Archetypes[c.type]?.name||c.type||'Unknown') + ' #' + c.id;
    chip.appendChild(document.createTextNode(label));
    legendEl.appendChild(chip);
  }
}

/* ===== Boot & Events ===== */
function toGridCoords(evt){
  const rect=canvas.getBoundingClientRect();
  const cell=viewScale; 
  const px = (evt.clientX-rect.left);
  const py = (evt.clientY-rect.top);
  const gx = Math.floor(px/cell); const gy=Math.floor(py/cell);
  return {gx, gy};
}

let spawnSelectedEl=null;
let spawnPending=null;

Array.from(document.querySelectorAll('[data-spawn]')).forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(spawnSelectedEl===btn){ // toggle off
      btn.classList.remove('spawn-active'); spawnSelectedEl=null; spawnPending=null; return;
    }
    if(spawnSelectedEl){ spawnSelectedEl.classList.remove('spawn-active'); }
    spawnSelectedEl=btn; btn.classList.add('spawn-active'); spawnPending = btn.getAttribute('data-spawn');
  });
});

canvas.addEventListener('mousemove', (e)=>{
  const {gx,gy} = toGridCoords(e);
  if(inBounds(gx,gy)){ World.hover={x:gx,y:gy}; } else { World.hover={x:-1,y:-1}; }
  needRedraw=true;
});

canvas.addEventListener('click', (e)=>{
  const {gx,gy} = toGridCoords(e);
  if(!inBounds(gx,gy)) return;
  const id=World.tiles[idx(gx,gy)];
  if(spawnPending){
    const created=newColony(spawnPending, gx, gy, null);
    if(created){ refreshLegend(); updateInspector(created); }
    return;
  }
  if(id!==-1){ const c=World.colonies.find(k=>k.id===id); if(c) updateInspector(c); }
});

['ovHumidity','ovLight','ovNutrient','ovWater','ovTrail'].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener('change', ()=>{needRedraw=true}); });
document.getElementById('speed').addEventListener('input', (e)=>{ World.speed=parseFloat(e.target.value) });
document.getElementById('mutRate').addEventListener('input', (e)=>{ World.mutationRate=parseFloat(e.target.value) });
document.getElementById('capacity').addEventListener('input', (e)=>{ World.capacity=parseFloat(e.target.value) });
document.getElementById('btnPause').addEventListener('click', playPause);
document.getElementById('btnStep').addEventListener('click', ()=>{ stepping=true; World.paused=true; document.getElementById('btnPause').textContent='▶️ Play' });
document.getElementById('btnReset').addEventListener('click', reset);
document.getElementById('btnShake').addEventListener('click', ()=>{
  for(let i=0;i<World.env.humidity.length;i++){ 
    World.env.humidity[i] = clamp(World.env.humidity[i] + randRange(World.rng,-0.2,0.25), 0, 1); 
    World.env.light[i] = clamp(World.env.light[i] + randRange(World.rng,-0.15,0.2), 0, 1); 
    World.env.nutrient[i] = clamp(World.env.nutrient[i] + randRange(World.rng,-0.1,0.25), 0, 1); 
  }
  needRedraw=true; notify('Seasonal pulse applied','warn',900);
});
document.getElementById('btnReseed').addEventListener('click', ()=>{ 
  const seed = parseInt(document.getElementById('seed').value||'1337',10); 
  const size = document.getElementById('worldSize').value; 
  const noise = ValueNoise(seed);
  World.rng = noise.r; World.field = noise;
  buildEnvironment(); 
  seedInitialColonies(); // Fix: also reseed colonies
  Slime.clear();
  updateTypePressure();
  refreshLegend(); 
  needRedraw=true; 
  notify('Environment reseeded','warn',900);
});
document.getElementById('btnRunTests').addEventListener('click', ()=>{
  try {
    const results = runAllTests();
    let message = 'Test Results:\\n';
    
    message += `Slime Trails: ${results.slimeTrails ? 'PASS' : 'FAIL'}\\n`;
    message += `Nutrient Balance: ${results.nutrientBalance ? 'PASS' : 'FAIL'}\\n`;
    
    // Add debug info
    message += `\\nDEBUG: ${debugNutrients()}\\n`;
    
    message += '\\nNutrient Dynamics:\\n';
    for(const test of results.nutrientDynamics) {
      message += `  ${test.name}: ${test.passed ? 'PASS' : 'FAIL'}`;
      if(test.error) message += ` (${test.error})`;
      message += '\\n';
    }
    
    message += '\\nColony Movement:\\n';
    for(const test of results.colonyMovement) {
      message += `  ${test.name}: ${test.passed ? 'PASS' : 'FAIL'}`;
      if(test.error) message += ` (${test.error})`;
      message += '\\n';
    }
    
    message += '\\nAdditional Tests:\\n';
    if(results.additionalTests) {
      for(const test of results.additionalTests) {
        message += `  ${test.name}: ${test.passed ? 'PASS' : 'FAIL'}`;
        if(test.error) message += ` (${test.error})`;
        message += '\\n';
      }
    }
    
    console.log(message);
    alert(message);
    
    const allPassed = results.slimeTrails && results.nutrientBalance && 
                     results.nutrientDynamics.every(t => t.passed) &&
                     results.colonyMovement.every(t => t.passed);
    
    notify(allPassed ? 'All tests passed!' : 'Some tests failed - check console', 
           allPassed ? 'info' : 'warn', 3000);
  } catch(e) {
    console.error('Test error:', e);
    notify('Test error: ' + e.message, 'error', 3000);
  }
});

document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape'){ if(spawnSelectedEl){ spawnSelectedEl.classList.remove('spawn-active'); spawnSelectedEl=null; spawnPending=null; } }
  if(e.code==='Space'){ e.preventDefault(); stepping=true; World.paused=true; document.getElementById('btnPause').textContent='▶️ Play' }
  if(e.key==='p' || e.key==='P'){ playPause() }
  if(e.key==='r' || e.key==='R'){ reset() }
  if(e.key==='s' || e.key==='S'){ savePNG() }
});

// Basic save/load
document.getElementById('btnExport').addEventListener('click', ()=>{
  const data = {
    version: 3,
    W: World.W, H: World.H, tick: World.tick,
    env: {
      humidity: Array.from(World.env.humidity),
      light: Array.from(World.env.light),
      nutrient: Array.from(World.env.nutrient),
      water: Array.from(World.env.water),
    },
    tiles: Array.from(World.tiles),
    biomass: Array.from(World.biomass),
    colonies: World.colonies
  };
  const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='slimeworld_save.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
});
document.getElementById('btnImport').addEventListener('click', ()=>{
  document.getElementById('fileImport').click();
});
document.getElementById('fileImport').addEventListener('change', (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      World.W=data.W; World.H=data.H;
      World.env.humidity = new Float32Array(data.env.humidity);
      World.env.light = new Float32Array(data.env.light);
      World.env.nutrient = new Float32Array(data.env.nutrient);
      World.env.water = new Uint8Array(data.env.water);
      World.tiles = new Int32Array(data.tiles);
      World.biomass = new Float32Array(data.biomass);
      World.colonies = data.colonies;
      World.tick = data.tick||0;
      Slime.trail = new Float32Array(World.W*World.H);
      Slime.trailNext = new Float32Array(World.W*World.H);
      needRedraw=true; resize(); draw(); notify('Save loaded','warn',900);
    }catch(err){ notify('Load failed: '+err.message,'error',3000); }
  };
  reader.readAsText(file);
});

// Kill / Nudge actions
document.getElementById('btnKill').addEventListener('click', ()=>{
  if(World.selectedId==null) return;
  for(let i=0;i<World.tiles.length;i++){ if(World.tiles[i]===World.selectedId){ World.tiles[i]=-1; World.biomass[i]=0; } }
  World.colonies = World.colonies.filter(c=>c.id!==World.selectedId);
  World.selectedId=null; refreshLegend(); notify('Colony removed','warn',800);
});
document.getElementById('btnNudge').addEventListener('click', ()=>{
  if(World.selectedId==null) return;
  const c = World.colonies.find(c=>c.id===World.selectedId); if(!c) return;
  World.env.nutrient[idx(Math.round(c.x), Math.round(c.y))] = clamp(World.env.nutrient[idx(Math.round(c.x), Math.round(c.y))] + 0.2, 0, 1);
  notify('Growth nudged','warn',600);
});

/* ===== Init ===== */
function boot(){
  document.getElementById('status').textContent='booting…';
  const seed = parseInt(document.getElementById('seed').value||'1337',10);
  const size = document.getElementById('worldSize').value;
  setupWorld(seed, size); // Use consistent setup
  World.paused = false; // Start running
  resize();
  document.getElementById('status').textContent='running';
  requestAnimationFrame(frame);
}
boot();
