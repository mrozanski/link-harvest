import { harvest } from '../src/index.js';

/**
 * Example: Harvest only product links from Gibson Mod Collection page
 * 
 * This example demonstrates how to use the new 'selector' and 'waitFor' options to target
 * specific elements on a page and extract only the links within those elements.
 * 
 * The selector targets the product grid container:
 * <div class="ais-hits-container page-width ais-results-as-block grid data-desktop-layout --mobile">
 * 
 * The waitFor ensures the page is fully loaded before attempting to extract links.
 */

async function harvestGibsonProductLinks() {
  try {
    console.log('Starting Gibson product link harvest...');
    
    const result = await harvest({
      start: ['http://gibson.com/collections/gibson-mod-collection'],
      maxDepth: 1, // Only crawl the initial page
      maxPages: 1, // Limit to 1 page
      waitFor: '.ais-hits-container', // Wait for the container to appear
      selector: '.ais-hits-container.page-width.ais-results-as-block.grid.data-desktop-layout.--mobile',
      logLevel: 'info'
    });

    console.log(`\nHarvest completed!`);
    console.log(`Found ${result.count} product links`);
    console.log(`Crawled from ${result.start.length} starting URL(s)`);
    console.log(`Domain: ${result.domain}`);
    console.log(`Crawl time: ${new Date(result.crawlCompleted).getTime() - new Date(result.crawlStarted).getTime()}ms`);
    
    console.log('\nProduct links found:');
    result.links.forEach((link, index) => {
      console.log(`${index + 1}. ${link.url}`);
      if (link.anchorTexts.length > 0) {
        console.log(`   Text: "${link.anchorTexts[0].text}"`);
      }
    });

  } catch (error) {
    console.error('Harvest failed:', error);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  harvestGibsonProductLinks();
}
