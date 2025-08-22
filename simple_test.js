// Simple test to check core nutrient dynamics
const fs = require('fs');

// Mock browser environment
global.document = { getElementById: () => ({ value: '1337' }) };
global.window = global;
global.alert = () => {};
global.console = console;

// Read and extract just the core simulation functions
const appJs = fs.readFileSync('app.js', 'utf8');

// Extract the essential functions by evaluating key parts
try {
  // Extract constants and core functions
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
  eval(appJs.match(/const World[\s\S]*?};/)[0]);
  eval(appJs.match(/function idx[\s\S]*?return y\*World\.W \+ x\}/)[0]);
  eval(appJs.match(/function inBounds[\s\S]*?return x>=0&&y>=0&&x<World\.W&&y<World\.H\}/)[0]);
  
  // Setup minimal simulation
  World.W = 160; World.H = 90;
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
  
  // Fill with test data
  for(let i = 0; i < World.env.nutrient.length; i++) {
    World.env.humidity[i] = 0.5;
    World.env.light[i] = 0.5;
    World.env.nutrient[i] = 0.3; // Start with some nutrients
    World.env.water[i] = 0;
  }
  
  // Add a test hotspot
  World.hotspots.push({
    x: Math.floor(World.W/2), 
    y: Math.floor(World.H/2), 
    strength: 0.2, 
    radius: 3, 
    age: 0
  });
  
  console.log('Initial setup complete');
  console.log(`Initial nutrient sum: ${World.env.nutrient.reduce((a,b) => a+b, 0)}`);
  
  // Test basic nutrient dynamics - extract and eval the function
  const nutrientDynamicsMatch = appJs.match(/function nutrientDynamics\(\)[\s\S]*?^\}/m);
  if (nutrientDynamicsMatch) {
    eval(nutrientDynamicsMatch[0]);
    
    console.log('Testing nutrient dynamics...');
    const beforeSum = World.env.nutrient.reduce((a,b) => a+b, 0);
    console.log(`Before dynamics: ${beforeSum}`);
    
    nutrientDynamics();
    
    const afterSum = World.env.nutrient.reduce((a,b) => a+b, 0);
    console.log(`After dynamics: ${afterSum}`);
    
    if (afterSum > 0 && afterSum >= beforeSum * 0.9) {
      console.log('✓ Nutrient dynamics working - nutrients preserved/regenerated');
    } else {
      console.log('✗ Nutrient dynamics BROKEN - nutrients disappeared');
    }
    
  } else {
    console.log('Could not extract nutrientDynamics function');
  }
  
} catch(error) {
  console.error('Test failed:', error.message);
  console.error(error.stack);
}