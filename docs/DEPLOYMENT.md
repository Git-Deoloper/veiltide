# Deployment

Veiltide is a static website with a small optional Node CLI. The browser site processes text in memory; it needs no database, account system, server-side file storage, or API keys.

## Build

```bash
npm ci --ignore-scripts
npm run verify
```

Build output: `dist/`.

### Cloudflare Pages

Connect a new repository and set:

- Framework: None
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 24

Confirm `_headers` was deployed and that a live page enforces CSP, no-referrer and no-sniff. TLS must be enabled. Cloudflare Pages static site deployments can interpret `_headers` rules, but independently confirm headers via developer tools.

### Netlify or other static hosts

Deploy `dist/` and verify the platform applies `_headers`, or reproduce the same headers in its native configuration. Plain GitHub Pages does not interpret `_headers`; do not assume privacy hardening is active without verification.

### Launch validation

1. Test the deployed site on desktop Safari, Firefox, Chromium and mobile browsers. Test clipboard permissions, file import, keyboard focus, custom terms and downloads.
2. Use network developer tools: input should cause **zero** network requests. The service worker may fetch its static shell on first installation; no raw text is sent.
3. Test CSP and security headers with the browser Network inspector.
4. Set a real canonical HTTPS URL and absolute Open Graph image before promoting social previews (this repository intentionally does not invent a domain).
5. Enable protected `main`, passing CI, dependency alerts, secret scanning and private vulnerability reports where supported.
6. Use real traffic feedback to prioritize fixes instead of making unproven claims.

Public-source release is not the same as a live deployment. Never promise complete sensitive-data removal.
