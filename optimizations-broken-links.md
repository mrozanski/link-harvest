# Optimizations - broken links

## **The Reality of HTTP Status Codes for Link Harvesting**

**Status codes where we CAN'T extract links:**
- **404** (Not Found) - No content to parse
- **403** (Forbidden) - Usually blocked/no content  
- **500** (Server Error) - Error page, no useful links
- **Timeouts** - No response at all

**Status codes where we CAN extract links:**
- **200** (OK) - Normal page
- **301/302** (Redirects) - Playwright follows these automatically to final destination

**Your insight is correct**: If status ≠ 200, there's typically **no meaningful content to harvest links from**.

## **Corrected Optimization Strategy**

**The `--fail-fast` option doesn't make sense** because:
- Non-200 responses don't have link content anyway
- We're already not extracting links from error pages
- The time is spent on the network request itself, not link extraction

## **Real Optimizations That Actually Work**

### **1. `--only-broken` (Output Filtering)**
```bash
link-harvest --start https://site.com --only-broken
```
- Same crawl time, much smaller output
- Focus on actionable issues only

### **2. `--shallow-check` (Reduce Depth)**
```bash
link-harvest --start https://site.com --max-depth 1 --max-pages 100
```
- Crawl fewer pages total
- Still finds most broken links (many are in navigation)

### **3. `--timeout-aggressive` (Fail Fast on Slow Pages)**
```bash
link-harvest --start https://site.com --timeout-ms 10000 --only-broken
```
- Shorter timeouts → faster failure detection
- Don't wait 45s for broken pages

### **4. Real Performance Gain: Concurrent Processing**
```bash
# Phase 2 feature
link-harvest --start https://site.com --concurrency 5 --only-broken
```
- Visit 5 pages simultaneously
- **This** is where real time savings come from

## **Actual Time Bottlenecks**

**For leg.colorado.gov:**
1. **Network latency** (500ms per page) × 1000 pages = 8+ minutes
2. **Page rendering** (2-3s per SPA page) × 1000 pages = 30+ minutes  
3. **Link extraction** (50ms per page) × 1000 pages = 50 seconds

**Real optimization targets:**
- Concurrent requests (5x speedup)
- Shorter timeouts for broken pages
- Skip heavy SPA rendering for simple static pages

## **Corrected Implementation**

**Remove the `--fail-fast` option** (doesn't help)

**Add these instead:**
```bash
--only-broken              # Filter output to non-200 status only
--timeout-ms <ms>         # Aggressive timeouts (default 45000, try 10000)
--max-concurrent <n>      # Phase 2: parallel processing
```

**Example for broken link checking:**
```bash
link-harvest \
  --start https://leg.colorado.gov \
  --max-depth 2 \
  --max-pages 500 \
  --timeout-ms 15000 \
  --only-broken \
  --output csv
```

## **Expected Real Performance**

**Current**: 30 minutes for 1000 pages
**Optimized**: 
- Shorter timeouts: ~20 minutes
- Reduce scope (max-pages 500): ~10 minutes  
- Phase 2 concurrency (5x): ~4 minutes
- Output filtering: Same time, 95% smaller output

**The biggest win**: Actionable results instead of massive data dumps.

Thanks for catching my logical error! The real performance gains come from concurrency and smarter scoping, not from "skipping link extraction" on pages that don't have content to extract from anyway.