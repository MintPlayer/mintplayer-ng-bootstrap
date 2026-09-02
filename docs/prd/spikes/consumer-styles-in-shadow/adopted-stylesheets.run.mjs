// Playwright spike: adoptedStyleSheets vs Bootstrap subset. Run: node run-spike.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../../../../package.json', import.meta.url));
const { chromium, firefox, webkit } = require('playwright');
const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4517;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  const p = path.join(DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'max-age=3600' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(PORT, r));
const BASE = `http://localhost:${PORT}/adopted-stylesheets.html`;

const results = { sizes: {}, browsers: {} };
for (const f of ['bootstrap-subset.css', 'bootstrap-full.css', 'bi.css']) {
  const b = fs.readFileSync(path.join(DIR, f));
  results.sizes[f] = { raw: b.length, gzip: zlib.gzipSync(b, { level: 9 }).length, brotli: zlib.brotliCompressSync(b).length };
}

const PROBES = ':root{--spike-root:root-matched} :host{--spike-host:host-matched} html{--spike-html:html-matched} body{--spike-body:body-matched} .leak{color:rgb(9,9,9)}';

async function adopt(page, texts) {
  return page.evaluate((texts) => {
    const r = document.getElementById('host').shadowRoot;
    r.adoptedStyleSheets = texts.map(t => makeSheet(t));
  }, texts);
}
// 400ms: Bootstrap .btn has a 150ms colour transition; the first run caught mid-transition values
async function settle(page) { await page.evaluate(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 400))))); }
async function iconHash(page) { const buf = await page.locator('#host #icon').screenshot(); return (await import('node:crypto')).createHash('sha1').update(buf).digest('hex').slice(0, 10); }
async function go(page, flags) { await page.goto(BASE + '?' + new URLSearchParams(flags)); await page.waitForLoadState('load'); await settle(page); }

async function runBrowser(name, type, launchOpts) {
  const out = { ranOK: false, scenarios: {} };
  let browser;
  try { browser = await type.launch(launchOpts); } catch (e) { out.launchError = String(e).slice(0, 300); return out; }
  out.version = browser.version();
  const page = await browser.newPage();
  page.on('pageerror', e => (out.pageErrors ??= []).push(String(e)));
  try {
    const subset = fs.readFileSync(path.join(DIR, 'bootstrap-subset.css'), 'utf8');
    const bi = fs.readFileSync(path.join(DIR, 'bi.css'), 'utf8').replace(/url\("\.\/fonts\//g, `url("http://localhost:${PORT}/fonts/`);

    // S0 baseline: doc has bootstrap link + icons css; shadow adopts nothing
    await go(page, { bs: 1, ff: 'doc' });
    out.scenarios.S0_baseline = await page.evaluate(() => measure());

    // S1: doc has link; shadow adopts subset + probes. Font-face variants:
    // S1a: @font-face only in document (bi.css linked), adopted sheet has icon CLASS rules only (bi.css minus @font-face)
    const biNoFace = bi.replace(/@font-face\s*{[^}]*}/s, '');
    await go(page, { bs: 1, ff: 'doc' });
    await adopt(page, [subset + PROBES, biNoFace]); await settle(page);
    out.scenarios.S1a_fontface_doc_only = await page.evaluate(() => measure());
    out.scenarios.S1a_fontface_doc_only.iconPixelHash = await iconHash(page);
    // S1b: @font-face ONLY in adopted sheet (document has no bi.css)
    await go(page, { bs: 1 });
    await adopt(page, [subset + PROBES, bi]); await settle(page);
    await page.evaluate(() => document.fonts.load('16px "bootstrap-icons"').catch(() => null)); await settle(page);
    out.scenarios.S1b_fontface_adopted_only = await page.evaluate(() => measure());
    out.scenarios.S1b_fontface_adopted_only.iconPixelHash = await iconHash(page);
    // S1c: both
    await go(page, { bs: 1, ff: 'doc' });
    await adopt(page, [subset + PROBES, bi]); await settle(page);
    out.scenarios.S1c_fontface_both = await page.evaluate(() => measure());
    // S1d: fonts in document but icon class rules only via adopted sheet, no doc bi.css: font-face injected into document <style> at runtime (the article's recommendation)
    await go(page, { bs: 1 });
    await page.evaluate((face) => { const s = document.createElement('style'); s.textContent = face; document.head.appendChild(s); }, bi.match(/@font-face\s*{[^}]*}/s)[0]);
    await adopt(page, [subset + PROBES, biNoFace]); await settle(page);
    out.scenarios.S1d_fontface_injected_into_doc = await page.evaluate(() => measure());

    // S2: doc does NOT load bootstrap; shadow adopts subset only
    await go(page, {});
    await adopt(page, [subset + PROBES]); await settle(page);
    out.scenarios.S2_adopt_only_no_doc_bootstrap = await page.evaluate(() => measure());
    // S2 fix: :root -> :host rewrite
    await go(page, {});
    await adopt(page, [subset.replace(/:root/g, ':host') + PROBES]); await settle(page);
    out.scenarios.S2b_adopt_only_root_rewritten_to_host = await page.evaluate(() => measure());

    // S3: mirror document sheets (with a cross-origin CDN link present)
    await go(page, { bs: 1, ff: 'doc', cdn: 1 });
    out.scenarios.S3_mirror = await page.evaluate(async () => {
      const r = document.getElementById('host').shadowRoot;
      const log = { sheets: [] };
      const readable = (ss) => { try { return Array.from(ss.cssRules).map(x => x.cssText).join(''); } catch (e) { return { error: e.name + ': ' + e.message }; } };
      const mirror = () => {
        const sheets = [];
        for (const ss of document.styleSheets) {
          const t = readable(ss);
          log.sheets.push({ href: ss.href, ownerTag: ss.ownerNode?.tagName, ok: typeof t === 'string', len: typeof t === 'string' ? t.length : t.error });
          if (typeof t === 'string') sheets.push(makeSheet(t));
        }
        r.adoptedStyleSheets = sheets;
      };
      mirror();
      await new Promise(x => setTimeout(x, 30));
      log.afterMirror = measure();
      // now append a NEW angular-style <style> after the fact
      const s = document.createElement('style'); s.textContent = '.hdr2[_ngcontent-y]{color:rgb(4,5,6)}'; document.head.appendChild(s);
      await new Promise(x => setTimeout(x, 30));
      log.afterAppend_noObserver = { hdr2: measure().hdr2, docSheetCount: document.styleSheets.length, adopted: r.adoptedStyleSheets.length };
      // install observer + re-mirror
      let fired = 0;
      const mo = new MutationObserver(() => { fired++; log.sheets = []; mirror(); });
      mo.observe(document.head, { childList: true, subtree: true, characterData: true });
      const s2 = document.createElement('style'); s2.textContent = '.hdr2[_ngcontent-y]{color:rgb(7,8,9)}'; document.head.appendChild(s2);
      await new Promise(x => setTimeout(x, 50));
      log.afterAppend_withObserver = { hdr2: measure().hdr2, observerFired: fired, adopted: r.adoptedStyleSheets.length };
      // Angular also MUTATES existing style nodes' text (styles removed / replaced); a childList observer on head sees textContent replacement as childList of the <style>
      s2.textContent = '.hdr2[_ngcontent-y]{color:rgb(10,11,12)}';
      await new Promise(x => setTimeout(x, 50));
      log.afterTextMutation = { hdr2: measure().hdr2, observerFired: fired };
      // insertRule on an existing sheet (CSSOM mutation, no DOM mutation) -> observer blind
      document.getElementById('ng-emulated').sheet.insertRule('.hdr2[_ngcontent-y]{color:rgb(13,14,15)}');
      await new Promise(x => setTimeout(x, 50));
      log.afterInsertRule_CSSOM = { hdr2: measure().hdr2, observerFired: fired, note: 'insertRule is a CSSOM mutation; MutationObserver cannot see it' };
      mo.disconnect();
      return log;
    });

    // S3 timing: mirror full bootstrap into N roots, shared vs per-root
    const full = fs.readFileSync(path.join(DIR, 'bootstrap-full.css'), 'utf8');
    out.scenarios.S3_timing = await page.evaluate(async (full) => {
      const res = {};
      const gc = () => (window.gc ? (window.gc(), true) : false);
      const mem = () => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024) : null;
      const many = document.getElementById('many');
      const makeRoots = (n) => { many.innerHTML = ''; const roots = []; for (let i = 0; i < n; i++) { const d = document.createElement('div'); many.appendChild(d); const r = d.attachShadow({ mode: 'open' }); r.innerHTML = '<button class="btn btn-primary">x</button><p>p</p>'; roots.push(r); } return roots; };
      const forceStyle = (roots) => { let w = 0; for (const r of roots) w += r.firstElementChild.offsetWidth; return w; };
      for (const n of [1, 50, 500]) {
        for (const mode of ['shared', 'perRoot']) {
          const roots = makeRoots(n); forceStyle(roots);
          gc(); const m0 = mem();
          const t0 = performance.now();
          if (mode === 'shared') { const s = makeSheet(full); for (const r of roots) r.adoptedStyleSheets = [s]; }
          else { for (const r of roots) r.adoptedStyleSheets = [makeSheet(full)]; }
          const t1 = performance.now();
          forceStyle(roots);
          const t2 = performance.now();
          const m1 = mem();
          res[`${mode}_${n}`] = { adoptMs: +(t1 - t0).toFixed(2), styleRecalcMs: +(t2 - t1).toFixed(2), totalMs: +(t2 - t0).toFixed(2), heapDeltaKB: (m0 != null && m1 != null) ? m1 - m0 : null };
          await new Promise(r => setTimeout(r, 0));
        }
      }
      // parse cost alone
      const t0 = performance.now(); for (let i = 0; i < 20; i++) makeSheet(full); res.parseFullCss_avgMs = +((performance.now() - t0) / 20).toFixed(2);
      many.innerHTML = '';
      return res;
    }, full);

    // S4: cascade order
    await go(page, { bs: 1 });
    out.scenarios.S4_cascade = await page.evaluate(() => {
      const r = document.getElementById('host').shadowRoot;
      const cas = () => getComputedStyle(r.getElementById('cas')).letterSpacing;
      const hostC = () => getComputedStyle(document.getElementById('host')).color;
      const A = makeSheet('.cas{letter-spacing:2px} :host{color:rgb(20,20,20)}'); // "bootstrap" adopted
      const B = makeSheet('.cas{letter-spacing:3px} :host{color:rgb(30,30,30)}'); // "Lit static styles"
      const o = {};
      r.adoptedStyleSheets = []; o.shadowStyleOnly = cas();
      r.adoptedStyleSheets = [A]; o.shadowStyle1px_vs_adoptedA2px = cas();
      r.adoptedStyleSheets = [A, B]; o.order_A_then_B = { cas: cas(), host: hostC() };
      r.adoptedStyleSheets = [B, A]; o.order_B_then_A = { cas: cas(), host: hostC() };
      // Chromium first run: reordering the SAME sheet objects did not restyle. Isolate: clear first, and fresh objects.
      r.adoptedStyleSheets = []; void cas(); r.adoptedStyleSheets = [B, A]; o.order_B_then_A_afterClear = { cas: cas(), host: hostC() };
      const A2 = makeSheet('.cas{letter-spacing:2px} :host{color:rgb(20,20,20)}'), B2 = makeSheet('.cas{letter-spacing:3px} :host{color:rgb(30,30,30)}');
      r.adoptedStyleSheets = [A2, B2]; void cas(); r.adoptedStyleSheets = [B2, A2]; o.order_B_then_A_freshObjects_reordered = { cas: cas(), host: hostC() };
      const A3 = makeSheet('.cas{letter-spacing:2px}'), B3 = makeSheet('.cas{letter-spacing:3px}');
      r.adoptedStyleSheets = [B3, A3]; o.order_B_then_A_freshObjects_firstAssign = { cas: cas() };
      r.adoptedStyleSheets = [A, B]; void cas();
      // in-place mutation (push) instead of reassign
      r.adoptedStyleSheets = [A]; void cas(); r.adoptedStyleSheets.push(B); o.push_B_after_A = { cas: cas() };
      // shadow <style> with higher specificity beats adopted on specificity, not order
      r.getElementById('shadow-style').textContent = '.cas.btn{letter-spacing:1px}';
      r.adoptedStyleSheets = [A, B]; o.shadowStyleHigherSpecificity_vs_adopted = cas();
      r.getElementById('shadow-style').textContent = '.cas{letter-spacing:1px}';
      // outer document rule on the host element vs :host in adopted sheet
      const ds = document.createElement('style'); ds.textContent = '#host{color:rgb(40,40,40)}'; document.head.appendChild(ds);
      o.documentRuleOnHost_vs_adoptedHostRule = hostC(); ds.remove();
      // !important in adopted vs shadow <style>
      r.getElementById('shadow-style').textContent = '.cas{letter-spacing:1px !important}';
      o.shadowStyleImportant_vs_adopted = cas();
      r.getElementById('shadow-style').textContent = '.cas{letter-spacing:1px}';
      r.adoptedStyleSheets = [];
      return o;
    });

    // S5: leak + slotted (S2 conditions: no doc bootstrap)
    await go(page, {});
    await adopt(page, [subset + PROBES]); await settle(page);
    const m5 = await page.evaluate(() => measure());
    out.scenarios.S5_leak_and_slotted_noDocBootstrap = { leak: m5.leak, slotted: m5.slotted, shadowBtn: m5.btn };
    await go(page, { bs: 1 });
    await adopt(page, [subset + PROBES]); await settle(page);
    const m5b = await page.evaluate(() => measure());
    out.scenarios.S5_slotted_withDocBootstrap = { slotted: m5b.slotted, leak: m5b.leak };

    // S6: DSD with <link> inside shadow template
    await go(page, {});
    out.scenarios.S6_dsd_link = await page.evaluate(async () => {
      const tpl = (i) => `<x-dsd id="d${i}"><template shadowrootmode="open"><link rel="stylesheet" href="bootstrap-subset.css?dsd=1"><button class="btn btn-primary">dsd ${i}</button><p>p</p></template></x-dsd>`;
      const area = document.getElementById('dsd-area');
      // setHTMLUnsafe parses DSD templates from script (innerHTML does not)
      const html = tpl(1) + tpl(2) + tpl(3);
      let parsedVia;
      if (area.setHTMLUnsafe) { area.setHTMLUnsafe(html); parsedVia = 'setHTMLUnsafe'; }
      else { const d = new DOMParser().parseFromString(html, 'text/html', { includeShadowRoots: true }); area.replaceChildren(...document.adoptNode(d.body).childNodes); parsedVia = 'DOMParser'; }
      await new Promise(r => setTimeout(r, 800));
      const roots = [1, 2, 3].map(i => document.getElementById('d' + i)?.shadowRoot);
      const entries = performance.getEntriesByType('resource').filter(e => e.name.includes('dsd=1'));
      return {
        parsedVia,
        shadowRootsCreated: roots.filter(Boolean).length,
        btnBg: roots.map(r => r && getComputedStyle(r.querySelector('button')).backgroundColor),
        pMarginTop_0px_means_reboot_applied: roots.map(r => r && getComputedStyle(r.querySelector('p')).marginTop),
        btnBorderRadius: roots.map(r => r && getComputedStyle(r.querySelector('button')).borderRadius),
        note: 'document does NOT load bootstrap here, so btn bg is transparent: --bs-primary from :root is undefined (same failure as S2)',
        resourceEntriesForSharedUrl: entries.length,
        transferSizes: entries.map(e => e.transferSize),
        linkTagBytes: '<link rel="stylesheet" href="bootstrap-subset.css">'.length,
        docStyleSheetsIncludesShadowLinks: document.styleSheets.length,
      };
    });
    // count actual HTTP requests for the dsd URL as seen by the server would be more reliable; we log resource entries above
    out.ranOK = true;
  } catch (e) { out.error = String(e && e.stack || e).slice(0, 1500); }
  await browser.close();
  return out;
}

const hits = {}; server.on('request', (req) => { if (req.url.includes('dsd=1')) hits[current] = (hits[current] || 0) + 1; });
let current = '';
for (const [name, type, opts] of [
  ['chromium', chromium, { args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] }],
  ['firefox', firefox, {}],
  ['webkit', webkit, {}],
]) {
  current = name;
  console.log('running', name);
  results.browsers[name] = await runBrowser(name, type, opts);
  results.browsers[name].serverHitsForDsdUrl = hits[name] || 0;
  console.log(name, results.browsers[name].ranOK ? 'ok' : 'FAILED', results.browsers[name].launchError || results.browsers[name].error || '');
}
server.close();
fs.writeFileSync(path.join(DIR, 'adopted-stylesheets.results.json'), JSON.stringify(results, null, 2));
console.log('wrote results.json');
