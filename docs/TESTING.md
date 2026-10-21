# Release testing checklist

## Automated

- [ ] `npm ci --ignore-scripts && npm run verify` succeeds
- [ ] CLI stdin/file output and error handling are tested
- [ ] Test changes to detectors with positives, negatives, and overlapping patterns

## Browser (manual on actual deployed HTTPS origin)

- [ ] Desktop Chromium, Firefox and Safari; iOS and Android browsers
- [ ] Keyboard focus order, Ctrl/Cmd + Enter, live-region status
- [ ] Drag/drop .log/.txt/.json, paste input, toggle all categories
- [ ] Custom literal phrases with punctuation and duplicate entries
- [ ] Large file is rejected rather than frozen or silently truncated
- [ ] Clipboard permission denied: output can still be selected manually
- [ ] Export text file does not contain any intentionally masked test strings
- [ ] Private browsing: no stored raw data across reloads
- [ ] No raw input appears in network requests, crash logs or console logs
- [ ] CSP, HTTPS and security headers enforced on the production host
- [ ] PWA offline shell works after first successful install
- [ ] Social image preview renders correctly with deployed absolute image URL

## Known limits

Pattern matching is heuristic; names, IPv6, custom secret formats, and encoded credentials may remain. Do not market Veiltide as a comprehensive secrets scanner. There is no automated guarantee that the output is safe to publish.
