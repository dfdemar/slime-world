const path = require('path');

module.exports = {
  // Puppeteer launch options
  launch: {
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps'
    ],
    defaultViewport: {
      width: 1024,
      height: 768
    }
  },

  // Browser context options
  browserContext: 'default',

  // Page options
  exitOnPageError: false,
  
  // Custom server setup (if needed)
  server: null
};

// Helper function to get the absolute path to index.html
function getIndexPath() {
  return path.resolve(__dirname, '../../../index.html');
}

// Export utilities for browser tests
module.exports.utils = {
  getIndexPath,
  
  // Navigate to the application
  async navigateToApp(page) {
    const indexPath = getIndexPath();
    await page.goto(`file://${indexPath}`, {
      waitUntil: 'domcontentloaded'
    });
    
    // Wait for the application to initialize
    await page.waitForSelector('#canvas', { timeout: 10000 });
    
    // Wait for World object to be available
    await page.waitForFunction(() => typeof World !== 'undefined', { timeout: 10000 });
  },
  
  // Set up test environment in browser
  async setupTestEnvironment(page) {
    await page.evaluate(() => {
      // Pause simulation by default for tests
      if (typeof World !== 'undefined') {
        World.paused = true;
      }
      
      // Disable animations for faster tests
      if (typeof requestAnimationFrame !== 'undefined') {
        window.originalRequestAnimationFrame = requestAnimationFrame;
        window.requestAnimationFrame = (callback) => {
          return setTimeout(callback, 0);
        };
      }
    });
  },
  
  // Clean up test environment
  async cleanupTestEnvironment(page) {
    await page.evaluate(() => {
      // Restore original requestAnimationFrame
      if (window.originalRequestAnimationFrame) {
        window.requestAnimationFrame = window.originalRequestAnimationFrame;
      }
    });
  }
};