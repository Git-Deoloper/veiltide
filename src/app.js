import { redact, summarize, MAX_TEXT_LENGTH } from './redact.js';

const $ = id => document.getElementById(id);
const input = $('source-text');
const output = $('result-text');
const fileInput = $('file-input');
const sourceWrap = $('input-wrap');
const toggles = [...document.querySelectorAll('[data-option]')];
const EXAMPLE = `[2026-10-21 09:42:12] ERROR request failed: 401\nrequest_id=vt_72a4\ncustomer_email: alex@example.com\nAuthorization: Bearer exampleTokenForPreviewOnly1234\napi_key = sampleCredentialValue_12345\nclient_ip=203.0.113.42\nsource=/Users/sampleuser/projects/checkout/app.log\nmessage=Could not reach /v1/checkout. Retry scheduled.`;
let lastResult = null;
let hiddenOriginal = false;

function announce(message) {
  $('announce').textContent = message;
}
function readOptions() {
  const result = Object.fromEntries(toggles.map(toggle => [toggle.dataset.option, toggle.checked]));
  result.custom = $('custom-terms').value.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0,20);
  return result;
}
function displayCount(value) { return `${value.toLocaleString()} character${value === 1 ? '' : 's'}`; }
function refresh() {
  $('input-count').textContent = displayCount(input.value.length);
  try {
    lastResult = redact(input.value, readOptions());
    output.value = lastResult.output;
    $('output-count').textContent = displayCount(lastResult.output.length);
    $('finding-total').textContent = `${lastResult.total} pattern${lastResult.total === 1 ? '' : 's'} masked`;
    $('finding-details').textContent = input.value.length ? summarize(lastResult) : 'Paste text or try the example to begin.';
    $('output-label').textContent = input.value.length ? (lastResult.changed ? 'Review the full result before sharing' : 'No common sensitive patterns found — review manually') : 'Waiting for input';
    $('copy-output').disabled = $('download-output').disabled = input.value.length === 0;
    $('live-status').innerHTML = input.value.length ? '<span></span> LOCAL ANALYSIS COMPLETE' : '<span></span> READY TO REVIEW';
  } catch (error) {
    lastResult = null;
    output.value = '';
    $('output-count').textContent = '0 characters';
    $('finding-total').textContent = 'Please review your settings';
    $('finding-details').textContent = error.message;
    $('output-label').textContent = 'Output unavailable';
    $('copy-output').disabled = $('download-output').disabled = true;
    $('live-status').textContent = 'SETTINGS NEED ATTENTION';
  }
}

function cleanImportedText(file) {
  if (!file) return;
  if (file.size > MAX_TEXT_LENGTH * 3) { announce('File too large. Limit is 1 MB of text.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string' || reader.result.length > MAX_TEXT_LENGTH) {
      announce('File exceeds the maximum text length.'); return;
    }
    input.value = reader.result;
    refresh();
    announce(`Imported ${file.name}. No upload occurred.`);
  };
  reader.onerror = () => announce('Unable to read that file.');
  reader.readAsText(file);
}

input.addEventListener('input', refresh);
$('custom-terms').addEventListener('input', refresh);
toggles.forEach(toggle => toggle.addEventListener('change', refresh));
$('load-example').addEventListener('click', () => { input.value = EXAMPLE; refresh(); announce('Loaded a fictional example.'); });
$('clear-all').addEventListener('click', () => { input.value = ''; $('custom-terms').value = ''; fileInput.value = ''; refresh(); announce('Cleared the workspace.'); input.focus(); });
$('hide-original').addEventListener('click', () => {
  hiddenOriginal = !hiddenOriginal;
  sourceWrap.classList.toggle('obscured', hiddenOriginal);
  $('hide-original').textContent = hiddenOriginal ? 'Reveal' : 'Hide';
  $('hide-original').setAttribute('aria-pressed', String(hiddenOriginal));
  announce(hiddenOriginal ? 'Original text visually obscured.' : 'Original text visible.');
});
$('open-file').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => cleanImportedText(fileInput.files?.[0]));
for (const eventName of ['dragenter','dragover']) sourceWrap.addEventListener(eventName, event => {event.preventDefault(); $('drop-overlay').hidden = false;});
for (const eventName of ['dragleave','drop']) sourceWrap.addEventListener(eventName, event => {event.preventDefault();$('drop-overlay').hidden = true;if(eventName==='drop') cleanImportedText(event.dataTransfer?.files?.[0]);});

async function copyOutput() {
  if (!lastResult || !input.value) return;
  try {
    await navigator.clipboard.writeText(lastResult.output);
    announce('Sanitized preview copied. Review before sharing.');
    const button = $('copy-output');
    button.firstChild.textContent = 'Copied! ';
    window.setTimeout(() => button.firstChild.textContent = 'Copy sanitized text ', 1800);
  } catch {
    output.focus();output.select();
    announce('Clipboard unavailable. Sanitized output is selected for manual copying.');
  }
}
$('copy-output').addEventListener('click', copyOutput);
$('download-output').addEventListener('click', () => {
  if (!lastResult || !input.value) return;
  const url = URL.createObjectURL(new Blob([lastResult.output], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');link.href = url;link.download = 'veiltide-redacted.txt';document.body.append(link);link.click();link.remove();window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  announce('Downloaded sanitized text. Review before sharing.');
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {event.preventDefault();refresh();announce('Review refreshed.');}
});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
refresh();
