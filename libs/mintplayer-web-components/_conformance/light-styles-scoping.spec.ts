import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

import { getLightStyleEntries } from '@mintplayer/web-components/light-dom';
// Every component that installs a document-level sheet. Completeness is
// asserted below against the installLightStyles calls in the source.
import '@mintplayer/web-components/accordion';
import '@mintplayer/web-components/calendar';
import '@mintplayer/web-components/carousel';
import '@mintplayer/web-components/charts/hierarchy';
import '@mintplayer/web-components/charts/trend';
import '@mintplayer/web-components/code-snippet';
import '@mintplayer/web-components/datatable';
import '@mintplayer/web-components/datepicker';
import '@mintplayer/web-components/datetime-picker';
import '@mintplayer/web-components/dock';
import '@mintplayer/web-components/dropdown-menu';
import '@mintplayer/web-components/file-manager';
import '@mintplayer/web-components/input-group';
import '@mintplayer/web-components/multi-range';
import '@mintplayer/web-components/navbar';
import '@mintplayer/web-components/otp-input';
import '@mintplayer/web-components/phone-input';
import '@mintplayer/web-components/query-builder';
import '@mintplayer/web-components/ribbon';
import '@mintplayer/web-components/select';
import '@mintplayer/web-components/shell';
import '@mintplayer/web-components/signature-pad';
import '@mintplayer/web-components/splitter';
import '@mintplayer/web-components/theming';
import '@mintplayer/web-components/tile-manager';
import '@mintplayer/web-components/timeline';
import '@mintplayer/web-components/timepicker';
import '@mintplayer/web-components/tree-select';
import '@mintplayer/web-components/treeview';
import '@mintplayer/web-components/typeahead';

/**
 * The no-leak guarantee for every stylesheet installed at DOCUMENT level —
 * light-tier (emulated-encapsulation) components, and the document sheet a
 * slot-based component such as mp-card ships for its slotted content.
 *
 * A document-level sheet has no browser-enforced boundary, so the boundary has
 * to be *checked* rather than trusted. This suite is that check: it reads every
 * sheet registered through `installLightStyles` and proves each rule can only
 * match elements inside the owning component.
 *
 * Two independent assertions, because they fail in different ways:
 *  1. STATIC — every selector is scope-ANCHORED: some compound carries the
 *     component's own scope (`[data-mps=<scope>]`) or host tag, and only
 *     descendant/child combinators separate it from the subject, so a match
 *     always requires an element we stamped. A rule that lost its scope during a
 *     codegen change fails here even if nothing on the page collides with it yet.
 *  2. BEHAVIOURAL — no selector matches anything in a decoy tree built from the
 *     class names our components and Bootstrap share (`.badge`, `.card`,
 *     `.table`, `.form-control`, …). This is the assertion that answers "are you
 *     certain the Bootstrap styles cannot affect other Angular components?".
 *
 * Rules deliberately exempted carry `/*! @mps-global *\/` in the source SCSS and
 * are emitted verbatim; they are listed explicitly below so an exemption can
 * never be added silently.
 */

// vitest runs with the lib as its root; a workspace-root invocation is also
// supported so the suite behaves the same however it is launched.
const LIB_ROOT = existsSync(join(process.cwd(), 'light-dom'))
  ? process.cwd()
  : join(process.cwd(), 'libs', 'mintplayer-web-components');

/** Scope-qualified escapes, each justified. An entry here is a review decision. */
const ALLOWED_GLOBAL_SELECTORS: readonly string[] = [
  // (none yet — every converted component is fully scoped)
];

const walk = (dir: string, keep: (name: string) => boolean, acc: string[] = []): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, keep, acc);
    else if (keep(entry.name)) acc.push(full);
  }
  return acc;
};

const relative = (abs: string): string => abs.slice(LIB_ROOT.length + 1).replace(/\\/g, '/');

/**
 * The first argument of every `installLightStyles(…)` call in the lib's source:
 * a literal key, or a core's scope constant (`TREEVIEW_SCOPE`, whose value is
 * the core's name in kebab case). Each must be registered once the components
 * below are imported, so a new document-level sheet cannot dodge this suite by
 * not being imported here.
 */
const installedKeysInSource = (): string[] =>
  walk(LIB_ROOT, (name) => name.endsWith('.ts') && !name.endsWith('.spec.ts') && !name.endsWith('.d.ts'))
    .flatMap((abs) => [...readFileSync(abs, 'utf8').matchAll(/\binstallLightStyles\(\s*(?:(['"`])([^'"`]+)\1|([A-Z][A-Z0-9_]*)_SCOPE\b)/g)])
    .map((m) => m[2] ?? m[3].toLowerCase().replace(/_/g, '-'))
    .sort();

/**
 * The sheets actually installed at DOCUMENT level, read from the registry —
 * not from a filename glob. Issue #432: the card's global sheet was named
 * `card-global.styles.ts`, a glob for `*.light.styles.ts` never saw it, and its
 * unscoped `.text-bg-*` / `.card-*` rules leaked onto the whole page.
 */
const documentSheets = () =>
  getLightStyleEntries()
    .map((entry) => ({ key: entry.key, css: entry.cssText }))
    .filter((s) => s.css.trim().length > 0);

/**
 * Whether a selector can only match inside the owning component.
 *
 * The obvious rule — "every compound carries the scope" — is too strict. A rule
 * may legitimately target DOM the template rewriter cannot stamp (`unsafeHTML`
 * output, a consumer's icon SVG), and the safe form for those is to anchor on a
 * scoped ANCESTOR: `.treeview-icon[data-mps=treeview] svg`. A match still
 * requires an element we stamped, so nothing outside the component is reachable.
 *
 * A sibling combinator (`+`, `~`) directly after the anchor walks OUT of the
 * stamped subtree, and in the light DOM that sibling can be consumer content —
 * so such an anchor does not count. Once a descendant/child combinator has
 * entered the anchor's subtree, later sibling combinators stay inside it (a
 * sibling of a descendant shares its parent): `mp-card .card-link + .card-link`
 * is anchored.
 *
 * The host tag must be the compound's whole type selector: `mp-card` anchors,
 * `mp-card-group` does not.
 */
const isScopeAnchored = (
  compounds: string[],
  combinators: string[],
  scopeAttr: string,
  tag: string,
): boolean =>
  compounds.some((compound, i) => {
    const carriesScope = compound.includes(scopeAttr) || new RegExp(`^${tag}(?![\\w-])`).test(compound);
    if (!carriesScope) return false;
    // The anchor is the subject, or the next combinator descends into it.
    return i === compounds.length - 1 || combinators[i] === ' ' || combinators[i] === '>';
  });

/** Every compound selector in the sheet, flattened, with its rule for reporting. */
const compoundsOf = (css: string) => {
  const out: { selector: string; compounds: string[]; combinators: string[] }[] = [];
  postcss.parse(css).walkRules((rule) => {
    // Skip at-rules whose "selectors" are not element selectors.
    for (let p: unknown = rule.parent; p; p = (p as { parent?: unknown }).parent) {
      const node = p as { type?: string; name?: string };
      if (node.type === 'atrule' && /^(-\w+-)?keyframes$/i.test(node.name ?? '')) return;
    }
    for (const selector of rule.selectors) {
      const compounds: string[] = [];
      const combinators: string[] = [];
      selectorParser((root) => {
        root.each((sel) => {
          let current = '';
          sel.each((node) => {
            if (node.type === 'combinator') {
              if (current.trim()) compounds.push(current.trim());
              combinators.push(String(node).trim() === '' ? ' ' : String(node).trim());
              current = '';
            } else {
              current += String(node);
            }
          });
          if (current.trim()) compounds.push(current.trim());
        });
      }).processSync(selector);
      out.push({ selector, compounds, combinators });
    }
  });
  return out;
};

describe('document-level stylesheets are scoped to their own component', () => {
  const sheets = documentSheets();

  it('finds installed document-level stylesheets to check', () => {
    // A codegen regression that emits nothing must fail loudly rather than
    // making this whole suite vacuously green.
    expect(sheets.length).toBeGreaterThan(0);
  });

  // Walked at collection time: reading the whole lib inside a test body can
  // exceed the 5s test timeout when the full suite runs in parallel.
  const sourceKeys = installedKeysInSource();

  it('registers every sheet the source installs (the imports above are complete)', () => {
    const registered = getLightStyleEntries().map((e) => e.key);
    expect(sourceKeys.length).toBeGreaterThan(0);
    expect(sourceKeys.filter((key) => !registered.includes(key))).toEqual([]);
  });

  it('registers every generated light-tier sheet', () => {
    const registered = getLightStyleEntries().map((e) => e.key);
    const lightFiles = walk(LIB_ROOT, (name) => name.endsWith('.light.styles.ts'));
    const missing = lightFiles
      .map((abs) => ({ file: relative(abs), key: basename(abs, '.light.styles.ts').replace(/^mp-/, '') }))
      .filter(({ key }) => !registered.includes(key))
      .map(({ file }) => file);
    expect(missing).toEqual([]);
  });

  for (const sheet of sheets) {
    describe(sheet.key, () => {
      const tag = `mp-${sheet.key}`;
      const scopeAttr = `[data-mps=${sheet.key}]`;

      it('every compound carries the component scope or its host tag', () => {
        const unscoped: string[] = [];
        for (const { selector, compounds, combinators } of compoundsOf(sheet.css)) {
          if (ALLOWED_GLOBAL_SELECTORS.includes(selector)) continue;
          if (!isScopeAnchored(compounds, combinators, scopeAttr, tag)) unscoped.push(selector);
        }
        expect(unscoped).toEqual([]);
      });

      it('no selector matches an unrelated component that shares its class names', () => {
        // A stand-in for "some other Angular component on the same page".
        const decoy = document.createElement('div');
        decoy.innerHTML = `
          <span class="badge bg-success">x</span>
          <span class="badge text-bg-warning">w</span>
          <span class="text-bg-primary">p</span>
          <div class="card">
            <div class="card-header text-bg-dark">h</div>
            <img class="card-img-top" alt="" />
            <div class="card-body"><h5 class="card-title">t</h5><p class="card-text">x</p>
              <a class="card-link">a</a><a class="card-link">b</a></div>
            <div class="card-footer">f</div>
          </div>
          <table class="table"><thead><tr><th>h</th></tr></thead>
            <tbody><tr><td class="text-nowrap">c</td></tr></tbody></table>
          <input class="form-control form-control-sm" />
          <button class="btn btn-primary">b</button>
          <ul class="list-group"><li class="list-group-item">i</li></ul>
          <div class="alert alert-danger">a</div>
          <span class="treeview-body"><span class="treeview-icon">i</span></span>
          <div class="datatable-shell"><div class="datatable-scroll"></div></div>
        `;
        document.body.appendChild(decoy);
        try {
          const leaked: string[] = [];
          for (const { selector } of compoundsOf(sheet.css)) {
            if (ALLOWED_GLOBAL_SELECTORS.includes(selector)) continue;
            let matches = 0;
            try {
              matches = decoy.querySelectorAll(selector).length;
            } catch {
              // Selectors jsdom cannot parse (modern pseudo-classes) are covered
              // by the static assertion above; skip rather than fail spuriously.
              continue;
            }
            if (matches > 0) leaked.push(`${selector} matched ${matches} decoy element(s)`);
          }
          expect(leaked).toEqual([]);
        } finally {
          decoy.remove();
        }
      });
    });
  }
});
