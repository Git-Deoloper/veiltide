# Security policy

Veiltide operates locally in your browser or as an offline Node.js CLI. It does not submit text to any service. **It is a heuristic tool, not a certified secrets scanner, DLP control, or anonymization guarantee.**

## Reporting a vulnerability

Use GitHub Private Vulnerability Reporting through **Security → Advisories → Report a vulnerability** when enabled. Do not post real secrets, undisclosed exploit details, or private logs in public issues. If private reporting isn't available, first ask maintainers for a private reporting channel without sharing exploit details.

## What the software does and does not protect

- Text is processed in memory, without analytics, accounts, or network API requests.
- Raw text remains in the editable input pane until you clear it or close the tab.
- Users explicitly choose whether to copy or download sanitized output.
- Detection uses deterministic patterns and can miss unfamiliar tokens, names, postal addresses, dates, identifiers, or encoded secrets. False positives are possible.
- The output should always be inspected before being pasted into public services.
- If a real credential was exposed previously, **rotate or revoke it**. Masking later copies does not make the original exposure safe.
- Clipboard contents and downloaded output may persist in your operating system; manage those with care.
- A hostile browser extension, compromised browser, or malicious hosting script can defeat local privacy assumptions. Inspect the source and deployed headers if handling valuable data.

## Maintainer safeguards

Run tests and verify external dependencies before release. Use GitHub branch protection, minimal Actions permissions, private vulnerability reporting, and secret scanning where available. Never use production secrets in tests, docs, or screenshots. Avoid deploying from an unreviewed fork. Static hosting should enforce `_headers` and HTTPS.
