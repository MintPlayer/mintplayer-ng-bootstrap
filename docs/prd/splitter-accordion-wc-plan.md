# Plan — bs-splitter restore + accordion WC migration

Companion PRD: `docs/prd/splitter-accordion-wc.md`. Branch: **`feat/carousel-wc` (PR #392)** —
no new branch/PR (user directive); commits land on the open PR.

## Execution order

Splitter first (small, independent, no codegen); accordion second (larger, gated on the nested-
close risk spike). Each phase commits separately.

### Phase S — restore bs-splitter

Create `libs/mintplayer-ng-bootstrap/splitter/`:

| File | Content |
|---|---|
| `index.ts` | `export * from './src';` |
| `ng-package.json` | copy of navbar's (verbatim) |
| `src/index.ts` | wrapper export + re-export of `@mintplayer/web-components/splitter` types (dock precedent) |
| `src/splitter/splitter.component.ts` | `bs-splitter`: eager side-effect import; inputs `orientation`/`minPanelSize`/`touchMode` → `[attr.*]` via `computed()`; outputs `resizeStart/resizing/resizeEnd` guarded on `event.target === nativeElement` (NO stopPropagation — nested splitters + dock delegation need bubbling); `getPanelSizes/setPanelSizes/resizeDividerBy` via `viewChild`; `<ng-content>` panes |
| `src/splitter/splitter.component.scss` | the `mp-splitter:not(:defined)` fallback block relocated from the demo page (shipped, not stranded) |
| `src/splitter/splitter.component.spec.ts` | bridging + event-guard + method-delegation assertions |

Demo/app changes: ng splitter page rewritten onto `bs-splitter` (fallback SCSS removed from the
page), second example exercising `min-panel-size`/`touch-mode`/events/size API; page moved
Advanced → **Enterprise** (`git mv`, route, nav item); react/vue demos: `direction=` →
`orientation=`, drop the truth-silencing React props cast, fix both wrappers' JSDoc. One ng e2e
spec (APG keyboard resize + resizing event).

### Phase A0 — accordion risk spike (GATE, in-tree vitest not throwaway)

Port just enough of the pilot's `MpAccordion` to write the **nested recursive close** test:
closing a tab must `closeAll()` every `mp-accordion` in that tab's slotted light DOM (composed
traversal). If light-DOM querying from the closing tab's assigned nodes proves unreliable, the
fallback design is an event-based contract (`mp-accordion-tab-toggle` bubbling + ancestors
closing descendants) — decide before Phase A proceeds.

### Phase A — mp-accordion element (JS tier)

Salvage from `feat/wc-ssr-accordion-pilot` @ `d0f1c0c6` (port files, no wholesale cherry-pick):
render logic, grid-rows animation, toggle event contract, part names, SCSS. Redesign per PRD
§5.2: index-based `h`/`c` slots stamped onto marker `<mp-accordion-tab>` children
(`mp-tab-page`-style trivial shadow), `multi`/`highlight-active-tab` as attributes
(attribute-only config — carousel lesson), `:host` `--bs-accordion-*` defaults (no global
import), reduced-motion, ARIA + new Home/End/ArrowUp/ArrowDown. vitest: contracts PRD §5.3 +
ARIA + reduced-motion.

### Phase B — accordion no-JS tier + SSR

Radio (single) / checkbox (multi) machine in `render()`, gated `:host(:not([data-js]))`;
pre-upgrade checked state read in the DSD handoff (carousel pattern). `gen-accordion-chrome.mjs`
pre-rendering the `[multi] × [count 0–12]` matrix; `codegen-accordion-chrome` target + aggregate
entry; `injectMpAccordionDsd` (generalize the carousel's depth-scan child counter — count only
`mp-accordion-tab` elements, read `multi` off the tag) composed into the three SSR entries.

### Phase C — wrappers + demos + e2e

- Angular: wrapper rewrite from the pilot (`bs-accordion`, `bs-accordion-tab`,
  `*bsAccordionTabHeader` replacing the header component — the one breaking change); fix the
  three in-lib consumers (sticky-footer, offcanvas incl. the zero-tab case, shell) and the
  broken specs that mocked the header component.
- React/Vue: `BsAccordion` + `BsAccordionItem` (header slot), carousel-template file shape.
- Demos: ng accordion page `::ng-deep` → `::part()` rewrite, moved Containers → **Enterprise**;
  new react/vue accordion pages + routes + sidebar entries.
- e2e: shared `accordion-suites.ts` in `tools/e2e-shared/` — JS tier (open/close, multi,
  nested, keyboard incl. new bindings, hydration no-dup) + no-JS tier (radio/checkbox machines,
  wrap of focus not required, independence, reduced-motion context per carousel lesson;
  single-action-target sequences only — Chromium/no-JS stability-hang lesson).

### Phase D — cleanup

Version bumps if a release cut happens from this PR beyond the carousel's (else fold), PRD
flipped to as-built, memory of record updated.

## Acceptance criteria

- [ ] `bs-splitter` exposes orientation/min-panel-size/touch-mode/events/methods; nested
      splitter events don't cross instances; fallback CSS ships with the wrapper; react/vue
      demo `direction` bug fixed.
- [ ] Accordion: PRD §5.3 contracts green in vitest (nested close gated first); interactive
      no-JS in all three demo apps (single-open radio + multi checkbox); `::part()` theming
      demonstrated where `::ng-deep` died; in-lib consumers compile and pass.
- [ ] Both demo pages under Enterprise in the ng app; full builds + unit + e2e sweeps green.
- [ ] Everything committed to `feat/carousel-wc` / PR #392 — no new branch, no new PR.

## Build & test commands

As `docs/prd/carousel-wc-plan.md` — plus `nx run mintplayer-web-components:codegen-accordion-chrome`
once it exists.

## Key references

`git show feat/wc-ssr-accordion-pilot:libs/mintplayer-web-components/accordion/src/components/mp-accordion.ts`
(and siblings) — salvage source; `libs/mintplayer-web-components/carousel/**` — chrome variants,
injector counter, DSD handoff, attribute-only config; `libs/mintplayer-web-components/tab-control/**`
— marker-child + `:host` token idioms; `libs/mintplayer-ng-bootstrap/{sticky-footer,offcanvas,shell}`
— in-lib accordion consumers; `apps/ng-bootstrap-demo/src/app/pages/advanced/splitter/` — raw-tag
usage + stranded fallback CSS to relocate.
