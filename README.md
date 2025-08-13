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
```

### Library API

```typescript
import { harvest } from '@dotsur/link-harvest';

const result = await harvest({
  start: ['https://example.com'],
  domain: 'example.com',
  maxDepth: 2,
  maxPages: 1000
});

console.log(`Found ${result.count} links`);
```

## CLI Options

- `--start <url>` - Seed URL(s) to start crawling from (required)
- `--domain <hostname>` - Primary host for same-host scope
- `--max-depth <n>` - Maximum crawl depth (default: 2)
- `--max-pages <n>` - Hard cap on pages to process (default: 1000)
- `--timeout-ms <ms>` - Page navigation timeout (default: 45000)
- `--settle-ms <ms>` - Extra wait after networkidle (default: 250)
- `--output <json|csv>` - Output format (default: json)
- `--out-file <path>` - Write to file instead of stdout
- `--log-level <level>` - Logging level: silent, error, warn, info, debug (default: warn)
- `--user-agent <string>` - Custom user agent string

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

## Phase 1.1 Deliverable Status

✅ **All Phase 1.1 requirements completed:**

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

**Ready for n8n integration and Phase 1.2 development.**

## License

AGPL-3.0-or-later