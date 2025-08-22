/* ===== World System ===== */
const World = {
    W:160, H:90,
    env:{humidity:[], light:[], nutrient:[], water:[]},
    tiles:[], biomass:[],
    colonies:[], nextId:1,
    rng:null, field:null,
    tick:0, paused:false, speed:1.2,
    mutationRate:0.18, capacity:1.0,
    hover:{x:-1,y:-1}, typePressure:{},
};

const Slime = {
    trail:null, trailNext:null,
    params:{evap:0.985, diff:0.35, trailScale:0.03},
    clear(){ this.trail.fill(0) },
    sat(v){ return 1 - Math.exp(-this.params.trailScale * v) },
    diffuseEvaporate(){
        const {evap,diff} = this.params; const W=World.W, H=World.H; const T=this.trail, N=this.trailNext;
        for(let y=0;y<H;y++){
            for(let x=0;x<W;x++){
                const i=y*W + x;
                const l=T[y*W + ((x-1+W)%W)]||0, r=T[y*W + ((x+1)%W)]||0, u=T[((y-1+H)%H)*W + x]||0, d=T[((y+1)%H)*W + x]||0;
                const self = T[i]||0;
                const mixed = (1-diff)*self + (diff*0.25)*(l+r+u+d);
                N[i] = mixed * evap;
            }
        }
        // swap buffers
        this.trail = N;
        this.trailNext = T;
    },
};

function idx(x,y){return y*World.W + x}
function inBounds(x,y){return x>=0&&y>=0&&x<World.W&&y<World.H}

function setupWorld(seed, sizeStr){
    const [W,H] = sizeStr.split('x').map(n=>parseInt(n,10));
    World.W=W; World.H=H;
    World.tiles = new Int32Array(W*H).fill(-1);
    World.biomass = new Float32Array(W*H).fill(0);
    World.env.humidity = new Float32Array(W*H);
    World.env.light = new Float32Array(W*H);
    World.env.nutrient = new Float32Array(W*H);
    World.env.water = new Uint8Array(W*H);
    World._nutrientNext = new Float32Array(W*H);
    World.colonies=[]; World.nextId=1; World.tick=0;
    const noise = ValueNoise(seed);
    World.rng = noise.r; World.field = noise;
    Slime.trail = new Float32Array(W*H); Slime.trailNext = new Float32Array(W*H);
    buildEnvironment();
    seedInitialColonies();
    updateTypePressure();
    refreshLegend();
}