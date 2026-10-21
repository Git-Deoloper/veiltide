# Contributing

Contributions are welcome, especially precise bug reports, defensive regex improvements, browser accessibility testing, translations, and documentation edits.

## Development

```bash
npm ci
npm run dev
npm run verify
```

Node.js 22+ is required. The browser application and CLI have no third-party runtime dependencies. The build creates `dist/` for static hosting.

Please keep the deterministic core in `src/redact.js`, interaction code in `src/app.js`, and every new detector covered by both positive and negative tests. Do not add network requests, trackers, clipboard reads without an explicit user action, or automatic storage of raw input. For large refactors, open an issue first.

**Use completely invented test data.** Never submit real customer logs, keys, personal emails, or unredacted bug reports. Security bugs belong in GitHub's private vulnerability reporting channel.
