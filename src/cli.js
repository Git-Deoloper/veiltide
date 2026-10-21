#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { redact, summarize, MAX_TEXT_LENGTH } from './redact.js';

const HELP = `veiltide — Redact common secrets and identifiers locally

Usage:
  veiltide [path] [--report] [--out output.txt] [--force]
  cat app.log | veiltide --report

Options:
  --report        Print category counts to stderr (never original matches)
  --out FILE      Save sanitized output instead of writing to stdout
  --force         Allow replacing an existing --out file
  --no-emails     Keep emails unchanged
  --no-ip         Keep IPv4 addresses unchanged
  --no-paths      Keep local user names unchanged
  --no-payments   Keep card-like numeric strings unchanged
  --no-credentials Keep credential-like strings unchanged
  --help          Print help

This is a heuristic aid, not a security guarantee. Review all output.
`;

export async function main(args = process.argv.slice(2), deps = {}) {
  const fsRead = deps.readFile || readFile;
  const fsWrite = deps.writeFile || writeFile;
  const stdin = deps.stdin || process.stdin;
  const stdout = deps.stdout || process.stdout;
  const stderr = deps.stderr || process.stderr;
  const opts = {};
  let file = null;
  let outputPath = null;
  let report = false;
  let force = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { stdout.write(HELP); return 0; }
    if (arg === '--report') report = true;
    else if (arg === '--force') force = true;
    else if (arg === '--no-emails') opts.emails = false;
    else if (arg === '--no-ip') opts.addresses = false;
    else if (arg === '--no-paths') opts.paths = false;
    else if (arg === '--no-payments') opts.payments = false;
    else if (arg === '--no-credentials') opts.credentials = false;
    else if (arg === '--out') { outputPath = args[++i]; if (!outputPath || outputPath.startsWith('--')) throw new Error('--out requires a file path'); }
    else if (arg.startsWith('-') && arg !== '-') throw new Error(`Unknown option: ${arg}`);
    else if (!file) file = arg;
    else throw new Error('Specify only one input file');
  }
  if (file && outputPath && file === outputPath) throw new Error('Refusing to overwrite input file');
  if (!file && stdin.isTTY) throw new Error('Provide a file or pipe text to stdin');
  let input;
  if (file && file !== '-') {
    input = await fsRead(file, 'utf8');
  } else {
    let parts = [];
    let length = 0;
    for await (const part of stdin) {
      const stringPart = typeof part === 'string' ? part : part.toString('utf8');
      length += stringPart.length;
      if (length > MAX_TEXT_LENGTH) throw new RangeError('Input too large');
      parts.push(stringPart);
    }
    input = parts.join('');
  }
  const result = redact(input, opts);
  if (outputPath) {
    // 'wx' is exclusive create; never clobber without explicit --force.
    await fsWrite(outputPath, result.output, { encoding: 'utf8', flag: force ? 'w' : 'wx', mode: 0o600 });
  } else {
    stdout.write(result.output);
  }
  if (report) stderr.write(`Redacted ${result.total} matches (${result.distinct} distinct). ${summarize(result)}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { process.stderr.write(`veiltide: ${error.message}\n`); process.exitCode = 1; });
}
