// Initial browser test to verify Puppeteer setup
const { utils } = require('../setup/puppeteer.config');

describe('Puppeteer Setup Verification', () => {
  let page;

  beforeAll(async () => {
    page = await browser.newPage();
    await utils.navigateToApp(page);
    await utils.setupTestEnvironment(page);
  });

  afterAll(async () => {
    if (page) {
      await utils.cleanupTestEnvironment(page);
      await page.close();
    }
  });

  test('can load the application in headless browser', async () => {
    // Check that the page loaded
    const title = await page.title();
    expect(title).toBe('Slimeworld Evolution Simulator');
  });

  test('canvas element is present and accessible', async () => {
    const canvas = await page.$('#canvas');
    expect(canvas).toBeTruthy();
    
    const canvasSize = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      return {
        width: canvas.width,
        height: canvas.height
      };
    });
    
    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.height).toBeGreaterThan(0);
  });

  test('World object is available in browser context', async () => {
    const worldExists = await page.evaluate(() => typeof World !== 'undefined');
    expect(worldExists).toBe(true);
    
    const worldProperties = await page.evaluate(() => {
      return {
        W: World.W,
        H: World.H,
        paused: World.paused,
        tick: World.tick
      };
    });
    
    expect(worldProperties.W).toBeGreaterThan(0);
    expect(worldProperties.H).toBeGreaterThan(0);
    expect(typeof worldProperties.paused).toBe('boolean');
    expect(typeof worldProperties.tick).toBe('number');
  });

  test('can access simulation modules in browser', async () => {
    const modulesAvailable = await page.evaluate(() => {
      return {
        World: typeof World !== 'undefined',
        Slime: typeof Slime !== 'undefined',
        Archetypes: typeof Archetypes !== 'undefined',
        // Check for actual functions instead of Colonies object
        newColony: typeof newColony !== 'undefined',
        suitabilityAt: typeof suitabilityAt !== 'undefined'
      };
    });
    
    expect(modulesAvailable.World).toBe(true);
    expect(modulesAvailable.Slime).toBe(true);
    expect(modulesAvailable.Archetypes).toBe(true);
    expect(modulesAvailable.newColony).toBe(true);
    expect(modulesAvailable.suitabilityAt).toBe(true);
  });

  test('can manipulate world state in browser', async () => {
    // Reset world and verify it's clean
    await testUtils.resetWorld(page);
    
    const initialState = await page.evaluate(() => {
      return {
        colonies: World.colonies.length,
        tick: World.tick
      };
    });
    
    expect(initialState.colonies).toBe(0);
    expect(initialState.tick).toBe(0);
    
    // Add a test colony
    await page.evaluate(() => {
      const colony = {
        id: 1,
        type: 'MAT',
        x: 50,
        y: 25,
        cells: [[50, 25]],
        biomass: 1.0,
        age: 0,
        generation: 0,
        traits: {
          water_need: 0.8,
          light_use: 0.4,
          photosym: 0.6,
          transport: 0.5,
          sensing: 0.3,
          predation: 0.2
        }
      };
      World.colonies.push(colony);
      World.nextId = 2;
    });
    
    const afterColony = await page.evaluate(() => World.colonies.length);
    expect(afterColony).toBe(1);
  });
});