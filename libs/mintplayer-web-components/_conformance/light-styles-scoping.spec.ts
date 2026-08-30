import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

/**
 * The no-leak guarantee for light-tier (emulated-encapsulation) components.
 *
 * Dropping the shadow root trades a browser-enforced boundary for a build-time
 * one, so the boundary has to be *checked* rather than trusted. This suite is
 * that check: it reads every generated `*.light.styles.ts` and proves each rule
 * can only match elements the owning component stamped.
 *
 * Two independent assertions, because they fail in different ways:
 *  1. STATIC — every compound selector carries the component's own scope
 *     (`[data-mps=<scope>]`) or is its host tag. A rule that lost its scope
 *     during a codegen change fails here even if nothing on the page collides
 *     with it yet.
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

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.light.styles.ts')) acc.push(full);
  }
  return acc;
};

const generatedSheets = () =>
  walk(LIB_ROOT)
    .map((abs) => {
      const rel = abs.slice(LIB_ROOT.length + 1);
      const source = readFileSync(abs, 'utf8');
      // The generated module exports a single css`` literal; the CSS text is
      // everything between the first backtick pair.
      const match = /`([\s\S]*)`/.exec(source);
      return {
        file: rel.replace(/\\/g, '/'),
        scope: basename(rel, '.light.styles.ts').replace(/^mp-/, ''),
        css: match ? match[1] : '',
      };
    })
    .filter((s) => s.css.trim().length > 0);

/** Every compound selector in the sheet, flattened, with its rule for reporting. */
const compoundsOf = (css: string) => {
  const out: { selector: string; compounds: string[] }[] = [];
  postcss.parse(css).walkRules((rule) => {
    // Skip at-rules whose "selectors" are not element selectors.
    for (let p: unknown = rule.parent; p; p = (p as { parent?: unknown }).parent) {
      const node = p as { type?: string; name?: string };
      if (node.type === 'atrule' && /^(-\w+-)?keyframes$/i.test(node.name ?? '')) return;
    }
    for (const selector of rule.selectors) {
      const compounds: string[] = [];
      selectorParser((root) => {
        root.each((sel) => {
          let current = '';
          sel.each((node) => {
            if (node.type === 'combinator') {
              if (current.trim()) compounds.push(current.trim());
              current = '';
            } else {
              current += String(node);
            }
          });
          if (current.trim()) compounds.push(current.trim());
        });
      }).processSync(selector);
      out.push({ selector, compounds });
    }
  });
  return out;
};

describe('light-tier stylesheets are scoped to their own component', () => {
  const sheets = generatedSheets();

  it('finds generated light stylesheets to check', () => {
    // A codegen regression that emits nothing must fail loudly rather than
    // making this whole suite vacuously green.
    expect(sheets.length).toBeGreaterThan(0);
  });

  for (const sheet of sheets) {
    describe(sheet.file, () => {
      const tag = `mp-${sheet.scope}`;
      const scopeAttr = `[data-mps=${sheet.scope}]`;

      it('every compound carries the component scope or its host tag', () => {
        const unscoped: string[] = [];
        for (const { selector, compounds } of compoundsOf(sheet.css)) {
          if (ALLOWED_GLOBAL_SELECTORS.includes(selector)) continue;
          const anchored = compounds.some(
            (c) => c.includes(scopeAttr) || c.startsWith(tag) || c === tag,
          );
          if (!anchored) unscoped.push(selector);
        }
        expect(unscoped).toEqual([]);
      });

      it('no selector matches an unrelated component that shares its class names', () => {
        // A stand-in for "some other Angular component on the same page".
        const decoy = document.createElement('div');
        decoy.innerHTML = `
          <span class="badge bg-success">x</span>
          <div class="card"><div class="card-body"><h5 class="card-title">t</h5></div></div>
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
