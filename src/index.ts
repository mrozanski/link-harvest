import { LinkHarvester } from './crawler.js';
import { HarvestOptions, HarvestResult, LinkRecord, AnchorTextInfo } from './types.js';

// Re-export types for library users
export type { HarvestOptions, HarvestResult, LinkRecord, AnchorTextInfo };

/**
 * Main harvest function - library API entry point
 * 
 * @param options - Harvest configuration options
 *   - start: Array of starting URLs (required)
 *   - domain: Target domain (optional, inferred from first URL if missing)
 *   - maxDepth: Maximum crawl depth (default: 2)
 *   - maxPages: Maximum pages to crawl (default: 1000)
 *   - timeoutMs: Page load timeout in milliseconds (default: 15000)
 *   - settleMs: Additional wait time after page load (default: 500)
 *   - userAgent: Custom user agent string (default: Link-Harvest/1.0)
 *   - logLevel: Logging level (default: 'warn')
 *   - dedupe: Deduplication mode (default: 'none')
 *   - selector: CSS selector to target specific elements for link extraction (optional)
 *   - waitFor: DOM selector to wait for before starting link extraction (optional)
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
    timeoutMs: 15000,
    settleMs: 500,
    userAgent: "Link-Harvest/1.0 (+https://github.com/mrozanski/link-harvest)",
    logLevel: 'warn',
    dedupe: 'none',
    ...options
  };

  // Create harvester instance and run
  const harvester = new LinkHarvester(harvestOptions);
  return await harvester.harvest();
}