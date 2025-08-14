/**
 * URL Normalization Rules (Phase 1) - Apply in this order:
 * 1. Resolve relative URLs against the current page URL
 * 2. Drop `hash` fragments
 * 3. Lowercase the scheme and hostname only
 * 4. Remove default ports (:80 for http, :443 for https)
 * 5. Normalize path: resolve `.` and `..`
 * 6. Remove trailing slashes (except for the origin root)
 * 7. Simple same-host check: `new URL(target).hostname === domain`
 */

export function normalizeUrl(href: string, baseUrl: string): string {
  try {
    // Step 1: Resolve relative URLs against the current page URL
    const url = new URL(href, baseUrl);
    
    // Step 2: Drop hash fragments
    url.hash = '';
    
    // Step 3: Lowercase the scheme and hostname only
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    
    // Step 4: Remove default ports
    if ((url.protocol === 'http:' && url.port === '80') ||
        (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }
    
    // Step 5: Normalize path: resolve `.` and `..`
    // The URL constructor already handles this automatically
    
    // Step 6: Remove trailing slashes (except for the origin root)
    const pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      url.pathname = pathname.slice(0, -1);
    }
    
    return url.toString();
  } catch (error) {
    // Invalid URL
    throw new Error(`Invalid URL: ${href} (base: ${baseUrl})`);
  }
}

export function isSameHost(url: string, domain: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.toLowerCase() === domain.toLowerCase();
  } catch {
    return false;
  }
}

export function extractDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    throw new Error(`Cannot extract domain from invalid URL: ${url}`);
  }
}