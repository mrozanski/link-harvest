import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { harvest } from '../src/index.js';
import { HarvestOptions } from '../src/types.js';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Harvest Integration Tests', () => {
  let fixtureServer: ChildProcess;
  const fixturePort = 3000;
  const fixtureUrl = `http://localhost:${fixturePort}`;

  beforeAll(async () => {
    // Start fixture server
    const fixturesPath = join(__dirname, 'fixtures');
    fixtureServer = spawn('npx', ['serve', fixturesPath, '-p', String(fixturePort), '-s'], {
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (fixtureServer) {
      fixtureServer.kill();
    }
  });

  describe('Basic harvesting', () => {
    it('crawls fixture site and returns structured results', async () => {
      const options: HarvestOptions = {
        start: [`${fixtureUrl}/`],
        domain: 'localhost',
        maxDepth: 2,
        maxPages: 50,
        logLevel: 'silent'
      };

      const result = await harvest(options);

      // Validate result structure
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('domain', 'localhost');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('crawlStarted');
      expect(result).toHaveProperty('crawlCompleted');
      expect(result).toHaveProperty('links');
      expect(Array.isArray(result.links)).toBe(true);

      // Should find links from the fixture site
      expect(result.count).toBeGreaterThan(0);
      expect(result.links.length).toBe(result.count);

      // All links should be internal (same host)
      for (const link of result.links) {
        expect(link.url).toMatch(/^http:\/\/localhost:/);
        expect(link).toHaveProperty('discoveredOn');
        expect(link).toHaveProperty('depth');
        expect(typeof link.depth).toBe('number');
      }

      // Results should be sorted by URL
      const urls = result.links.map(link => link.url);
      const sortedUrls = [...urls].sort();
      expect(urls).toEqual(sortedUrls);
    }, 30000);

    it('respects maxDepth parameter', async () => {
      const options: HarvestOptions = {
        start: [`${fixtureUrl}/`],
        domain: 'localhost',
        maxDepth: 1,
        logLevel: 'silent'
      };

      const result = await harvest(options);

      // All links should have depth <= maxDepth
      for (const link of result.links) {
        expect(link.depth).toBeLessThanOrEqual(1);
      }
    }, 30000);

    it('filters out external links', async () => {
      const options: HarvestOptions = {
        start: [`${fixtureUrl}/external.html`],
        domain: 'localhost',
        maxDepth: 1,
        logLevel: 'silent'
      };

      const result = await harvest(options);

      // Should only contain localhost links, no external ones
      for (const link of result.links) {
        expect(link.url).toMatch(/^http:\/\/localhost:/);
        expect(link.url).not.toMatch(/example\.com|google\.com|github\.com/);
      }
    }, 30000);

    it('normalizes URLs correctly', async () => {
      const options: HarvestOptions = {
        start: [`${fixtureUrl}/products/widget-b.html`],
        domain: 'localhost',
        maxDepth: 1,
        logLevel: 'silent'
      };

      const result = await harvest(options);

      // Look for normalized URLs (fragments removed, trailing slashes handled, etc.)
      const urls = result.links.map(link => link.url);
      
      // Should not contain any fragments
      expect(urls.every(url => !url.includes('#'))).toBe(true);
      
      // Should contain properly normalized URLs
      expect(urls).toContain(`${fixtureUrl}/`); // Query params preserved, fragment removed
    }, 30000);
  });

  describe('Deterministic behavior', () => {
    it('produces identical results for identical runs', async () => {
      const options: HarvestOptions = {
        start: [`${fixtureUrl}/`],
        domain: 'localhost',
        maxDepth: 2,
        maxPages: 20,
        logLevel: 'silent'
      };

      // Run harvest twice
      const result1 = await harvest(options);
      const result2 = await harvest(options);

      // Results should be identical (except timestamps)
      expect(result1.links).toEqual(result2.links);
      expect(result1.count).toBe(result2.count);
      expect(result1.domain).toBe(result2.domain);
      expect(result1.start).toEqual(result2.start);

      // URLs should be in same order
      const urls1 = result1.links.map(link => link.url);
      const urls2 = result2.links.map(link => link.url);
      expect(urls1).toEqual(urls2);
    }, 60000);
  });

  describe('Error handling', () => {
    it('throws error for missing start URLs', async () => {
      const options: HarvestOptions = {
        start: [],
        domain: 'localhost'
      };

      await expect(harvest(options)).rejects.toThrow('At least one start URL is required');
    });

    it('throws error for invalid start URLs', async () => {
      const options: HarvestOptions = {
        start: ['not-a-url'],
        domain: 'localhost'
      };

      await expect(harvest(options)).rejects.toThrow('Invalid start URL');
    });

    it('handles unreachable URLs gracefully', async () => {
      const options: HarvestOptions = {
        start: ['http://localhost:9999/nonexistent'],
        domain: 'localhost',
        maxDepth: 1,
        logLevel: 'silent'
      };

      // Should not throw, but return empty or minimal results
      const result = await harvest(options);
      expect(result).toHaveProperty('links');
      expect(Array.isArray(result.links)).toBe(true);
    }, 30000);
  });
});