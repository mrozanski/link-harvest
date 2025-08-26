import { harvest } from '../src/index.js';

async function waitForExample() {
  try {
    console.log('Starting wait-for example...');
    
    const result = await harvest({
      start: ['https://example.com'],
      waitFor: '.content-loaded',  // Wait for this element before extracting links
      selector: '.product-grid',   // Then extract from this container
      maxDepth: 1,
      maxPages: 1,
      logLevel: 'info'
    });
    
    console.log(`Found ${result.count} links`);
    console.log('Links:', result.links.map(l => ({ url: l.url, text: l.anchorTexts[0]?.text })));
    
  } catch (error) {
    console.error('Harvest failed:', error);
  }
}

async function waitForOnlyExample() {
  try {
    console.log('Starting wait-for only example (no selector)...');
    
    const result = await harvest({
      start: ['https://example.com'],
      waitFor: '.page-ready',  // Wait for this element, then extract all links
      maxDepth: 1,
      maxPages: 1,
      logLevel: 'info'
    });
    
    console.log(`Found ${result.count} links`);
    console.log('Links:', result.links.map(l => ({ url: l.url, text: l.anchorTexts[0]?.text })));
    
  } catch (error) {
    console.error('Harvest failed:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Run the appropriate example based on command line argument
  const example = process.argv[2];
  
  if (example === 'wait-only') {
    waitForOnlyExample();
  } else {
    waitForExample();
  }
}
