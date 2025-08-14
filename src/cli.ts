#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { harvest } from './index.js';
import { HarvestOptions, HarvestResult, OutputFormat, LogLevel, DedupeMode } from './types.js';
import fs from 'fs/promises';

interface CliArgs {
  start: string[];
  domain?: string;
  'max-depth': number;
  'max-pages': number;
  'timeout-ms': number;
  'settle-ms': number;
  output: OutputFormat;
  'out-file'?: string;
  'log-level': LogLevel;
  'user-agent': string;
  dedupe: DedupeMode;
}

function formatAsCSV(result: HarvestResult, dedupeMode: DedupeMode): string {
  const escapeCsv = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Different column structures based on dedupe mode
  if (dedupeMode === 'none') {
    // Current behavior: discoveredOn column, one row per occurrence
    const headers = 'url,discoveredOn,depth,anchorText,finalUrl,status,contentType';
    const rows: string[] = [];
    
    for (const link of result.links) {
      // For 'none' mode, each link should have single-item arrays
      for (let i = 0; i < link.discoveredOn.length; i++) {
        const anchorText = link.anchorTexts.length > 0 ? link.anchorTexts[0].text : null;
        rows.push([
          escapeCsv(link.url),
          escapeCsv(link.discoveredOn[i]),
          escapeCsv(link.depth),
          escapeCsv(anchorText),
          escapeCsv(link.finalUrl),
          escapeCsv(link.status),
          escapeCsv(link.contentType)
        ].join(','));
      }
    }
    
    return [headers, ...rows].join('\n');
  } else if (dedupeMode === 'url') {
    // Group by URL+anchorText: Replace discoveredOn with discoveryCount
    const headers = 'url,discoveryCount,depth,anchorText,finalUrl,status,contentType';
    const rows: string[] = [];
    
    for (const link of result.links) {
      // Each link.anchorTexts entry becomes a row
      for (const anchorInfo of link.anchorTexts) {
        rows.push([
          escapeCsv(link.url),
          escapeCsv(anchorInfo.count),
          escapeCsv(link.depth),
          escapeCsv(anchorInfo.text),
          escapeCsv(link.finalUrl),
          escapeCsv(link.status),
          escapeCsv(link.contentType)
        ].join(','));
      }
      
      // If no anchor texts, still include the link
      if (link.anchorTexts.length === 0) {
        rows.push([
          escapeCsv(link.url),
          escapeCsv(link.discoveryCount),
          escapeCsv(link.depth),
          escapeCsv(null),
          escapeCsv(link.finalUrl),
          escapeCsv(link.status),
          escapeCsv(link.contentType)
        ].join(','));
      }
    }
    
    return [headers, ...rows].join('\n');
  } else { // 'full' mode
    // Group by URL only: Remove anchorText column entirely
    const headers = 'url,discoveryCount,depth,finalUrl,status,contentType';
    const rows = result.links.map(link => [
      escapeCsv(link.url),
      escapeCsv(link.discoveryCount),
      escapeCsv(link.depth),
      escapeCsv(link.finalUrl),
      escapeCsv(link.status),
      escapeCsv(link.contentType)
    ].join(','));
    
    return [headers, ...rows].join('\n');
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('link-harvest')
    .usage('$0 --start <url> --domain <hostname> [options]')
    .option('start', {
      type: 'array',
      description: 'Seed URL(s) to start crawling from',
      demandOption: true,
      coerce: (urls: string[]) => {
        // Handle both --start url1 url2 and multiple --start url1 --start url2
        return Array.isArray(urls) ? urls.flat() : [urls];
      }
    })
    .option('domain', {
      type: 'string',
      description: 'Primary host for same-host scope (default: derived from first seed)'
    })
    .option('max-depth', {
      type: 'number',
      description: 'Maximum crawl depth',
      default: 2
    })
    .option('max-pages', {
      type: 'number',
      description: 'Hard cap on pages to process',
      default: 1000
    })
    .option('timeout-ms', {
      type: 'number',
      description: 'Page navigation timeout in milliseconds',
      default: 5000
    })
    .option('settle-ms', {
      type: 'number',
      description: 'Extra wait time after networkidle in milliseconds',
      default: 250
    })
    .option('output', {
      type: 'string',
      choices: ['json', 'csv'] as const,
      description: 'Output format',
      default: 'json' as const
    })
    .option('out-file', {
      type: 'string',
      description: 'Write output to file (otherwise print to stdout)'
    })
    .option('log-level', {
      type: 'string',
      choices: ['silent', 'error', 'warn', 'info', 'debug'] as const,
      description: 'Logging level',
      default: 'warn' as const
    })
    .option('user-agent', {
      type: 'string',
      description: 'Custom user agent string',
      default: "Link-Harvest/1.0 (+https://github.com/mrozanski/link-harvest)"
    })
    .option('dedupe', {
      type: 'string',
      choices: ['none', 'url', 'full'] as const,
      description: 'Deduplication mode: none (current), url (group by URL+anchor), full (group by URL only)',
      default: 'none' as const
    })
    .example('$0 --start https://example.com --domain example.com', 'Basic crawl')
    .example('$0 --start https://example.com --max-depth 3 --output csv', 'Deep crawl with CSV output')
    .example('$0 --start https://example.com --out-file results.json --log-level info', 'Save to file with verbose logging')
    .example('$0 --start https://example.com --dedupe url', 'Deduplicate by URL and anchor text')
    .help()
    .version()
    .strict()
    .parseAsync() as CliArgs;

  try {
    // Build harvest options from CLI args
    const harvestOptions: HarvestOptions = {
      start: argv.start,
      ...(argv.domain && { domain: argv.domain }),
      maxDepth: argv['max-depth'],
      maxPages: argv['max-pages'],
      timeoutMs: argv['timeout-ms'],
      settleMs: argv['settle-ms'],
      userAgent: argv['user-agent'],
      logLevel: argv['log-level'],
      dedupe: argv.dedupe
    };

    // Run the harvest
    const result = await harvest(harvestOptions);

    // Format output
    let output: string;
    if (argv.output === 'csv') {
      output = formatAsCSV(result, argv.dedupe);
    } else {
      output = JSON.stringify(result, null, 2);
    }

    // Write to file or stdout
    if (argv['out-file']) {
      await fs.writeFile(argv['out-file'], output, 'utf8');
      
      // Only log to stderr when writing to file, so stdout stays clean for pipes
      if (argv['log-level'] !== 'silent') {
        console.error(`✅ Harvest completed. Found ${result.count} links. Output written to ${argv['out-file']}`);
      }
    } else {
      // Write to stdout for pipes/redirection
      console.log(output);
    }

    process.exit(0);
  } catch (error) {
    // Log error to stderr so it doesn't interfere with stdout
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Always run main when this module is executed
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});