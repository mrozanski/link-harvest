# **Phase 1.1.1: Add Deduplication** (Quick Addition)

Analysis of Sample Data shows:

1. **Exact duplicates** (same page, same link, same anchor text)
2. **Same URL, different pages** (like `/accessibility` appearing on multiple pages)
3. **Same URL, different anchor text** (like "leg.colorado.gov/accessibility" vs "Accessibility Statement")

## **Proposed Deduplication Design**

### **New CLI Option**
```bash
--dedupe <none|url|full>   # default: none (current behavior)
```

**Modes:**
- `none`: Current behavior (every link occurrence is a separate record)
- `url`: Group by URL, aggregate discovery info
- `full`: Group by URL + anchorText combination

### **Enhanced Output Schema**

```typescript
export interface LinkRecord {
  url: string;                    // normalized target URL
  discoveredOn: string[];         // array of referrer URLs where this link was found
  discoveryCount: number;         // total occurrences across all pages
  depth: number;                  // minimum depth where this URL was discovered
  anchorTexts: AnchorTextInfo[];  // all anchor text variations
  finalUrl?: string;              // after redirects
  status?: number;                // HTTP status
  contentType?: string | null;
}

export interface AnchorTextInfo {
  text: string | null;            // the anchor text
  count: number;                  // how many times this exact text appeared
  discoveredOn: string[];         // which pages had this specific anchor text
}
```

### **Example Output with `--dedupe url`**

```json
{
  "links": [
    {
      "url": "https://leg.colorado.gov/accessibility",
      "discoveredOn": [
        "https://leg.colorado.gov/",
        "https://leg.colorado.gov/2025-special-session-bills-authorized-sponsor-pre-release",
        "https://leg.colorado.gov/BallotAnalysis"
      ],
      "discoveryCount": 4,
      "depth": 0,
      "anchorTexts": [
        {
          "text": "Accessibility Statement",
          "count": 3,
          "discoveredOn": [
            "https://leg.colorado.gov/",
            "https://leg.colorado.gov/2025-special-session-bills-authorized-sponsor-pre-release",
            "https://leg.colorado.gov/BallotAnalysis"
          ]
        },
        {
          "text": "leg.colorado.gov/accessibility",
          "count": 1,
          "discoveredOn": [
            "https://leg.colorado.gov/BallotAnalysis"
          ]
        }
      ],
      "finalUrl": "https://leg.colorado.gov/accessibility",
      "status": 200,
      "contentType": "text/html; charset=utf-8"
    }
  ]
}
```

### CSV Column Rules:

**Implement CSV deduplication as follows:**

```text
--dedupe none: Current behavior (discoveredOn column, one row per occurrence)
--dedupe url: Replace discoveredOn with discoveryCount, group by URL+anchorText
--dedupe full: Replace discoveredOn with discoveryCount, remove anchorText column, group by URL only  
```

This gives users three clean data views: detailed, by-anchor-text, and unique-URLs-only.

```text
| Dedupe Mode | Columns | Grouping Logic |
|-------------|---------|----------------|
| `none` | `url,discoveredOn,depth,anchorText,finalUrl,status,contentType` | No grouping (current) |
| `url` | `url,discoveryCount,depth,anchorText,finalUrl,status,contentType` | Group by URL+anchorText |
| `full` | `url,discoveryCount,depth,finalUrl,status,contentType` | Group by URL only |
```

**Key Changes:**

- Replace discoveredOn with discoveryCount in dedupe modes
- Remove anchorText column entirely in full mode
- Keep depth as minimum depth where URL was discovered
- Preserve status and finalUrl** (same for all occurrences of a URL)

## **Implementation Strategy**

**CLI Enhancement:**
```bash
link-harvest --start https://leg.colorado.gov --max-pages 10 --dedupe url --out-file legco-deduped.json
```

**Processing Logic:**
```typescript
// After crawling, before output
function deduplicateLinks(links: LinkRecord[], mode: 'none' | 'url' | 'full'): LinkRecord[] {
  if (mode === 'none') return links;
  
  const grouped = new Map<string, LinkRecord[]>();
  
  for (const link of links) {
    const key = mode === 'url' ? link.url : `${link.url}|${link.anchorText}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(link);
  }
  
  return Array.from(grouped.values()).map(group => mergeLinks(group));
}

function mergeLinks(links: LinkRecord[]): LinkRecord {
  const first = links[0];
  const discoveredOn = [...new Set(links.map(l => l.discoveredOn))];
  const anchorTexts = aggregateAnchorTexts(links);
  
  return {
    ...first,
    discoveredOn,
    discoveryCount: links.length,
    depth: Math.min(...links.map(l => l.depth)),
    anchorTexts
  };
}
```

**Add to Phase 1 CLI Options:**
```
--dedupe <none|url|full>    deduplication mode (default: none)
```

**Add to HarvestOptions interface:**
```typescript
export interface HarvestOptions {
  // ... existing options
  dedupe?: 'none' | 'url' | 'full';
}
```

**Add to output documentation:**
- When `dedupe !== 'none'`, `discoveredOn` becomes an array
- Add `discoveryCount` and `anchorTexts` fields
- Preserve all existing fields for compatibility
