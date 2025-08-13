import { LinkHarvester } from './crawler.js';
import { HarvestOptions, HarvestResult, LinkRecord, AnchorTextInfo } from './types.js';

// Re-export types for library users
export type { HarvestOptions, HarvestResult, LinkRecord, AnchorTextInfo };

/**
 * Main harvest function - library API entry point
 * 
 * @param options - Harvest configuration options
 * @returns Promise resolving to harvest results with links and metadata
 */
export async function harvest(options: HarvestOptions): Promise<HarvestResult> {
  // Validate required options
  if (!options.start || options.start.length === 0) {
    throw new Error('At least one start URL is required');
  }

  // Validate start URLs
  for (const url of options.start) {
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid start URL: ${url}`);
    }
  }

  // Set defaults for optional parameters
  const harvestOptions: HarvestOptions = {
    maxDepth: 2,
    maxPages: 1000,
    timeoutMs: 45000,
    settleMs: 250,
    userAgent: "Link-Harvest/1.0 (+https://github.com/mrozanski/link-harvest)",
    logLevel: 'warn',
    dedupe: 'none',
    ...options
  };

  // Create harvester instance and run
  const harvester = new LinkHarvester(harvestOptions);
  return await harvester.harvest();
}