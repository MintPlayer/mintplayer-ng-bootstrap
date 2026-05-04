# PRD: Dock / Splitter / Tab-control as composable Lit web components

## Problem

Three threads converge:

1. **Tab-control has no Lit WC yet.** `bs-tab-control` (Angular) lives at `libs/mintplayer-ng-bootstrap/tab-control/` with `tab-control.component.ts:8-103`, `tab-control.component.html:1-53`, `tab-control.component.scss:1-110`, `tab-page/tab-page.component.ts:1-23`, and `tab-page-header/tab-page-header.directive.ts:1-8`. Unlike dock (`MintDockManagerElement` after PR #302) and splitter (`MpSplitter` after PR #302), there's no `mp-tab-control` web component to consume from non-Angular hosts or from inside other WCs.

2. **Bootstrap-styled WCs need Bootstrap styles inside their Shadow DOM.** `bs-tab-control` applies `nav nav-tabs`, `nav-link.active`, `tab-content`, `position-relative`, `d-block` etc. on the Angular wrapper's host and inside its template (`tab-control.component.html:16-53`). Once the rendering moves into a Lit WC's Shadow DOM, those global Bootstrap classes no longer reach in — Bootstrap has to be imported into the WC's `static styles` directly. Same applies to dock (which currently has its own hand-rolled tab and split CSS in `mint-dock-manager.element.scss` instead of Bootstrap-styled).

3. **The dock manager duplicates tab-strip + split rendering logic that already exists in `mp-splitter` and (soon) `mp-tab-control`.** Today `MintDockManagerElement` builds its own tab strip (`renderStack` lines 1470-1571) and its own split layout (`renderSplit` lines 1414-1468), with bespoke CSS for both. The duplication is real: ~1000-1500 lines of imperative DOM construction in the dock element are doing what `<mp-splitter>` and `<mp-tab-control>` were built for. The dock should compose those WCs and shrink to its actually-unique responsibilities: layout-tree ownership, drag-to-detach-floating, and overlay layers (intersection handles, snap markers, drop indicator/joystick).

These threads are entangled: building `mp-tab-control` requires the Bootstrap-in-Shadow-DOM strategy; embedding it in dock requires `mp-splitter` to grow a few extension points; the dock-internal swap can't happen without the WC existing first.

## Scope and timing

This PRD captures the **target architecture**. Implementation does not have to land in a single PR.

- **Phase 1 ✅ (PR #302 + #303)**: Lit base-class migration, split-file codegen, `mp-tab-control` extraction from `bs-tab-control`, Bootstrap-in-Shadow-DOM for `mp-tab-control`. Dock keeps its bespoke tab strip + split rendering for now.
- **Phase 2 ✅ (this PR, commits `7fc84949`..`a7bc4335`)**: Embed `<mp-tab-control>` inside the dock's `renderStack`. Add `mp-splitter`/`mp-tab-control` extension points (panel hidden state via `data-hidden`). Embed nested `<mp-splitter>` inside the dock's `renderSplit`. Strip dock's bespoke `.dock-tab` / `.dock-split__divider` CSS in favour of the embedded WCs.
- **Phase 3 ✅ (this PR, commits `a1aa43db`..)**: Finish dock-embed adaptations the Phase 2 work left as gaps (intersection handles + corner resize through mp-splitter shadow; remove dead single-divider code) + recolour overlay CSS via `--bs-*` variables.

Splitting into phases reduces the single-PR regression surface (the dock just migrated to Lit; stacking a major rendering-engine refactor on top tangles "did Lit break anything?" with "did the WC swap break anything?") and lets the `mp-splitter` extension API be designed deliberately rather than under PR pressure.

## Goals

1. Ship a new `mp-tab-control` (+ `mp-tab-page`) Lit web component with feature-equivalent behaviour to `bs-tab-control`, in its own Nx project at `libs/mp-tab-control-wc/`.
2. Refactor `BsTabControlComponent` (Angular) to wrap that WC instead of rendering its own tab strip. Angular consumers' API stays unchanged (signal inputs, `contentChildren`, CDK drag-drop ergonomics).
3. Move all Bootstrap-driven look-and-feel into each Lit WC's Shadow DOM via SCSS partial imports compiled through the existing `codegen-wc` pipeline. The WCs become **standalone-styled** — they work without the host page importing Bootstrap.
4. Embed `<mp-tab-control>` inside `MintDockManagerElement` for stack tab strips, replacing `renderStack`'s bespoke `.dock-stack__header` markup.
5. Embed nested `<mp-splitter>` inside `MintDockManagerElement` for split layouts, replacing `renderSplit`'s bespoke `.dock-split` markup. Add the minimal extension points to `mp-splitter` that this requires.
6. Strip `mint-dock-manager.element.scss` of duplicated tab-strip + divider CSS in favour of the embedded WCs' own styles. Recolour dock's remaining overlay CSS (intersection handles, snap markers, drop indicator/joystick) via `--bs-*` variables.

### Non-goals

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

### Phase 1 ✅

- [x] `mp-tab-control` and `mp-tab-page` exist as Lit WCs in `libs/mp-tab-control-wc/`, registered as custom elements, importable from `@mintplayer/tab-control-wc`.
- [x] `BsTabControlComponent` renders via `<mp-tab-control>` internally; its public Angular API (signal inputs, `contentChildren`, drag-drop) is unchanged for consumers.
- [x] Bootstrap styles for `nav`/`nav-tabs`/`tab-content`/`tab-pane` are imported into `mp-tab-control`'s Shadow DOM via `@import 'bootstrap/scss/...'`.
- [x] `--bs-*` custom properties are scoped to `:host` inside each WC that imports `_root.scss`.
- [x] `npm run build` succeeds end-to-end.
- [x] Visual smoke-test of `bs-tab-control` demo page shows no regression vs `master`.
- [x] `mp-tab-control` works standalone in a plain HTML page with only the WC's own JS imported (no external CSS).

### Phase 2 ✅

- [x] `mp-splitter` exposes the documented extension points: `hidden` panel mode, divider opt-out (`data-no-resize` panel attribute or equivalent), `::part(divider-N)`. Each has a unit test.
- [x] `MintDockManagerElement.renderStack` embeds `<mp-tab-control>` per `DockStackNode`. The bespoke `.dock-stack__header` and tab markup is removed.
- [x] `MintDockManagerElement.renderSplit` embeds nested `<mp-splitter>` per `DockSplitNode`. The bespoke `.dock-split` markup is removed.
- [x] Dock element file size shrinks by ~1000-1500 lines.
- [x] All existing dock behaviours still work in the browser: tab activation, in-strip tab reorder, tab drag-to-detach-as-floating-window, single-divider drag, intersection-handle 4-way drag, snap markers during corner drag, drop indicator + drop joystick, floating-window resize, layout serialisation round-trip.
- [x] Dock's bespoke tab + split CSS is removed from `mint-dock-manager.element.scss`. (Overlay CSS — intersection handles, snap markers, drop indicator/joystick — stays.)

### Phase 3a — Finish Phase-2 dock-embed adaptations ✅

- [x] `renderIntersectionHandles` iterates `<mp-splitter class="dock-split">` elements and reads dividers from each splitter's shadow via the existing `getSplitterDividers` helper — no more `this.shadowRoot.querySelectorAll('.dock-split__divider')`.
- [x] `beginCornerResize` / `handleCornerResizeMove` / `endCornerResize` operate on splitter shadow data and call `mpSplitter.setPanelSizes(...)` instead of mutating `.dock-split__child` flex.
- [x] `renderSnapMarkersForCorner` / `clearSnapMarkers` query divider geometry through `getSplitterDividers(splitter)[index]`.
- [x] Dead code removed: `beginResize`, `handleResizeMove`, `endResize`, and the divider pointerdown wiring in the OLD renderSplit (mp-splitter handles single-divider drag natively now). `onIntersectionDoubleClick` (double-click-to-equalize) was also rewired through mp-splitter while in the area, fixing a stale index lookup at the same time.
- [x] Browser-tested: corner-handle 4-way drag works, snap markers appear during corner drag.

### Phase 3b — Recolour dock overlay CSS via `--bs-*` ✅

- [x] Every rgba()/hex colour rule in `mint-dock-manager.element.scss` either references a `--bs-*` variable per the mapping table above, or has a deliberate justification for staying hard-coded.
- [x] Verified: `getComputedStyle(<mint-dock-manager>).getPropertyValue('--bs-primary')` resolves to the host page's Bootstrap value (custom-property cascade through Shadow DOM).
- [x] No visual regression vs Phase 2 except the intentional palette shift. Side-by-side screenshot diff against the Phase-2 dock as the baseline.
- [x] PRD index updated to mark Phases 1, 2, 3 complete.

### Phase 4 — Stabilise nested-splitter sizing ✅

#### Problem statement

After Phase 2 swapped each `DockSplitNode` for a `<mp-splitter>`, dragging an
inner divider can shift the **parent** splitter's panel sizes mid-drag. The
user-reported symptom: "in the dock, when resizing a horizontal splitter, the
adjacent (parent) splitter is also shifting at the moment." On `master`
(commit `c5272ad2`, before the embed refactor) the same nested-split
configuration resized cleanly — only the two children adjacent to the dragged
divider moved.

##### Reproducible measurement (initial layout, no `node.sizes`)

Layout: horizontal split where the second child is itself a horizontal split
(two stacks). All `DockSplitNode.sizes` empty, so `renderSplit`'s
`if (sizes.length > 0)` branch never fires and `setPanelSizes` is never
called. Both splitters' panel-wrappers stay in their initial state: class
`panel-wrapper flex-grow`, computed `flex: 1 1 auto`, no inline width.

Dispatching `mousedown` on the inner divider, then `mousemove` on `document`
with `clientX` shifted by -120 px:

| Phase                  | Outer panel widths (px) | Inner panel widths (px) |
|------------------------|--------------------------|--------------------------|
| before drag            | 803.19 / 946.81          | 610.33 / 328.48          |
| first inner mousemove  | **670.58 / 1079.42**     | 556.63 / 514.80          |
| ...                    | 670.58 / 1079.42         | (continues to track)     |
| mouseup                | 670.58 / 1079.42         | 796.63 / 274.80          |

The outer panel containing the inner splitter jumps from 946.81 px to
1079.42 px on the **very first** inner-mousemove — a +132.61 px shift, while
the user's pointer has only moved one delta on the inner divider. The outer
shift is irreversible during the drag (it stays at 670.58 / 1079.42 even as
the inner panels keep moving) because the outer wrappers never had explicit
sizes to revert to.

The same drag with `sizes: [1, 1.5]` on the outer node and `sizes: [2, 1]`
on the inner node (so the dock calls `setPanelSizes` on both during render):
outer widths stay rock-solid at 700 / 1050 throughout the entire drag. No
shift.

##### Comparison with master

`mint-dock-manager.element.ts` on `master` rendered each `DockSplitNode`'s
children directly (`renderSplit` lines 1414-1468) with this critical line
(line 1432):

```ts
if (typeof size === 'number' && Number.isFinite(size)) {
  childWrapper.style.flex = `${Math.max(size, 0)} 1 0`;
} else {
  childWrapper.style.flex = '1 1 0';   // ← flex-basis: 0
}
```

Every `.dock-split__child`, including those without persisted sizes, got
`flex-basis: 0`. CSS spec: with `flex-basis: 0`, the flex item's preferred
size is 0 and free space distributes by `flex-grow` ratio — **content
intrinsic size cannot leak through**. mp-splitter today does the opposite:
`splitter.styles.scss:37` sets `flex-grow: 1` (which resolves to
`flex: 1 1 auto`, basis `auto`), so each panel-wrapper's preferred size is
its content's intrinsic size. When an inner mp-splitter assigns explicit
pixel widths to its own wrappers, those widths roll up through `auto` basis
into the inner-splitter container's intrinsic width, which becomes the
parent wrapper's preferred size, which the parent's flex-redistribution then
honours.

The dock on master also imperatively rewrote every child's `flex` value on
every `pointermove` (lines 1737-1742), keeping the basis-0 contract intact
through the drag.

#### Root cause

`.panel-wrapper { flex-grow: 1 }` in
`libs/mp-splitter-wc/src/styles/splitter.styles.scss:37` is the longhand,
not the `flex: 1` shorthand. The longhand leaves `flex-basis` at its
initial `auto`, which lets each panel-wrapper's preferred size equal its
content's intrinsic size. mp-splitter's `applyPanelSizes` only sets explicit
`width` / `height` on wrappers it has sizes for
(`mp-splitter.ts:321-333`); on initial layout (no `setPanelSizes` call yet)
**no** wrapper has explicit sizes — they are all `flex: 1 1 auto`. As soon
as a nested mp-splitter starts a drag and writes `width: Xpx` on its own
wrappers, the nested splitter's flex container develops an intrinsic width
that differs from what the outer flex distributed. The outer wrapper's
`flex-basis: auto` resolves to that new intrinsic width, the outer flex
container redistributes, and the parent's panels visibly shift.

Three subordinate findings rule in/out the alternative hypotheses listed
in the original investigation brief:

- **`::slotted(*) { width: 100%; height: 100% }` (splitter.styles.scss:121)**
  is irrelevant. The slotted content fills its panel-wrapper, but
  panel-wrapper itself sits inside the flex container, and it's the
  panel-wrapper's `flex-basis: auto` that lets intrinsic content size leak.
  Setting `100%` on the slotted child doesn't change the wrapper's basis.
- **The dock's `dispatchLayoutChanged` round-trip is not implicated**
  during the live drag — `dispatchLayoutChanged` only fires on
  `resize-end`, not during `pointermove`. Repeated measurement during the
  drag confirms the parent shift happens on the first inner mousemove,
  before any layout-changed dispatch.
- **Subpixel rounding** is not the mechanism. The shift is +132 px on a
  ~1750 px container — three orders of magnitude too large to be rounding.

So: only the `flex-basis: auto` hypothesis matches the measurements.

#### Design

The fix belongs in mp-splitter, not the dock. The dock has no business
knowing whether a sibling splitter happens to be using `flex-basis: 0` vs
`auto`; mp-splitter is the one that owns its panel-wrappers' flex sizing.
The user's preferred phrasing — "after the first layout-phase, the
splitters will have to store the sizes of all regions" — captures the
right invariant: **once mp-splitter has measured itself, every
panel-wrapper has an explicit pixel size, never `flex: 1 1 auto`.**

##### Approach: pin all panel sizes after first measure (favoured)

In `firstUpdated`'s existing `requestAnimationFrame` callback (mp-splitter.ts
line 72-74), after `updatePanelsFromSlot()`:

1. If no explicit sizes have been set (the stateManager's `panelSizes` is
   empty), measure each panel-wrapper's current size via `getBoundingClientRect()`
   on the splitter's main axis.
2. Call `applyPanelSizes(measuredSizes)` so every wrapper gets `width: Xpx` /
   `height: Xpx` and loses the `flex-grow` class.
3. Persist the measured sizes into the stateManager so a later `getPanelSizes`
   reflects reality and so `updatePanelsFromSlot`'s "re-apply stored sizes"
   branch (mp-splitter.ts:226-228, added in commit `7033e1a8`) keeps working
   across slot churn.

This makes the contract: **mp-splitter is in flex-grow mode for at most one
animation frame after first connect; thereafter every wrapper is explicitly
sized in pixels.** A nested mp-splitter starting a drag now finds itself
inside a parent wrapper that is `width: Xpx` (not `auto`), so the parent
doesn't reflow.

The `dispatchEvent('resize-start')` already fires on every drag start, but
no event is needed for the initial pin — it is purely a render-time
internal operation. No public API change required.

##### Container resize behaviour

Pinning panels in pixels naively means the splitter no longer redistributes
when its container grows or shrinks (e.g., window resize). Master inherited
correct behaviour from `flex-grow` ratios (basis 0). To match master:
mp-splitter installs a `ResizeObserver` on its splitter-container. When the
container's main-axis size changes, the splitter scales every wrapper's
pinned pixel size by `newContainerSize / oldContainerSize`, then calls
`applyPanelSizes` with the scaled values. This preserves the proportions
the user has set while keeping wrappers in explicit-pixel mode.

The ResizeObserver replaces the implicit "let flexbox handle it" flow that
master got for free. Cost: ~30 LoC + one new field for the last-observed
container size.

##### Alternatives considered

- **Change `.panel-wrapper { flex-grow: 1 }` → `.panel-wrapper { flex: 1 1 0 }`**.
  This is the master-equivalent CSS-only fix. It works for the live-drag
  case (intrinsic content can no longer leak through). But mp-splitter's
  `applyPanelSizes` writes `width: Xpx`, not `flex: <ratio> 1 0`, so once a
  drag has happened the wrappers are no longer in flex-grow mode — they
  become `flex: 1 1 0` *plus* an explicit `width`, and the resolved size is
  the explicit width regardless of free space. That's fine for the
  drag-active case but means container resize after a drag stops working
  (the wrappers are pinned to pre-resize widths, no scaling). To get the
  master-equivalent post-drag-resize behaviour we'd have to either rewrite
  `applyPanelSizes` to emit `flex: <ratio> 1 0` (deviating from the
  current public-API contract that `setPanelSizes(sizes)` interprets `sizes`
  as pixels), or add the same ResizeObserver. Either way the ResizeObserver
  solution is the lower-risk delta — and it composes with the pin-on-first-
  measure invariant.
- **Push the responsibility onto the dock**: the dock would call
  `setPanelSizes(measuredPixels)` on every `<mp-splitter>` after first
  render even when `node.sizes` is empty, then write the measured sizes
  back into the layout tree. This works, but mp-splitter is the natural
  owner of "my own panel-wrapper sizes" and a non-Angular consumer
  embedding `<mp-splitter>` directly would hit the same bug. Fixing it in
  the splitter benefits every consumer.
- **Drop the per-drag pin and rely on `flex-basis: 0` permanently**: this
  is master's behaviour. The downside is that mp-splitter loses the
  ability to expose absolute pixel sizes via `getPanelSizes` — every read
  becomes a relative ratio. The current API contract says
  `getPanelSizes(): number[]` returns measured pixels, and the dock
  serialises those into `node.sizes` as ratios. Keeping the
  pixel-internal model and adding a one-frame-late pin matches the
  existing contract.

##### Touch points with existing API

- `setPanelSizes(sizes: number[])`: unchanged signature and contract
  (pixel sizes). Internal: still calls `applyPanelSizes`. After Phase 4 the
  function is called automatically once on first measure when the
  consumer hasn't supplied initial sizes.
- `getPanelSizes(): number[]`: unchanged. After Phase 4 it returns
  measured pixel sizes for the initial layout case too (instead of an
  empty array, which is what the current state manager returns when
  no resize has happened yet — verify in `SplitterStateManager`).
- `resize-start` / `resizing` / `resize-end` events: unchanged. The
  initial pin does **not** dispatch a `resize-end` (no user action
  occurred).
- The dock's `renderSplit` (`mint-dock-manager.element.ts:1380-1451`) needs
  no changes. The dock keeps converting `node.sizes` weights → pixels via
  `setPanelSizes` for non-empty cases, and now relies on mp-splitter's
  internal pin for the empty-sizes case. The dock's `resize-end` handler
  also keeps working unchanged because mp-splitter still fires the same
  pixel sizes.

#### Implementation steps

1. **Add `pinSizesFromCurrentLayout()` private method to `MpSplitter`**: walk
   `this.panelWrappers`, read `getBoundingClientRect()[axis]` for each, and
   call `this.applyPanelSizes(measured)` plus
   `this.stateManager.setPanelSizes(measured)`. Idempotent — calling twice
   in a row is a no-op visually.
2. **Wire it into `firstUpdated`'s raf**: after `updatePanelsFromSlot()`, if
   `stateManager.getState().panelSizes.length === 0`, call
   `pinSizesFromCurrentLayout()`. Order matters: panel-wrappers must exist
   first, which is why this lives inside the existing raf, not at the top
   of `firstUpdated`.
3. **Wire it into `updatePanelsFromSlot` for the slotchange-after-mount
   path**: when the wrapper count changes (panel added/removed) and the
   stateManager has no stored sizes, re-pin from the measured layout. The
   existing "re-apply stored sizes" branch (lines 226-228) handles the
   has-stored-sizes case; this is its mirror for the no-stored-sizes case.
4. **Install `ResizeObserver` on `splitter-container`**: in `firstUpdated`
   after panel pin. On container size change, compute scaling factor on
   the main axis and call `applyPanelSizes(currentSizes.map(s => s * scale))`,
   then update stateManager. Bail out if no stored sizes (the pin in step 1
   hasn't run yet) or if the change is below a 1-pixel threshold (avoid
   feedback loops with subpixel rounding from the scaling itself).
5. **Drop the `flex-grow` CSS class entirely** from
   `splitter.styles.scss:34-38` once steps 1-4 are in place — every wrapper
   has an explicit `width` / `height` after the first raf, so the class
   serves no purpose. Optional but tidies up.
6. **Add a unit test in `libs/mp-splitter-wc/`** that mounts a splitter with
   no initial sizes, runs one raf, and asserts every panel-wrapper has an
   inline `width` (or `height`) and no `flex-grow` class.
7. **Add a Playwright integration test in the dock demo** that reproduces the
   nested-horizontal-in-horizontal layout, drags the inner divider, and
   asserts the outer panel widths are unchanged across the drag.

#### Acceptance criteria

- [x] `mp-splitter` panel-wrappers have explicit `width` (horizontal) or
      `height` (vertical) after the first animation frame, even when the
      consumer never calls `setPanelSizes`. Verified by browser inspection
      of `getComputedStyle(wrapper).width` returning a px value, not `auto`.
- [x] Dragging an inner mp-splitter's divider does not shift the parent
      mp-splitter's panel sizes during the drag. Verified by dispatching
      `mousedown` + a sequence of `mousemove`s on the inner divider and
      measuring the parent's panel-wrapper rects on each step — the parent
      widths must remain constant (within ±1 px subpixel rounding).
- [x] When the splitter's container resizes (e.g., window resize), every
      panel-wrapper scales proportionally to the container delta. Verified
      by scripting `mint-dock-manager`'s host element to a new size and
      asserting the ratios between panel widths are preserved within
      ±1 px.
- [x] After dragging an inner divider with no initial `node.sizes`, the
      dock's serialised layout (via `dispatchLayoutChanged` → `[attr.layout]`)
      reflects the post-drag pixel ratios. Round-tripping the layout
      through `setAttribute('layout', JSON.stringify(layout))` produces the
      same visible panel sizes.
- [ ] Existing `mp-splitter` unit tests pass unchanged. New unit test for
      the auto-pin invariant lands as part of this phase. *(Implementation
      landed in `7c49bed4`; dedicated unit test is still TODO.)*
- [x] No regression in master's existing dock behaviours: tab activation,
      tab drag-to-detach, single-divider drag in non-nested splits,
      intersection-handle 4-way drag, snap markers during corner drag,
      drop indicator + drop joystick, floating-window resize, layout
      serialisation round-trip.
- [x] `splitter.styles.scss`'s `.panel-wrapper { flex-grow: 1 }` rule is
      removed (or kept only as a fallback before the first raf, with a
      comment). *(Kept as fallback, scoped to `.panel-wrapper.flex-grow`
      with a comment explaining why `flex: 1 1 0` (basis-0) is required to
      avoid intrinsic-size leak.)*

### Post-Phase-4 polish (landed on `dock-embed-mp-wc`, not yet on master)

These commits accumulated on the `dock-embed-mp-wc` branch after Phase 4
landed (`7c49bed4`). They are bug fixes / small UX polish on top of the
Phase 1-4 architecture, not new phases — recorded here so the next
session knows the current state of the branch.

**`mp-tab-control` API addition:**

- New `border="top"` value (alongside `"true"`/`"false"`). Renders only
  `border-top` on the content `<div>` so consumers can opt into the
  Bootstrap "strip cutout" line (active tab visually punches through
  into body) without the full Bootstrap frame around the content. The
  dock now uses `border="top"` to get the cutout line back without
  doubling against `.dock-stack` / `.dock-floating`'s outer chrome
  border. Commit: `837f8dc7`.

**Dock fixes:**

- `.dock-tab` now extends its drag-handle hit area to fill the strip
  button via `display: block` + `padding: 0.5rem 1rem` + matching
  negative `margin: -0.5rem -1rem`. Without this, only the slotted
  `<span>`'s text rect (~50×21) was draggable; clicks on the button's
  surrounding padding didn't initiate dragstart. Commits: `c896b741`,
  `73a4f194` (the second corrects the placeholder width measurement
  to subtract the new padding).
- In-strip drag placeholder mirrors the dragged tab's text at 0.5
  opacity and uses `display: inline-block` so its `min-width` is
  honoured. Previously the inline span ignored `min-width` and the
  strip button collapsed to padding-only width (~34×18), leaving a
  textless "mini-thumb" stub at drag start. Commit: `837f8dc7`.
- `endFloatingResize` now clears `data-resizing` on the resizer handle
  outside the `releasePointerCapture` try/catch so the dark-blue resize
  affordance doesn't get stuck after mouseout (cleanup symmetry with
  `endCornerResize` / `endFloatingDrag`). Commit: `cd631dd8`.
- `endPaneDrag` clears the header drag placeholder *before* nulling
  `dragState`; `set layout` now rejects external writes during any
  active interaction (`isInteracting()` guard). Together these fix two
  drag-to-detach regressions: Panel 2's content disappearing when
  pulled out of a multi-pane stack, and Panel 3's floating window not
  following the cursor after detaching from a single-pane stack.
  Commit: `cb13ef66`.
- `set layout` short-circuits when the incoming snapshot is structurally
  identical to the current state (JSON-equality guard) — eliminates the
  brief equal-share flash users saw after divider drag, caused by the
  Angular host re-applying its own `(layoutChange)` echo. Commit:
  `39e0e707`.
- `.dock-drop-indicator` background restored to translucent
  `rgba(var(--bs-primary-rgb), 0.2)` (was solid
  `--bs-primary-bg-subtle` after Phase 3b). Commit: `98e4c3d0`.
- `mp-splitter`'s `handleContainerResize` now subtracts the
  panel-wrappers' negative margins (the `.divider` thumb-margin overlap)
  from `targetPanelTotal`, otherwise the layout undersized by 6 px and
  left visible gaps between panels. Commit: `e31e5cfe`.

**Repo hygiene:**

- `tsconfig.base.json` dropped deprecated `baseUrl` + `ignoreDeprecations`,
  bumped `moduleResolution` to `bundler`, `target` to `es2020`. All
  workspace tsconfigs got `./` prefixes on `include`/`exclude` globs to
  match the explicit-relative semantics needed without `baseUrl`. Commit:
  `01c2c8e8`.

### Phase 5 — Intersection glyphs (proposed, not started)

#### Problem statement

The dock's intersection handles (`.dock-intersection-handle`) are
invisible-by-default 1rem squares that become a coloured dot on hover
and a slightly punchier dot during drag. They sit at the corners where
two perpendicular `<mp-splitter>` instances meet; dragging one moves
both adjacent dividers in sync (the 4-way orchestration described in
Phase 2). They're functional but visually under-communicated — a
first-time user has no affordance signalling that the corner is
draggable until they happen to hover it.

The Phase 4 work makes this worse in one respect: nested splits now
preserve sizes correctly, so users actually keep nested layouts alive
long enough to hit corner-resize as a regular workflow. The handles
need to *announce themselves*.

#### Goals (sketch — to refine in the dedicated session)

1. Render a small glyph inside each intersection handle (cross / plus /
   four-way arrow) so the affordance is visible at rest, not only on
   hover.
2. Match the existing `--bs-primary-*` palette already used by the
   handle's hover/drag states. The glyph should fade in alongside the
   handle's `opacity: 0` → `opacity: 1` hover transition rather than
   appearing as a separate layer.
3. Preserve the current keyboard-accessibility story
   (`focus-visible` reveals the handle).
4. No regression in the 4-way orchestration: the glyph is purely
   decorative and does not interfere with pointer/touch capture or with
   `setPanelSizes` calls on the two adjacent splitters.

#### Open design questions

- **Glyph source.** Inline SVG (single shape, no external dep), a
  Bootstrap Icons class via `<i class="bi bi-arrows-move">` (depends on
  whether the demo page already loads `bootstrap-icons`), or a CSS-only
  pseudo-element (cheapest, but limited to simple shapes)?
- **Visibility default.** Always-visible at low opacity (~0.3) so the
  affordance is permanent, vs. only on hover/drag (consistent with
  current behaviour). Always-visible reads better but adds visual
  noise to dense layouts.
- **Resting size.** The handle is currently `1rem × 1rem`. A glyph
  filling it would be ~12 px — readable but small. Larger handles
  improve discoverability but eat into panel content area.
- **Touch story.** On touch, hover doesn't fire; the handle is currently
  hard to find. Should the always-visible mode be the touch default?

#### Files involved

- `mint-dock-manager.element.ts` — `renderIntersectionHandles` (handle
  DOM construction).
- `mint-dock-manager.element.scss` — `.dock-intersection-handle` styles
  (background, border, opacity transitions).

#### Out of scope for Phase 5

- Reorganising the 4-way orchestration logic. Glyphs are a presentation
  layer change; handle behaviour stays as-is.
- New keyboard shortcuts for corner-resize.
- Drag-to-resize feedback animations beyond the existing
  `data-resizing` colour swap.

#### Acceptance criteria (sketch)

- [ ] Each intersection handle shows a glyph (TBD shape) at rest.
- [ ] Glyph + handle background use only `--bs-*` tokens; no
      hard-coded rgba.
- [ ] Hover, focus-visible, and `data-resizing` states all transition
      smoothly between resting and active appearances (no flicker).
- [ ] Existing 4-way orchestration still works: dragging the handle
      moves both adjacent dividers in lockstep, snap markers still
      appear during the drag, double-click still reset-to-equal-share.
- [ ] Manual smoke test on the dock demo page: nested
      horizontal-in-horizontal layout, all four corner directions
      reachable, glyph readable at the smallest splitter size.
