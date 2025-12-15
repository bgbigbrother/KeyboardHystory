// Basic setup test to verify Jest and fast-check configuration
import * as fc from 'fast-check';

describe('Test Environment Setup', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('fast-check is available and working', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return typeof n === 'number';
      }),
      { numRuns: 10 }
    );
  });

  test('jsdom environment is available', () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
  });

  test('performance.now mock is available', () => {
    expect(window.performance.now).toBeDefined();
    expect(typeof window.performance.now()).toBe('number');
  });
});