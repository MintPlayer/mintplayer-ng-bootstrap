// S2 prototype: ROOT / SUB / ANCHORS classification, fail-closed, real guard emitter.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const R = 'C:/Repos/mintplayer-ng-bootstrap';
const require = createRequire(R + '/package.json');
const postcss = require('postcss');
const sp = require('postcss-selector-parser');
const { scopeBootstrapPart, OWNED_CLASSES } = await import(pathToFileURL(R + '/tools/scripts/lib/scope-bootstrap.mjs').href);
const D = process.argv[2];

const V = '(primary|secondary|success|info|warning|danger|light|dark)';
const BP = '(sm|md|lg|xl|xxl)';
// root: the component's outer element and its modifiers (guard: self only).
// sub: documented content of a root (guard: self, or inside an anchor).
const CLASSES = {
  accordion: { root: /^accordion(-flush)?$/, sub: /^accordion-(item|header|button|collapse|body)$/, anchors: ['.accordion'] },
  alert: { root: new RegExp(`^alert(-dismissible|-${V})?$`), sub: /^alert-(heading|link)$/, anchors: ['.alert'] },
  badge: { root: /^badge$/ },
  breadcrumb: { root: /^breadcrumb$/, sub: /^breadcrumb-item$/, anchors: ['.breadcrumb'] },
  'button-group': { root: /^(btn-group(-vertical|-sm|-lg)?|btn-toolbar)$/, sub: /^dropdown-toggle-split$/, anchors: ['.btn-group', '.btn-group-vertical'] },
  card: { root: /^card-group$/, sub: /^card(-.+)?$/, anchors: ['.card', '.card-group'] },
  carousel: { root: /^carousel(-fade|-dark)?$/, sub: /^carousel-.+$/, anchors: ['.carousel'] },
  close: { root: /^btn-close(-white)?$/ },
  containers: { root: /^container(-.+)?$/ },
  dropdown: {
    root: new RegExp(`^(dropup|dropend|dropdown|dropstart|dropup-center|dropdown-center|dropdown-toggle|dropdown-menu(-dark|-start|-end|-${BP}-(start|end))?)$`),
    sub: /^dropdown-(divider|item|header|item-text)$/, anchors: ['.dropdown-menu'],
  },
  forms: { root: /^$/, sub: /^(form-.+|col-form-label(-.+)?|input-group(-.+)?|btn-check|(in)?valid-(feedback|tooltip))$/, anchors: ['form', '.input-group', '.form-floating'] },
  grid: { root: /^(row|row-cols-.+|g[xy]?-.+)$/, sub: /^(col(-.+)?|offset-.+)$/, anchors: ['.row'] },
  'list-group': { root: /^list-group(-numbered|-flush|-horizontal(-.+)?)?$/, sub: /^list-group-item(-.+)?$/, anchors: ['.list-group'] },
  modal: { root: /^modal(-dialog(-.+)?|-content|-backdrop|-sm|-lg|-xl|-fullscreen(-.+)?)?$/, sub: /^modal-(header|title|body|footer)$/, anchors: ['.modal-content'] },
  nav: { root: /^(nav(-tabs|-pills|-underline|-fill|-justified)?|tab-content)$/, sub: /^nav-link$/, anchors: ['.nav', '.navbar-nav'] },
  navbar: { root: /^navbar(-expand(-.+)?|-dark)?$/, sub: /^navbar-(brand|nav|nav-scroll|text|collapse|toggler|toggler-icon)$/, anchors: ['.navbar'] },
  offcanvas: { root: new RegExp(`^offcanvas(-${BP}|-backdrop)?$`), sub: /^offcanvas-(header|title|body)$/, anchors: ['.offcanvas', '.offcanvas-sm', '.offcanvas-md', '.offcanvas-lg', '.offcanvas-xl', '.offcanvas-xxl'] },
  pagination: { root: /^pagination(-lg|-sm)?$/, sub: /^page-(item|link)$/, anchors: ['.pagination'] },
  placeholders: { root: /^placeholder-(glow|wave)$/, sub: /^placeholder(-xs|-sm|-lg)?$/, anchors: ['.placeholder-glow', '.placeholder-wave'] },
  popover: { root: /^(popover|bs-popover-.+)$/, sub: /^popover-(header|body)$/, anchors: ['.popover'] },
  progress: { root: /^progress(-stacked)?$/, sub: /^progress-bar(-.+)?$/, anchors: ['.progress', '.progress-stacked'] },
  spinners: { root: /^spinner-.+$/ },
  tables: { root: /^(table(-sm|-bordered|-borderless|-striped(-columns)?|-hover|-responsive(-.+)?)?|caption-top)$/, sub: new RegExp(`^table-(active|group-divider|${V.slice(1, -1)})$`), anchors: ['.table'] },
  toasts: { root: /^toast(-container)?$/, sub: /^toast-(header|body)$/, anchors: ['.toast'] },
  tooltip: { root: /^(tooltip|bs-tooltip-.+)$/, sub: /^tooltip-inner$/, anchors: ['.tooltip'] },
  transitions: { root: /^(fade|collapse|collapsing|collapse-horizontal)$/ },
};

function guard(isSub, anchors) {
  const arms = ['[data-mps]', ...(isSub ? anchors.map((a) => `${a}[data-mps] *`) : [])];
  return `:where(${arms.join(', ')})`;
}

function scope(css, partial) {
  const owns = OWNED_CLASSES[partial];
  const cls = CLASSES[partial];
  if (cls.sub && !cls.anchors?.length) throw new Error(`${partial}: sub classes without anchors`);
  const root = postcss.parse(css);
  const unclassified = new Set();
  root.walkRules((rule) => {
    for (let p = rule.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes|font-face|property|page|counter-style/.test(p.name)) return;
    rule.selector = sp((ss) => ss.each((s) => {
      let t = null;
      s.each((n) => { if (!t && n.type === 'class' && owns.test(n.value)) t = n; });
      if (!t) return;
      const isSub = !!cls.sub && cls.sub.test(t.value);
      if (!isSub && !cls.root.test(t.value)) unclassified.add(t.value);
      const g = sp().astSync(`a${guard(isSub, cls.anchors)}`).first.last; // the :where pseudo
      t.parent.insertAfter(t, g);
    })).processSync(rule.selector);
  });
  if (unclassified.size) throw new Error(`${partial}: unclassified ${[...unclassified].join(' ')}`);
  return root.toString();
}

const summary = {};
const rows = [];
for (const f of readdirSync(D).filter((f) => f.endsWith('.css'))) {
  const p = f.replace('.css', '');
  const css = readFileSync(D + '/' + f, 'utf8');
  const cur = scopeBootstrapPart(css, p).css;
  const nxt = scope(css, p);
  writeFileSync(`${D}/out/${p}.scoped.css`, nxt);
  const A = [], B = [];
  postcss.parse(cur).walkRules((r) => A.push(r.selector));
  postcss.parse(nxt).walkRules((r) => B.push(r.selector));
  let n = 0; const ex = [];
  A.forEach((s, i) => { if (s !== B[i]) { n++; ex.push([s, B[i]]); } });
  summary[p] = `${n}/${A.length}, +${nxt.length - cur.length}B`;
  if (n) rows.push(`${p} (${n})\n` + ex.slice(0, 4).map(([x, y]) => `  ${x.replace(/\s+/g, ' ')}\n  -> ${y.replace(/\s+/g, ' ')}`).join('\n'));
}
writeFileSync(D + '/proto2.out.txt', JSON.stringify(summary, null, 1) + '\n' + rows.join('\n'));
console.log(JSON.stringify(summary));
