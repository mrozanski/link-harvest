# Link Harvest - Phase 1.1

A deterministic link harvesting tool for QA and website migration testing.

## Overview

Link Harvest crawls websites using Playwright and extracts internal links with metadata for quality assurance testing. This Phase 1.1 implementation provides the core functionality needed for n8n integration.

## Features

- **Deterministic crawling**: Identical inputs produce identical outputs
- **BFS traversal**: Breadth-first search with lexicographic URL sorting
- **Internal links only**: Filters to same-host links
- **Rich metadata**: Depth, anchor text, HTTP status, content type
- **Multiple output formats**: JSON (default) and CSV
- **CLI and library API**: Use as command-line tool or Node.js module

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Build the project
npm run build

# Link for local development
npm run link-local
```

## Usage

### Command Line Interface

```bash
# Basic crawl
link-harvest --start https://example.com --domain example.com

# Deep crawl with CSV output
link-harvest --start https://example.com --max-depth 3 --output csv

# Save to file with verbose logging
link-harvest --start https://example.com --out-file results.json --log-level info

# Deduplicated crawl for clean URL list
link-harvest --start https://example.com --dedupe full --output csv
```

### Library API

```typescript
import { harvest } from '@dotsur/link-harvest';

const result = await harvest({
  start: ['https://example.com'],
  domain: 'example.com',
  maxDepth: 2,
  maxPages: 1000,
  dedupe: 'url'  // Enable deduplication by URL + anchor text
});

console.log(`Found ${result.count} links`);
console.log(`First link discovered on: ${result.links[0].discoveredOn.join(', ')}`);
```

## Deduplication Modes

Link Harvest supports three deduplication modes to handle different use cases:

### `--dedupe none` (Default)
Current behavior - every link occurrence is a separate record:
```bash
link-harvest --start https://example.com --dedupe none
```
- Each link discovery creates a separate record
- Shows exactly where and how each link was found
- Useful for detailed analysis of link patterns

### `--dedupe url` 
Groups by URL + anchor text combination:
```bash
link-harvest --start https://example.com --dedupe url
```
- Groups identical URL + anchor text pairs
- Shows discovery count and all referrer pages
- Useful for understanding link variations and anchor text usage

### `--dedupe full`
Groups by URL only (maximum deduplication):
```bash
link-harvest --start https://example.com --dedupe full
```
- One record per unique URL
- Aggregates all anchor text variations
- Useful for getting a clean list of unique URLs

### Enhanced Output Schema

All modes use an enhanced schema with additional metadata:

```typescript
interface LinkRecord {
  url: string;                    // normalized target URL
  discoveredOn: string[];         // array of referrer URLs where this link was found
  discoveryCount: number;         // total occurrences across all pages
  depth: number;                  // minimum depth where this URL was discovered
  anchorTexts: AnchorTextInfo[];  // all anchor text variations
  finalUrl?: string;              // after redirects
  status?: number;                // HTTP status
  contentType?: string | null;
}

interface AnchorTextInfo {
  text: string | null;      // the anchor text
  count: number;            // how many times this exact text appeared
  discoveredOn: string[];   // which pages had this specific anchor text
}
```

### CSV Output by Mode

The CSV format adapts based on deduplication mode:

| Mode | Columns | Behavior |
|------|---------|----------|
| `none` | `url,discoveredOn,depth,anchorText,finalUrl,status,contentType` | One row per occurrence |
| `url` | `url,discoveryCount,depth,anchorText,finalUrl,status,contentType` | One row per URL+anchor combination |
| `full` | `url,discoveryCount,depth,finalUrl,status,contentType` | One row per unique URL |

## CLI Options

- `--start <url>` - Seed URL(s) to start crawling from (required)
- `--domain <hostname>` - Primary host for same-host scope
- `--max-depth <n>` - Maximum crawl depth (default: 2)
- `--max-pages <n>` - Hard cap on pages to process (default: 1000)
- `--timeout-ms <ms>` - Page navigation timeout (default: 5000)
- `--settle-ms <ms>` - Extra wait after networkidle (default: 250)
- `--output <json|csv>` - Output format (default: json)
- `--out-file <path>` - Write to file instead of stdout
- `--log-level <level>` - Logging level: silent, error, warn, info, debug (default: warn)
- `--user-agent <string>` - Custom user agent string
- `--dedupe <none|url|full>` - Deduplication mode (default: none)
- `--selector <css-selector>` - CSS selector to target specific elements for link extraction (optional)
- `--wait-for <css-selector>` - DOM selector to wait for before starting link extraction (optional)

## Targeted Link Extraction

The `--selector` option allows you to extract links only from specific parts of a webpage, ignoring navigation, footers, and other unwanted areas. This is particularly useful for e-commerce sites, search results, and content-focused pages.

### Basic Usage

```bash
# Extract only product links from a specific container
link-harvest --start https://example.com --selector ".product-grid"

# Target search results while ignoring navigation
link-harvest --start https://example.com --selector ".search-results"

# Use multiple selectors (OR logic)
link-harvest --start https://example.com --selector ".main-content, .content-area"
```

### Common Selector Patterns

**Product Grids:**
```bash
# Gibson Mod Collection (specific)
link-harvest --start http://gibson.com/collections/gibson-mod-collection \
  --selector ".ais-hits-container.page-width.ais-results-as-block.grid.data-desktop-layout.--mobile"

# Generic product selectors
link-harvest --start https://shop.example.com --selector ".product-list"
link-harvest --start https://shop.example.com --selector ".catalog-items"
```

**Content Areas (excluding navigation):**
```bash
# Main content only
link-harvest --start https://blog.example.com --selector "main"

# Content excluding sidebar/navigation
link-harvest --start https://example.com --selector ".content:not(.sidebar):not(.nav)"
```

**Search Results:**
```bash
# Algolia search results
link-harvest --start https://example.com --selector ".ais-hits-container"

# Generic search results
link-harvest --start https://example.com --selector ".search-results"
```

### Finding the Right Selector

1. **Inspect the page**: Right-click on the element containing your target links
2. **Look for unique identifiers**: Classes, IDs, or data attributes that identify the container
3. **Test in browser console**: `document.querySelector("your-selector")`
4. **Verify link count**: `document.querySelector("your-selector").querySelectorAll("a").length`

### Library API Usage

```typescript
import { harvest } from '@dotsur/link-harvest';

const result = await harvest({
  start: ['https://gibson.com/collections/gibson-mod-collection'],
  selector: '.ais-hits-container.page-width.ais-results-as-block.grid.data-desktop-layout.--mobile',
  maxDepth: 1,
  maxPages: 1
});

console.log(`Found ${result.count} product links`);
```

## Waiting for Dynamic Content

The `--wait-for` option allows you to specify a DOM selector that the crawler should wait for before starting to extract links. This is particularly useful for sites with client-side rendering or dynamic content loading.

### Basic Usage

```bash
# Wait for a specific element before extracting links
link-harvest --start https://example.com --wait-for ".content-loaded"

# Combine with selector for targeted extraction
link-harvest --start https://example.com --wait-for ".page-ready" --selector ".product-grid"
```

### Use Cases

1. **Client-side rendered content**: Wait for JavaScript to populate the page
2. **Lazy-loaded sections**: Wait for specific containers to appear
3. **Progressive loading**: Wait for key elements before proceeding
4. **Custom loading states**: Wait for your app's "ready" indicator

### Library API Usage

```typescript
import { harvest } from '@dotsur/link-harvest';

const result = await harvest({
  start: ['https://example.com'],
  waitFor: '.content-loaded',  // Wait for this element
  selector: '.product-grid',   // Then extract from this container
  maxDepth: 1
});
```

### How It Works

1. **Page loads**: Crawler waits for `domcontentloaded` event
2. **Wait for element**: If `--wait-for` is specified, waits for that selector
3. **Extract links**: Proceeds with link extraction (with or without `--selector`)
4. **Fallback behavior**: If no `--wait-for` specified, continues with current logic

## Development

### Local Testing

```bash
# Start fixture server
npm run test:fixtures

# Test CLI locally
link-harvest --start http://localhost:3000 --domain localhost --max-depth 2

# Run tests
npm test

# Watch for changes
npm run dev
```

### Project Structure

```
/src
  /cli.ts             # CLI entry point
  /index.ts           # Library entry (export harvest)
  /crawler.ts         # Main crawler logic
  /browser.ts         # Playwright wrapper
  /normalize.ts       # URL normalization
  /types.ts           # TypeScript interfaces
/test
  /fixtures/          # Static test site
  *.test.ts          # Tests
```

## Example Output

### JSON (default)
```json
{
  "start": ["https://example.com"],
  "domain": "example.com",
  "count": 123,
  "crawlStarted": "2025-08-13T10:30:00Z",
  "crawlCompleted": "2025-08-13T10:32:15Z",
  "links": [
    {
      "url": "https://example.com/about",
      "discoveredOn": "https://example.com/",
      "depth": 1,
      "anchorText": "About",
      "finalUrl": "https://example.com/about",
      "status": 200,
      "contentType": "text/html; charset=utf-8"
    }
  ]
}
```

### CSV
```csv
url,discoveredOn,depth,anchorText,finalUrl,status,contentType
https://example.com/about,https://example.com/,1,About,https://example.com/about,200,text/html; charset=utf-8
```

## Phase 1.1.1 Deliverable Status

✅ **All Phase 1.1 + Deduplication requirements completed:**

**Core Phase 1.1:**
- TypeScript project with CLI and library API
- Deterministic BFS crawler using Playwright only  
- CLI command `link-harvest` with all Phase 1 options
- JSON/CSV output formats with stable sorting
- Test fixture site for validation
- Local development setup with `npm link` capability
- Unit and integration tests
- URL normalization (7-step process)
- Same-host internal link filtering
- Rich metadata collection

**Phase 1.1.1 Deduplication Enhancement:**
- Three deduplication modes: `none`, `url`, `full`
- Enhanced schema with arrays and metadata aggregation
- Adaptive CSV output formats for each mode
- Backward-compatible defaults (`dedupe: 'none'`)
- Rich anchor text analysis and discovery tracking

**Ready for n8n integration and Phase 1.2 development.**

## License

AGPL-3.0-or-later