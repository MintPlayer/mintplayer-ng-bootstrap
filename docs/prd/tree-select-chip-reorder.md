# PRD — Tree-select chip reorder + reusable drag-drop primitive

**Status:** Implemented (branch `feature/tree-select-chip-reorder`)
**Owner:** pieterjan@2sky.be
**Created:** 2026-06-30
**Affected libs:** `@mintplayer/web-components` (new `drag-drop` primitive + `tree-select`),
`@mintplayer/ng-bootstrap`, `@mintplayer/react-bootstrap`, `@mintplayer/vue-bootstrap`,
`apps/ng-bootstrap-demo`

---

## 1. Context & problem

The demo page at `additional-samples/tree-select-drag-drop` was meant to let users **reorder the
selected items inside the `BsTreeSelect` component itself**. The shipped implementation instead
renders a **separate `cdkDropList` bar below** the component: items are picked in `bs-tree-select`,
then reordered in an unrelated Angular CDK list, and the new order is pushed back through `[value]`.
That is a workaround, not the intended feature.

The workaround exists for a concrete technical reason. In `multiple` / `checkbox` mode the selected
items render as `<span class="ts-chip">` chips **inside the web component's shadow DOM**
(`libs/mintplayer-web-components/tree-select/src/components/mp-tree-select.ts` → `renderChips()`).
Angular CDK's `cdkDrag` / `cdkDropList` are Angular directives that can only bind to **light-DOM**
elements Angular owns; they cannot reach into a Lit shadow root, so the chips themselves cannot be
made CDK-draggable.

### Goal

Let users **drag-reorder the selected chips in place, inside `bs-tree-select`**, and remove the
separate bar. Because reorder must happen inside the shadow DOM, it is implemented with
**pointer events owned by the web component** — and that mechanism is **generalized into a reusable,
CDK-flavored drag-drop primitive** in the web-components library so other components can adopt it.

### Decisions (confirmed with stakeholder)

| # | Decision |
|---|----------|
| 1 | **Scope** = reorder the **selected chips in the trigger** (`multiple` / `checkbox` mode), in place. Reordering tree nodes in the dropdown panel is **out of scope**. |
| 2 | **Mechanism** = **WC-native pointer drag**, not Angular CDK. This matches repo conventions (WC owns UI; pointer events over HTML5 DnD; React/Vue get the feature for free). |
| 3 | **Generalize**: build a reusable, CDK-flavored drag-drop primitive in `mintplayer-web-components` rather than a one-off. Other components (`dock`, `tile-manager`, `query-builder`, `scheduler`) each roll their own drag today and could later consolidate onto it. |
| 4 | **Reorder is opt-in and tree-shakeable**: the drag-drop code must be **excluded from the bundle** for consumers that don't reorder. Achieved via a **registration seam** in the WC + an **explicit opt-in import/directive** the consumer adds — not a static import in the base component (see §2.1). |

### Why not Angular CDK directly

CDK was evaluated and rejected for this feature: keeping it literally would require exposing the
chip area as a light-DOM `<slot>`, rendering chips in the Angular wrapper, and projecting them in.
That is Angular-only (React/Vue can't reuse it), duplicates chip rendering, and breaks the
"web component is the single source of UI truth" convention. The pointer-drag primitive achieves
genuine in-component reorder for all three frameworks at once.

---

## 2. The reusable primitive — `@mintplayer/web-components/drag-drop`

A new **framework-agnostic** shared sub-entry, mirroring the shape of existing primitives
`overlay` and `a11y` (just `index.ts` + `src/`, no `ng-package.js` / `package.json`; auto-resolved
by the `@mintplayer/web-components/*` tsconfig wildcard and `vite.config.mts`, imported as
`@mintplayer/web-components/drag-drop`).

```
libs/mintplayer-web-components/drag-drop/
  index.ts                    → export * from './src'
  src/
    index.ts                  → public API barrel
    sortable-controller.ts    → SortableController (Lit ReactiveController)
    move-item.ts              → moveItemInArray / transferArrayItem (CDK-parity helpers)
    types.ts                  → SortDropEvent, SortableOptions, SortAxis
    sortable-controller.spec.ts
```

### Scope (v1)

Single-list **sortable reorder** — the subset CDK covers with `cdkDropList` + `moveItemInArray`.
The API is CDK-flavored and extensible; **cross-list transfer** (`transferArrayItem`) and
**drop-zone / tree-reparent** drags are noted as future extensions and **not built now**. The
tree-reparent case already exists in `query-builder/src/dnd/drag-controller.ts`; consolidating it
onto this primitive is a follow-up, out of scope here.

### Public API (CDK-flavored, Lit-idiomatic)

```ts
class SortableController<T> implements ReactiveController {
  constructor(host: ReactiveControllerHost & LitElement, opts: {
    items: () => readonly T[];          // current order (read at drag start)
    itemId: (item: T) => string;        // track-by; matched against data-sortable-id
    onDrop: (e: SortDropEvent) => void; // { previousIndex, currentIndex } — host reorders + re-renders
    axis?: 'horizontal' | 'vertical' | 'both';  // 'both' = wrap layout (chips). default 'both'
    handleSelector?: string;            // optional drag-handle selector within an item
    dragThresholdPx?: number;           // mouse slop; default 5 (scheduler precedent)
    longPressMs?: number;               // touch arming; default 600 (dock/tile-manager precedent)
    disabled?: () => boolean;
  });
  attach(container: Element): void;     // wire from a Lit ref directive on the item container
}

function moveItemInArray<T>(arr: readonly T[], from: number, to: number): T[]; // returns a new array
function transferArrayItem<T>(/* declared; future use */): void;
```

### Responsibilities (hidden inside the controller — a deep module)

- **Gesture state machine** `idle → arming(touch) → dragging → dropping`: 5px slop for mouse,
  600ms + 10px touch long-press — reusing thresholds proven in `dock` and `tile-manager`.
- **Hit-testing** via `elementsFromPoint`, filtered to `[data-sortable-id]` elements **within the
  host's shadow root** (works because the listeners and items share the same root). Each draggable
  item must carry `data-sortable-id=${itemId(item)}`.
- **Visual feedback**: a **ghost/preview** clone (`position: fixed; pointer-events: none`) tracking
  the pointer, plus a **placeholder gap** insertion indicator at the live drop index. Any settle
  transition respects `prefers-reduced-motion`.
- **Touch**: `touch-action: none` on draggable items; never `preventDefault()` a touch
  `pointerdown` (it suppresses the synthesized click).
- **Keyboard reorder** (accessibility): `M` to grab a focused item, Arrow keys to move,
  `Enter` / `M` to drop, `Escape` to cancel — matching the dock/tile-manager keymap (`M` for
  move-mode, not Space). Moves are announced via `@mintplayer/web-components/a11y` live-announcer.
- **Data ownership stays with the host**: the controller emits one `onDrop({previousIndex,
  currentIndex})`; the host mutates its own data and re-renders. The primitive imposes no behavior
  on the data model.

### 2.1 Opt-in / tree-shaking architecture

The drag chips live in `mp-tree-select`'s shadow DOM, so the `SortableController` must be
instantiated **inside** the WC (only it holds a ref to the chip container). To keep the heavy code
out of the bundle for consumers that don't reorder, the WC must **not statically import** the
controller. Instead:

**(a) Generic registration seam in the WC.** A tiny module
`tree-select/src/components/sortable-registry.ts` holds a `register` / `get` pair:

```ts
export type TreeSelectSortableFactory = (
  host: LitElement & ReactiveControllerHost,
  opts: { items: () => readonly TreeNode[]; itemId: (n: TreeNode) => string;
          onDrop: (e: SortDropEvent) => void },
) => { attach(container: Element): void; detach(): void };

let _factory: TreeSelectSortableFactory | undefined;
export const registerTreeSelectSortable = (f: TreeSelectSortableFactory) => { _factory = f; };
export const getTreeSelectSortable = () => _factory;
```

`mp-tree-select` imports **only** this registry (a getter/setter — negligible bytes), never the
controller. When `reorderable` is set **and** a factory has been registered, it builds + attaches
the controller; otherwise reorder is **inert** with a one-time dev-mode `console.warn` pointing at
the opt-in import. The heavy `SortableController` is reachable only through a registered factory.

**(b) Opt-in artifacts** — each pulls in the primitive **and** registers the factory, so the
bundler tree-shakes all of it away unless the consumer imports it:

- **Plain WC / framework-agnostic** — a side-effect registrar module that imports
  `SortableController` from `@mintplayer/web-components/drag-drop` and calls
  `registerTreeSelectSortable(...)`. Consumer opts in with a single import line.
- **Angular (primary path)** — a standalone `BsTreeSelectReorderDirective` shipped from a separate
  secondary entry `@mintplayer/ng-bootstrap/tree-select/reorder`. Selector `bs-tree-select[reorderable]`:
  applying the `reorderable` attribute activates the directive, which registers the factory and sets
  `el.reorderable = true`. The directive is bundled **only** if the consumer imports it; without the
  import, `reorderable` is an inert plain attribute. (Keeps drag-drop out of the base
  `@mintplayer/ng-bootstrap/tree-select` entry entirely.)
- **React / Vue** — equivalent opt-in: a side-effect/registrar import (or a tiny
  `enableTreeSelectReorder()` helper) re-exported from each wrapper package.

**Implementation note:** verify the secondary-entry resolution for the registrar path
(`@mintplayer/web-components/tree-select/reorder` vs. a sibling sub-entry). The repo auto-discovers
`<name>/src/index.ts` as a sub-entrypoint; a sub-*sub*-path may need either a sibling top-level
module or an explicit export-map entry. The Angular `tree-select/reorder` follows the existing
ng-packagr secondary-entry pattern (its own `ng-package.json`).

---

## 3. `mp-tree-select` integration

- New boolean attribute/property **`reorderable`** (default `false`), declared via the static
  `observedAttributes` getter pattern (spread `super.observedAttributes`). Only effective in
  `multiple` / `checkbox` modes.
- When `reorderable` flips true, call `getTreeSelectSortable()` (§2.1). If a factory is registered,
  build the controller via the factory with `items = () => [...this._selected.values()]`,
  `itemId = (n) => n.id`, `axis: 'both'` (chips wrap), and `attach()` it to the chip container ref.
  If no factory is registered, no-op + one-time dev warning. **No static import of
  `SortableController` here.**
- In `renderChips()`: when `reorderable`, stamp each `.ts-chip` with `data-sortable-id=${node.id}`,
  add a grab affordance / drag handle, and bind the chip container's `ref` to `controller.attach`.
- `onDrop` → rebuild the insertion-ordered `_selected` Map in the new order, recompute `value`,
  then emit **two** events:
  - **`value-change`** with the reordered `value` (`added` / `removed` undefined) — so reactive /
    template-driven forms and the CVA pick up the new order, just like today's `[value]` round-trip
    but now internal.
  - **`reorder`** — a `CustomEvent<{ value, previousIndex, currentIndex }>` semantic event.
- **Styles** (chip `cursor: grab`, ghost, placeholder gap, handle) go in
  `tree-select.styles.scss`. SCSS is compiled into the generated `tree-select.styles.ts`, so
  **`nx run mintplayer-web-components:codegen-wc` must be re-run** after editing it. Re-declare any
  Bootstrap utility rules needed — they do not cross the shadow boundary.

---

## 4. Framework wrappers

### Angular — `libs/mintplayer-ng-bootstrap/tree-select/`

The **base** `BsTreeSelectComponent` stays free of any drag-drop code (so the base
`@mintplayer/ng-bootstrap/tree-select` entry never bundles it). It only needs to:
- surface a `reordered = output<TreeSelectReorderEventDetail>()` and bind `(reorder)` in
  `tree-select.component.html` to emit it (the event is dispatched by the WC regardless of who
  registered the factory; binding it is free of drag code). `onValueChange` already maps
  `value-change` → model + `onChange` (CVA), so the reordered order reaches `formControl` /
  `ngModel` with no extra wiring.
- re-export the reorder event type from `src/index.ts`.

The opt-in lives in a **new secondary entry** `@mintplayer/ng-bootstrap/tree-select/reorder`
(own `ng-package.json`, mirroring an existing secondary entry):
- `BsTreeSelectReorderDirective`, selector `bs-tree-select[reorderable]`.
- On construction it imports `SortableController` from `@mintplayer/web-components/drag-drop` and
  calls `registerTreeSelectSortable(...)` (idempotent), then sets `el.reorderable = true` on the
  host WC element via its `ElementRef`.
- Bundled **only** when the consumer imports the directive; otherwise tree-shaken out.

**No `@angular/cdk` dependency** anywhere for this feature.

### React & Vue

Reorder is internal to the WC and surfaces through the existing `value` / value-change bridge, so
the base wrappers only pass the `reorderable` attribute through and optionally expose an `onReorder`
/ `@reorder` passthrough. The **opt-in** (importing the primitive + registering the factory) is a
small side-effect/registrar import re-exported per wrapper package, kept out of the base wrapper so
it tree-shakes. No chip-rendering duplication — "WC owns UI, wrappers stay thin" holds.

---

## 5. Demo rewrite — `apps/ng-bootstrap-demo/.../tree-select-drag-drop/`

- Remove the separate `cdkDropList` bar, the `DragDropModule` import, `onDrop` / `moveItemInArray`,
  and the `.dnd-*` SCSS.
- Import `BsTreeSelectReorderDirective` from `@mintplayer/ng-bootstrap/tree-select/reorder` and add
  it to the page component's `imports` (this is the opt-in that pulls the drag code in).
- Set `reorderable` on `<bs-tree-select mode="multiple">`; chips reorder in place.
- Update the prose and `bs-code-snippet`s to show the in-component reorder **and the required
  opt-in import** (so consumers learn the tree-shakeable pattern). Live demo **before** the snippet
  (repo convention). Keep the existing route.

---

## 6. Files

**Create**
- `libs/mintplayer-web-components/drag-drop/{index.ts, src/index.ts, src/sortable-controller.ts, src/move-item.ts, src/types.ts, src/sortable-controller.spec.ts}`
- `libs/mintplayer-web-components/tree-select/src/components/sortable-registry.ts` (the WC seam, §2.1a)
- Framework-agnostic registrar (side-effect opt-in) module for the WC (§2.1b — path TBD per the
  resolution note)
- Angular reorder secondary entry: `libs/mintplayer-ng-bootstrap/tree-select/reorder/{index.ts, ng-package.json, src/...}` with `BsTreeSelectReorderDirective`

**Modify**
- `libs/mintplayer-web-components/tree-select/src/components/mp-tree-select.ts` (registry-gated wiring, `reorderable`, `renderChips`, `reorder` event)
- `libs/mintplayer-web-components/tree-select/src/styles/tree-select.styles.scss` (+ regenerated `.styles.ts`)
- `libs/mintplayer-web-components/tree-select/src/types/tree-select.ts` + `src/index.ts` (reorder event type + `registerTreeSelectSortable` export)
- `libs/mintplayer-ng-bootstrap/tree-select/src/tree-select/tree-select.component.{ts,html}` + `src/index.ts` (base: `reordered` output only — no drag code)
- `libs/mintplayer-react-bootstrap/tree-select/**`, `libs/mintplayer-vue-bootstrap/tree-select/**` (base passthrough + separate opt-in registrar)
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/tree-select-drag-drop/*`

**Reuse**
- `@mintplayer/web-components/a11y` (live-announcer for keyboard reorder)
- Gesture thresholds / state-machine patterns from `dock`, `tile-manager`, `scheduler/src/drag`
- `repeat` keying already present in `renderChips()`

---

## 7. Verification

1. `npx nx run mintplayer-web-components:codegen-wc` after SCSS edits.
2. `npx nx test mintplayer-web-components` — unit specs for `moveItemInArray`, drop-index
   computation, and the keyboard-reorder reducer (pointer-drag is jsdom-limited; test the pure
   pieces + dispatch synthetic pointer events where feasible).
3. `npx nx build mintplayer-web-components`, then `nx build mintplayer-ng-bootstrap`
   (+ react / vue).
4. **Verify through the running demo apps** (not a standalone harness): `apps/ng-bootstrap-demo` →
   `additional-samples/tree-select-drag-drop` — pick several items, drag a chip to reorder
   (mouse + touch), confirm the order persists in `[(ngModel)]` / form value; test keyboard reorder
   (`M` + arrows); smoke-test in Firefox (fixed-size flex children shrink there). Spot-check the
   React and Vue demos for the same.
5. Optional Playwright e2e: pointer-drag a chip and assert the new order.
6. **Bundle-exclusion check** (the point of §2.1): build a throwaway app that uses
   `<bs-tree-select>` **without** importing the reorder directive and confirm `SortableController` /
   the `drag-drop` chunk is absent from the output (grep the bundle for a `SortableController`
   identifier). Then add the directive and confirm it appears. Verifies reorder is genuinely
   opt-in, not dead-code that ships anyway.

---

## 8. Out of scope (follow-ups)

- Cross-list `transferArrayItem` drags; tree-node reorder / reparent in the dropdown panel.
- Migrating `query-builder` / `dock` / `tile-manager` / `scheduler` onto the shared primitive.
