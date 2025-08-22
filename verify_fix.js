// Verify the basic colony mechanics are working
const fs = require('fs');

// Mock minimal browser environment
global.document = { getElementById: () => ({ value: '1337' }) };
global.window = global;
global.alert = () => {};
global.console = console;

// Read app.js and extract core functions
const appJs = fs.readFileSync('app.js', 'utf8');

try {
  // Extract essential parts safely
  eval(appJs.match(/const SIMULATION_PARAMS[\s\S]*?};/)[0]);
  eval(appJs.match(/function sfc32[\s\S]*?return \(t>>>0\)\/4294967296\}\}/)[0]);
  eval(appJs.match(/function xmur3[\s\S]*?return \(h\^h>>>16\)>>>0\}\}/)[0]);
  eval(appJs.match(/function randRange[\s\S]*?return min \+ r\(\)\*\(max-min\)\}/)[0]);
  eval(appJs.match(/function clamp[\s\S]*?return v<a\?a:\(v>b\?b:v\)\}/)[0]);
  eval(appJs.match(/function lerp[\s\S]*?return a\+\(b-a\)\*t\}/)[0]);
  eval(appJs.match(/function smoothstep[\s\S]*?return t\*t\*\(3-2\*t\)\}/)[0]);
  eval(appJs.match(/function percentile[\s\S]*?return a\[i\]; \}/)[0]);
  eval(appJs.match(/function ValueNoise[\s\S]*?return \{noise2D, fractal2D, r\};\s*\}/)[0]);
  eval(appJs.match(/const Archetypes[\s\S]*?};/)[0]);
  eval(appJs.match(/const TypeBehavior[\s\S]*?};/)[0]);
  eval(appJs.match(/const World = \{[\s\S]*?\};/)[0]);
  eval(appJs.match(/function idx[\s\S]*?return y\*World\.W \+ x\}/)[0]);
  eval(appJs.match(/function inBounds[\s\S]*?return x>=0&&y>=0&&x<World\.W&&y<World\.H\}/)[0]);
  
  // Setup world
  World.W = 80; World.H = 45;
  World.colonies = []; World.nextId = 1; World.tick = 0;
  const noise = ValueNoise(1337);
  World.rng = noise.r; World.field = noise;
  
  // Initialize arrays
  World.env = {};
  World.env.humidity = new Float32Array(World.W * World.H);
  World.env.light = new Float32Array(World.W * World.H);
  World.env.nutrient = new Float32Array(World.W * World.H);
  World.env.water = new Uint8Array(World.W * World.H);
  World._nutrientNext = new Float32Array(World.W * World.H);
  World.hotspots = [];
  
  // Fill with basic data
  for(let i = 0; i < World.env.nutrient.length; i++) {
    World.env.humidity[i] = 0.6;
    World.env.light[i] = 0.6;
    World.env.nutrient[i] = 0.4;
    World.env.water[i] = 0;
  }
  
  // Test colony creation
  const colony = {
    id: World.nextId++,
    x: 40, y: 22,
    biomass: 1.0,
    type: 'MAT',
    age: 0,
    lastFit: 0.7,
    mutations: {}
  };
  
  World.colonies.push(colony);
  console.log('✓ Colony created successfully');
  console.log(`Colony: id=${colony.id}, pos=(${colony.x},${colony.y}), type=${colony.type}`);
  
  // Test suitability calculation
  const suitMatch = appJs.match(/function suitabilityAt[\s\S]*?^}/m);
  if (suitMatch) {
    eval(suitMatch[0]);
    
    const suit = suitabilityAt(colony.x, colony.y, colony.type);
    console.log(`✓ Suitability at colony position: ${suit.toFixed(3)}`);
    
    if (suit > 0) {
      console.log('✓ Positive suitability - colony should be able to survive');
    } else {
      console.log('✗ Zero suitability - colony may not survive');
    }
  }
  
  // Test nutrient dynamics
  const nutrientMatch = appJs.match(/function nutrientDynamics\(\)[\s\S]*?^}/m);
  if (nutrientMatch) {
    eval(nutrientMatch[0]);
    
    const beforeSum = World.env.nutrient.reduce((a,b) => a+b, 0);
    console.log(`Before nutrient dynamics: ${beforeSum.toFixed(2)}`);
    
    nutrientDynamics();
    
    const afterSum = World.env.nutrient.reduce((a,b) => a+b, 0);
    console.log(`After nutrient dynamics: ${afterSum.toFixed(2)}`);
    
    if (!isNaN(afterSum) && afterSum > 0) {
      console.log('✓ Nutrient dynamics working - no NaN values');
    } else {
      console.log('✗ Nutrient dynamics broken - NaN or zero result');
    }
  }
  
  console.log('\n=== BASIC FUNCTIONALITY CHECK COMPLETE ===');
  
} catch(error) {
  console.error('Verification failed:', error.message);
  console.error(error.stack);
}