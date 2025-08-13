import { chromium, Browser, BrowserContext, Page, Response } from 'playwright';
import { LogLevel } from './types.js';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async initialize(userAgent?: string, _logLevel?: LogLevel): Promise<void> {
    // Launch browser with deterministic settings
    this.browser = await chromium.launch({
      headless: true,
      // Consistent browser flags for deterministic behavior
      args: [
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
      ]
    });

    // Create context with deterministic settings
    this.context = await this.browser.newContext({
      // Fixed viewport for consistency
      viewport: { width: 1366, height: 768 },
      
      // Fixed user agent (configurable)
      userAgent: userAgent || "Link-Harvest/1.0 (+https://github.com/mrozanski/link-harvest)",
      
      // Deterministic locale and timezone
      locale: 'en-US',
      timezoneId: 'UTC',
      
      // Disable cache for deterministic behavior
      ignoreHTTPSErrors: false,
      
      // Additional deterministic settings
      reducedMotion: 'reduce',
      forcedColors: 'none',
      colorScheme: 'light',
    });

    // Disable cache using init script
    await this.context.addInitScript(() => {
      // Disable cache in the browser context
      if (typeof window !== 'undefined' && 'caches' in window) {
        window.caches.keys().then((names: string[]) => {
          names.forEach((name: string) => {
            window.caches.delete(name);
          });
        });
      }
    });

    // Set extra HTTP headers for consistency
    await this.context.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    });
  }

  async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized. Call initialize() first.');
    }

    const page = await this.context.newPage();
    
    // Set additional page-level deterministic settings
    await page.setViewportSize({ width: 1366, height: 768 });
    
    return page;
  }

  async navigateToPage(page: Page, url: string, timeoutMs: number, settleMs: number): Promise<Response | null> {
    try {
      // Navigate with networkidle wait condition
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: timeoutMs
      });

      // Additional settle time after networkidle
      if (settleMs > 0) {
        await page.waitForTimeout(settleMs);
      }
      
      return response;
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error}`);
    }
  }

  async extractLinksFromPage(page: Page, currentUrl: string): Promise<Array<{href: string, text: string}>> {
    try {
      // Extract all a[href] elements
      const links = await page.evaluate((_pageUrl) => {
        const linkElements = Array.from(document.querySelectorAll('a[href]'));
        
        return linkElements.map((element: Element) => {
          const href = element.getAttribute('href');
          const text = (element.textContent || '').trim().substring(0, 100);
          
          return {
            href: href || '',
            text: text
          };
        }).filter(link => link.href); // Filter out empty hrefs
      }, currentUrl);

      return links;
    } catch (error) {
      throw new Error(`Failed to extract links from ${currentUrl}: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}