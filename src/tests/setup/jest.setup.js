// Global Jest setup for SlimeWorld tests

// ASCII Banner for SlimeWorld Tests (show once across all processes)
const fs = require('fs');
const path = require('path');
const os = require('os');

const bannerFlagPath = path.join(os.tmpdir(), '.slimeworld-test-banner');

if (!fs.existsSync(bannerFlagPath)) {
  try {
    fs.writeFileSync(bannerFlagPath, 'shown');
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███████╗██╗     ██╗███╗   ███╗███████╗██╗    ██╗ ██████╗    ║
║   ██╔════╝██║     ██║████╗ ████║██╔════╝██║    ██║██╔═══██╗   ║
║   ███████╗██║     ██║██╔████╔██║█████╗  ██║ █╗ ██║██║   ██║   ║
║   ╚════██║██║     ██║██║╚██╔╝██║██╔══╝  ██║███╗██║██║   ██║   ║
║   ███████║███████╗██║██║ ╚═╝ ██║███████╗╚███╔███╔╝╚██████╔╝   ║
║   ╚══════╝╚══════╝╚═╝╚═╝     ╚═╝╚══════╝ ╚══╝╚══╝  ╚═════╝    ║
║                                                               ║
║                     Test Suite v2.4.0                         ║
║                       Jest Framework                          ║
╚═══════════════════════════════════════════════════════════════╝
`);

    // Clean up the flag file after a short delay
    setTimeout(() => {
      try { fs.unlinkSync(bannerFlagPath); } catch {}
    }, 100);
  } catch {
    // If file creation fails (race condition), skip banner
  }
}

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeValidColony(received) {
    const pass = received && 
                 typeof received.id === 'number' &&
                 typeof received.x === 'number' &&
                 typeof received.y === 'number' &&
                 typeof received.type === 'string' &&
                 Array.isArray(received.cells);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid colony`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid colony with id, x, y, type, and cells properties`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Create deterministic seed for tests
  getTestSeed: () => 42,
  
  // Wait for simulation ticks
  waitForTicks: async (page, ticks) => {
    await page.evaluate((tickCount) => {
      return new Promise((resolve) => {
        const startTick = World.tick;
        const checkTick = () => {
          if (World.tick >= startTick + tickCount) {
            resolve();
          } else {
            requestAnimationFrame(checkTick);
          }
        };
        checkTick();
      });
    }, ticks);
  },
  
  // Reset world state for tests
  resetWorld: async (page) => {
    await page.evaluate(() => {
      if (typeof World !== 'undefined') {
        World.colonies = [];
        World.nextId = 1;
        World.tick = 0;
        World.biomass.fill(0);
        if (World.tiles) World.tiles.fill(0);
        if (Slime && Slime.trail) Slime.clear();
      }
    });
  }
};

// Console log filtering for cleaner test output
const originalConsoleLog = console.log;
console.log = (...args) => {
  // Filter out simulation debug messages during tests
  if (!args.some(arg => typeof arg === 'string' && arg.includes('tick:'))) {
    originalConsoleLog(...args);
  }
};
