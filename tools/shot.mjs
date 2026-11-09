// usage: node tools/shot.mjs <piece> <out_prefix> <w> <t1> [t2 ...]
// Launches one headless Chrome (private profile), renders ?cap stills, writes the canvas pixels as PNG
// to <out_prefix>_t<t>.png. Also prints console errors and per-still render ms.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [piece, prefix, w, ...ts] = process.argv.slice(2);
const prof = mkdtempSync(join(tmpdir(), 'gzcdp-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--user-data-dir=${prof}`, '--remote-debugging-port=0', '--mute-audio', '--hide-scrollbars', '--window-size=800,800', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const kill = () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(prof, { recursive: true, force: true }); } catch {} };
const timer = setTimeout(() => { console.error('TIMEOUT'); kill(); process.exit(2); }, 240000);
const wsUrl = await new Promise((res, rej) => { let buf = ''; chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); chrome.on('exit', () => rej(new Error('chrome exited'))); });
const port = new URL(wsUrl).port;
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); const errs = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errs.push(m.params.args.map(a => a.value ?? a.description).join(' ')); });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
for (const t of ts) {
  const url = `file://${ROOT}/index.html?cap&bench&p=${piece}&t=${t}&w=${w}`;
  await send('Page.navigate', { url });
  let ok = false; const t0 = Date.now();
  for (let i = 0; i < 600; i++) { const r = await send('Runtime.evaluate', { expression: 'window.__READY===true' }); if (r.result?.result?.value) { ok = true; break; } if (errs.length) break; await new Promise(r => setTimeout(r, 100)); }
  if (!ok) { console.error('NOT READY', t, errs.join('\n')); continue; }
  const r = await send('Runtime.evaluate', { expression: `document.querySelector('canvas').toDataURL('image/png')`, returnByValue: true });
  const data = r.result.result.value.split(',')[1];
  const out = `${prefix}_t${t}.png`; writeFileSync(out, Buffer.from(data, 'base64'));
  const ms = (await send('Runtime.evaluate', { expression: 'JSON.stringify({init:window.__INIT,first:window.__MS,avgDraw:window.__BENCH})', returnByValue: true })).result?.result?.value;
  console.log(`ok ${out} wall=${Date.now() - t0}ms ${ms}`);
}
if (errs.length) console.error('ERRORS:\n' + errs.join('\n'));
clearTimeout(timer); ws.close(); kill(); process.exit(0);
