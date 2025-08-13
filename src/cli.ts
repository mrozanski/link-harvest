#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { harvest } from './index.js';
import { HarvestOptions, HarvestResult, OutputFormat, LogLevel } from './types.js';
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
}

function formatAsCSV(result: HarvestResult): string {
  const headers = 'url,discoveredOn,depth,anchorText,finalUrl,status,contentType';
  const rows = result.links.map(link => {
    const escapeCsv = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escapeCsv(link.url),
      escapeCsv(link.discoveredOn),
      escapeCsv(link.depth),
      escapeCsv(link.anchorText),
      escapeCsv(link.finalUrl),
      escapeCsv(link.status),
      escapeCsv(link.contentType)
    ].join(',');
  });

  return [headers, ...rows].join('\n');
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
      default: 45000
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
    .example('$0 --start https://example.com --domain example.com', 'Basic crawl')
    .example('$0 --start https://example.com --max-depth 3 --output csv', 'Deep crawl with CSV output')
    .example('$0 --start https://example.com --out-file results.json --log-level info', 'Save to file with verbose logging')
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
      logLevel: argv['log-level']
    };

    // Run the harvest
    const result = await harvest(harvestOptions);

    // Format output
    let output: string;
    if (argv.output === 'csv') {
      output = formatAsCSV(result);
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

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}