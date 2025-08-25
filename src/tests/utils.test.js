/**
 * Jest tests for utility functions
 * Testing simple mathematical functions from src/js/utils.js
 */

// Mock DOM elements that might be needed
if (!window.location) {
  Object.defineProperty(window, 'location', {
    value: {
      protocol: 'http:',
      host: 'localhost',
      pathname: '/'
    }
  });
}

// Import functions by loading the script content
const fs = require('fs');
const path = require('path');

// Load the utils.js file content
const utilsPath = path.join(__dirname, '../js/utils.js');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

// Execute the utils code to make functions available
eval(utilsContent);

describe('Utils Mathematical Functions', () => {
  describe('clamp function', () => {
    test('should clamp values below minimum', () => {
      expect(clamp(5, 10, 20)).toBe(10);
    });

    test('should clamp values above maximum', () => {
      expect(clamp(25, 10, 20)).toBe(20);
    });

    test('should return value when within range', () => {
      expect(clamp(15, 10, 20)).toBe(15);
    });

    test('should handle edge cases', () => {
      expect(clamp(10, 10, 20)).toBe(10);
      expect(clamp(20, 10, 20)).toBe(20);
    });
  });

  describe('lerp function', () => {
    test('should interpolate between two values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
    });

    test('should return first value when t=0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    test('should return second value when t=1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    test('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });
  });

  describe('smoothstep function', () => {
    test('should return 0 when t=0', () => {
      expect(smoothstep(0)).toBe(0);
    });

    test('should return 1 when t=1', () => {
      expect(smoothstep(1)).toBe(1);
    });

    test('should return smooth interpolation for t=0.5', () => {
      const result = smoothstep(0.5);
      expect(result).toBeCloseTo(0.5, 2);
    });

    test('should produce smooth curve', () => {
      const t1 = smoothstep(0.25);
      const t2 = smoothstep(0.75);
      expect(t1).toBeGreaterThan(0);
      expect(t1).toBeLessThan(0.5);
      expect(t2).toBeGreaterThan(0.5);
      expect(t2).toBeLessThan(1);
    });
  });

  describe('PRNG functions', () => {
    test('sfc32 should generate consistent values with same seed', () => {
      const rng1 = sfc32(12345, 67890, 11111, 22222);
      const rng2 = sfc32(12345, 67890, 11111, 22222);
      
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
    });

    test('sfc32 should generate values between 0 and 1', () => {
      const rng = sfc32(1, 2, 3, 4);
      
      for (let i = 0; i < 10; i++) {
        const value = rng();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    test('xmur3 should generate hash function from string', () => {
      const hash1 = xmur3('test');
      const hash2 = xmur3('test');
      
      expect(hash1()).toBe(hash2());
    });
  });
});