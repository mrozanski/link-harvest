import { describe, it, expect } from 'vitest';
import { normalizeUrl, isSameHost, extractDomainFromUrl } from '../src/normalize.js';

describe('URL Normalization', () => {
  describe('normalizeUrl', () => {
    it('resolves relative URLs against base URL', () => {
      const baseUrl = 'https://example.com/products/';
      
      expect(normalizeUrl('/about.html', baseUrl)).toBe('https://example.com/about.html');
      expect(normalizeUrl('./widget.html', baseUrl)).toBe('https://example.com/products/widget.html');
      expect(normalizeUrl('../index.html', baseUrl)).toBe('https://example.com/index.html');
      expect(normalizeUrl('widget.html', baseUrl)).toBe('https://example.com/products/widget.html');
    });

    it('drops hash fragments', () => {
      const baseUrl = 'https://example.com';
      
      expect(normalizeUrl('https://example.com/page#section', baseUrl))
        .toBe('https://example.com/page');
      expect(normalizeUrl('/page#section1#section2', baseUrl))
        .toBe('https://example.com/page');
    });

    it('lowercases scheme and hostname only', () => {
      const baseUrl = 'https://example.com';
      
      expect(normalizeUrl('HTTPS://EXAMPLE.COM/PATH', baseUrl))
        .toBe('https://example.com/PATH');
      expect(normalizeUrl('HTTP://TEST.EXAMPLE.COM/CaseSensitivePath', baseUrl))
        .toBe('http://test.example.com/CaseSensitivePath');
    });

    it('removes default ports', () => {
      const baseUrl = 'https://example.com';
      
      expect(normalizeUrl('http://example.com:80/page', baseUrl))
        .toBe('http://example.com/page');
      expect(normalizeUrl('https://example.com:443/page', baseUrl))
        .toBe('https://example.com/page');
      
      // Non-default ports should remain
      expect(normalizeUrl('http://example.com:8080/page', baseUrl))
        .toBe('http://example.com:8080/page');
      expect(normalizeUrl('https://example.com:8443/page', baseUrl))
        .toBe('https://example.com:8443/page');
    });

    it('normalizes path by resolving . and ..', () => {
      const baseUrl = 'https://example.com';
      
      expect(normalizeUrl('/path/./page', baseUrl))
        .toBe('https://example.com/path/page');
      expect(normalizeUrl('/path/../page', baseUrl))
        .toBe('https://example.com/page');
      expect(normalizeUrl('/a/b/c/../d/./e', baseUrl))
        .toBe('https://example.com/a/b/d/e');
    });

    it('removes trailing slashes except for root', () => {
      const baseUrl = 'https://example.com';
      
      expect(normalizeUrl('https://example.com/', baseUrl))
        .toBe('https://example.com/');
      expect(normalizeUrl('https://example.com/page/', baseUrl))
        .toBe('https://example.com/page');
      expect(normalizeUrl('https://example.com/path/to/page/', baseUrl))
        .toBe('https://example.com/path/to/page');
    });

    it('preserves query parameters', () => {
      const baseUrl = 'https://example.com';
      
      expect(normalizeUrl('/page?param=value', baseUrl))
        .toBe('https://example.com/page?param=value');
      expect(normalizeUrl('/page?a=1&b=2', baseUrl))
        .toBe('https://example.com/page?a=1&b=2');
    });

    it('handles complex URLs correctly', () => {
      const baseUrl = 'https://example.com/section/';
      
      const input = 'HTTPS://EXAMPLE.COM:443/path/../page/?param=value#section';
      const expected = 'https://example.com/page?param=value';
      
      expect(normalizeUrl(input, baseUrl)).toBe(expected);
    });

    it('throws error for invalid URLs', () => {
      const baseUrl = 'not-a-valid-base';
      
      expect(() => normalizeUrl('https://example.com', baseUrl)).toThrow('Invalid URL');
    });
  });

  describe('isSameHost', () => {
    it('returns true for same hostname', () => {
      expect(isSameHost('https://example.com/page', 'example.com')).toBe(true);
      expect(isSameHost('http://example.com/page', 'example.com')).toBe(true);
      expect(isSameHost('https://example.com:443/page', 'example.com')).toBe(true);
    });

    it('returns false for different hostnames', () => {
      expect(isSameHost('https://other.com/page', 'example.com')).toBe(false);
      expect(isSameHost('https://sub.example.com/page', 'example.com')).toBe(false);
      expect(isSameHost('https://example.org/page', 'example.com')).toBe(false);
    });

    it('handles case insensitivity', () => {
      expect(isSameHost('HTTPS://EXAMPLE.COM/page', 'example.com')).toBe(true);
      expect(isSameHost('https://example.com/page', 'EXAMPLE.COM')).toBe(true);
    });

    it('returns false for invalid URLs', () => {
      expect(isSameHost('not-a-url', 'example.com')).toBe(false);
      expect(isSameHost('', 'example.com')).toBe(false);
    });
  });

  describe('extractDomainFromUrl', () => {
    it('extracts domain from valid URLs', () => {
      expect(extractDomainFromUrl('https://example.com/page')).toBe('example.com');
      expect(extractDomainFromUrl('http://sub.example.com/page')).toBe('sub.example.com');
      expect(extractDomainFromUrl('https://example.com:8080/page')).toBe('example.com');
    });

    it('handles case correctly', () => {
      expect(extractDomainFromUrl('HTTPS://EXAMPLE.COM/page')).toBe('example.com');
    });

    it('throws error for invalid URLs', () => {
      expect(() => extractDomainFromUrl('not-a-url')).toThrow('Cannot extract domain from invalid URL');
      expect(() => extractDomainFromUrl('')).toThrow('Cannot extract domain from invalid URL');
    });
  });
});