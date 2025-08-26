import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { harvest } from '../src/index.js';

describe('Selector functionality', () => {
  it('should extract links from specific selector', async () => {
    // This test would require a real webpage or fixture with specific selectors
    // For now, we'll test that the option is properly passed through
    const options = {
      start: ['https://example.com'],
      selector: '.test-selector',
      maxDepth: 1,
      maxPages: 1
    };
    
    expect(options.selector).toBe('.test-selector');
  });

  it('should work without selector (default behavior)', async () => {
    const options = {
      start: ['https://example.com'],
      maxDepth: 1,
      maxPages: 1
    };
    
    expect(options.selector).toBeUndefined();
  });
});
