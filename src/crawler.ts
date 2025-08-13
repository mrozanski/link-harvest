import pino from 'pino';
import { HarvestOptions, HarvestResult, QueueItem } from './types.js';
import { normalizeUrl, isSameHost, extractDomainFromUrl } from './normalize.js';
import { BrowserManager } from './browser.js';
import { RawLinkData, deduplicateLinks } from './deduplication.js';

export class LinkHarvester {
  private logger: pino.Logger;
  private browserManager: BrowserManager;
  private visited = new Set<string>();
  private enqueued = new Set<string>();
  private queue: QueueItem[] = [];
  private rawLinks: RawLinkData[] = [];
  private domain: string = '';
  private startTime: Date = new Date();

  constructor(private options: HarvestOptions) {
    // Initialize logger
    this.logger = pino({
      level: options.logLevel || 'warn',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    });

    this.browserManager = new BrowserManager();
  }

  async harvest(): Promise<HarvestResult> {
    this.startTime = new Date();
    
    try {
      await this.initialize();
      await this.crawl();
      
      return this.buildResult();
    } finally {
      await this.cleanup();
    }
  }

  private async initialize(): Promise<void> {
    // Set domain from options or derive from first seed URL
    if (this.options.domain) {
      this.domain = this.options.domain;
    } else {
      this.domain = extractDomainFromUrl(this.options.start[0]);
    }

    // Initialize browser with deterministic settings
    await this.browserManager.initialize(
      this.options.userAgent,
      this.options.logLevel
    );

    // Sort start URLs lexicographically and enqueue them
    const sortedStartUrls = [...this.options.start].sort();
    
    for (const startUrl of sortedStartUrls) {
      try {
        const normalizedUrl = normalizeUrl(startUrl, startUrl);
        if (isSameHost(normalizedUrl, this.domain)) {
          this.enqueueUrl(normalizedUrl, 0);
        } else {
          this.logger.warn(`Skipping start URL not matching domain: ${startUrl}`);
        }
      } catch (error) {
        this.logger.error(`Invalid start URL: ${startUrl} - ${error}`);
      }
    }

    this.logger.info(`Initialized crawler with domain: ${this.domain}, queue size: ${this.queue.length}`);
  }

  private async crawl(): Promise<void> {
    const maxPages = this.options.maxPages || 1000;
    const maxDepth = this.options.maxDepth || 2;
    const timeoutMs = this.options.timeoutMs || 45000;
    const settleMs = this.options.settleMs || 250;
    
    let pagesProcessed = 0;

    // BFS traversal with concurrency = 1 for determinism
    while (this.queue.length > 0 && pagesProcessed < maxPages) {
      const item = this.queue.shift()!;
      
      // Skip if already visited
      if (this.visited.has(item.url)) {
        continue;
      }

      this.visited.add(item.url);
      pagesProcessed++;
      
      this.logger.info(`Processing ${pagesProcessed}/${maxPages}: ${item.url} (depth: ${item.depth})`);

      try {
        await this.processPage(item, maxDepth, timeoutMs, settleMs);
      } catch (error) {
        this.logger.error(`Failed to process page ${item.url}: ${error}`);
        
        // Add record for failed page
        this.rawLinks.push({
          url: item.url,
          discoveredOn: this.getDiscoveredOn(item.url),
          depth: item.depth,
          anchorText: null,
          finalUrl: item.url,
          status: undefined,
          contentType: null
        });
      }
    }

    this.logger.info(`Crawl completed. Processed ${pagesProcessed} pages, found ${this.rawLinks.length} raw links.`);
  }

  private async processPage(item: QueueItem, maxDepth: number, timeoutMs: number, settleMs: number): Promise<void> {
    const page = await this.browserManager.createPage();
    
    try {
      // Navigate to page and get response
      const response = await this.browserManager.navigateToPage(page, item.url, timeoutMs, settleMs);
      
      // Get final URL after redirects and response status
      const finalUrl = page.url();
      const status = response?.status();
      const contentType = response?.headers()['content-type'] || null;

      // Extract links from page
      const pageLinks = await this.browserManager.extractLinksFromPage(page, finalUrl);
      
      // Process extracted links
      const discoveredUrls: string[] = [];
      
      for (const link of pageLinks) {
        try {
          const normalizedUrl = normalizeUrl(link.href, finalUrl);
          
          // Check if it's same-host
          if (isSameHost(normalizedUrl, this.domain)) {
            // Add to raw links collection
            this.rawLinks.push({
              url: normalizedUrl,
              discoveredOn: item.url,
              depth: item.depth,
              anchorText: link.text || null,
              finalUrl: finalUrl,
              status: status,
              contentType: contentType
            });

            // Collect for enqueueing if not already visited/enqueued and within depth limit
            if (!this.visited.has(normalizedUrl) && item.depth < maxDepth) {
              discoveredUrls.push(normalizedUrl);
            }
          }
        } catch (error) {
          this.logger.debug(`Skipping invalid link ${link.href} on ${finalUrl}: ${error}`);
        }
      }

      // Sort discovered URLs lexicographically and enqueue
      const sortedUrls = discoveredUrls.sort();
      for (const url of sortedUrls) {
        this.enqueueUrl(url, item.depth + 1);
      }

    } finally {
      await page.close();
    }
  }

  private enqueueUrl(url: string, depth: number): void {
    if (!this.enqueued.has(url) && !this.visited.has(url)) {
      this.enqueued.add(url);
      this.queue.push({ url, depth });
    }
  }

  private getDiscoveredOn(url: string): string {
    // For start URLs, they are "discovered" on themselves
    if (this.options.start.includes(url)) {
      return url;
    }
    
    // Find the first raw link record that has this URL to get its discoveredOn
    const linkRecord = this.rawLinks.find(link => link.url === url);
    return linkRecord?.discoveredOn || url;
  }

  private buildResult(): HarvestResult {
    // Apply deduplication based on options
    const dedupeMode = this.options.dedupe || 'none';
    const processedLinks = deduplicateLinks(this.rawLinks, dedupeMode);

    return {
      start: this.options.start,
      domain: this.domain,
      options: this.options,
      count: processedLinks.length,
      crawlStarted: this.startTime.toISOString(),
      crawlCompleted: new Date().toISOString(),
      links: processedLinks
    };
  }

  private async cleanup(): Promise<void> {
    await this.browserManager.close();
  }
}