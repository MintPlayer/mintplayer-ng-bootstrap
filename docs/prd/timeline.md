# PRD: `<bs-timeline>` — enterprise timeline component

Tracks: [issue #331](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/331).

Status: **Proposed** — not yet implemented.

A new enterprise component that renders a sequence of events along a
connecting line, vertically or horizontally, with fully customizable
markers, content, and connectors. Built as a framework-agnostic Lit web
component (`<mp-timeline>` + `<mp-timeline-item>`) with hand-written
Angular, React, and Vue wrappers and a demo page in each demo app — the
same shape as `<bs-datatable>`, `<bs-scheduler>`, and `<bs-dock>`.

References that shaped this spec: [PrimeNG Timeline](https://primeng.org/timeline)
and [Syncfusion Angular Timeline](https://www.syncfusion.com/angular-components/angular-timeline).
We take the **superset** of both: PrimeNG's granular named templates +
Syncfusion's `reverse`, four-way `align`, typed item model, and RTL.

> **Design-review note.** The dual-authoring + SSR design below was
> stress-tested by an adversarial review. It corrected an earlier draft
> that had `<mp-timeline-item>` expose region slots **and** had the parent
> re-project them by id (`marker-{id}`) — a two-level-slotting impossibility
> (content projected into the item's shadow slot cannot also be assigned to
> an ancestor's named slot), which also could not SSR (the parent cannot
> read light-DOM children during `@lit-labs/ssr` server render). The model
> here — **item owns its row, parent is a CSS-driven container with a single
> default slot** — is the standard slot-based approach (Shoelace / Ionic /
> Carbon) and dissolves both problems.

---

## Overview

1. **One component, two orientations.** `orientation="vertical"` (default)
   or `"horizontal"`. The same alignment / reverse / template logic applies
   to both axes.
2. **Positioning.** `align` places item content on the start side, end side,
   or alternating sides of the line; the *opposite* region (typically the
   timestamp) renders on the other side automatically.
3. **Reverse.** `reverse` flips item order — bottom-to-top (vertical) or
   right-to-left (horizontal) — independent of `align` and of `dir` (RTL).
4. **Granular customization.** Consumers can override the **marker
   (bullet)**, **title**, **timestamp**, **content**, **opposite**, and
   **connector** per item — improving on both reference libraries (neither
   offers a connector template).
5. **Typed item model with free-form passthrough.** A `TimelineItem`
   interface covers the common fields (id, title, description, time, icon,
   color, disabled); arbitrary extra fields pass through untouched.
6. **Two authoring modes for one component.** (a) **Data-driven** — set the
   `items` property + supply templates/render-props/scoped-slots; (b)
   **Declarative** — author `<mp-timeline-item>` child elements directly.
   They are two serializations of one canonical model and never compete
   inside one instance (see § Dual-mode reconciliation). Declarative is the
   SSR-meaningful, no-wrapper-friendly path; data-driven is the dynamic-list
   path used by framework wrappers.
7. **Framework-agnostic core.** Lit web components `<mp-timeline>` +
   `<mp-timeline-item>` + `timeline-core` (types + the shared `resolveSides`
   helper), consumed by hand-written Angular, React (via `@lit/react`), and
   Vue wrappers.
8. **Presentational by default, selectable on opt-in.** With no `selectable`
   flag the timeline imposes no selection or keyboard model (consistent with
   the WC-primitive rule) and just emits a semantic `item-click`. Set
   `selectable` to enable a built-in selection model with roving-tabindex
   keyboard navigation (v1 scope). See § Selection & keyboard.

A first-class demo on every demo app replicates the Syncfusion "Templates"
example: **a connected card rendered to the side of the bullet** (feature 6
in the request).

---

## Tech stack & constraints

* **Web component:** Lit 3, framework-agnostic, no framework imports.
  Lives at `libs/mintplayer-web-components/timeline/` with a sibling
  `libs/mintplayer-web-components/timeline-core/` holding the shared types
  + the `resolveSides` helper (so wrappers can `import` them without pulling
  the registration side-effect — mirrors `scheduler` / `scheduler-core`).
* **Sub-entrypoints auto-discovered.** Any directory under the WC lib root
  containing `src/index.ts` becomes a published sub-entrypoint
  (`@mintplayer/web-components/timeline`,
  `@mintplayer/web-components/timeline-core`) — handled by the existing
  `discoverEntries()` scan in `libs/mintplayer-web-components/vite.config.*`.
  No manual `exports` edits, but add both subpaths to
  `docs/prd/wc-inventory.md`.
* **Styling:** SCSS authored in `src/styles/*.styles.scss`, compiled to
  `*.styles.ts` by the `codegen-wc` Nx target
  (`node tools/scripts/build-web-components.mjs libs/mintplayer-web-components`).
  **Re-run codegen after every SCSS edit** — the `.styles.ts` is generated
  and git-tracked, and `build` depends on `codegen-wc`.
* **Shadow DOM caveat:** Bootstrap utility classes do not cross the shadow
  boundary. Every spacing / flex / color utility the timeline relies on
  must be re-declared inside the WC SCSS (or use `var(--bs-*)` custom
  properties, which *do* inherit through shadow roots).
* **Template-only shadow scaffold (SSR-load-bearing).** `<mp-timeline>` and
  `<mp-timeline-item>` must build their entire shadow DOM in the Lit
  `render()` template — **no imperative `document.createElement` /
  `innerHTML` shadow construction** (unlike `mp-splitter` / `mp-scheduler`,
  which build shadow imperatively and therefore cannot be DSD-serialized or
  hydrated). Only template-rendered shadow DOM can SSR. The one allowed
  exception is the **data-mode** row construction (see reconciliation),
  which is hydration-dependent anyway.
* **Angular wrapper:** `libs/mintplayer-ng-bootstrap/timeline/`, signals API
  (`input()` / `model()` / `output()`), templates exposed via structural
  directives (see § Angular wrapper). Published as the
  `@mintplayer/ng-bootstrap/timeline` sub-entrypoint.
* **React wrapper:** `libs/mintplayer-react-bootstrap/timeline/`,
  `@lit/react` `createComponent` base wrapped by a hand-written FC; templates
  as render-props lowered to `<mp-timeline-item>` children.
* **Vue wrapper:** `libs/mintplayer-vue-bootstrap/timeline/`, `<script setup>`
  SFC, scoped slots lowered to `<mp-timeline-item>` children.
* **SSR (forward-compat, not yet live).** The repo's `@lit-labs/ssr`
  middleware + the `is-server-side` attribute convention are **planned but
  not yet built** — no WC implements `isServerSide`/`renderSsr` today, and
  `docs/prd/wc-ssr-lit-labs.md` does not yet exist. Timeline adds the
  `isServerSide` property (reflected to `is-server-side`) for forward-compat
  and follows the hydration-safe rules below, but **until that middleware
  lands, SSR degrades to "renders on the client after hydration."** Do not
  promise no-JS SSR of the `items[]` mode at all. Timeline is a
  non-branching widget (no radio/checkbox CSS state machine) → the
  "visible-but-inert until hydration" DSD tier; one `render()` serves both
  server and client.
* **Hydration-safe rules.** (1) No DOM access in the constructor — defer to
  `connectedCallback()` / `firstUpdated()`. (2) Gate any `MutationObserver`
  and any `this.children` / `assignedElements()` reads behind Lit's
  `isServer` (the server cannot read light-DOM children). (3) Do **not**
  mutate light-DOM children before first paint (no writing `slot=` onto
  children); the parent positions items purely with CSS on
  `::slotted(mp-timeline-item)`. (4) Any slotchange/observer handler must be
  idempotent and is also invoked once from `firstUpdated()`, so CSR-only and
  hydrated mounts converge. (5) The `<li>`/row structure must not depend on
  a server-side child-walk — alternate side, reverse, and connectors are
  **CSS-derived** (`:nth-child`, `flex order`, `::slotted(:last-of-type)`),
  so they are correct on the server without enumerating children.
* **Breaking changes:** new component, so no BC surface. Design for the
  cleanest API; do not carry shims.

---

## Data model — `TimelineItem`

Defined in `timeline-core`. Typed but open: unknown extra fields pass
through to templates via the item object.

```ts
export interface TimelineItem {
  /** Stable identity for selection + trackBy + event payloads. Falls back to
   *  index. STRONGLY RECOMMENDED whenever selectable or reorderable. */
  id?: string | number;
  /** Default title text (used by the built-in row layout). */
  title?: string;
  /** Default body text / description. */
  description?: string;
  /** Timestamp; rendered in the opposite region by default. */
  time?: string | Date;
  /** Icon class for the default marker (e.g. a Bootstrap-icons class). */
  icon?: string;
  /** Accent color for the default marker + the trailing connector. */
  color?: string;
  /** Dims the item and skips selection/click. */
  disabled?: boolean;
  /** Extra class on the rendered row. */
  cssClass?: string;
  /** Free-form passthrough for custom templates. */
  [key: string]: unknown;
}
```

**Default rendering (no templates):** colored dot marker (with `icon` if
set) → content shows `title` (bold) + `description` → `time` shown in the
opposite region → a connector segment trailing toward the next item, tinted
by `color`; the last item draws no trailing connector.

---

## Web component API — `<mp-timeline>`

`<mp-timeline>` is a thin container: it renders the list scaffold + a single
default `<slot>` and owns orientation / align / reverse / selection — all
applied via **host attributes + CSS on `::slotted(mp-timeline-item)`**. Rows
are always `<mp-timeline-item>` elements (authored directly in declarative
mode, or generated by the wrapper/WC in data mode). This keeps the two
authoring modes on one rendering path and keeps layout CSS-driven (no
server-side child enumeration).

### Attributes (reflected, scalar)

| Attribute | Type | Default | Purpose |
|---|---|---|---|
| `orientation` | `vertical \| horizontal` | `vertical` | Axis of the line. |
| `align` | `start \| end \| alternate \| alternate-reverse` | `start` | Side the content sits on. `start` = left (vertical) / top (horizontal); `end` = the opposite. `alternate` zig-zags; `alternate-reverse` zig-zags starting from the other side. Implemented via `::slotted(mp-timeline-item:nth-child(...))`. |
| `reverse` | `boolean` | `false` | Reverse item order (bottom-to-top / right-to-left) via CSS `order` / `flex-direction`. Never mutates `items` or reorders DOM. Orthogonal to `dir`. |
| `dir` | `ltr \| rtl` | inherited | RTL support (maps Syncfusion `enableRtl`). Swaps physical start/end at the CSS layer only; logical `side` names stay dir-agnostic. |
| `selectable` | `none \| single \| multiple` | `none` | Opt-in selection mode. `none` = presentational. Enables roving-tabindex keyboard nav + selection events. |
| `is-server-side` | `boolean` | unset | Forward-compat SSR flag (set by the planned middleware; see § Tech stack). Inert until that infra lands. |

> **Naming decision (Q1, decided):** a single
> `start/end/alternate/alternate-reverse` enum resolved per orientation,
> rather than PrimeNG's orientation-specific `left/right/top/bottom`.
> Cleaner, and `start/end` is RTL-aware.

### Properties (JS-shaped)

| Property | Type | Purpose |
|---|---|---|
| `items` | `TimelineItem[]` | Data-driven source. Reference-equality change detection — pass a new array to re-render. **Non-empty `items` wins over declarative children** (see reconciliation). |
| `selectedIds` | `(string \| number)[]` | Selected item ids (`selectable !== 'none'`). Identity = `id`/`item-id` or index. |
| `isServerSide` | `boolean` | Reflects `is-server-side`. |
| `markerRenderer` | `ItemRenderer?` | **Advanced / Angular path.** Per-item callback returning DOM node(s) for the bullet of a WC-constructed data-mode row. Not used by the React/Vue lower-to-children bridge (see § wrappers). |
| `titleRenderer` | `ItemRenderer?` | As above, title. |
| `timestampRenderer` | `ItemRenderer?` | As above, timestamp/opposite. |
| `contentRenderer` | `ItemRenderer?` | As above, content body (supersedes title+description). |
| `oppositeRenderer` | `ItemRenderer?` | As above, opposite region. |
| `connectorRenderer` | `ConnectorRenderer?` | As above; the trailing connector after item[index]. |

```ts
// timeline-core
export type ItemRenderer = (item: TimelineItem, ctx: TimelineItemContext) => Node | Node[];
export type ConnectorRenderer = (ctx: TimelineConnectorContext) => Node | Node[];

export interface TimelineItemContext {
  index: number;          // source index (pre-reverse)
  visualIndex: number;    // post-reverse render order
  isFirst: boolean;       // first in render order
  isLast: boolean;        // last in render order (no trailing connector)
  orientation: 'vertical' | 'horizontal';
  side: 'start' | 'end';  // resolveSides(...) — may be provisional under inherited dir
}
export interface TimelineConnectorContext {
  index: number;          // the connector trailing item[index]
  fromItem: TimelineItem;
  toItem: TimelineItem;
  orientation: 'vertical' | 'horizontal';
}

/** Single source of truth for side resolution; consumed by BOTH the WC and the
 *  wrappers so they never disagree under reverse + alternate + rtl. */
export function resolveSides(
  count: number,
  align: 'start' | 'end' | 'alternate' | 'alternate-reverse',
  reverse: boolean,
  dir: 'ltr' | 'rtl',
): ('start' | 'end')[];
```

> **Bridge correction (supersedes the earlier draft).** The renderer-callback
> mechanism is the **Angular** bridge (and an advanced imperative escape
> hatch), where the WC *constructs the data-mode row in its own DOM* and
> splices the returned nodes in. **React and Vue do NOT push callbacks onto
> these properties** — they lower render-props / scoped-slots into
> `<mp-timeline-item>` children whose content sits in the item's own named
> slots (see § React wrapper / § Vue wrapper). Both paths yield identical
> DOM; neither re-projects across two shadow boundaries.

### Events

| Event | `detail` | When |
|---|---|---|
| `item-click` | `{ item: TimelineItem; index: number; originalEvent: Event }` | A non-disabled item is activated (click / Enter / Space). Always emitted. |
| `selection-change` | `{ selected: TimelineItem[]; added: TimelineItem[]; removed: TimelineItem[] }` | `selectable !== 'none'` and the selection set changes. Ids computed pre-reverse, so selection survives reverse/align toggles. |

All events are `CustomEvent` with `{ bubbles: true, composed: true }`.
`item-click` fires regardless of `selectable` (the WC-primitive escape hatch
— consumers can ignore the built-in selection and mutate their own state).

---

## `<mp-timeline-item>` (the row element)

A real LitElement that **renders its own row** (marker | content | opposite,
plus a trailing connector) in its **own shadow DOM**, fed by its own named
slots with attribute fallbacks. It is the focus / `aria-selected` target.
The parent never reaches into it — it only positions it via CSS. This is the
decisive resolution of Q3: there is exactly **one** shadow boundary between
authored content and its rendered region, so render-props / scoped-slots /
plain HTML all project cleanly and SSR via DSD.

### Attributes (scalar fields — DSD-serializable)

Each mirrors a `TimelineItem` field, so the two authoring modes are two
serializations of one model.

| Attribute | Type | Maps to | Notes |
|---|---|---|---|
| `item-id` | `string` | `id` | Stable identity. **Required in practice when `selectable` or reorderable.** Falls back to document-order index. Named `item-id` (not `id`) to avoid colliding with the global `id` attribute — same spirit as `mp-tab-page`'s `tab-id`. |
| `title` | `string` | `title` | `title` slot wins if present. |
| `description` | `string` | `description` | default (unnamed) slot wins if present. |
| `time` | `string` (ISO) | `time` | `opposite`/`timestamp` slot wins if present. (Attributes are strings; a `Date` is expressed as an ISO string. No epoch coercion.) |
| `icon` | `string` | `icon` | `marker` slot wins if present. |
| `color` | `string` (reflected) | `color` | Tints the default marker + the trailing connector. |
| `disabled` | `boolean` (reflected) | `disabled` | Dims + removes from tab order + skips click/selection. The `disabled → data-disabled` mirror (if any) is written in `firstUpdated`, not `connectedCallback`, so server and client trees agree. |
| `item-class` | `string` | `cssClass` | Applied to the rendered row. |
| `selected` | `boolean` (reflected) | — | **Authoring seed only.** Seeds the parent's initial `selectedIds` when `selectable !== none` *and no explicit `selectedIds`/`selection` is supplied* (explicit selection wins). Runtime selection state is owned by the parent, not re-read from this attribute after first paint. |
| `data-*` | `string` | `passthrough` | Harvested into the item's passthrough (`data-foo` → `foo`). **String-typed only** — declarative passthrough cannot carry Dates/functions/objects the way `items[]` passthrough can. |

### Named slots (rich fields — DSD-serializable, single boundary)

| Slot | Region | Fallback chain |
|---|---|---|
| `marker` | bullet / icon | → `icon` attr → default colored dot |
| `title` | title line | → `title` attr |
| (default) | content body | → `content` slot → `description` attr |
| `content` | content body (explicit alias of default) | default slot wins if both |
| `opposite` / `timestamp` | opposite region | → `time` attr |
| `connector` | the trailing connector after this item | → default CSS line (suppressed on the last item via `::slotted(...:last-of-type)`) |

> **Connector ownership (refined from the earlier draft).** The connector is
> now **item-owned**: each item draws the segment trailing toward the next
> item, and the parent suppresses it on the last item with CSS. A simple
> "line to the next item" needs no neighbor data, so this is cleaner and
> SSR-safe — and it removes the earlier host-level `connector-{id}` slot
> (which depended on the broken id-keyed re-projection).

### Host display

The item host **is** the row (`display:flex`/`grid` per orientation) — *not*
`display:contents`. So it can hold `tabindex`, `role`, and `aria-selected`,
and consumers can style/query it as the rendered row.

---

## Dual-mode reconciliation

`items[]` and `<mp-timeline-item>` children are two serializations of one
canonical list. Reconcile by choosing **one source per render** — never
merge two lists.

1. **Source of truth — non-empty `items` wins.** When `items` is
   `null`/`undefined` or an empty `[]`, the WC derives its list from
   `<mp-timeline-item>` children. Rationale: `items` is the imperative /
   wrapper path (the dominant runtime usage) and a bound array must not have
   stray markup silently injected; mirrors the repo's data-owns-structure
   precedent (dock `layout`) and Angular Material's `dataSource`.
   - **Empty-array exception:** `[]` = "no data yet", so a wrapper whose
     signal hasn't loaded still lets pre-rendered SSR children show. A
     genuinely-empty data timeline supplies no children. (See Open concerns
     for the load-flash mitigation.)
2. **Conflict — warn, never throw.** When both a non-empty `items` *and* ≥1
   `<mp-timeline-item>` child are present: render from `items`, emit one
   dev-mode `console.warn`, and CSS-hide the children
   (`:host([data-source=items]) ::slotted(mp-timeline-item){display:none}`)
   rather than mutating the DOM. A hard error would break SSR/hydration and
   incremental authoring. (Wrappers avoid this entirely — see rule 7.)
3. **Neither** → empty `<ol>` (or `listbox` when `selectable`), no rows, no
   connectors. Valid, inert, accessible.
4. **One present** → render through the same pipeline. Children mode installs
   a `MutationObserver` (gated by `isServer`) to re-derive on child
   add/remove/attr-change, with `attributeFilter` scoped to the item
   attributes so unrelated ticks don't thrash; the handler is idempotent and
   also runs from `firstUpdated()`.
5. **Identity** = `item-id`/`id` if present, else 0-based source index. Used
   for selection and trackBy. (Not for slot names — there are no id-keyed
   slots in this model.)
6. **Reverse** flips iteration order only (CSS `order`); `id`/source index
   preserved, only `visualIndex` changes. Identical in both modes.
7. **Side** = `resolveSides(count, align, reverse, dir)` — a pure function of
   `visualIndex`. CSS implements it (`:nth-child` + `[align]` + `[dir]`); the
   same exported helper feeds render-prop `ctx.side` so the WC and wrappers
   never disagree. (`ctx.side` may be provisional when `dir` is inherited at
   runtime; consumers needing exactness read it back post-mount.)
8. **Wrapper mutual-exclusivity (load-bearing).** When a wrapper lowers
   `items` + templates into `<mp-timeline-item>` children, it **must not also
   set the WC `items` property** (or the WC would see non-empty `items` +
   children → conflict-warn → hide the very children the wrapper generated →
   blank timeline). Conversely, with no templates the wrapper sets `el.items`
   and emits no children. The two paths are mutually exclusive per instance.

---

## Angular wrapper

Two consumer-facing shapes, both supported; pick per consumer:

**Data-driven (primary)** — `<bs-timeline [items]>` + six structural
directives, the datatable bridge: `contentChild()` discovery →
`EmbeddedViewRef` → `rootNodes` → assigned to the WC `*Renderer` properties
via `effect()`. The WC constructs the data-mode rows and splices the Angular
nodes in (single shadow boundary — the WC owns that DOM).

| Directive | Selector | Context (`let-` vars) |
|---|---|---|
| Marker / bullet | `*bsTimelineMarker` | `$implicit: item`, `index`, `visualIndex`, `isFirst`, `isLast`, `side` |
| Title | `*bsTimelineTitle` | `$implicit: item`, `index` |
| Timestamp | `*bsTimelineTimestamp` | `$implicit: item`, `index` |
| Content | `*bsTimelineContent` | `$implicit: item`, `index`, `isFirst`, `isLast`, `side` |
| Opposite | `*bsTimelineOpposite` | `$implicit: item`, `index`, `side` |
| Connector | `*bsTimelineConnector` | `$implicit: fromItem`, `toItem`, `index` |

```ts
@Directive({ selector: '[bsTimelineContent]' })
export class BsTimelineContentDirective {
  readonly templateRef = inject<TemplateRef<BsTimelineItemContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTimelineContentDirective, ctx: unknown,
  ): ctx is BsTimelineItemContext { return true; }
}
export class BsTimelineItemContext {
  $implicit!: TimelineItem; index = 0; visualIndex = 0;
  isFirst = false; isLast = false; side: 'start' | 'end' = 'start';
}
```

**Declarative** — export `BsTimelineItemComponent` (`selector:
bs-timeline-item`) that maps 1:1 to `<mp-timeline-item>` via host bindings
(`[attr.item-id]`, `[attr.color]`, `[attr.disabled]`, …) and splits
`<ng-content>` into `[slot=marker]` / `[slot=title]` / default /
`[slot=opposite]` / `[slot=connector]`. Unlike tab-control, `bs-timeline`
does **not** `contentChildren`-bridge these — they pass straight through to
the WC light DOM, which reconciles them itself.

```ts
readonly items       = input<TimelineItem[]>([]);
readonly orientation = input<'vertical' | 'horizontal'>('vertical');
readonly align       = input<'start' | 'end' | 'alternate' | 'alternate-reverse'>('start');
readonly reverse     = input<boolean>(false);
readonly selectable  = input<'none' | 'single' | 'multiple'>('none');
readonly selection   = model<TimelineItem[]>([]);   // two-way [(selection)]
readonly itemClick   = output<{ item: TimelineItem; index: number; originalEvent: Event }>();
```

### Angular usage example (data-driven)

```html
<bs-timeline [items]="milestones()" align="alternate" selectable="single"
             [(selection)]="picked">
  <span *bsTimelineMarker="let item" class="dot" [style.background]="item.color">
    <i [class]="item.icon"></i>
  </span>
  <div *bsTimelineContent="let item" class="card shadow-sm">
    <div class="card-body">
      <h6 class="card-title">{{ item.title }}</h6>
      <p class="card-text">{{ item.description }}</p>
    </div>
  </div>
  <small *bsTimelineTimestamp="let item">{{ item.time | date:'mediumDate' }}</small>
</bs-timeline>
```

### Angular usage example (declarative)

```html
<bs-timeline align="alternate" selectable="single" [(selection)]="picked">
  <bs-timeline-item item-id="ship" color="#198754" selected>
    <i slot="marker" class="bi bi-check-circle"></i>
    <small slot="opposite">2026-05-01</small>
    Released the first public build.
  </bs-timeline-item>
  <bs-timeline-item item-id="beta" color="#0d6efd">
    <small slot="opposite">2026-04-15</small>
    Closed beta.
  </bs-timeline-item>
</bs-timeline>
```

---

## React wrapper

`BsTimeline` is a **hand-written FC** over a `createComponent` base (scalar
props + events). This is a new wrapper shape for the repo (existing React
wrappers are bare `createComponent`), because it must map `items` → children
while also forwarding scalar props/events.

**Q3 resolution — Option B: render-props lowered to slot-attributed children
(no portals, no per-render `createRoot`/unmount).** When render-props are
supplied, the wrapper maps `items` to `<mp-timeline-item>` children with the
render-prop output wrapped in `slot=`-attributed elements; it does **not**
set the WC `items` property (rule 8). React renders these into real light
DOM; each lands in the item's own shadow slot (one boundary).

```tsx
const Inner = createComponent({
  react: React, tagName: 'mp-timeline', elementClass: MpTimeline,
  events: {
    onItemClick: 'item-click' as EventName<CustomEvent<{ item: TimelineItem; index: number; originalEvent: Event }>>,
    onSelectionChange: 'selection-change' as EventName<CustomEvent<{ selected: TimelineItem[] }>>,
  },
});

export function BsTimeline({ items, renderMarker, renderContent, renderOpposite,
                            children, selection, onSelectionChange, ...rest }: BsTimelineProps) {
  const hasTemplates = !!(renderMarker || renderContent || renderOpposite);
  const sides = resolveSides(items?.length ?? 0, rest.align ?? 'start', !!rest.reverse, 'ltr');
  return (
    <Inner {...rest} selection={selection} onSelectionChange={onSelectionChange}
           // NOTE: when lowering, do NOT pass `items` to the WC.
           {...(hasTemplates ? {} : { items })}>
      {hasTemplates
        ? items!.map((item, i) => {
            const ctx = { index: i, visualIndex: i, isFirst: i === 0, isLast: i === items!.length - 1, side: sides[i], orientation: rest.orientation ?? 'vertical' };
            return (
              <mp-timeline-item key={item.id ?? i} item-id={item.id ?? i} color={item.color}>
                {renderMarker   && <span  slot="marker">{renderMarker(item, ctx)}</span>}
                {renderContent  && <div   slot="content">{renderContent(item, ctx)}</div>}
                {renderOpposite && <small slot="opposite">{renderOpposite(item, ctx)}</small>}
              </mp-timeline-item>
            );
          })
        : children /* declarative <BsTimelineItem> passthrough */}
    </Inner>
  );
}
```

Also export `BsTimelineItem` (a thin `forwardRef` over `<mp-timeline-item>`)
for declarative authoring. Selection is **controlled** (`selection` +
`onSelectionChange`), like datatable's `expandedIds` — no two-way sugar.

> **Perf note (from review).** Controlled selection re-renders re-run
> `items.map(...)`; key children by `item.id` so React reuses nodes and the
> WC observer sees no `childList` mutation, and the WC should short-circuit
> `reconcileChildren` when the derived list is structurally unchanged. For
> large / selection-heavy timelines, prefer the no-template `items` path
> (no children, no observer).

---

## Vue wrapper

`<script setup>` SFC. Same Q3 resolution: scoped slots are lowered into
`<mp-timeline-item>` children with slot-attributed content rendered by Vue
normally — **no per-slot `createApp`/mount**. When no scoped slots are
present, set `el.items` after mount (the scheduler property-setter pattern)
and omit children. The two branches are mutually exclusive (rule 8).

```vue
<template>
  <!-- templated: lower scoped slots to children; do NOT bind :items -->
  <mp-timeline v-if="hasSlots" ref="el" :orientation :align :reverse :selectable>
    <mp-timeline-item v-for="(item, i) in items" :key="item.id ?? i"
                      :item-id="item.id ?? i" :color="item.color">
      <span    slot="marker"   v-if="$slots.marker"><slot name="marker"   :item :index="i" :side="sideOf(i)"/></span>
      <div     slot="content"  v-if="$slots.content"><slot name="content"  :item :index="i" :side="sideOf(i)"/></div>
      <small   slot="opposite" v-if="$slots.opposite"><slot name="opposite" :item :index="i"/></small>
    </mp-timeline-item>
  </mp-timeline>
  <!-- non-templated: property-set items, no children -->
  <mp-timeline v-else ref="el" :orientation :align :reverse :selectable />
</template>
```

Export `BsTimelineItem.vue` (renders `<mp-timeline-item>` + a default
`<slot/>`) for declarative authoring. Selection via `v-model:selection`.
`sideOf` uses the shared `resolveSides`. Set `selected`/`disabled` on lowered
items **once** (the WC re-reads `selected` only during the initial seed), so
a Vue re-render doesn't fight controlled selection.

---

## Layout & styling

* **Vertical:** the `<mp-timeline>` shadow lays out a flex/grid column of
  `::slotted(mp-timeline-item)` rows. Each item host is internally three
  logical tracks — *opposite* | *line (marker + connector)* | *content* —
  collapsing to two when there is no opposite content.
* **Horizontal:** the same, rotated 90°.
* **Align / side:** pure CSS — `:host([align=start]) ::slotted(...) { ... }`,
  `:host([align=alternate]) ::slotted(:nth-child(even)) { ... }`, etc. No JS
  enumeration, so it is correct under SSR.
* **Reverse:** CSS `order` / `flex-direction` on the slotted rows — never
  mutates `items` or DOM order.
* **Connector:** each item draws its trailing segment (in its own shadow),
  tinted by `color`; `:host ::slotted(mp-timeline-item:last-of-type)`
  suppresses the last one. Custom connectors via the item's `connector` slot.
* **CSS custom properties** for theming — `--timeline-line-color`,
  `--timeline-marker-size`, `--timeline-gap` — defaulting to `var(--bs-*)`
  equivalents so they inherit through the shadow boundary.
* `flex: 0 0 auto` on circular markers (Firefox shrinks fixed-size flex
  children otherwise — smoke-test in Firefox).

---

## Selection & keyboard (opt-in)

Gated behind `selectable`; mirrors datatable's selection contract. Works
identically in both authoring modes (both render `<mp-timeline-item>` rows).

* **`selectable="none"` (default):** presentational. No tabindex, no
  selection state; only `item-click` fires.
* **`selectable="single"`:** one selected item; click / Enter / Space on a
  focused item selects it (deselecting the previous).
* **`selectable="multiple"`:** Ctrl/Cmd-click toggles; Shift-click range-
  selects; Enter/Space toggles the focused item.
* **State:** `selectedIds` (WC) ↔ `[(selection)]` (Angular) / `selection` +
  `onSelectionChange` (React) / `v-model:selection` (Vue). Identity = `id` /
  `item-id` / index, computed pre-reverse, so selection survives
  reverse/align toggles. A child's `selected` attribute seeds the initial
  set only when no explicit selection is supplied (explicit wins).
* **Roving tabindex** lives on the `<mp-timeline-item>` host elements: exactly
  one has `tabindex="0"`, the rest `-1`. Arrow keys move focus along the axis
  (Up/Down vertical, Left/Right horizontal — flipped under `reverse`/RTL),
  Home/End to first/last. Focus movement does not change selection unless an
  activation key is pressed.
* `disabled` items are skipped by keyboard nav and are not selectable.

### Accessibility

* `<mp-timeline>` renders an ordered list: `role="list"` (or `role="listbox"`
  + `aria-multiselectable` when `selectable !== none`); `aria-orientation`
  reflects `orientation`.
* Each `<mp-timeline-item>` host is the `role="listitem"` (or `role="option"`
  + `aria-selected` when selectable) — possible precisely because the item
  host is the row (not `display:contents`).
* The default marker is decorative (`aria-hidden`) unless a template makes it
  meaningful.
* The demo page must document the keymap, per the ARIA-demo convention.
  Follow-up parity with the ARIA audit branch: axe-core coverage for the new
  demo pages.

---

## Files to add

**Web component** — `libs/mintplayer-web-components/`
* `timeline/index.ts`, `timeline/src/index.ts`,
  `timeline/src/components/{index.ts, mp-timeline.ts, mp-timeline-item.ts}`
* `timeline/src/styles/{timeline.styles.scss, timeline-item.styles.scss}` (+ generated `.ts`)
* `timeline-core/index.ts`, `timeline-core/src/index.ts`,
  `timeline-core/src/models/timeline-item.ts`,
  `timeline-core/src/resolve-sides.ts` (+ renderer/context types)
* Specs: `mp-timeline.spec.ts`, `mp-timeline.ssr.spec.ts`,
  `mp-timeline.aria.spec.ts`, `resolve-sides.spec.ts` (unit-test reverse ×
  alternate × rtl combinations)

**Angular wrapper** — `libs/mintplayer-ng-bootstrap/timeline/`
* `src/timeline/timeline.component.{ts,html,scss}`
* `src/timeline-item/timeline-item.component.ts`
* `src/timeline-*/*.directive.ts` (marker, title, timestamp, content, opposite, connector)
* `src/index.ts`, `index.ts`, `ng-package.js`

**React wrapper** — `libs/mintplayer-react-bootstrap/timeline/`
* `src/BsTimeline.tsx`, `src/BsTimelineItem.tsx`, `src/index.ts`, `index.ts`

**Vue wrapper** — `libs/mintplayer-vue-bootstrap/timeline/`
* `src/BsTimeline.vue`, `src/BsTimelineItem.vue`, `src/index.ts`, `index.ts`

**Demo pages** (live demo **before** the `<bs-code-snippet>`):
* Angular: `apps/ng-bootstrap-demo/src/app/pages/enterprise/timeline/timeline.component.*` + route in `enterprise.routes.ts`
* React: `apps/react-bootstrap-demo/src/app/pages/enterprise/TimelinePage.tsx` + route + nav
* Vue: `apps/vue-bootstrap-demo/src/views/enterprise/TimelineView.vue` + route + nav

**Docs:** this PRD; add the two subpaths to `docs/prd/wc-inventory.md`.

---

## Demo content

Each demo page shows, in order (demo then snippet for each):

1. **Basic vertical** — default markers, title + description, timestamp opposite.
2. **Horizontal** — `orientation="horizontal"`.
3. **Alternate alignment** — `align="alternate"`.
4. **Reverse** — `reverse` toggle.
5. **Custom markers + colors** — icons / colored dots per item.
6. **Connected card** (headline) — card beside the bullet via
   `*bsTimelineContent` / `renderContent` / `#content`, replicating the
   Syncfusion "Templates" demo. Include **one** declarative
   `<bs-timeline-item>` variant of this example to show both authoring modes.
7. **Selectable** — `selectable="multiple"` + bound selection, showing
   keyboard nav + `selection-change`.

Per the "don't overengineer demo ports" rule, ship these focused sections —
one declarative variant, not a full second port.

---

## Decided

* **Q1 — `align` vocabulary:** `start/end/alternate/alternate-reverse`
  (RTL-aware), not literal `left/right/top/bottom`.
* **Q2 — declarative authoring:** `<mp-timeline-item>` child elements that
  **own their row** (own shadow, own named slots) — not index-keyed bare
  slots and not parent-side id-keyed re-projection.
* **Q3 — template bridge:** React render-props / Vue scoped-slots are
  **lowered into `<mp-timeline-item>` children** with content in the item's
  own named slots (one shadow boundary; no portals). Angular keeps the
  `EmbeddedViewRef` → `*Renderer` callback path against WC-constructed rows.
* **Q4 — interactivity:** ship the opt-in `selectable` (single/multiple) +
  roving-tabindex selection mode in v1.
* **Q5 — tracking:** [issue #331](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/331).

## Open concerns / risks (from design review)

1. **SSR infra is not yet real.** `@lit-labs/ssr` middleware, the
   `is-server-side` convention, and `docs/prd/wc-ssr-lit-labs.md` do not
   exist yet, and no WC implements `isServerSide`. The DSD / no-JS story for
   declarative children only goes live once that lands; until then SSR ==
   client-render-after-hydration. `items[]` mode never SSRs without JS.
2. **Empty-array load flash.** A wrapper binding `[items]=signal()` that
   emits `[]` during load falls back to children, then swaps when data
   arrives. **Mitigation (chosen): wrappers set the WC `items` property only
   once it is non-empty** (otherwise leave it unset). Revisit only if a
   consumer needs a genuinely-always-empty data timeline (would warrant an
   explicit `source` escape hatch).
3. **Both-present conflict has an inherent SSR flash** (children visible
   server-side, hidden after hydration once JS picks `items`). The dev-warn
   discourages supplying both; document the SSR consequence. Wrappers avoid
   it via rule 8.
4. **Index-fallback fragility.** Without a stable `id`/`item-id`,
   add/remove/reorder invalidates `selectedIds`, and React's index `key` can
   desync from the WC's index identity on reorder. **Escalate `id` from
   "recommended" to required for any reorderable or selectable timeline** in
   docs + demos.
5. **Reconcile-on-reselect cost.** Controlled-selection re-renders regenerate
   children in React/Vue; rely on stable keys + an idempotent, structurally-
   short-circuiting `reconcileChildren`, and steer large/selection-heavy
   timelines to the `items` path. Perf note in docs.
6. **`resolveSides` must be the single source.** The WC and all wrappers must
   consume the same exported helper (not private copies); `ctx.side` is
   provisional under runtime-inherited `dir` (read back post-mount for
   exactness). Unit-test reverse × alternate × rtl.
7. **String-typed declarative passthrough.** `data-*` carries strings only;
   `items[]` passthrough carries rich JS values. Custom renderers relying on
   rich passthrough behave differently in declarative mode — document it.
8. **No imperative shadow construction in the SSR path.** `mp-splitter` /
   `mp-scheduler` build shadow imperatively and cannot hydrate; timeline's
   declarative scaffold must be pure-template. Data-mode row construction may
   be imperative (hydration-dependent only). Flag this divergence for
   reviewers expecting a tab-page/splitter-shaped implementation.
