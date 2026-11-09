// usage: node tools/shot.mjs <piece> <out_prefix> <w> <t1> [t2 ...]
// Launches one headless Chrome (private profile), renders ?cap stills, writes the canvas pixels as PNG
// to <out_prefix>_t<t>.png. Also prints console errors and per-still render ms.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [out, pageUrl = `file://${ROOT}/dist/godzilla-nights.html`] = process.argv.slice(2);
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
await send('Emulation.setDeviceMetricsOverride',{width:1728,height:1117,deviceScaleFactor:2,mobile:false});
await send("Page.navigate",{url:pageUrl});
await new Promise(r=>setTimeout(r,4000));
const fps=(await send('Runtime.evaluate',{expression:`new Promise(r=>{let n=0;const s=performance.now();(function f(){n++; if(performance.now()-s<2000) requestAnimationFrame(f); else r(n/2)})()})`,awaitPromise:true})).result.result.value;
const sc=await send('Page.captureScreenshot',{format:'jpeg',quality:85});
writeFileSync(out,Buffer.from(sc.result.data,'base64')); console.log('fps',fps,out);
if (errs.length) console.error('ERRORS:\n' + errs.join('\n'));
clearTimeout(timer); ws.close(); kill(); process.exit(0);
