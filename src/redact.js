/**
 * Veiltide's deterministic, heuristic redaction engine.
 * No I/O, networking, persistent storage, or dependencies.
 * Not a guarantee that every secret or identifier is found.
 */

export const MAX_TEXT_LENGTH = 1_000_000;

export const DEFAULT_OPTIONS = Object.freeze({
  credentials: true,
  emails: true,
  addresses: true,
  paths: true,
  payments: true,
  custom: []
});

const LABELS = Object.freeze({
  'PRIVATE KEY': 'PRIVATE_KEY',
  'CREDENTIAL': 'CREDENTIAL',
  'TOKEN': 'TOKEN',
  'EMAIL': 'EMAIL',
  'IP ADDRESS': 'IP',
  'LOCAL PATH': 'PATH',
  'PAYMENT CARD': 'CARD',
  'CUSTOM': 'CUSTOM'
});

/** Validates user-specified literal strings (never interpreted as regex). */
export function normalizeOptions(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Options must be an object');
  }
  const options = { ...DEFAULT_OPTIONS };
  for (const flag of ['credentials', 'emails', 'addresses', 'paths', 'payments']) {
    if (typeof input[flag] === 'boolean') options[flag] = input[flag];
  }
  if (input.custom !== undefined) {
    if (!Array.isArray(input.custom) || input.custom.length > 20) throw new RangeError('Up to 20 custom terms are supported');
    const normalized = input.custom.map(term => {
      if (typeof term !== 'string' || term.trim().length < 3 || term.length > 100) {
        throw new RangeError('Custom terms must be between 3 and 100 characters');
      }
      return term.trim();
    });
    options.custom = [...new Set(normalized)].slice(0, 20);
  }
  return options;
}

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function addMatches(text, regex, type, priority, ranges, captureGroup = 0, validate = null) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[captureGroup];
    if (!value) continue;
    if (validate && !validate(value)) continue;
    const offset = captureGroup ? match[0].lastIndexOf(value) : 0;
    const start = match.index + offset;
    ranges.push({ start, end: start + value.length, type, priority, value });
    if (regex.lastIndex === match.index) regex.lastIndex++;
  }
}

/** Luhn filters false positives for payment-card candidates. */
export function validCard(value) {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let checksum = 0;
  let doubling = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (doubling) { n *= 2; if (n > 9) n -= 9; }
    checksum += n;
    doubling = !doubling;
  }
  return checksum % 10 === 0;
}

export function redact(text, rawOptions = {}) {
  if (typeof text !== 'string') throw new TypeError('Input must be text');
  if (text.length > MAX_TEXT_LENGTH) throw new RangeError('Input exceeds 1,000,000 characters');
  const options = normalizeOptions(rawOptions);
  const ranges = [];

  if (options.credentials) {
    addMatches(text, /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]{0,16000}?-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g, 'PRIVATE KEY', 100, ranges);
    addMatches(text, /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk_(?:test|live)_[A-Za-z0-9]{12,}|sk-[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{14,}|AKIA[0-9A-Z]{16})\b/g, 'TOKEN', 90, ranges);
    addMatches(text, /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, 'TOKEN', 90, ranges);
    addMatches(text, /\b(?:Bearer\s+)([A-Za-z0-9._~+\/-]{8,}={0,2})/gi, 'TOKEN', 80, ranges, 1);
    addMatches(text, /\b(?:password|passwd|pwd|client_secret|api_key|access_token|secret_key|auth_token|private_token)\b\s*[:=]\s*["']?([^\s"',;}{]{4,})/gi, 'CREDENTIAL', 85, ranges, 1);
    addMatches(text, /["'](?:password|passwd|client_secret|api_key|access_token|secret_key|auth_token)["']\s*:\s*["']([^"'\r\n]{4,})["']/gi, 'CREDENTIAL', 85, ranges, 1);
    // Mask the password in a URL without hiding useful hostname and path information.
    addMatches(text, /\b[a-z][a-z\d+.-]*:\/\/[^\s/@:]+:([^\s/@]+)@[^\s/]+/gi, 'CREDENTIAL', 88, ranges, 1);
  }
  if (options.emails) {
    addMatches(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}\b/gi, 'EMAIL', 40, ranges);
  }
  if (options.addresses) {
    addMatches(text, /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g, 'IP ADDRESS', 30, ranges, 0, candidate =>
      candidate.split('.').every(segment => Number(segment) <= 255));
  }
  if (options.paths) {
    addMatches(text, /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)([^\s\\/"']{1,80})/gi, 'LOCAL PATH', 35, ranges, 1);
  }
  if (options.payments) {
    addMatches(text, /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g, 'PAYMENT CARD', 70, ranges, 0, validCard);
  }
  for (const term of options.custom) {
    addMatches(text, new RegExp(escapeRegex(term), 'gi'), 'CUSTOM', 95, ranges);
  }

  // Select non-overlapping ranges, prioritizing secrets over less-specific signals.
  ranges.sort((a, b) => b.priority - a.priority || a.start - b.start || b.end - a.end);
  const selected = [];
  // A small byte-map bounds overlap resolution by input length, not quadratic
  // comparisons against every earlier match on dense logs.
  const occupied = new Uint8Array(text.length);
  for (const candidate of ranges) {
    if (occupied.subarray(candidate.start, candidate.end).includes(1)) continue;
    occupied.fill(1, candidate.start, candidate.end);
    selected.push(candidate);
  }
  selected.sort((a, b) => a.start - b.start);

  const counters = {};
  const replacements = new Map();
  const findings = [];
  let cursor = 0;
  let output = '';
  for (const match of selected) {
    output += text.slice(cursor, match.start);
    const key = `${match.type}\0${match.value.toLowerCase()}`;
    let tag = replacements.get(key);
    if (!tag) {
      const name = LABELS[match.type];
      counters[match.type] = (counters[match.type] || 0) + 1;
      tag = `[${name}_${counters[match.type]}]`;
      replacements.set(key, tag);
    }
    output += tag;
    findings.push({ type: match.type, tag, start: match.start, end: match.end });
    cursor = match.end;
  }
  output += text.slice(cursor);
  return {
    output,
    findings,
    counts: Object.fromEntries(Object.entries(counters).map(([name, count]) => [name, count])),
    total: findings.length,
    distinct: replacements.size,
    changed: findings.length > 0
  };
}

export function summarize(result) {
  if (!result || !Array.isArray(result.findings)) throw new TypeError('Expected redaction result');
  return Object.entries(result.counts)
    .map(([type, count]) => `${type}: ${count} unique`)
    .join(' · ') || 'No recognized patterns found';
}
