# Plan — consumer content inside a shadow root, and the CSS that never reaches it

PRD: [shadow-boundary-css.md](./shadow-boundary-css.md)
Status: **Proposed** (2026-08-25) — nothing implemented. Design LOCKED in
PRD §19: slot everything, datatable → grid + subgrid (D2 reinstated), `mp-table`
as a family of self-styling elements (D10 reshaped). D8/D9/D11 retired. Spikes
and their reversals recorded in PRD §15.

**Milestones split by cost, because they are not one piece of work.** M0–M4 and
M6a are cheap, independently valuable, and carry no open risk. M4b/M5/M6b/M8 are
the expensive, spike-gated half. Nothing in the first group depends on the
second.

**Cheap half — no open risk, ships on its own**

| Milestone | State |
|---|---|
| M0 Regression spec that fails today | ⏳ |
| M1 `mp-badge` WC | ⏳ |
| M2 Badge wrappers ×3 + demo (closes React/Vue gap) | ⏳ |
| M3 Docs: stale `card-classes.ts` comment, CLAUDE.md rule, conformance guard | ⏳ |
| M4 Slot projection — treeview, query-builder, tree-select, select | ⏳ |
| M6a Standalone bug fixes (see below) | ⏳ |

**Expensive half — spike-gated**

| Milestone | State |
|---|---|
| S1 grid + subgrid under virtual scroll / recycling / column sizing | ⏳ |
| S3 Firefox + WebKit parity for PRD §15 | ⏳ |
| S4 ARIA roles for a grid-based table | ⏳ |
| M4b `mp-table` family + `bs-table` wrapper (PRD §19.3) | ⏳ |
| M5 Datatable → grid + subgrid + slotted cells (gated on S1/S3/S4) | ⏳ |
| M6b `mp-card` global sheet → shadow; `mp-file-manager` | ⏳ |
| M8 The remaining F5 components (G8) | ⏳ |
| M7 Batched verification sweep | ⏳ |

### M6a — standalone bug fixes, each independently shippable

Found during investigation; none depends on the mechanism work.

- [ ] **`mp-timeline-item.icon`** renders a Bootstrap-icons class *into a shadow
      root*. Shipped live in all three demos (`timeline.component.ts:61-64`,
      `TimelinePage.tsx:19-22`, `TimelineView.vue:17-20`). Route it through the
      existing light-DOM `slot="marker"` path.
- [ ] **`TimelineItem.cssClass`** — "extra class on the rendered row", applied to
      a shadow node. Structurally dead since written. Fix or delete.
- [ ] **Tooltip/popover dead IDREFs** — `tooltip.directive.ts:136` and
      `popover.directive.ts:133-135` write `aria-describedby`/`aria-controls`
      onto a consumer trigger pointing at `document.body`. Dead whenever the
      trigger is in a shadow root. Real a11y bug, unrelated to this PRD's fix.
- [ ] **`[bsFormGroup]`** stamps `.form-group`, removed in Bootstrap 5 and
      defined nowhere. Define or delete.
- [ ] **`libs/mintplayer-ng-bootstrap/dropdown-divider/`** — orphan duplicate of
      the one in `dropdown-menu/`; only the latter is styled. Delete.
- [ ] **Hoist `_styles/buttons.styles.scss`** — `bootstrap/scss/buttons` is
      imported independently by 4 elements (4 × 12.4 KB, 4 parses). Net −37 KB.
- [ ] Correct plan M4's claim that `mp-select.optionRenderer` has no consumers —
      `mp-phone-input.ts:400` uses it, and the classes are deliberately declared
      in `select.styles.scss:88-151`. **Do not delete it.**

## Conventions (these bite here specifically)

- **Batch the suites.** Verify milestones by reading + `tsc --noEmit`. One sweep
  at M7. `nx test mintplayer-ng-bootstrap` alone is ~2.5 min.
- **Commit per milestone, push once.** Every push is billed and a push cancels
  any in-flight run.
- After any `.styles.scss` edit: `npx nx run mintplayer-web-components:codegen-wc`.
  Generated `*.styles.ts` is gitignored — never stage it.
- Windows/Nx: `NX_ISOLATE_PLUGINS=false`, `NX_DAEMON=false`, vitest `--pool=threads`.
- **The dev server is host-managed** — do not run `ng serve`/`ng build` against
  the demo workspace; save the file and let it reload.
- **Never name an `mp-*` tag in a `::slotted()` selector** — an Angular wrapper
  puts `bs-foo` in the slot and the `mp-*` element one level deeper. This
  shipped a 0px-wide control in #400. Select on what slotted children are *not*,
  or use inherited custom properties.
- **Validate slot behaviour per framework, not once** (PRD R4).
- In wrapper specs, drive inputs from a `signal()`, never a mutable field.
- No new branch or PR without explicit permission.

## Ordering rationale

M0 comes first and deliberately fails: a spec that asserts `p-2` / `d-none` /
`visually-hidden` behave the same inside a row template as outside is the
executable statement of the bug, and it is what proves the fix later. Writing it
after the fix would prove nothing.

M1–M3 are independent of every open question. `mp-badge` is worth doing on its
own merits — it closes the React/Vue parity gap (PRD F7) and is the element most
likely to appear in a cell — and it does **not** depend on the slot work. Note
what changed during investigation: badge conversion is no longer *the fix* for
the reported bug, because it does nothing for consumer-authored `m-3`/`p-2`
(PRD F1). It is now a parallel track that happens to also fix the reported
symptom. Landing it early keeps a visible win independent of the risky part.

M4 before M5 because the four non-table exposures need slot projection with **no
layout change** (PRD F9 — flex and block already project correctly). They prove
the mechanism cheaply, in three frameworks, before the datatable work bets on it.
Note the two halves of this PRD use *different* mechanisms and that is
deliberate: where the component owns a flex/block structure, a `<slot>` is the
right tool; where it owns a **table**, the table must move to light DOM instead
(PRD D8), because slots and table layout are incompatible (§15.1).

M4b before M5 because `mp-datatable` composes the `mp-table` family. Building the
family standalone — with `bs-table` as its first consumer — means M5 assembles
tested parts rather than inventing them mid-refactor. It also converts
`bs-table`/`bs-table-styles` off their `::ng-deep` import, which is two of PRD
F5's 46 for free.

M5 is the gated one. S3 and S4 run before it; if S3 fails in another engine, D9
is unsafe and M5 falls back to the superseded grid design (kept in PRD §7.1) or
is dropped, without invalidating M0–M4b.

M6 last because `mp-file-manager` renders *through* `mp-datatable` — it can only
be fixed after M5 settles the datatable's contract, and it is the honest test of
whether the mechanism works for a real in-library consumer.

---

## S3 — Spike: Firefox + WebKit parity for PRD §15 [PRD §9]

Every measurement in §15 is Chromium 151. Two of them are load-bearing.

- [ ] Re-run **S-C** (table in the component's own light DOM) in Firefox + WebKit.
- [ ] Re-run **S-C2/S-C3** (custom element with `display: table-cell`: does it
      participate in table layout, and does page CSS stay out of its shadow root?)
      in Firefox + WebKit. This is the one that matters — D9 rests on it.
- [ ] Record per-engine results in PRD §15. FAIL in any engine → D9 is unsafe,
      D8 collapses, and the fallback is the superseded D2 grid design (still
      documented in PRD §7.1) or shipping M0–M4 + M6 with F1 recorded as a known
      datatable limitation.

## S4 — Spike: implicit ARIA role of `display: table-cell` custom elements [PRD §9, R2]

- [ ] Build the `mp-table` family skeleton and inspect the computed
      accessibility tree (Chrome DevTools + `getComputedRole` where available).
      A `<mp-td>` is not a `<td>`; `display` does not confer a role.
- [ ] Where the implicit role is absent, add explicit `role="table"`/`"row"`/
      `"columnheader"`/`"cell"` on the family's hosts.
- [ ] Record the verdict in PRD §9. This gates M4b/M5, and is much narrower than
      the dropped S2 because the structure genuinely is a table.

---

## M0 — The regression spec that fails today [PRD §10]

Files: `libs/mintplayer-web-components/datatable/src/components/mp-datatable.slotted-styles.spec.ts` (new).

- [ ] Mount a datatable with a row template containing probes classed
      `p-2`, `d-none`, `visually-hidden`, `text-danger`.
- [ ] Assert each probe's computed style equals the same node's computed style
      in the light DOM.
- [ ] Confirm it **fails** against current `master` — that is the point.
      Mark it skipped with a comment naming this PRD until M5 lands.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M1 — `mp-badge` web component [PRD §7.3, D5, D6]

Files: `libs/mintplayer-web-components/badge/` (new — `index.ts`,
`src/index.ts`, `src/components/mp-badge.ts`, `src/components/index.ts`,
`src/styles/badge.styles.scss`).

- [ ] Lit element, shadow root, `color` / `unit` / `decorative` attributes;
      `observedAttributes` as a **static getter** if hand-rolled.
- [ ] SCSS from `var(--bs-{color}-rgb)` with literal fallbacks, following
      `datatable.styles.scss:6-12`. Implement `text-bg-*` semantics (D6):
      background **and** contrasting foreground.
- [ ] `:host(:empty) { display: none }` — not `.badge:empty` (PRD §7.3).
- [ ] `unit` → visually-hidden span **inside** the shadow root.
      `decorative` → `aria-hidden` on the host.
- [ ] Class comment: why this is shadow-DOM and self-styled, citing the
      datatable case. Do not repeat F6's mistake of letting it go stale.
- [ ] Run `codegen-wc`. Add `mp-badge` to
      `libs/mintplayer-web-components/_conformance/naming.spec.ts`.
- [ ] `mp-badge.aria.spec.ts` — role/name/state, `decorative` and `unit` paths.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M2 — Badge wrappers ×3, and the demo repro [PRD §7.4, F7]

Files: `libs/mintplayer-ng-bootstrap/badge/src/badge.component.{ts,html,scss}`,
`libs/mintplayer-react-bootstrap/badge/` (new),
`libs/mintplayer-vue-bootstrap/badge/` (new),
`apps/{ng,react,vue}-bootstrap-demo/…/badge` pages,
`apps/ng-bootstrap-demo/src/app/pages/enterprise/datatables/datatables.component.{html,ts}`.

- [ ] Angular: `bs-badge` keeps selector and inputs; resolve `Color[c]` → token
      as `bs-card.component.ts:35` does. Delete the `::ng-deep` Bootstrap import.
      Forward host `aria-*`/`role`/`id`/`tabindex` onto the `mp-*` element.
- [ ] React: `@lit/react` `createComponent`, props extend
      `React.HTMLAttributes`, spread `...rest`.
- [ ] Vue: SFC, `inheritAttrs: false` + `v-bind="$attrs"` on the inner element.
- [ ] Keep the datatable demo's `<bs-badge>` (currently an uncommitted local
      repro) as the live regression case; add badge pages to the React and Vue
      demos — neither has one.
- [ ] Wrapper specs in all three, inputs driven from a `signal()` (Angular).
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M3 — Correct the record [PRD F6, G7]

Files: `libs/mintplayer-web-components/card/src/card-classes.ts:1-12`,
`CLAUDE.md`.

- [ ] Rewrite the stale `card-classes.ts` comment: the family is `LitElement`
      with a shadow root and no `createRenderRoot` override; there are **zero**
      light-DOM WCs in the library. Keep a note of what the light-DOM design was
      and why it was abandoned, so it is not re-litigated.
- [ ] Add to `CLAUDE.md` under the WC gotchas, with the measured numbers:
      consumer content rendered into a shadow root loses **all** document CSS
      (21 of 22 utilities dead; `d-none` shows, `visually-hidden` becomes
      visible); `<slot>` is the fix; CSS **table** layout does not cross the flat
      tree while grid and flex do.
- [ ] **Commit.**

## M4 — Slot projection for the four non-table exposures [PRD §7.2, D1]

Files: `libs/mintplayer-web-components/treeview/src/components/mp-treeview.ts`,
`…/query-builder/src/mp-query-condition.element.ts`,
`…/tree-select/src/components/mp-tree-select.ts`,
`…/select/src/components/mp-select.ts`, plus the Angular/React/Vue wrappers for each.

- [ ] Treeview: `nodeRenderer` output moves to light DOM + named slot keyed by
      node id; `iconResolver`'s `unsafeHTML` likewise. Stale slot cleanup on
      collapse/rebuild — restore focus by stable key, not index.
- [ ] Query-builder: `editorRegistry` handles mount into a light-DOM slot rather
      than `mount.appendChild` (`mp-query-condition.element.ts:144`). Built-in
      editors keep their shadow styling; consumer editors now get page CSS.
- [ ] Tree-select: all seven templates. Thread the derived `nodeRenderer`
      through **both** shadow roots (`:690` → `:877`).
- [ ] Select: `optionRenderer` — lowest value, feature-gated, no consumers.
      Convert or delete; decide and record which.
- [ ] Close the parity gaps found in the audit: Vue `BsTreeview` exposes neither
      `nodeRenderer` nor `iconResolver`; React `BsQueryBuilder` exposes no
      `editorRegistry`.
- [ ] Per-framework verification (R4), not one.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M4b — `mp-table` element family + `bs-table` wrapper [PRD D10, §7.1b] — gated on S4

Files: `libs/mintplayer-web-components/table/` (new),
`libs/mintplayer-ng-bootstrap/table/src/component/table.component.ts`,
`…/table/src/table-styles/table-styles.component.{ts,scss}`,
`libs/mintplayer-react-bootstrap/table/` (new),
`libs/mintplayer-vue-bootstrap/table/` (new).

- [ ] `mp-table` / `mp-thead` / `mp-tbody` / `mp-tr` / `mp-th` / `mp-td`, each a
      Lit element with `:host { display: table | table-header-group | table-row |
      table-cell … }` and its own shadow styles.
- [ ] Move the Bootstrap table rules out of `table-styles.component.scss:10-11`
      (`reboot`, `tables`) into the family's shadow sheets, `--bs-*`-driven.
      `_bootstrap.scss:38` stays commented out — that is the existing policy
      (PRD §15.5), not something to change.
- [ ] Scope decision for Q4: `table-striped` / `-bordered` / `-hover` / `-sm` /
      responsive — implement what `bs-table`'s demo and `mp-datatable` consume,
      and record explicitly what was left out.
- [ ] Roles from S4 applied to each host.
- [ ] `bs-table` + `bs-table-styles` become thin wrappers; delete the
      `::ng-deep` import. Add React + Vue wrappers (neither lib has a table).
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

> **AMENDED 2026-08-25:** M5 below described the retired D8 (light-DOM real
> table). The shipped design is D2 — shadow root kept, `<table>` replaced by CSS
> grid with `grid-template-columns: subgrid` on each row, consumer cells arriving
> through a per-row named `<slot>` keyed by the existing `rowKey`. See PRD §7.1
> and §19. The retired text is kept below so the rejected shape stays visible.
>
> Under D2, M5's work list becomes: shadow `.grid` / `.hcell` / `.row` (subgrid)
> / `<slot name="row-<key>">`; wrapper moves `EmbeddedViewRef` root nodes into
> the WC's light DOM with a slot name, removing stale children when a row leaves;
> `colspan` → `grid-column: 1/-1`; measured widths → `grid-template-columns`;
> sticky header on grid items; virtual spacers span all tracks; delete
> `tbody td { white-space/overflow/text-overflow }` rather than reproducing it as
> `::slotted()`; explicit ARIA roles per S4 including `aria-rowcount` /
> `aria-colindex` under virtual scrolling; un-skip M0's spec.
>
> **The per-row named-slot bookkeeping is the least-proven part of this whole
> PRD** and is what S1 exists to de-risk — not the layout, which §15 already
> measured.

## M5 (retired shape) — Datatable: real `<table>`, mounted in light DOM [D8, D9]

Files: `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts`,
`…/datatable/src/styles/datatable.styles.scss`,
`libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts`,
React/Vue datatable wrappers.

- [ ] Shadow root keeps chrome only — `.datatable-shell`, `.datatable-scroll`,
      `.datatable-footer`, a `<slot>`, and `::slotted(table)` rules.
- [ ] The table subtree is built into the component's **own light DOM** using the
      M4b family; consumer cells stay plain `<td>` children of `<mp-tr>`.
- [ ] `rowRenderer` keeps its `Node[]` contract — root nodes are appended into a
      light-DOM `<mp-tr>`. **No slot names, no per-row slot bookkeeping**; this
      is strictly less machinery than the superseded design.
- [ ] Move `tbody td { white-space/overflow/text-overflow }`
      (`datatable.styles.scss:84-92`) onto `mp-td`'s `:host`, so it applies to
      component-owned cells only. Consumer `<td>`s are the consumer's to style
      (PRD G1/R3). `cellClass` stays the column-level channel.
- [ ] Verify virtual scrolling, windowed fetch, tree mode, column resize, the
      measure-once pass, `colspan` placeholders and the sticky `thead` all still
      work — they operate on a real table, so none should need reshaping.
- [ ] Extend `mp-datatable.aria.spec.ts` — implicit table semantics are retained,
      so this is a regression guard, not a rewrite.
- [ ] Un-skip M0's spec. It must now pass.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M6 — The library's own two instances [PRD F3, F4, D7]

Files: `libs/mintplayer-web-components/card/src/mp-card.element.ts`,
`…/card/src/card-global.styles.scss`, `…/card/src/mp-card.element.scss`,
`…/file-manager/src/components/mp-file-manager.ts:919-995`,
`…/file-manager/src/styles/file-manager.styles.scss`,
plus the dropdown-menu companion sheets in all three frameworks.

- [ ] `mp-card`: move `card-global.styles.scss` into the shadow sheet; drop
      `ensureCardStylesInjected` and the `document.head` injection. Where a
      grandchild selector is unavoidable, give the region its own element.
      This also closes the SSR hole (no `card/ssr/`, JS-only injection).
- [ ] Dropdown-menu: move the `ViewEncapsulation.None` / companion-CSS rule
      (`dropdown-menu.component.ts:45-62`, React/Vue `dropdown-menu.css`) into
      `mp-dropdown-menu`'s shadow sheet.
- [ ] `mp-file-manager`: its `cellRenderer`s use `.row-cell`/`.row-icon`/
      `.rename-input` from its **own** sheet inside `mp-datatable`'s shadow root,
      plus `cellClass: 'text-nowrap'`. Convert to the M5 slot contract — this is
      the honest end-to-end test of the mechanism.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## S2 — AT verdict on the role-based grid (human) [PRD §9, R2]

- [ ] **HUMAN:** NVDA and VoiceOver on the datatable demo, before vs after M5.
      Row/column announcement, count announcement under virtual scrolling,
      selection state. Record the verdict in PRD §9.
- [ ] A regression here blocks M5, not the PR.

## M7 — Batched verification sweep (only now; one pass)

```bash
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run mintplayer-web-components:codegen-wc
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-web-components
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-react-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-vue-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-web-components -- --pool=threads
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-react-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-vue-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run-many -t e2e --parallel=1
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run-many -t e2e-a11y --parallel=1
dotnet build apps/api/Api.csproj -c Debug
```

- [ ] Version bumps — breaking on `mp-datatable` (PRD §12).
- [ ] **HUMAN:** S2 sign-off.
- [ ] **HUMAN:** keyboard-only pass over the datatable and treeview demos;
      Escape, focus visibility, no trap.
- [ ] **HUMAN:** view the SSR demo with JS disabled — M6 changes the card path.
- [ ] Push once → PR (with permission).

## Risks

| Risk | Mitigation |
|---|---|
| M5 moves the table subtree out of the shadow root — touches every `render()` path in a 1846-line element | Table, virtual scroll, tree mode and column sizing all keep working on a real table (PRD §7.1b); the change is *where* it mounts, not *what* it is |
| `<mp-td>` may expose no implicit cell role | S4 measures it and adds explicit roles before M5 |
| Page CSS can now reach the datatable's table subtree (PRD R7) | Intended (G1). Everything the library owns is a sealed custom element (D9, measured S-C3), so the blast radius is consumer cells only |
| Consumer CSS overrides datatable cell defaults | Intended (G1/G3); documented; `cellClass` remains |
| Slot / light-DOM semantics differ per framework | R4 — validate three times, never once |
| Chromium-only evidence for the whole D8/D9 design | S3, and it is a hard gate |
| Scope creep into the other 46 components | PRD §5 non-goal; Q2 is the user's call (D10 already folds in `bs-table`) |

## Explicitly rejected (do not resurrect casually)

- **Copying `document.styleSheets` into shadow roots** — PRD D4. Breaks
  encapsulation inward, throws on cross-origin sheets, needs a `MutationObserver`
  for Angular's lazy injection, and re-parses Bootstrap per instance.
- **Re-declaring `.badge` inside `datatable.styles.scss`** — fixes one component
  in one host; the next report is `bs-button`, then `.text-danger`, then `m-3`.
- **A `<slot>` for cells inside a shadow `<tr>`, or for a whole `<tr>` inside a
  shadow `<tbody>`** — measured, both fail: content renders at `(0,0)` outside
  the table (PRD F9).
- **`slot { display: table-row-group }` to make the above work** — measured,
  fails identically (PRD §15.1, S-D). The table fixup algorithm does not
  traverse the flat tree, and no display value changes that.
- **Dropping `<table>` for CSS grid + subgrid** — was D2/D3, superseded
  2026-08-25. It works (PRD §7.1, F10) but costs the implicit table semantics,
  a hand-written ARIA role set, per-row slot bookkeeping, and a rewrite of the
  measure-once/column-sizing pass — all to solve a problem that S-C solves by
  simply not putting the table in the shadow root. Kept documented as the
  fallback if S3 fails.
- **Reaching a slotted table's `tr`/`td` from the wrapper's shadow CSS** —
  `::slotted()` cannot select descendants (PRD §15.2, S-A). This is the same
  limitation that produced the `mp-card` `document.head` injection in F4; the
  answer is D9 (own elements), not a global sheet.
- **Making `mp-badge` a light-DOM class-carrier like the old mp-card design** —
  it would reproduce the exact bug being fixed.
