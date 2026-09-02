import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const TARGET = 'https://coverage.mintplayer.com/po/account/Accounts%2F48772716';
const OUT = 'out.json';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const resp = await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);
const finalUrl = page.url();
const status = resp?.status();

const result = await page.evaluate(() => {
  const trunc = (s, n = 400) => (s ?? '').slice(0, n);

  function chain(el) {
    const parts = [];
    let n = el;
    while (n) {
      if (n.nodeType === 1) {
        const e = n;
        const id = e.id ? `#${e.id}` : '';
        const cls = e.classList?.length ? '.' + [...e.classList].slice(0, 4).join('.') : '';
        const slot = e.getAttribute?.('slot') ? `[slot=${e.getAttribute('slot')}]` : '';
        parts.push(e.tagName.toLowerCase() + id + cls + slot);
        n = e.parentNode;
      } else if (n.nodeType === 11 && n.host) {
        parts.push(`#shadow-root(${n.host.tagName.toLowerCase()})`);
        n = n.host;
      } else if (n.nodeType === 9) {
        parts.push('#document');
        break;
      } else {
        n = n.parentNode;
      }
    }
    return parts.reverse().join(' > ');
  }

  function* walk(root) {
    const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let cur = it.currentNode;
    while (cur) {
      if (cur.nodeType === 1) {
        yield cur;
        if (cur.shadowRoot) yield* walk(cur.shadowRoot);
      }
      cur = it.nextNode();
    }
  }

  const all = [...walk(document)];

  const iconLike = (el) => {
    const t = el.tagName.toLowerCase();
    const cls = el.className && typeof el.className === 'string' ? el.className : '';
    return (
      /(^|\s)(bi|fa|fas|far|icon|material-icons)(\s|$)/.test(cls) ||
      /bi-info|fa-info|info-circle|icon-info/.test(cls) ||
      t === 'bs-icon' || t === 'mp-icon' || t === 'svg' || t === 'i' ||
      (t === 'button' && el.textContent.trim().length <= 2 && /i|ⓘ|info/i.test(el.textContent + (el.getAttribute('aria-label') || '') + (el.getAttribute('title') || '')))
    );
  };

  const inside = (el, tag) => {
    let n = el;
    while (n) {
      if (n.nodeType === 1 && n.tagName.toLowerCase() === tag) return true;
      n = n.nodeType === 11 ? n.host : n.parentNode;
    }
    return false;
  };

  function describe(el) {
    const cs = getComputedStyle(el);
    const before = getComputedStyle(el, '::before');
    const r = el.getBoundingClientRect();
    const root = el.getRootNode();
    return {
      chain: chain(el),
      outerHTML: trunc(el.outerHTML),
      rootType: root === document ? 'document' : `shadow(${root.host?.tagName.toLowerCase()})`,
      assignedSlot: el.assignedSlot ? `${el.assignedSlot.tagName.toLowerCase()}[name=${el.assignedSlot.name}] in ${el.assignedSlot.getRootNode().host?.tagName.toLowerCase()}` : null,
      fontFamily: cs.fontFamily,
      display: cs.display,
      width: r.width, height: r.height,
      beforeContent: before.content,
      beforeFontFamily: before.fontFamily,
      beforeDisplay: before.display,
      color: cs.color,
      visibility: cs.visibility,
      opacity: cs.opacity,
    };
  }

  const candidates = all.filter(iconLike);
  const inTab = candidates.filter((el) => inside(el, 'mp-tab-control') && !inside(el, 'mp-datatable'));
  const inDt = candidates.filter((el) => inside(el, 'mp-datatable'));

  // Collect all stylesheets: document + every shadow root
  const sheets = [];
  const pushSheets = (owner, list, kind) => {
    for (const s of list) {
      let rules = null, err = null;
      try { rules = s.cssRules; } catch (e) { err = String(e); }
      sheets.push({ owner, kind, href: s.href, ownerNode: s.ownerNode ? trunc(s.ownerNode.outerHTML, 120) : null, sheet: s, rules, err });
    }
  };
  pushSheets('document', document.styleSheets, 'styleSheets');
  pushSheets('document', document.adoptedStyleSheets, 'adopted');
  for (const el of all) {
    if (el.shadowRoot) {
      pushSheets(`shadow(${el.tagName.toLowerCase()})`, el.shadowRoot.styleSheets, 'styleSheets');
      pushSheets(`shadow(${el.tagName.toLowerCase()})`, el.shadowRoot.adoptedStyleSheets, 'adopted');
    }
  }

  function matchingRules(el) {
    const out = [];
    const visit = (rules, sheetInfo) => {
      for (const r of rules) {
        if (r.selectorText) {
          const sels = r.selectorText.split(',').map((s) => s.trim());
          for (const sel of sels) {
            const base = sel.replace(/::?(before|after)$/, '');
            let m = false;
            try { m = el.matches(base); } catch {}
            if (m) {
              out.push({ owner: sheetInfo.owner, kind: sheetInfo.kind, href: sheetInfo.href, ownerNode: sheetInfo.ownerNode, selector: sel, css: trunc(r.cssText, 300), wouldApply: sheetInfo.owner === 'document' ? el.getRootNode() === document : el.getRootNode().host?.tagName.toLowerCase() === sheetInfo.owner.replace(/^shadow\((.*)\)$/, '$1') });
            }
          }
        }
        if (r.cssRules) visit(r.cssRules, sheetInfo);
      }
    };
    for (const s of sheets) if (s.rules) visit(s.rules, s);
    return out;
  }

  const dt = document.querySelector('mp-datatable');
  const dtInfo = dt && dt.shadowRoot ? {
    adoptedCount: dt.shadowRoot.adoptedStyleSheets.length,
    styleSheetsCount: dt.shadowRoot.styleSheets.length,
    adopted: [...dt.shadowRoot.adoptedStyleSheets].map((s) => { try { return trunc([...s.cssRules].map((r) => r.cssText).join(' '), 200); } catch (e) { return String(e); } }),
    styleSheets: [...dt.shadowRoot.styleSheets].map((s) => { try { return trunc([...s.cssRules].map((r) => r.cssText).join(' '), 200); } catch (e) { return String(e); } }),
    headerHTML: trunc(dt.shadowRoot.querySelector('thead')?.outerHTML, 3000),
    lightChildren: [...dt.children].map((c) => trunc(c.outerHTML, 200)),
  } : null;

  const tc = document.querySelector('mp-tab-control');
  const tcInfo = tc && tc.shadowRoot ? {
    adoptedCount: tc.shadowRoot.adoptedStyleSheets.length,
    styleSheetsCount: tc.shadowRoot.styleSheets.length,
    shadowHTML: trunc(tc.shadowRoot.innerHTML, 1500),
  } : null;

  return {
    title: document.title,
    counts: { mpDatatable: document.querySelectorAll('mp-datatable').length, mpTabControl: document.querySelectorAll('mp-tab-control').length, bsDatatable: document.querySelectorAll('bs-datatable').length, candidates: candidates.length },
    inTabControl: inTab.map((el) => ({ ...describe(el), rules: matchingRules(el) })),
    inDatatable: inDt.map((el) => ({ ...describe(el), rules: matchingRules(el) })),
    sheetSummary: sheets.map((s) => ({ owner: s.owner, kind: s.kind, href: s.href, ownerNode: s.ownerNode, ruleCount: s.rules ? s.rules.length : null, err: s.err })),
    dtInfo,
    tcInfo,
  };
});

writeFileSync(OUT, JSON.stringify({ status, finalUrl, ...result }, null, 2));
await page.screenshot({ path: OUT.replace('out.json', 'page.png'), fullPage: true });
console.log(JSON.stringify({ status, finalUrl, counts: result.counts, tab: result.inTabControl.length, dt: result.inDatatable.length }));
await browser.close();
