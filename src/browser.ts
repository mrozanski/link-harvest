import { chromium, Browser, BrowserContext, Page, Response } from 'playwright';
import { LogLevel } from './types.js';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async initialize(userAgent?: string, _logLevel?: LogLevel): Promise<void> {
    // Launch browser with deterministic settings
    this.browser = await chromium.launch({
      headless: false,
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
      // Use domcontentloaded for consistent behavior
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs
      });

      // Additional settle time after page load
      if (settleMs > 0) {
        await page.waitForTimeout(settleMs);
      }
      
      return response;
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error}`);
    }
  }

  async extractLinksFromPage(page: Page, currentUrl: string, selector?: string, waitFor?: string): Promise<Array<{href: string, text: string}>> {
    try {
      // If waitFor is specified, wait for that element first
      if (waitFor) {
        try {
          await page.waitForSelector(waitFor, { timeout: 10000 }); // 10 second timeout
          // Small additional delay to ensure the element is fully ready
          await page.waitForTimeout(500);
        } catch (error) {
          throw new Error(`Wait-for selector "${waitFor}" not found on page: ${error}`);
        }
      }
      
      // If a selector is specified, wait for it to be available and stable
      if (selector) {
        try {
          // Wait for the selector to appear on the page
          await page.waitForSelector(selector, { timeout: 10000 }); // 10 second timeout
          
          // Additional wait to ensure content is fully loaded within the selector
          await page.waitForFunction(
            (targetSelector: string) => {
              const container = document.querySelector(targetSelector);
              if (!container) return false;
              
              // Check if there are links within the container
              const links = container.querySelectorAll('a[href]');
              return links.length > 0;
            },
            selector,
            { timeout: 10000 }
          );
          
          // Small additional delay to ensure any final rendering is complete
          await page.waitForTimeout(1000);
        } catch (error) {
          throw new Error(`Selector "${selector}" not found or not ready on page: ${error}`);
        }
      }

      // Extract links from specific selector or all a[href] elements
      const links = await page.evaluate((targetSelector: string | undefined) => {
        let linkElements: Element[];
        
        if (targetSelector) {
          // Use the specified selector to find the container, then extract links from within it
          const container = document.querySelector(targetSelector);
          if (container) {
            linkElements = Array.from(container.querySelectorAll('a[href]'));
          } else {
            // If selector not found, throw an error
            throw new Error(`Selector "${targetSelector}" not found on page`);
          }
        } else {
          // Default behavior: extract all a[href] elements
          linkElements = Array.from(document.querySelectorAll('a[href]'));
        }
        
        return linkElements.map((element: Element) => {
          const href = element.getAttribute('href');
          const text = (element.textContent || '').trim().substring(0, 100);
          
          return {
            href: href || '',
            text: text
          };
        }).filter(link => link.href); // Filter out empty hrefs
      }, selector);

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