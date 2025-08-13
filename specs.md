# QA Link Harvest Module (Node.js) — **Phased Implementation Spec**

> Purpose: a **deterministic** CLI + library that crawls a site (SSR + SPA) and returns a canonicalized, de-duplicated list of **internal links** with metadata for QA.

---

# **PHASE 1: Core Crawler (MVP for n8n)**

> **Goal**: Get the essential link harvesting working with n8n integration. Focus on deterministic crawling with Playwright only.

---

## 1) Scope & Goals (Phase 1)

**Goals**

* Crawl from one or more seed URLs, follow **internal** links only, and emit:
  * canonicalized URL list (unique)
  * per-URL metadata (depth, final URL after redirects, status, content type, referrers, anchor texts)
* **Deterministic** behavior given the same inputs/environment.
* Support **SPA rendering** with Playwright + Chromium.
* Work standalone (CLI) and as a module (JS/TS API).
* **Primary use case**: Easy integration with n8n Execute Command node.

**Phase 1 Non-Goals**

* HTTP-only mode (use Playwright for everything in MVP)
* UI interaction scenarios (Phase 2)
* Advanced capture modes (screenshots, HAR files)
* Complex configuration files

---

## 2) Determinism Definition

Given identical:

* inputs (seeds, depth, allow/deny rules),
* module version & dependencies,
* network content (same responses),
* runtime options (timeouts, UA, viewport, locale),

…the output **set of URLs** is identical, and the **ordering** of emitted results is stable.

**Enforcements**

* BFS traversal; always **sort** discovered URLs lexicographically before enqueueing.
* Fixed **user agent**, viewport, timezone, locale.
* Disable browser cache.
* Use `waitUntil: 'networkidle'` + fixed additional settle delay.
* **Concurrency = 1** in Phase 1 for maximum determinism.

---

## 3) Architecture Overview (Phase 1)

* **Renderer**: Playwright (Chromium) only - handles both SPA and SSR
* **Crawler**: Deterministic BFS queue with:
  * `visited` set, `enqueued` set,
  * per-page link extraction,
  * scope filters & normalization
* **Normalizer**: Canonical URL function (see §7).
* **Output**: JSON (primary), CSV (optional). Stable, sorted.

---

## 4) Runtime & Dependencies (Phase 1)

* **Node**: ≥ 20 LTS
* **Core deps**:
  * `playwright` (Chromium only)
  * `yargs` or `commander` (CLI)
  * `pino` for structured logging
* **Dev**:
  * TypeScript, ESLint, Prettier, Vitest

---

## 5) CLI Specification (Phase 1)

**Package & Command setup for n8n compatibility:**

```bash
# Installation options for teams:
npm install @dotsur/link-harvest                    # local to project
npm install -g @dotsur/link-harvest                 # global install

# Usage in n8n Execute Command:
npx @dotsur/link-harvest --start {{$json.start_url}} --domain {{$json.domain}} --max-depth {{$json.max_depth}}

# Alternative for n8n (most reliable):
node ./node_modules/.bin/link-harvest --start {{$json.start_url}} --domain {{$json.domain}} --max-depth {{$json.max_depth}}
```

**Command name**: `link-harvest`

**Synopsis**

```
link-harvest --start https://example.com --domain example.com [options]
```

**Phase 1 Options (Essential)**

* `--start <url>` (repeatable) — seed URL(s)
* `--domain <hostname>` — primary host for "same-host" scope (default derived from first seed)
* `--max-depth <n>` (default: 2)
* `--max-pages <n>` hard cap (default: 1000)
* `--timeout-ms <ms>` page nav timeout (default: 45000)
* `--settle-ms <ms>` extra wait after networkidle (default: 250)
* `--output <json|csv>` (default: json)
* `--out-file <path>` write to file; otherwise print to stdout
* `--log-level <silent|error|warn|info|debug>` (default: warn)
* `--user-agent <string>` (default: fixed UA)

**Phase 1 Deferred Options** (implement in Phase 2):
* `--scope` (custom scoping rules)
* `--include/exclude` regex patterns
* `--robots` (robots.txt support)
* `--sitemap` (sitemap.xml integration)
* `--concurrency` (keep at 1 for Phase 1)
* `--render` mode selection
* Cookie/header support

**Exit codes**

* `0` success, `>0` failure; never partial garbage on stdout.

**Example n8n Execute Command:**
```
Command: npx @dotsur/link-harvest
Parameters: --start {{$json.start_url}} --domain {{$json.domain}} --max-depth {{$json.max_depth}} --output json --log-level error
```

---

## 6) Library API (TypeScript - Phase 1)

```ts
export interface HarvestOptions {
  start: string[];          // required
  domain?: string;          // optional; inferred from first seed if missing
  maxDepth?: number;        // default: 2
  maxPages?: number;        // default: 1000
  timeoutMs?: number;       // default: 45000
  settleMs?: number;        // default: 250
  userAgent?: string;       // default: fixed UA
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

export interface LinkRecord {
  url: string;            // normalized target
  discoveredOn: string;   // normalized referrer
  depth: number;
  anchorText?: string | null;
  finalUrl?: string;      // after redirects
  status?: number;        // HTTP status for finalUrl
  contentType?: string | null;
}

export interface HarvestResult {
  start: string[];
  domain: string;
  options: HarvestOptions;
  count: number;
  links: LinkRecord[]; // sorted lexicographically by url, stable
}

export async function harvest(options: HarvestOptions): Promise<HarvestResult>;
```

---

## 7) URL Normalization Rules (Phase 1)

Apply in this order:

1. Resolve relative URLs against the **current page URL**.
2. Drop `hash` fragments.
3. Lowercase the **scheme** and **hostname** only.
4. Remove default ports (`:80` for http, `:443` for https).
5. Normalize path: resolve `.` and `..`.
6. Remove trailing slashes (except for the origin root).
7. **Simple same-host check**: `new URL(target).hostname === domain`

**Phase 1 Simplifications:**
* No query param manipulation (preserve as-is)
* No tracking parameter removal
* No complex scope rules (same-host only)

---

## 8) Extraction Rules (Phase 1)

On each visited HTML page:

* Collect `a[href]` elements only
* For each element:
  * Extract `href` → normalize
  * Record `anchorText` = `textContent.trim()` (first 100 chars)
  * Record `discoveredOn` = normalized page URL
* **Sorting**: sort all newly discovered **internal** URLs (lexicographically) before enqueueing.
* **De-dupe**: keep first occurrence of each URL per page.

---

## 9) Crawl Strategy (Phase 1)

**Traversal**

* BFS with a queue of `{url, depth}`.
* `visited` set keyed by normalized URL.
* **Concurrency = 1** (sequential processing).
* If `depth < maxDepth`, enqueue discovered links.

**Ordering**

* At initialization: **sort** start URLs and enqueue.
* For each page: After extraction & filtering → **sort** newly discovered → enqueue.

**Error handling**

* On navigation error/timeouts: log and continue (don't retry in Phase 1).
* Hard stop on `maxPages` reached.

---

## 10) Rendering (Phase 1 - Playwright Only)

* **Playwright/Chromium** for all pages:
  * `waitUntil: 'networkidle'`, then wait `settleMs`.
  * Fixed UA: `"Link-Harvest/1.0 (+https://github.com/mrozanski/link-harvest)"`
  * Viewport: `1366x768`
  * Locale: `en-US`, timezone: `UTC`
  * Disable cache: `context.addInitScript(() => { /* disable cache */ })`
  * No cookie support in Phase 1

---

## 11) Output Format (Phase 1)

**JSON (default)**:

```json
{
  "start": ["https://example.com"],
  "domain": "example.com",
  "options": { "maxDepth": 2, "maxPages": 1000, "timeoutMs": 45000 },
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

**CSV** (for n8n Spreadsheet node):

```
url,discoveredOn,depth,anchorText,finalUrl,status,contentType
```

**Ordering**: `links` sorted by `url` (lexicographic).

---

## 12) n8n Integration (Phase 1)

**Execute Command Node Configuration:**
```
Command: npx @dotsur/link-harvest
Parameters: --start {{$json.start_url}} --domain {{$json.domain}} --max-depth {{$json.max_depth}} --output json --log-level error
```

**Input from previous n8n node:**
```json
{
  "start_url": "https://example.com",
  "domain": "example.com",
  "max_depth": 2
}
```

**Code Node (parse output):**
```javascript
// Parse stdout JSON
const result = JSON.parse($json.stdout);

// Simple validation
if (!result.links || !Array.isArray(result.links)) {
  throw new Error('Invalid harvest result');
}

// Transform for downstream nodes
return {
  ...result,
  summary: {
    total_links: result.count,
    crawl_duration_seconds: Math.round(
      (new Date(result.crawlCompleted) - new Date(result.crawlStarted)) / 1000
    )
  }
};
```

---

## 13) Testing Strategy (Phase 1)

* **Unit tests**:
  * URL normalization (basic cases)
  * Same-host filtering
  * Link extraction from sample HTML
* **Integration**:
  * Local fixture site using `http-server`
  * Golden snapshots: expected `links` JSON for known inputs
  * Determinism test: run twice → identical output
* **E2E**:
  * CLI invocations against fixtures
  * CSV output validation

Minimal Effective Fixture Structure

```
/test/fixtures/
├── index.html          # Main page with nav links
├── about.html          # Simple page with back links  
├── products/
│   ├── index.html      # Category page with product links
│   ├── widget-a.html   # Product page
│   └── widget-b.html   # Another product
└── external.html       # Page with external links (for filtering tests)
```

---

## 14) Directory Layout (Phase 1)

```
/link-harvest
  /src
    /cli.ts             // CLI entry point
    /index.ts           // library entry (export harvest)
    /crawler.ts         // main crawler logic
    /browser.ts         // Playwright wrapper
    /normalize.ts       // URL normalization
    /types.ts           // TypeScript interfaces
  /test
    /fixtures/          // static test site
    *.test.ts
  package.json          // bin: "link-harvest": "./dist/cli.js"
  tsconfig.json
  README.md
```

---

## 15) Implementation Checklist

### Phase 1.1 - Core Crawler CLI & Library

- [ ] **Project Setup**: TypeScript, build system, dependencies
- [ ] **Core Library**: `harvest()` function with BFS logic
- [ ] **CLI Interface**: `link-harvest` command with all Phase 1 options
- [ ] **Fixture Site**: Simple test pages with known link structure  
- [ ] **Tests**: Unit tests + integration tests with fixtures
- [ ] **Local Commands**: `npm link` + CLI works locally
- [ ] **Documentation**: README with local development instructions
- [ ] **Output Validation**: JSON/CSV formats match specs exactly

**Deliverable:** "Run `npm link` and the CLI works locally with deterministic output"

### **Development Workflow (Phase 1.1)**

**Local Development Setup (Claude Code should implement):**

```json
// package.json scripts section
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "npm run test:fixtures & vitest",
    "test:fixtures": "serve test/fixtures -p 3000 -s &",
    "clean": "rm -rf dist/",
    "link-local": "npm run build && npm link"
  }
}
```

**Local Testing Commands:**
```bash
# Development cycle
npm run build
npm link                    # Makes 'link-harvest' available globally
link-harvest --help         # Test CLI locally

# Test with fixtures
npm run test:fixtures       # Starts fixture server on :3000
link-harvest --start http://localhost:3000 --domain localhost --max-depth 2
```

**Pre-publish Checklist:**
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] `npm link && link-harvest --help` works
- [ ] CLI produces valid JSON output
- [ ] Fixture tests deterministic (run twice, identical results)

**Do NOT publish to npm yet** - this will be done manually after local testing.


### Phase 1.2 - n8n Integration & Execute Command Node

- [ ] n8n Execute Command testing

---

# **PHASE 2: Advanced Features**

> **Goal**: Add the sophisticated features that make this a comprehensive QA tool.

---

## 16) Phase 2 Additions

**Enhanced CLI Options:**
* `--scope <same-host|same-site|custom>`
* `--include <regex>` / `--exclude <regex>` (repeatable)
* `--robots <true|false>` respect robots.txt
* `--sitemap <auto|off|url>` sitemap.xml integration
* `--concurrency <n>` parallel processing
* `--delay-ms <n>` politeness delay
* `--cookies-file <path>` JSON array of cookies
* `--headers <json>` custom request headers
* `--ignore-ext <csv>` skip file extensions
* `--retry <n>` retry failed pages

**HTTP Mode:**
* Add `undici` dependency
* `--render <browser|http|auto>` mode selection
* Fast path for SSR pages and sitemaps
* Hybrid mode: HTTP for known static content, browser for SPA

**Enhanced Output:**
* `--save-screenshots <dir>` 
* `--save-html <dir>`
* Additional metadata fields (canonical URLs, nofollow flags)

**Library API Extensions:**
```ts
export interface HarvestOptions {
  // ... Phase 1 options plus:
  scope?: 'same-host' | 'same-site' | 'custom';
  include?: RegExp[];
  exclude?: RegExp[];
  robots?: boolean;
  sitemap?: 'auto' | 'off' | string;
  concurrency?: number;
  render?: 'browser' | 'http' | 'auto';
  cookies?: CookieParam[];
  headers?: Record<string, string>;
  // ... etc
}

export interface LinkRecord {
  // ... Phase 1 fields plus:
  nofollow?: boolean;
  canonicalUrl?: string | null;
  redirectChain?: string[];
}
```

---

# **PHASE 3: UI Interaction & Scenarios**

> **Goal**: Support SPA filter testing and complex user flows.

---

## 17) Scenario Runner

**New CLI Command:**
```bash
link-harvest scenario --file filters.yml --mode ui --output json
```

**Scenario File (YAML):**
```yaml
name: "Product search with filters"
startUrl: "https://shop.example.com/search"
params:
  category: "electronics"
  price_min: "100"
  price_max: "500"

steps:
  - waitFor: { selector: "#category-select" }
  - select: { selector: "#category-select", label: "Electronics" }
  - fill: { selector: "#price-min", value: "100" }
  - fill: { selector: "#price-max", value: "500" }
  - click: { selector: "#search-button" }
  - waitForNetworkIdle: {}

harvest:
  include: ["^https://shop\\.example\\.com/"]
  resultSelector: ".product-card"

assertions:
  - type: "count"
    countSelector: ".results-count"
  - type: "no-dup"
  - type: "param-roundtrip"
```

**Interaction Primitives:**
* `waitFor`, `click`, `type`, `fill`, `select`, `check/uncheck`
* `waitForNetworkIdle`, `scrollIntoView`, `press`
* Built-in assertions for count, sorting, deduplication

**Enhanced Output:**
```json
{
  "scenario": "Product search with filters",
  "mode": "ui",
  "startUrl": "https://shop.example.com/search",
  "finalUrl": "https://shop.example.com/search?category=electronics&price_min=100",
  "assertions": [
    { "type": "count", "pass": true, "observed": 45, "expected": 45 }
  ],
  "harvest": { "count": 45, "depth": 0 },
  "links": [...]
}
```

---

# **IMPLEMENTATION PRIORITY**

1. **Phase 1**: Core crawler + n8n integration
2. **Phase 2**: Advanced features + HTTP mode
3. **Phase 3**: UI scenarios (as needed)

---

# **ACCEPTANCE CRITERIA**

**Phase 1:**
- [ ] Can crawl a test site and produce deterministic JSON output
- [ ] Works with n8n Execute Command node
- [ ] Handles both SPA and SSR pages via Playwright
- [ ] Produces CSV output compatible with n8n Spreadsheet node
- [ ] Passes determinism test (identical runs produce identical output)

**Phase 2:**
- [ ] HTTP mode significantly faster for static content
- [ ] Robots.txt and sitemap.xml integration working
- [ ] Advanced filtering (include/exclude patterns) working
- [ ] Parallel processing with deterministic output

**Phase 3:**
- [ ] Can execute UI scenarios from YAML files
- [ ] Assertions validate expected behavior
- [ ] Both `params` and `ui` modes produce consistent results

---