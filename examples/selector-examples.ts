import { harvest } from '../src/index.js';

/**
 * Examples of using the 'selector' option for targeted link extraction
 * 
 * This file demonstrates various CSS selector patterns you can use to
 * extract links from specific parts of web pages.
 */

// Example 1: Gibson product grid (specific class combination)
async function gibsonProductExample() {
  console.log('\n=== Gibson Product Links Example ===');
  
  const result = await harvest({
    start: ['http://gibson.com/collections/gibson-mod-collection'],
    maxDepth: 1,
    maxPages: 1,
    selector: '.ais-hits-container.page-width.ais-results-as-block.grid.data-desktop-layout.--mobile',
    logLevel: 'info'
  });
  
  console.log(`Found ${result.count} product links`);
}

// Example 2: Generic product grid (common patterns)
async function genericProductGridExample() {
  console.log('\n=== Generic Product Grid Examples ===');
  
  // Common selectors for product grids
  const selectors = [
    '.product-grid',
    '.products-container',
    '.catalog-items',
    '[data-testid="product-list"]',
    '.search-results .item',
    '.ais-hits-container', // Algolia search results
    '.product-listing'
  ];
  
  console.log('Common product grid selectors:');
  selectors.forEach(selector => {
    console.log(`  - ${selector}`);
  });
}

// Example 3: Content area (excluding navigation/footer)
async function contentAreaExample() {
  console.log('\n=== Content Area Examples ===');
  
  const selectors = [
    'main',                    // Main content area
    '.content',                // Generic content class
    '.main-content',           // Common content class
    'article',                 // Article content
    '.post-content',           // Blog post content
    '.page-content',           // Page content
    '#content',                // Content by ID
    '.container:not(.header):not(.footer):not(.nav)' // Exclude common non-content areas
  ];
  
  console.log('Content area selectors (excluding nav/footer):');
  selectors.forEach(selector => {
    console.log(`  - ${selector}`);
  });
}

// Example 4: Search results
async function searchResultsExample() {
  console.log('\n=== Search Results Examples ===');
  
  const selectors = [
    '.search-results',
    '.results-container',
    '.ais-hits',              // Algolia
    '.search-hits',           // Elasticsearch
    '.results-list',
    '[data-testid="search-results"]'
  ];
  
  console.log('Search results selectors:');
  selectors.forEach(selector => {
    console.log(`  - ${selector}`);
  });
}

// Example 5: E-commerce specific
async function ecommerceExample() {
  console.log('\n=== E-commerce Examples ===');
  
  const selectors = [
    '.product-list',
    '.catalog-grid',
    '.item-grid',
    '.product-container',
    '.listing-container',
    '.search-results .product',
    '.category-products'
  ];
  
  console.log('E-commerce specific selectors:');
  selectors.forEach(selector => {
    console.log(`  - ${selector}`);
  });
}

// Example 6: Blog/News content
async function blogContentExample() {
  console.log('\n=== Blog/News Content Examples ===');
  
  const selectors = [
    '.post-list',
    '.articles',
    '.news-items',
    '.blog-posts',
    '.content-list',
    '.entry-list'
  ];
  
  console.log('Blog/News content selectors:');
  selectors.forEach(selector => {
    console.log(`  - ${selector}`);
  });
}

// Example 7: Advanced selector patterns
async function advancedSelectorsExample() {
  console.log('\n=== Advanced Selector Patterns ===');
  
  const patterns = [
    // Multiple selectors (OR logic)
    '.product-grid, .catalog-items, .search-results',
    
    // Nested selectors
    '.main-content .product-list',
    
    // Attribute selectors
    '[data-component="product-list"]',
    '[class*="product"]', // Contains "product" in class name
    
    // Pseudo-classes
    '.product-grid:not(.featured)',
    
    // Complex combinations
    'main .content:not(.sidebar):not(.navigation) .product-item'
  ];
  
  console.log('Advanced selector patterns:');
  patterns.forEach(pattern => {
    console.log(`  - ${pattern}`);
  });
}

// Example 8: How to find the right selector
async function findingSelectorsExample() {
  console.log('\n=== How to Find the Right Selector ===');
  
  console.log('1. Open the target page in your browser');
  console.log('2. Right-click on the element containing the links you want');
  console.log('3. Select "Inspect Element" or "Inspect"');
  console.log('4. Look at the HTML structure and identify unique classes/IDs');
  console.log('5. Test your selector in the browser console:');
  console.log('   document.querySelector("your-selector")');
  console.log('6. Verify it contains the expected links:');
  console.log('   document.querySelector("your-selector").querySelectorAll("a").length');
  
  console.log('\nCommon inspection tips:');
  console.log('- Look for semantic class names like "product-list", "search-results"');
  console.log('- Check for data attributes like data-testid, data-component');
  console.log('- Avoid generic classes like "container", "wrapper" that might be too broad');
  console.log('- Test with :not() to exclude unwanted areas');
}

// Run all examples
async function runAllExamples() {
  try {
    console.log('Link Harvest Selector Examples');
    console.log('==============================');
    
    await genericProductGridExample();
    await contentAreaExample();
    await searchResultsExample();
    await ecommerceExample();
    await blogContentExample();
    await advancedSelectorsExample();
    await findingSelectorsExample();
    
    console.log('\n=== Usage Example ===');
    console.log('To use a selector with the harvest function:');
    console.log(`
const result = await harvest({
  start: ['https://example.com'],
  selector: '.product-grid', // Your CSS selector here
  maxDepth: 1,
  maxPages: 1
});
    `);
    
  } catch (error) {
    console.error('Examples failed:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
