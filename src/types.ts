export interface HarvestOptions {
  start: string[];          // required
  domain?: string;          // optional; inferred from first seed if missing
  maxDepth?: number;        // default: 2
  maxPages?: number;        // default: 1000
  timeoutMs?: number;       // default: 45000
  settleMs?: number;        // default: 250
  userAgent?: string;       // default: fixed UA
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  dedupe?: 'none' | 'url' | 'full';  // default: 'none'
}

export interface AnchorTextInfo {
  text: string | null;      // the anchor text
  count: number;            // how many times this exact text appeared
  discoveredOn: string[];   // which pages had this specific anchor text
}

export interface LinkRecord {
  url: string;                    // normalized target URL
  discoveredOn: string[];         // array of referrer URLs where this link was found
  discoveryCount: number;         // total occurrences across all pages
  depth: number;                  // minimum depth where this URL was discovered
  anchorTexts: AnchorTextInfo[];  // all anchor text variations
  finalUrl?: string;              // after redirects
  status?: number | undefined;    // HTTP status
  contentType?: string | null;
}

export interface HarvestResult {
  start: string[];
  domain: string;
  options: HarvestOptions;
  count: number;
  crawlStarted: string;   // ISO timestamp
  crawlCompleted: string; // ISO timestamp
  links: LinkRecord[]; // sorted lexicographically by url, stable
}

export interface QueueItem {
  url: string;
  depth: number;
}

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';
export type OutputFormat = 'json' | 'csv';
export type DedupeMode = 'none' | 'url' | 'full';