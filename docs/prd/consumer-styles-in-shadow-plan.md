# Plan — Consumer styles inside web-component shadow roots

PRD: [consumer-styles-in-shadow.md](./consumer-styles-in-shadow.md). Status: **Not executed — D0
chose O3** (2026-09-02).

This plan describes **O2** (keep shadow DOM, mirror the document's stylesheets into the four
consumer-DOM-adopting components). D0 picked **O3**, the light-DOM branch this file lives on, so
Milestones 0–4 are shelved and kept only as the ready-made fallback for a component that cannot
leave the shadow DOM. What still applies from here is **Milestone 5** (documentation and the
CLAUDE.md gotchas, which hold regardless of the mechanism) plus one item surfaced by verifying O3:
a datatable e2e that asserts computed padding/border on a consumer-rendered `<td>` (PRD §9).

Rules that apply throughout: one PR for everything here; commit per milestone, push once at the
end; run the build + unit + e2e sweep once after M4, not per milestone; verify intermediate work by
type-check and reading.

## Milestone 0 — Spikes (gate O2; none touches library source)

All under `docs/prd/spikes/consumer-styles-in-shadow/`, Playwright node scripts, three engines
where the demo permits. Each has a pass criterion; a fail stops the plan and returns to D0 (O3 or O4).

| Spike | What | Pass criterion |
|---|---|---|
| **S-O2.1 Angular churn** | Inject the prototype mirror (`document-styles.mjs`, standalone) into the running `ng-bootstrap-demo`; navigate datatables → treeview → tree-select → query-builder → home → back; log `MutationObserver` batches, re-mirror time per batch, total; after each navigation diff the mirrored rule set against `document.styleSheets` flattened. | Rule sets identical after every navigation (no stale, no missing); total re-mirror time < 50 ms per navigation on Chromium; no rule applied twice (probe an `[_ngcontent-*]` element for one matching mirrored rule). |
| **S-O2.2 `@import` and `@layer`** | Test page with a document sheet using `@import url(...)`, nested `@layer a, b` and a `@layer` inside the imported sheet; flatten; adopt. | `replaceSync` receives no `@import`; computed values inside the shadow equal the document's for the same markup; layer order preserved (a rule in `@layer a` loses to `@layer b` in both trees). |
| **S-O2.3 Chrome regression** | Screenshot the four demo pages (datatable, treeview, tree-select, query-builder) with the mirror on and off, in (a) the Angular demo (trimmed subset) and (b) the React or Vue demo (full `bootstrap.min.css`). Pixel-diff; for every differing region list the page rule now applying to component chrome. | Every difference is either accepted explicitly in the PRD §6 D3 note or fixed by a chrome rule in the component's own SCSS (which wins ties by array order). No change to consumer content is a regression by definition. |
| **S-O2.4 Nesting** | `mp-file-manager` demo: inner datatable and treeview inside the file-manager shadow. | Inner components' consumer content styled; no rule applied twice (file-manager's `adoptLightStyles` registry vs the inner mirror); disposal on file-manager removal leaves no listeners (count observer callbacks after removal = 0). |

Also re-run the existing `adopted-stylesheets.run.mjs` once against the flattening code path (S1,
S4) so the shared-object and ordering facts are checked on the real implementation, not the
prototype.

## Milestone 1 — `document-styles` module (framework-agnostic)

`libs/mintplayer-web-components/document-styles/` (barrel, `src/document-styles.ts`, vitest spec).

- `getDocumentStyleMirror(doc = document)` — one instance per `Document`, stored on
  `globalThis[Symbol.for('mp.documentStyles')]` so two copies of the package share it (same
  pattern as the `mp.lightStyles` registry on the 2026-08 branches; reuse that file's SSR guard —
  it must test `document.head`, not `typeof document`, because `@lit-labs/ssr`'s shim defines a
  headless `document`).
- Per source sheet: `WeakMap<CSSStyleSheet, CSSStyleSheet>` source → constructed. Flatten rules
  recursively (`CSSImportRule.styleSheet.cssRules`), skip `CSSFontFaceRule` (inert in shadow roots
  — Chromium/Firefox) and any rule whose `cssText` fails `replaceSync` (log once, `console.warn`
  with the sheet href). Cross-origin sheets: catch `SecurityError`, record the href in
  `mirror.unreadable` (exposed for the demo's diagnostics panel and the README guidance).
- Sync: `MutationObserver` on `document.documentElement` (`childList`, `subtree`,
  `characterData`) filtered to `STYLE`/`LINK[rel~=stylesheet]` nodes, plus `load` on new links;
  batched with `queueMicrotask`. Public `refresh()` for `insertRule()` users.
- `adoptDocumentStyles(root: ShadowRoot, componentStyles: CSSStyleSheet[]): () => void` — sets
  `root.adoptedStyleSheets = [...mirrored, ...componentStyles]` **as a fresh array on every
   update** (Chromium ignores in-place reorders), subscribes, returns a disposer. Falls back to
  `<style>` elements when constructed sheets are unavailable (older WebKit; keep the same fallback
  the registry already has).
- Tests (jsdom): flattening of nested imports; font-face skipped; cross-origin recorded not thrown;
  observer add/remove/replace; disposer removes the subscription; two `adoptDocumentStyles` on one
  root do not duplicate; array order.

Verify by `tsc --noEmit` and reading. Commit.

## Milestone 2 — Adopt in the four components

For `mp-datatable`, `mp-treeview`, `mp-tree-select`, `mp-query-condition` (and `mp-query-builder`
only if it mounts consumer DOM itself — check `EditorFactory` plumbing):

- Override `createRenderRoot()` to capture the root; in `connectedCallback` (guarded by
  `renderRoot instanceof ShadowRoot` and the absence of the `isolate-styles` attribute) call
  `adoptDocumentStyles(root, this.constructor.elementStyles.map(s => s.styleSheet))`; dispose in
  `disconnectedCallback`. Lit's own `adoptStyles` runs in `createRenderRoot`; our array replaces it,
  so the component's sheets come **last** and win ties over Bootstrap reboot (T5).
- New public property `styleSheets: CSSStyleSheet[]` (attribute-less), appended after the mirror
  and before component styles; changes re-compose the array. This is #408's option 2.
- Where S-O2.3 flagged chrome regressions, add the specific rule to the component's SCSS (rerun
  `nx run mintplayer-web-components:codegen-wc` — generated `.styles.ts` are gitignored).
- Per-component `*.aria.spec.ts` untouched; add one vitest per component asserting the adopted
  array shape and the `isolate-styles` opt-out.

Commit.

## Milestone 3 — Wrappers and demos

- Angular / React / Vue wrappers expose `styleSheets` and `isolateStyles` (`isolate-styles`)
  pass-through; no other wrapper change — the fix is inside the WC.
- Demo pages: datatable header template with a `<i class="bi bi-info-circle">` and a
  `.badge`-styled span in a row template (Angular demo currently has text-only headers, which is
  why the bug was invisible here); same sample in the React and Vue demos. The Angular demo loads
  no icon font today — add `bootstrap-icons` to `apps/ng-bootstrap-demo/project.json` styles so
  the sample is meaningful (React/Vue already load it).
- Diagnostics: a small "document styles" panel on the datatable demo page listing mirrored sheets
  and any `unreadable` hrefs, so a consumer hitting the cross-origin gap sees why.

Commit.

## Milestone 4 — E2E and the single verification sweep

- Playwright e2e in all three demo `-e2e` projects: header icon inside the datatable has a
  non-zero box and `::before` content; a row-template `.badge` has Bootstrap's `border-radius`;
  an Angular emulated rule (a class declared in the demo page component's `styles`) applies inside
  a cell; `isolate-styles` restores the old behaviour. Chromium + Firefox.
- Then, once: `nx build` for the four libs and three demos, `nx test mintplayer-web-components`,
  `nx test mintplayer-ng-bootstrap`, the e2e sweep. Record results in the PRD §9.

Commit; **push once**.

## Milestone 5 — Documentation (applies under O2 and O3)

- README: consumer rules — Bootstrap and icon fonts in the document, same-origin or CORS;
  `@font-face` never inside a component; `isolate-styles` / `styleSheets` (O2 only).
- CLAUDE.md WC gotchas: `:root` never matches inside a shadow root (`:host` does; variables
  inherit from the document); `@font-face` in an adopted sheet is ignored by Chromium and
  Firefox; adopted sheets sort after shadow `<style>` and win ties, and Chromium ignores a pure
  reorder of `adoptedStyleSheets` — rebuild the array.
- PRD §6 D0 recorded with the outcome; §9 verification results; close #408 from the PR body.
- Memory/PRD cross-reference to `feat/wc-style-encapsulation` and
  `feat/light-dom-emulated-encapsulation`: state which branch is superseded by the D0 outcome so
  neither is re-litigated.

## Out of scope (genuinely not being done)

- Shipping a compiled Bootstrap sheet inside `@mintplayer/web-components` (O1 — rejected, PRD D1).
- Restyling component chrome from Bootstrap partials (Tier S of `feat/wc-style-encapsulation`).
- Any change to the five DSD/no-JS components; they adopt no consumer DOM.
- Slot protocols for rows/headers (O4) — fallback only if S-O2.x fail and O3 is refused.
