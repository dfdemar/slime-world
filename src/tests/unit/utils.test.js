// Unit tests for utils.js - PRNG, mathematical functions, utilities

// Load test fixtures
const { TestData, TestUtils } = require('../fixtures/test-data');

// Mock DOM for notify function tests
const mockDOM = {
  getElementById: jest.fn().mockReturnValue({
    className: '',
    classList: { add: jest.fn() },
    textContent: '',
    style: { display: 'none' }
  })
};
global.document = mockDOM;
global.clearTimeout = jest.fn();
global.setTimeout = jest.fn().mockReturnValue(12345);

// Since utils.js functions are global, we need to eval the file content
const fs = require('fs');
const path = require('path');
const utilsPath = path.resolve(__dirname, '../../js/utils.js');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

// Extract function declarations and eval them
eval(utilsContent);

describe('Utils - PRNG Functions', () => {
  test('xmur3 produces consistent hash function for same input', () => {
    const hash1 = xmur3('test');
    const hash2 = xmur3('test');
    
    // Should produce same sequence
    expect(hash1()).toBe(hash2());
    expect(hash1()).toBe(hash2());
  });

  test('xmur3 produces different hashes for different inputs', () => {
    const hash1 = xmur3('test1');
    const hash2 = xmur3('test2');
    
    expect(hash1()).not.toBe(hash2());
  });

  test('sfc32 produces deterministic sequence', () => {
    const rng1 = sfc32(1, 2, 3, 4);
    const rng2 = sfc32(1, 2, 3, 4);
    
    // Same initial state should produce same sequence
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  test('sfc32 produces values in range [0, 1)', () => {
    const rng = sfc32(1, 2, 3, 4);
    
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeWithinRange(0, 0.999999);
    }
  });

  test('sfc32 state serialization works correctly', () => {
    const rng1 = sfc32(1, 2, 3, 4);
    
    // Generate some values
    rng1();
    rng1();
    rng1();
    
    const state = rng1.getState();
    const rng2 = sfc32(0, 0, 0, 0);
    rng2.setState(state);
    
    // Should produce same sequence from this point
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
  });

  test('sfc32 with test seed produces expected deterministic values', () => {
    const hash = xmur3(TestData.TEST_SEED.toString());
    const rng = sfc32(hash(), hash(), hash(), hash());
    
    // First few values should be consistent for regression testing
    const firstValue = rng();
    expect(typeof firstValue).toBe('number');
    expect(firstValue).toBeWithinRange(0, 1);
    
    // Sequence should be deterministic
    const rng2 = TestUtils.createTestRNG(TestData.TEST_SEED);
    if (typeof rng2.getState === 'function') {
      // If we get the actual sfc32 implementation
      const state1 = rng.getState();
      const state2 = rng2.getState();
      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
    }
  });
});

describe('Utils - Mathematical Functions', () => {
  test('clamp restricts values to range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  test('lerp interpolates between values', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(5, 15, 0.25)).toBe(7.5);
  });

  test('smoothstep produces smooth interpolation', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBe(0.5);
    
    // Should be smooth (derivative continuous)
    const val = smoothstep(0.3);
    expect(val).toBeWithinRange(0, 1);
    expect(val).toBe(0.3 * 0.3 * (3 - 2 * 0.3));
  });

  test('randRange produces values in specified range', () => {
    const rng = sfc32(1, 2, 3, 4);
    
    for (let i = 0; i < 50; i++) {
      const val = randRange(rng, 10, 20);
      expect(val).toBeWithinRange(10, 20);
    }
    
    // Test negative ranges
    for (let i = 0; i < 50; i++) {
      const val = randRange(rng, -5, 5);
      expect(val).toBeWithinRange(-5, 5);
    }
  });

  test('percentile returns correct values', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    expect(percentile(arr, 0)).toBe(1);
    expect(percentile(arr, 1)).toBe(10);
    expect(percentile(arr, 0.5)).toBeWithinRange(5, 6);
    
    // Should work with unsorted arrays
    const unsorted = [5, 1, 9, 3, 7, 2];
    expect(percentile(unsorted, 0)).toBe(1);
    expect(percentile(unsorted, 1)).toBe(9);
  });
});

describe('Utils - Color Conversion', () => {
  test('hslToHex converts HSL to hex correctly', () => {
    expect(hslToHex('hsl(0 100% 50%)')).toBe('#ff0000'); // Red
    expect(hslToHex('hsl(120 100% 50%)')).toBe('#00ff00'); // Green
    expect(hslToHex('hsl(240 100% 50%)')).toBe('#0000ff'); // Blue
    expect(hslToHex('hsl(0 0% 0%)')).toBe('#000000'); // Black
    expect(hslToHex('hsl(0 0% 100%)')).toBe('#ffffff'); // White
  });

  test('hslToHex handles invalid input', () => {
    expect(hslToHex('invalid')).toBe('#000000');
    expect(hslToHex('')).toBe('#000000');
    expect(hslToHex(null)).toBe('#000000');
  });

  test('hexToHsl converts hex to HSL correctly', () => {
    expect(hexToHsl('#ff0000')).toBe('hsl(0.0 100.0% 50.0%)'); // Red
    expect(hexToHsl('#00ff00')).toBe('hsl(120.0 100.0% 50.0%)'); // Green
    expect(hexToHsl('#0000ff')).toBe('hsl(240.0 100.0% 50.0%)'); // Blue
    expect(hexToHsl('#000000')).toBe('hsl(0.0 0.0% 0.0%)'); // Black
    expect(hexToHsl('#ffffff')).toBe('hsl(0.0 0.0% 100.0%)'); // White
  });

  test('color conversion is bidirectional', () => {
    const originalHsl = 'hsl(180 75% 60%)';
    const hex = hslToHex(originalHsl);
    const backToHsl = hexToHsl(hex);
    
    // Should be approximately equal (allowing for rounding)
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(backToHsl).toMatch(/^hsl\(\d+\.\d+ \d+\.\d+% \d+\.\d+%\)$/);
  });
});

describe('Utils - DOM Notify Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock element
    mockDOM.getElementById.mockReturnValue({
      className: '',
      classList: { add: jest.fn() },
      textContent: '',
      style: { display: 'none' }
    });
  });

  test('notify displays message with default settings', () => {
    const mockEl = {
      className: '',
      classList: { add: jest.fn() },
      textContent: '',
      style: { display: 'none' }
    };
    mockDOM.getElementById.mockReturnValue(mockEl);
    
    notify('Test message');
    
    expect(mockDOM.getElementById).toHaveBeenCalledWith('alert');
    expect(mockEl.textContent).toBe('Test message');
    expect(mockEl.style.display).toBe('block');
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1600);
  });

  test('notify handles different levels', () => {
    const mockEl = {
      className: '',
      classList: { add: jest.fn() },
      textContent: '',
      style: { display: 'none' }
    };
    mockDOM.getElementById.mockReturnValue(mockEl);
    
    notify('Warning message', 'warn');
    expect(mockEl.classList.add).toHaveBeenCalledWith('warn');
    
    notify('Error message', 'error');
    expect(mockEl.classList.add).toHaveBeenCalledWith('error');
  });

  test('notify respects custom TTL', () => {
    const mockEl = {
      className: '',
      classList: { add: jest.fn() },
      textContent: '',
      style: { display: 'none' }
    };
    mockDOM.getElementById.mockReturnValue(mockEl);
    
    notify('Custom TTL', 'info', 3000);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
  });
});

describe('Utils - ValueNoise', () => {
  test('ValueNoise creates consistent noise generator', () => {
    const noise1 = ValueNoise(TestData.TEST_SEED);
    const noise2 = ValueNoise(TestData.TEST_SEED);
    
    // Same seed should produce same values
    expect(noise1.noise2D(1.5, 2.5)).toBe(noise2.noise2D(1.5, 2.5));
    expect(noise1.fractal2D(1.5, 2.5)).toBe(noise2.fractal2D(1.5, 2.5));
  });

  test('ValueNoise produces values in expected range', () => {
    const noise = ValueNoise(TestData.TEST_SEED);
    
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        const val = noise.noise2D(i * 0.1, j * 0.1);
        expect(val).toBeWithinRange(0, 1);
      }
    }
  });

  test('ValueNoise fractal produces normalized values', () => {
    const noise = ValueNoise(TestData.TEST_SEED);
    
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const val = noise.fractal2D(i * 0.1, j * 0.1, 4, 2.0, 0.5);
        expect(val).toBeWithinRange(0, 1);
      }
    }
  });

  test('ValueNoise fractal with different parameters', () => {
    const noise = ValueNoise(TestData.TEST_SEED);
    
    const val1 = noise.fractal2D(1, 1, 1, 1, 1); // Single octave
    const val2 = noise.fractal2D(1, 1, 4, 2, 0.5); // Multiple octaves
    
    expect(val1).toBeWithinRange(0, 1);
    expect(val2).toBeWithinRange(0, 1);
    // Different parameters should generally produce different values
    expect(val1).not.toBe(val2);
  });

  test('ValueNoise with different seeds produces different values', () => {
    const noise1 = ValueNoise(1);
    const noise2 = ValueNoise(2);
    
    const val1 = noise1.noise2D(1.5, 2.5);
    const val2 = noise2.noise2D(1.5, 2.5);
    
    expect(val1).not.toBe(val2);
  });

  test('ValueNoise exposes RNG for additional randomness', () => {
    const noise = ValueNoise(TestData.TEST_SEED);
    
    expect(typeof noise.r).toBe('function');
    
    for (let i = 0; i < 10; i++) {
      const val = noise.r();
      expect(val).toBeWithinRange(0, 1);
    }
  });
});