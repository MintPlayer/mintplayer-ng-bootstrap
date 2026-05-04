# PRD: Dock / Splitter / Tab-control as composable Lit web components

## Problem

Three threads converge:

1. **Tab-control has no Lit WC yet.** `bs-tab-control` (Angular) lives at `libs/mintplayer-ng-bootstrap/tab-control/` with `tab-control.component.ts:8-103`, `tab-control.component.html:1-53`, `tab-control.component.scss:1-110`, `tab-page/tab-page.component.ts:1-23`, and `tab-page-header/tab-page-header.directive.ts:1-8`. Unlike dock (`MintDockManagerElement` after PR #302) and splitter (`MpSplitter` after PR #302), there's no `mp-tab-control` web component to consume from non-Angular hosts or from inside other WCs.

2. **Bootstrap-styled WCs need Bootstrap styles inside their Shadow DOM.** `bs-tab-control` applies `nav nav-tabs`, `nav-link.active`, `tab-content`, `position-relative`, `d-block` etc. on the Angular wrapper's host and inside its template (`tab-control.component.html:16-53`). Once the rendering moves into a Lit WC's Shadow DOM, those global Bootstrap classes no longer reach in — Bootstrap has to be imported into the WC's `static styles` directly. Same applies to dock (which currently has its own hand-rolled tab and split CSS in `mint-dock-manager.element.scss` instead of Bootstrap-styled).

3. **The dock manager duplicates tab-strip + split rendering logic that already exists in `mp-splitter` and (soon) `mp-tab-control`.** Today `MintDockManagerElement` builds its own tab strip (`renderStack` lines 1470-1571) and its own split layout (`renderSplit` lines 1414-1468), with bespoke CSS for both. The duplication is real: ~1000-1500 lines of imperative DOM construction in the dock element are doing what `<mp-splitter>` and `<mp-tab-control>` were built for. The dock should compose those WCs and shrink to its actually-unique responsibilities: layout-tree ownership, drag-to-detach-floating, and overlay layers (intersection handles, snap markers, drop indicator/joystick).

These threads are entangled: building `mp-tab-control` requires the Bootstrap-in-Shadow-DOM strategy; embedding it in dock requires `mp-splitter` to grow a few extension points; the dock-internal swap can't happen without the WC existing first.

## Scope and timing

This PRD captures the **target architecture**. Implementation does not have to land in a single PR.

- **Phase 1 (current PR #302)**: Land the Lit base-class migration + split-file codegen + `mp-tab-control` extraction from `bs-tab-control` + Bootstrap-in-Shadow-DOM for `mp-tab-control`. Dock keeps its bespoke tab strip + split rendering (just like today). This is already a substantial PR and the work is verified in the browser.
- **Phase 2 (follow-up PR)**: Embed `<mp-tab-control>` inside the dock's `renderStack`. Add `mp-splitter` extension points (divider opt-out, panel hidden state, mid-drag stability). Embed nested `<mp-splitter>` inside the dock's `renderSplit`. Strip dock's bespoke `.dock-tab` / `.dock-split__divider` CSS in favour of the embedded WCs.
- **Phase 3 (follow-up PR)**: Recolour dock's overlay CSS via `--bs-*` variables for visual cohesion.

Splitting into phases reduces the single-PR regression surface (the dock just migrated to Lit; stacking a major rendering-engine refactor on top tangles "did Lit break anything?" with "did the WC swap break anything?") and lets the `mp-splitter` extension API be designed deliberately rather than under PR pressure.

## Goals

1. Ship a new `mp-tab-control` (+ `mp-tab-page`) Lit web component with feature-equivalent behaviour to `bs-tab-control`, in its own Nx project at `libs/mp-tab-control-wc/`.
2. Refactor `BsTabControlComponent` (Angular) to wrap that WC instead of rendering its own tab strip. Angular consumers' API stays unchanged (signal inputs, `contentChildren`, CDK drag-drop ergonomics).
3. Move all Bootstrap-driven look-and-feel into each Lit WC's Shadow DOM via SCSS partial imports compiled through the existing `codegen-wc` pipeline. The WCs become **standalone-styled** — they work without the host page importing Bootstrap.
4. Embed `<mp-tab-control>` inside `MintDockManagerElement` for stack tab strips, replacing `renderStack`'s bespoke `.dock-stack__header` markup.
5. Embed nested `<mp-splitter>` inside `MintDockManagerElement` for split layouts, replacing `renderSplit`'s bespoke `.dock-split` markup. Add the minimal extension points to `mp-splitter` that this requires.
6. Strip `mint-dock-manager.element.scss` of duplicated tab-strip + divider CSS in favour of the embedded WCs' own styles. Recolour dock's remaining overlay CSS (intersection handles, snap markers, drop indicator/joystick) via `--bs-*` variables.

### Non-goals

- Reactive `html\`...\``-driven re-rendering of the dock's overlay layers (intersection handles, drop indicator, drop joystick). The current "imperative DOM construction inside `firstUpdated()`" pattern (preserved from PR #302) stays.
- Removing `bs-tab-control`'s public Angular API. The wrapper stays; only its internals change.
- Replacing the dock's layout-tree data model (`DockLayoutNode` / `DockSplitNode` / `DockStackNode`). The tree stays as the source of truth; the dock just renders the tree by composing WC primitives instead of building DOM from scratch.
- Replacing the dock's drag-to-floating logic. The dock continues to own pane drag, floating-window state, and drop targeting. `mp-tab-control` and `mp-splitter` are rendering primitives, not interaction owners.
- Reimplementing the dock's intersection-handle 4-way drag inside `mp-splitter`. The intersection handle stays as a dock-owned overlay that *orchestrates* `setPanelSizes` calls across two adjacent `<mp-splitter>` instances. mp-splitter has no concept of intersections; the dock does.
- SSR considerations beyond what already works for the existing Lit WCs.
- Visual redesign. The intent is "look the same, render via Bootstrap classes + composed WCs."

## Current state

| File | Lines | Role |
|---|---|---|
| `libs/mintplayer-ng-bootstrap/tab-control/src/tab-control/tab-control.component.ts` | 103 | Angular tab control — `extends Component`, content children, signals, CDK drag-drop, header-template projection via `*bsTabPageHeader` |
| `libs/mintplayer-ng-bootstrap/tab-control/src/tab-control/tab-control.component.html` | 53 | Angular template — Bootstrap `nav nav-tabs`, noscript fallback (radio inputs + `:checked` siblings), top/bottom positioning |
| `libs/mintplayer-ng-bootstrap/tab-control/src/tab-control/tab-control.component.scss` | 110 | Tab-control styles — noscript `:checked` cascade for up to 20 tabs (`@for $i from 1 through 20`), border styling |
| `libs/mintplayer-ng-bootstrap/tab-control/src/tab-page/tab-page.component.ts` | 23 | Tab page — `disabled` input, header template via `contentChild(BsTabPageHeaderDirective)` |
| `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts` | 3985 | Dock Lit WC. `renderStack` lines 1470-1571 (tab strip), `renderSplit` lines 1414-1468 (split layout). Has its own `.dock-tab` / `.dock-split__divider` CSS. |
| `libs/mp-splitter-wc/src/components/mp-splitter.ts` | 324 | Splitter Lit WC — flat 2+-way splitter, slot-based, `orientation` / `min-panel-size` / `touch-mode` attributes, `getPanelSizes`/`setPanelSizes`, `resize-{start,ing,end}` events |

No `mp-tab-control-wc` project exists. Bootstrap is currently only available globally via `apps/ng-bootstrap-demo/src/styles.scss`; nothing is loading it inside any WC's Shadow DOM today.

## Architectural decisions and trade-offs

### Decision 1 — Bootstrap-in-Shadow-DOM strategy

**Recommendation: Option 1 — `@use` Bootstrap partials in each WC's `*.styles.scss`, compiled by the existing `codegen-wc` pipeline.**

Why over the alternatives:

- **Option 2 (`adoptedStyleSheets` shared sheet)**: One parsed copy at runtime, but every WC consumer transitively imports the shared module — heavier per-WC than option 3 and only meaningfully better than option 1 if 3+ WCs share the same Bootstrap surface. We have at most one (`mp-tab-control`) right now.
- **Option 3 (`--bs-*` CSS-variable contract + handwritten structural CSS)**: Smallest bundle, but maintenance is highest — every Bootstrap visual upgrade has to be re-implemented by hand in the WC's SCSS. We lose `nav-tabs` "for free."
- **Option 4 (light DOM via `createRenderRoot()`)**: Free Bootstrap, but breaks `<slot>` semantics, `::part`, and style isolation. Defeats the goal of standalone-styled WCs.
- **Option 5 (hybrid light/shadow DOM per element)**: Not possible per-element with Lit. Splitting components is not worth the API leak.

Concrete shape for `libs/mp-tab-control-wc/src/styles/tab-control.styles.scss`:

```scss
// Bootstrap configuration partials
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/variables-dark';
@import 'bootstrap/scss/maps';
@import 'bootstrap/scss/mixins';

// :root targets don't cross Shadow DOM — wrap with :host so --bs-* land on the shadow host
:host {
  @import 'bootstrap/scss/root';
}

// Component partial — covers .nav, .nav-tabs, .nav-link, .tab-content, .tab-pane
@import 'bootstrap/scss/nav';
@import 'bootstrap/scss/transitions';

:host {
  display: block;
  position: relative;
}
```

The existing `tools/scripts/build-web-components.mjs` runs Sass with `loadPaths: [dirname(scssPath)]`. Sass walks up to find `node_modules/bootstrap/scss/...` automatically. **Verify with a smoke compile** before assuming it works — if not, the script gains one line (`loadPaths: [dirname(scssPath), 'node_modules']`).

Bootstrap as a peerDependency on each WC lib that imports it. The repo already declares `"bootstrap": "^5.3.0"` as a peerDependency of `@mintplayer/ng-bootstrap`; mirror that on `@mintplayer/tab-control` and (later) on splitter / dock if they adopt the same pattern.

### Decision 2 — Dock's tab strip: bespoke vs. embed `<mp-tab-control>`

**Recommendation: embed `<mp-tab-control>` inside the dock for each stack's header**, but require `mp-tab-control` to expose two extension points the bespoke implementation has today:

- **Programmatic active-tab control** — the dock owns the layout tree (`DockStackNode.activePane`); it must be able to set the active tab without mp-tab-control's internal "select first non-disabled" auto-pick clobbering its choice. Achieved by exposing an `active` property on `mp-tab-control` and dispatching `tab-activate` events; the dock listens, mutates the tree, sets `active` back.
- **Drag-to-detach hook** — dock supports dragging a tab off the strip to detach it as a floating window (`captureTabDragMetrics` lines 1780-1811, `beginPaneDrag` lines 1817-1927, threshold check 1855-1859). `mp-tab-control` doesn't need to *implement* the floating-window logic, but it must surface a `tab-drag-out` event (or expose a `dragstart`/`pointermove`/threshold-check API) the dock can hook. Easiest path: `mp-tab-control` doesn't try to absorb pointer events outside its own bounds; it lets the host install pointer listeners on its rendered tab buttons.

The dock keeps its tab-drag-to-floating logic; `mp-tab-control` just hosts the tab strip's appearance and core interactions (click-to-activate, keyboard nav, ARIA, in-strip reorder via CDK in the Angular wrapper).

### Decision 3 — Dock's split layout: embed nested `<mp-splitter>`

**Recommendation: embed `<mp-splitter>` (nested recursively, one per `DockSplitNode`) inside the dock**, with `mp-splitter` gaining a few minimal extension points to support dock's needs. The dock's bespoke `.dock-split` / `.dock-split__divider` markup goes away.

The earlier "keep bespoke" recommendation conflated three concerns; only one is a real obstacle.

| Concern | Real obstacle? | How embedding addresses it |
|---|---|---|
| **Recursive trees** — dock has `DockSplitNode` containing other `DockSplitNode`s | No | Compose: `<mp-splitter>` containing nested `<mp-splitter>` elements as panels. mp-splitter doesn't need a "tree" concept; the dock walks the tree and renders nested WCs. |
| **Intersection-handle 4-way drag** — single drag at split crossings moves both perpendicular dividers in sync | No | Stays as a dock-owned overlay on `.dock-intersections-layer`. The dock orchestrates by calling `setPanelSizes()` on the two relevant `<mp-splitter>` instances simultaneously. mp-splitter doesn't need to know intersections exist. |
| **Snap markers** during corner-handle drag | No | Dock-owned overlay layer, independent of any splitter. |
| **Sizes persisted in tree** — `DockSplitNode.sizes` is the source of truth | No | Dock listens for `mp-splitter`'s `resize-end` events, writes back to the tree, calls `setPanelSizes()` on initial render to apply the persisted sizes. mp-splitter already exposes both halves of this contract. |
| **Mid-drag tree mutation** — drag-to-floating removes a pane from a stack mid-drag, which can change a parent split's child count | **Yes — real** | Needs careful sequencing: the dock either completes the drag-to-floating gesture *before* mutating the slotted children of the affected `<mp-splitter>`, or `mp-splitter` gains a "panel hidden" mode where a panel is excluded from layout without slot churn. The PRD recommends the latter (see extension points below). |

What `mp-splitter` needs to gain to support dock embedding (estimated ~50-100 LoC):

- **`hidden-panels` API** — a way to mark individual panels as excluded from the layout (skip them when laying out flex sizes; collapse adjacent dividers). Lets the dock visually "remove" a pane from a split during drag-to-floating without re-projecting all slot children. Could be an attribute (`hidden` on the slotted child) or a programmatic `setPanelVisibility(index, visible)` method.
- **Divider opt-out / divider-element exposure** — for the corner-handle case, the dock's intersection handle wraps multiple dividers from sibling splitters. The dock needs either (a) a way to disable mp-splitter's own pointer handling on a given divider, or (b) a stable reference to the divider DOM element so the dock can attach its own listeners. Recommendation: expose dividers as a queryable part (`::part(divider-N)`) and accept a `data-no-resize` attribute on a panel to suppress the divider after it.
- **Stable size handling across panel-count changes** — verify `setPanelSizes(sizes: number[])` behaves correctly when called immediately after a `slotchange` reduces panel count. If `mp-splitter` currently re-derives sizes from the previous flex values, that's already correct; if it caches sizes by index, dock's mutation will misalign. Add a smoke test.

What stays purely in the dock (overlays, not duplication):

- The intersection-handle layer (`.dock-intersections-layer`) and its 4-way orchestration logic.
- The snap-marker layer.
- The drop indicator + drop joystick.
- The floating-window layer.
- The layout tree itself (`DockLayoutSnapshot`, serialisation, drag-to-floating mutations).

What goes away:

- `renderSplit` (lines 1414-1468 of `mint-dock-manager.element.ts`) — replaced by recursive `<mp-splitter>` rendering of `DockSplitNode`s.
- Dock's bespoke `.dock-split` / `.dock-split__child` / `.dock-split__divider` CSS (lines 210-278 of `mint-dock-manager.element.scss`) — `mp-splitter`'s shadow styles cover this.
- Dock's bespoke resize state machine (`resizeState`, `beginResize`, lines 1573-1650) — `mp-splitter` owns single-divider resize. Dock keeps only the corner-handle (cross-splitter) coordination.

Estimated dock element shrinkage: **~1000-1500 lines** removed (renderSplit + resize state machine + tab-strip rendering when paired with Decision 2). Net dock complexity drops dramatically; what remains is exactly the dock-specific stuff (tree ownership, drag-to-float, overlays).

### Decision 4 — `mp-tab-control` projection model

Two options for how `mp-tab-page` content lands inside `mp-tab-control`:

**Option A** — One `mp-tab-page` element per tab, each with two named slots (`header`, default for content):
```html
<mp-tab-control>
  <mp-tab-page disabled>
    <span slot="header">Tab 1</span>
    Panel content 1
  </mp-tab-page>
  ...
</mp-tab-control>
```
`mp-tab-page` registers itself with the parent `mp-tab-control` in `connectedCallback` (no DI, just walk up to the parent element).

**Option B** — Per-tab named slots on `mp-tab-control` itself, no child element:
```html
<mp-tab-control>
  <span slot="header-tab1">Tab 1</span>
  <div slot="content-tab1">Panel content 1</div>
  ...
</mp-tab-control>
```

**Recommendation: Option A.** Mirrors `bs-tab-control`'s `bs-tab-page` model, keeps `disabled` as an attribute on the page (not on a sibling), and is what consumers (including the Angular wrapper) most naturally project into. Option B forces consumers to invent unique tab IDs and pair them by slot name — clumsier.

### Decision 5 — Wrapper-vs-WC split for tab-control

Stays in Angular `BsTabControlComponent`:
- Signal-based `input()` API surface for Angular consumers.
- `contentChildren(BsTabPageComponent)` query — translates Angular component tree into WC DOM children.
- `effect()`-driven auto-select-first-tab logic — keep here, the WC just exposes `active` + emits `tab-activate`.
- `*bsTabPageHeader` directive + `NgTemplateOutlet` for header projection — the wrapper renders the directive's template into a `<span slot="header">` inside each `<mp-tab-page>` projection.
- Dependency-injection provider (`{ provide: 'TAB_CONTROL', useExisting: BsTabControlComponent }`) for `bs-tab-page` registration.

Dropped from `BsTabControlComponent`:
- CDK drag-drop reorder. The Lit WC owns the tab-strip DOM and the host-side reorder ergonomics didn't carry through Shadow DOM cleanly. Consumers who need reorder can apply `cdkDrag` to their own projected tab content, or wait for the WC to grow a built-in reorder mode (out of scope).

Moves into Lit `MpTabControl`:
- Tab strip rendering (Lit `html\`\`` with Bootstrap `nav nav-tabs`).
- Tab content panel switching (active vs hidden).
- Click-to-activate, keyboard (Enter/Space, Arrow keys for tab strip).
- ARIA (`role=tablist`, `role=tab`, `role=tabpanel`, `aria-selected`, `aria-controls`).
- Top/bottom tab positioning.
- Noscript fallback (`<input type="radio">` + `:checked` siblings) — works inside Shadow DOM since the radios + labels are in the same scope.
- `border` attribute → CSS class toggle.

The drag-drop reorder logic stays in the wrapper; `mp-tab-control` exposes `tab-reorder` events the wrapper consumes if/when it wants to push state back.

## Proposed file layout

```text
libs/mp-tab-control-wc/
├── package.json                     # @mintplayer/tab-control-wc; deps: lit, tslib; peer: bootstrap
├── project.json                     # @nx/js:tsc build + codegen-wc target (mirrors mp-splitter-wc)
├── tsconfig.json
├── tsconfig.lib.json
├── vitest.config.ts
└── src/
    ├── index.ts                     # Re-exports
    ├── components/
    │   ├── index.ts
    │   ├── mp-tab-control.ts        # Lit WC, ~250 LoC
    │   └── mp-tab-page.ts           # Lit WC, ~80 LoC
    ├── styles/
    │   ├── index.ts
    │   └── tab-control.styles.scss  # Bootstrap nav/buttons/transitions partials + :host
    └── types/
        ├── index.ts
        └── tabs-position.ts         # 'top' | 'bottom'

libs/mintplayer-ng-bootstrap/tab-control/  # existing — refactored
├── src/
│   ├── tab-control/
│   │   ├── tab-control.component.ts        # wraps mp-tab-control; signals → properties via effect()
│   │   ├── tab-control.component.html      # <mp-tab-control [attr...]><ng-content/></mp-tab-control>
│   │   └── tab-control.component.scss      # leaner — only :host margin/spacing concerns
│   ├── tab-page/
│   │   ├── tab-page.component.ts           # wraps mp-tab-page
│   │   ├── tab-page.component.html         # <mp-tab-page><span slot="header">...</span><ng-content/></mp-tab-page>
│   │   └── tab-page.component.scss
│   └── tab-page-header/
│       └── tab-page-header.directive.ts    # unchanged
```

Update workspace root:
- Add `@mintplayer/tab-control-wc` path mapping in `tsconfig.base.json`.
- The `nx run-many --target=codegen-wc` postinstall picks up the new lib automatically (no edits to root `package.json`).
- `libs/mintplayer-ng-bootstrap/package.json` — add `@mintplayer/tab-control-wc` as peerDependency (mirrors `@mintplayer/splitter`, `@mintplayer/scheduler-wc`).

For dock + splitter: extend each `*.styles.scss` to import the relevant Bootstrap partials. Likely targets:
- `mint-dock-manager.element.scss` — `_root.scss` (variables), `_buttons.scss` (joystick buttons), retain bespoke `.dock-*` rules but recolour via `--bs-*` variables.
- `splitter.styles.scss` — `_root.scss`, plus `--bs-border-color` references already aligned with `--mp-splitter-divider-color`. Light touch.

## Build wiring

No new build infrastructure. Existing `codegen-wc` pipeline handles all SCSS-with-Bootstrap-imports compilation transparently. Three concrete checks:

1. **Sass `loadPaths`**: confirm Sass resolves `bootstrap/scss/...` from `node_modules` automatically. If not, extend `loadPaths` in `tools/scripts/build-web-components.mjs` to include `node_modules` (one-line change).
2. **`:root` rewrite**: Bootstrap's `_root.scss` emits selectors against `:root`, which doesn't cross Shadow DOM. Wrap with `:host { @import 'bootstrap/scss/root'; }` in each WC's SCSS so `--bs-*` variables bind to the shadow host. (Smaller change than post-processing the compiled CSS.)
3. **Bundle size**: each WC that imports Bootstrap partials brings ~10-15 KB compiled CSS for the configuration + `_root.scss` block. Acceptable. If 3+ WCs share the same partial set later, factor into `libs/wc-shared-styles/` and `@use` from each.

## Migration plan (phased)

### Phase 1 (recommended for current PR #302 scope)

1. **Verify Sass + Bootstrap-from-node_modules resolves cleanly.** Smoke-compile a test SCSS that imports `bootstrap/scss/_nav.scss` via the existing `codegen-wc` pipeline. If it fails, fix `loadPaths` first.
2. **Scaffold `libs/mp-tab-control-wc/`** with package.json, project.json (codegen-wc + build), tsconfig.lib.json, vitest config — copy the mp-splitter-wc structure.
3. **Author `MpTabControl` + `MpTabPage` Lit WCs** with feature parity to bs-tab-control: top/bottom strip, active tab, disabled tabs, ARIA, keyboard, noscript fallback. Use Bootstrap nav classes from the imported partials.
4. **Add `tsconfig.base.json` path mapping**: `"@mintplayer/tab-control-wc": ["libs/mp-tab-control-wc/src/index.ts"]`.
5. **Refactor `BsTabControlComponent`** to render `<mp-tab-control>` and project `bs-tab-page` content as `<mp-tab-page>` children. Keep CDK drag-drop and signal-based API unchanged externally.
6. **Update `bs-tab-page`** template to wrap content in `<mp-tab-page>` with a `<span slot="header">` for the projected `*bsTabPageHeader` template.
7. **Smoke-test bs-tab-control demo page in the browser.** Visual diff against `master`.

After Phase 1 the dock still uses its bespoke tab strip + split rendering — same as today. The wins are: a new reusable `mp-tab-control` WC, Bootstrap-styled inside Shadow DOM, and `bs-tab-control` refactored to wrap it. PR scope stays manageable.

### Phase 2 (follow-up PR — dock embeds the WCs)

8. **Add extension points to `mp-splitter`** (in a focused commit per extension):
   - `hidden-panels` mode (panel marked hidden is excluded from flex layout, adjacent divider collapses).
   - Divider opt-out / `::part(divider-N)` exposure (so the dock can suppress mp-splitter's pointer handling on dividers wrapped by an intersection handle).
   - Smoke-test that `setPanelSizes()` behaves correctly across panel-count changes.
9. **Refactor `MintDockManagerElement.renderSplit`** to render nested `<mp-splitter>` per `DockSplitNode`. Wire `resize-end` events back to the layout tree. Apply persisted sizes on initial render via `setPanelSizes()`. Keep `cornerResizeState` orchestration on top of the embedded splitters.
10. **Refactor `MintDockManagerElement.renderStack`** to embed `<mp-tab-control>` per `DockStackNode`. Wire active-pane events and the dock's drag-to-detach-floating pointer handling on the tab buttons.
11. **Strip dock's bespoke tab + split CSS** from `mint-dock-manager.element.scss` (`.dock-tab*`, `.dock-stack__header`, `.dock-stack__content`, `.dock-stack__pane`, `.dock-split*`).
12. **Smoke-test dock demo page**: tab activation, tab reorder, tab drag-to-detach (single-pane and multi-pane stacks), divider drag, intersection-handle 4-way drag, snap markers during drag, drop indicator + joystick, floating-window resize, layout serialisation round-trip.

### Phase 3 (follow-up PR — visual polish + Phase-2 dock-embed clean-up)

Phase 3 covers two distinct concerns. Either can be split into its own PR if the
combined diff is too large for one review.

#### 3a. Finish the dock-embed adaptations Phase 2 left as known gaps

Phase 2 swapped the dock's bespoke `renderStack` / `renderSplit` for embedded
`<mp-tab-control>` and `<mp-splitter>` elements, but the dock's
**intersection-handle 4-way drag** and **snap markers during corner drag** were
left non-functional. The cause: the dock queries `.dock-split__divider` from
its own shadow root, but those dividers now live inside each `<mp-splitter>`'s
shadow root. Helpers (`getSplitterDividers`, `getSplitterPanels`,
`findSplitterByPath`) are already in place on the dock element from
commit `49c9ed5b` — they just aren't wired into the consumer methods yet.

13. **Adapt `renderIntersectionHandles`** to iterate `<mp-splitter
    class="dock-split">` elements via the dock's shadow root, then pull each
    splitter's dividers from its shadow via `getSplitterDividers(splitter)`.
    Replace the existing `this.shadowRoot.querySelectorAll('.dock-split__divider')`
    pattern with a flat-map over splitters. The divider geometry comes from
    `getBoundingClientRect()` on the shadow divider elements (works across
    shadow boundaries).
14. **Adapt `beginCornerResize` / `handleCornerResizeMove` / `endCornerResize`**
    so the corner-handle pointerdrag calls `mpSplitter.setPanelSizes(...)` on
    each affected splitter instead of mutating `.dock-split__child` flex sizes
    directly. Capture initial sizes via `getSplitterPanels(splitter).map(p => p.getBoundingClientRect()...)`
    in the appropriate axis.
15. **Adapt `renderSnapMarkersForCorner` / `clearSnapMarkers`** to read divider
    geometry via `getSplitterDividers(splitter)[index]` instead of
    `container.querySelector(':scope > .dock-split__divider')`.
16. **Dead-code cleanup** — `beginResize`, `handleResizeMove`, `endResize`,
    and the per-divider pointerdown wiring inside the OLD `renderSplit` are
    unreachable in Phase 2 (the rendering swap means dock dividers no longer
    exist). Remove or document as private API kept for the corner-handle
    sibling case.

Acceptance for 3a: corner-handle drag works the same as on master, snap
markers appear during corner drag, no divider-related dead code remains.

#### 3b. Recolour dock's overlay CSS via `--bs-*` variables

17. **Recolour dock's overlay CSS** (intersection handles, snap markers, drop
    indicator, drop joystick, floating chrome) via `--bs-*` variables for
    visual cohesion. Drop hand-coded `rgba(...)` colours where there's a
    `--bs-*` equivalent.
18. **Update `docs/prd/` index** to reflect the now-completed migration.

##### Concrete rgba → `--bs-*` mapping

Read the current values from `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.scss`.
The proposed mapping (verify against the latest checkout — line numbers drift):

| Selector | Current colour | Proposed Bootstrap variable |
|---|---|---|
| `.dock-floating` border | `rgba(0, 0, 0, 0.3)` | `var(--bs-border-color)` |
| `.dock-floating` background | `rgba(255, 255, 255, 0.92)` | `var(--bs-body-bg)` (slight opacity loss — acceptable) |
| `.dock-floating` box-shadow | `rgba(15, 23, 42, 0.25)` | `var(--bs-box-shadow)` (Bootstrap 5.3 token) |
| `.dock-floating__chrome` background gradient | `rgba(148, 163, 184, ...)` | `var(--bs-secondary-bg)` |
| `.dock-floating__chrome` border-bottom | `rgba(148, 163, 184, 0.5)` | `var(--bs-border-color)` |
| `.dock-floating__title` colour | `rgba(30, 41, 59, 0.95)` | `var(--bs-body-color)` |
| `.dock-floating__resizer` background | `rgba(148, 163, 184, 0.25)` | `var(--bs-secondary-bg-subtle)` |
| `.dock-floating__resizer:hover` | `rgba(148, 163, 184, 0.4)` | `var(--bs-secondary-bg)` |
| `.dock-stack` border | `rgba(0, 0, 0, 0.2)` | `var(--bs-border-color)` |
| `.dock-stack` background | `rgba(255, 255, 255, 0.75)` | `var(--bs-body-bg)` |
| `.dock-intersection-handle` background | `rgba(59, 130, 246, 0.2)` | `var(--bs-primary-bg-subtle)` |
| `.dock-intersection-handle` border | `rgba(59, 130, 246, 0.6)` | `var(--bs-primary-border-subtle)` |
| `.dock-intersection-handle:hover` background | `rgba(59, 130, 246, 0.35)` | `var(--bs-primary-bg-subtle)` w/ opacity tweak, or just `var(--bs-primary)` w/ low alpha |
| `.dock-snap-marker` background | `rgba(59, 130, 246, 0.7)` | `var(--bs-primary)` |
| `.dock-snap-marker` shadow | `rgba(59, 130, 246, 0.15)` | `var(--bs-primary-bg-subtle)` |
| `.dock-drop-indicator` border | `rgba(59, 130, 246, 0.9)` | `var(--bs-primary)` |
| `.dock-drop-indicator` background | `rgba(59, 130, 246, 0.2)` | `var(--bs-primary-bg-subtle)` |
| `.dock-drop-joystick` background | `rgba(15, 23, 42, 0.15)` | `var(--bs-tertiary-bg)` |
| `.dock-drop-joystick__button` border | `rgba(59, 130, 246, 0.4)` | `var(--bs-primary-border-subtle)` |
| `.dock-drop-joystick__button` colour | `rgba(30, 64, 175, 0.9)` | `var(--bs-primary)` |
| `.dock-drop-joystick__button:hover` | `rgba(59, 130, 246, 0.25)` | `var(--bs-primary-bg-subtle)` |

Where the original alpha matters for visual layering, prefer the
`*-bg-subtle` / `*-border-subtle` Bootstrap tokens over manually composing
`rgba(var(--bs-primary-rgb), 0.2)` — Bootstrap 5.3 already provides those
pre-computed variants.

##### Cascade through Shadow DOM

`--bs-*` variables defined on `:root` (Bootstrap's `_root.scss`) **inherit
through Shadow DOM** via standard CSS custom-property cascade. The dock's
`<mint-dock-manager>` element lives inside the consuming page (where Bootstrap
is loaded globally), so its shadow rules pick up `--bs-*` automatically.
**No `_root.scss` import is needed** in the dock's SCSS — verify with a
`getComputedStyle(host).getPropertyValue('--bs-primary')` in the browser
console after first render.

For standalone-WC use (no host Bootstrap), the colours fall back to whatever
default the SCSS uses. Document this in the dock's package readme if it
becomes a real concern; not in scope here.

Acceptance for 3b: every colour rule in `mint-dock-manager.element.scss`
either references a `--bs-*` variable or has a deliberate justification for
staying hard-coded. No visual regression vs Phase 2 except the intentional
palette shift.

## Risks

| Risk | Phase | Mitigation |
|---|---|---|
| Bootstrap's `_root.scss` interaction with `:host` produces unexpected CSS variable scoping | 1 | Wrap explicitly in `:host { @import ... }`; verify with a manual `getComputedStyle` smoke test in the browser console after first render. |
| Bundle size grows per-WC (~10-15 KB CSS each) | 1 | Factor shared SCSS into `libs/wc-shared-styles/` once a third WC adopts the same partials. Out of scope today. |
| `bs-tab-control` Angular consumers depend on the rendered DOM structure (e.g. CSS selectors targeting `.nav-tabs > .nav-item`) | 1 | Audit demo-app usages before merging. The PR preserves the same DOM tree inside the WC's Shadow DOM, but global selectors targeting the WC's interior will not work — that's a Shadow DOM property, not a regression. |
| Noscript fallback (radio-input + `:checked` siblings) doesn't work the same way inside Shadow DOM | 1 | Verify in a browser with JavaScript disabled. The radios + labels live inside the same shadow tree, so `:checked` sibling selectors should still cascade — but confirm. |
| Sass cannot resolve `bootstrap/scss/...` from `node_modules` automatically | 1 | One-line fix: add `'node_modules'` to `loadPaths` in `tools/scripts/build-web-components.mjs`. Detected at first compile. |
| Dock's tab-drag-to-floating logic breaks because `mp-tab-control` intercepts pointer events | 2 | `mp-tab-control` does not attach `pointermove` listeners outside its own bounds. The dock installs its own `pointerdown` listeners on the rendered tab buttons (queried via `::part` or shadow-querySelector). Document this contract on `mp-tab-control`. |
| Mid-drag layout-tree mutation desyncs from `<mp-splitter>`'s slot children | 2 | `mp-splitter` gains a "panel hidden" mode so the dock can mark a pane as excluded without churning slot projection. Drag-to-floating commits the tree mutation only after the gesture completes; during the gesture the visual placeholder is overlay, not slot manipulation. |
| Intersection-handle 4-way drag doesn't compose cleanly across two `<mp-splitter>` instances | 2 | The dock keeps `cornerResizeState` and orchestrates by computing the new size deltas itself, then calling `setPanelSizes()` on the two relevant splitters in the same animation frame. mp-splitter exposes a `data-no-resize` attribute on a panel to suppress its own divider for the corner case. |
| Snap markers misalign because the dock's overlay layer is positioned independently of the splitter's divider DOM | 2 | The dock queries each `<mp-splitter>`'s divider geometry (via `::part(divider-N)`) at frame start; same math, different selector. |
| `setPanelSizes()` behaviour across slot-children changes is undefined | 2 | Add a unit test in `mp-splitter-wc` covering: panel removal between calls, panel addition, panel hidden state. Land this test before the dock embed. |
| Visual regressions from dock embedding mp-tab-control / mp-splitter (Phase 2) get tangled with Lit migration regressions (PR #302) | 2 | Keep Phase 2 as a separate PR landing after PR #302 has been in `master` for a non-zero period. Each phase is independently reviewable. |
| Visual regressions from migrating dock's hand-rolled colours to `--bs-*` variables | 3 | Keep the colour migration to a clearly-bounded subset; if it introduces visible drift, defer pieces to follow-up PRs. |

## Open questions

1. **`mp-tab-control` reorder events** — does `mp-tab-control` fire its own `tab-reorder` event for in-strip reordering, or is reorder strictly the wrapper's CDK responsibility (no events from the WC)? Recommendation: WC fires `tab-reorder` so non-Angular consumers also get the behaviour; Angular wrapper listens *or* overrides with CDK by intercepting pointerdown.
2. **Dock-internal `mp-tab-page` slot population** — the dock currently uses `<slot name="paneName">` projection (line 1562 of `mint-dock-manager.element.ts`). When the dock embeds `mp-tab-control`, the projection chain becomes: dock's host slots → `mp-tab-control` → `mp-tab-page` → user's pane content. Need to validate the projection works through three levels of Shadow DOM. (Spoiler: it does in Lit, but worth confirming with an integration smoke test.)
3. **Splitter Bootstrap touch** — does `mp-splitter` need any Bootstrap import at all, or is `--mp-splitter-divider-color` sufficient and we just rebind it to `--bs-border-color` as the default? Recommendation: rebind defaults, no full Bootstrap import.

## Acceptance criteria

### Phase 1

- [ ] `mp-tab-control` and `mp-tab-page` exist as Lit WCs in `libs/mp-tab-control-wc/`, registered as custom elements, importable from `@mintplayer/tab-control-wc`.
- [ ] `BsTabControlComponent` renders via `<mp-tab-control>` internally; its public Angular API (signal inputs, `contentChildren`, drag-drop) is unchanged for consumers.
- [ ] Bootstrap styles for `nav`/`nav-tabs`/`tab-content`/`tab-pane` are imported into `mp-tab-control`'s Shadow DOM via `@import 'bootstrap/scss/...'`.
- [ ] `--bs-*` custom properties are scoped to `:host` inside each WC that imports `_root.scss`.
- [ ] `npm run build` succeeds end-to-end.
- [ ] Visual smoke-test of `bs-tab-control` demo page shows no regression vs `master`.
- [ ] `mp-tab-control` works standalone in a plain HTML page with only the WC's own JS imported (no external CSS).

### Phase 2

- [ ] `mp-splitter` exposes the documented extension points: `hidden` panel mode, divider opt-out (`data-no-resize` panel attribute or equivalent), `::part(divider-N)`. Each has a unit test.
- [ ] `MintDockManagerElement.renderStack` embeds `<mp-tab-control>` per `DockStackNode`. The bespoke `.dock-stack__header` and tab markup is removed.
- [ ] `MintDockManagerElement.renderSplit` embeds nested `<mp-splitter>` per `DockSplitNode`. The bespoke `.dock-split` markup is removed.
- [ ] Dock element file size shrinks by ~1000-1500 lines.
- [ ] All existing dock behaviours still work in the browser: tab activation, in-strip tab reorder, tab drag-to-detach-as-floating-window, single-divider drag, intersection-handle 4-way drag, snap markers during corner drag, drop indicator + drop joystick, floating-window resize, layout serialisation round-trip.
- [ ] Dock's bespoke tab + split CSS is removed from `mint-dock-manager.element.scss`. (Overlay CSS — intersection handles, snap markers, drop indicator/joystick — stays.)

### Phase 3a — Finish Phase-2 dock-embed adaptations

- [ ] `renderIntersectionHandles` iterates `<mp-splitter class="dock-split">` elements and reads dividers from each splitter's shadow via the existing `getSplitterDividers` helper — no more `this.shadowRoot.querySelectorAll('.dock-split__divider')`.
- [ ] `beginCornerResize` / `handleCornerResizeMove` / `endCornerResize` operate on splitter shadow data and call `mpSplitter.setPanelSizes(...)` instead of mutating `.dock-split__child` flex.
- [ ] `renderSnapMarkersForCorner` / `clearSnapMarkers` query divider geometry through `getSplitterDividers(splitter)[index]`.
- [ ] Dead code removed: `beginResize`, `handleResizeMove`, `endResize`, and the divider pointerdown wiring in the OLD renderSplit (mp-splitter handles single-divider drag natively now).
- [ ] Browser-tested: corner-handle 4-way drag works, snap markers appear during corner drag.

### Phase 3b — Recolour dock overlay CSS via `--bs-*`

- [ ] Every rgba()/hex colour rule in `mint-dock-manager.element.scss` either references a `--bs-*` variable per the mapping table above, or has a deliberate justification for staying hard-coded.
- [ ] Verified: `getComputedStyle(<mint-dock-manager>).getPropertyValue('--bs-primary')` resolves to the host page's Bootstrap value (custom-property cascade through Shadow DOM).
- [ ] No visual regression vs Phase 2 except the intentional palette shift. Side-by-side screenshot diff against the Phase-2 dock as the baseline.
- [ ] PRD index updated to mark Phases 1, 2, 3 complete.
