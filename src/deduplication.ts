import { LinkRecord, AnchorTextInfo, DedupeMode } from './types.js';

// Internal interface for tracking raw link data during crawling
export interface RawLinkData {
  url: string;
  discoveredOn: string;
  depth: number;
  anchorText: string | null;
  finalUrl?: string;
  status?: number | undefined;
  contentType?: string | null;
}

export function aggregateAnchorTexts(rawLinks: RawLinkData[]): AnchorTextInfo[] {
  const anchorTextMap = new Map<string | null, AnchorTextInfo>();

  for (const link of rawLinks) {
    const text = link.anchorText;
    
    if (anchorTextMap.has(text)) {
      const existing = anchorTextMap.get(text)!;
      existing.count++;
      if (!existing.discoveredOn.includes(link.discoveredOn)) {
        existing.discoveredOn.push(link.discoveredOn);
      }
    } else {
      anchorTextMap.set(text, {
        text,
        count: 1,
        discoveredOn: [link.discoveredOn]
      });
    }
  }

  // Sort anchor texts by count (descending) then by text (ascending)
  return Array.from(anchorTextMap.values()).sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count; // Higher count first
    }
    // Handle null values in text comparison
    if (a.text === null && b.text === null) return 0;
    if (a.text === null) return 1;
    if (b.text === null) return -1;
    return a.text.localeCompare(b.text);
  });
}

export function mergeLinks(rawLinks: RawLinkData[]): LinkRecord {
  const first = rawLinks[0];
  const discoveredOn = [...new Set(rawLinks.map(l => l.discoveredOn))].sort();
  const anchorTexts = aggregateAnchorTexts(rawLinks);
  
  return {
    url: first.url,
    discoveredOn,
    discoveryCount: rawLinks.length,
    depth: Math.min(...rawLinks.map(l => l.depth)),
    anchorTexts,
    finalUrl: first.finalUrl,
    status: first.status,
    contentType: first.contentType
  };
}

export function deduplicateLinks(rawLinks: RawLinkData[], mode: DedupeMode): LinkRecord[] {
  if (mode === 'none') {
    // Convert each raw link to enhanced format with single-item arrays
    return rawLinks.map(rawLink => ({
      url: rawLink.url,
      discoveredOn: [rawLink.discoveredOn],
      discoveryCount: 1,
      depth: rawLink.depth,
      anchorTexts: rawLink.anchorText !== null ? [{
        text: rawLink.anchorText,
        count: 1,
        discoveredOn: [rawLink.discoveredOn]
      }] : [],
      finalUrl: rawLink.finalUrl,
      status: rawLink.status,
      contentType: rawLink.contentType
    }));
  }
  
  const grouped = new Map<string, RawLinkData[]>();
  
  for (const link of rawLinks) {
    const key = mode === 'url' 
      ? `${link.url}|${link.anchorText}` 
      : link.url; // 'full' mode groups by URL only
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(link);
  }
  
  const deduplicatedLinks = Array.from(grouped.values()).map(group => mergeLinks(group));
  
  // Sort by URL for stable output
  return deduplicatedLinks.sort((a, b) => a.url.localeCompare(b.url));
}