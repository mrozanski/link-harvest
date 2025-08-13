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
  status?: number | undefined;        // HTTP status for finalUrl
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