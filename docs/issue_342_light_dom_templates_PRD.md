# PRD: TreeSelect light-DOM templating (follow-up to #342)

**Issue**: #342 (follow-up) · **PR**: #378 (branch `issues/#342-light-dom-templates`)
**Status**: In progress (PR #378 open) · **Created**: 2026-05-31

> Self-contained record of the post-#377 templating work + the agreed forward
> direction, so the working conversation can be compacted without losing context.

---

## Summary

PR #377 shipped the unified `mp-tree-select` WC + ng/react/vue wrappers (replacing
select2/searchbox/multiselect). Its custom templates were **render-callbacks whose
DOM was inserted into the WC shadow**, so consumer content couldn't be styled by
page CSS or host Angular CDK directives. PR #378 reworks the **selected chip + single
value** to **light-DOM `<slot>` projection** so that content lives in the light DOM
(page CSS + `cdkDrag`/`cdkDragHandle` work). The `suggestionTemplate` stays a
render-callback because dropdown rows render inside the nested `mp-treeview` shadow.

## The core architectural model (load-bearing)

- **Slotted content is page-styleable.** A `<slot>` does NOT move projected content
  into the shadow DOM — the element stays a **light-DOM child of the host**; the slot
  only relocates where it renders. So document CSS matches it normally. (Verified live
  via Playwright MCP: tree-select chips' parent chain is all light DOM; `.ts-tpl-chip`
  page CSS styled them.)
- **Shadow-inserted content is NOT page-styleable.** Content the WC appends into its
  own shadow root — its shadow markup, or a render-callback's returned DOM (e.g.
  `suggestionTemplate` appended into the `mp-treeview` shadow) — can't be reached by
  page CSS. Style it via `::slotted()` (slotted only), **CSS custom properties** (they
  inherit *into* shadow — the theming seam), inheritable props (`color`/`font`),
  **inline styles**, or classes the WC defines itself.
- **Repo styling reality:** in the **ng demo app** only Bootstrap reboot/utilities/
  grid/forms/buttons are global; component classes (`.badge`/`.btn-close`/`.card`/
  `.alert`/`.list-group`/`form-check`) are NOT — they live inside the `bs-*` components.
  React/Vue demo apps import full `bootstrap.min.css` (everything global there). See
  `CLAUDE.md` "WC gotchas".

## What shipped in PR #378 (as built)

- **WC `mp-tree-select`**: chips render via `<slot name="chips">` and single value via
  `<slot name="value">` (built-in chips are the slot **fallback**). Removed the
  `itemTemplate` callback (no BC). Added public `removeById(id)`. `suggestionTemplate`
  unchanged (callback → treeview shadow).
- **Angular wrapper**: keeps the structural-directive DX — `*bsTreeSelectItem` is
  rendered **per selected node** into `slot="chips"` via `ngTemplateOutlet` (context:
  `$implicit: node`, `query`, `remove()`); template **root must carry `slot="chips"`**.
  `<ng-content>` also allows direct projection. `bsTreeSelectSuggestion` unchanged.
- **React**: JSX `slot="chips"` children passthrough. **Vue**: default `<slot/>` passthrough.
- **Demos**: `additional-samples/tree-select-drag-drop` reworked into **two connected
  `bs-tree-select`s** whose custom chips (with `cdkDragHandle`) drag **between** them
  (`cdkDropListConnectedTo` + `transferArrayItem`; drag wiring is consumer-owned, not in
  the library). `basic/tree-select` gains a **Custom templates** section
  (`*bsTreeSelectItem` chip styled with page CSS `.ts-tpl-chip`; `*bsTreeSelectSuggestion`
  row uses intrinsic `<strong>`/`<small>` since page CSS can't reach the treeview shadow).
- **Versions**: web-components 1.5.0, ng 21.47.0, react 19.5.0, vue 3.5.0.
- **Validation**: WC unit 750/750; ng/react/vue + ng-demo build green; tree-select e2e
  8/8 (chromium+firefox); drag-transfer e2e stable ×2. e2e readiness waits for the
  wrapper to push `provider` then calls `open()` (no click-vs-hydration race).

## Proposed forward direction (this is the open decision to act on)

**Principle:** make **every** customizable region a light-DOM `<slot>`, and have the
ng/react/vue **wrapper components always provide a template for each slot** — a
**default template** when the consumer doesn't override, plus the **styles** — so all
customizable content is light-DOM and therefore page-styleable. Third-party direct-WC
usage is explicitly NOT a concern yet, so the wrappers can own the templates + styles.

Apply to: `chips` (done), `value` (done), and the panel regions `header` / `footer` /
`noResults` / `enterSearchTerm` / `button` (currently still render-callbacks → move to
light-DOM slots) — and crucially **suggestion rows**.

**Suggestion rows are the hard part** (rows live in the nested `mp-treeview` shadow — a
second boundary; slots cross only one). Options, to decide:
1. **Slot-forward** consumer content through both boundaries (`mp-tree-select` exposes a
   per-row slot and re-projects into `mp-treeview`) — intricate, per-row.
2. **`mp-tree-select` renders its own rows** (stop delegating row rendering to
   `mp-treeview`) so rows are one boundary from the wrapper — larger change.
3. Leave suggestions as a render-callback and document the styling constraint (status quo).
   *(Note: converting `mp-treeview` itself to light DOM was considered and rejected — it
   only removes treeview's own boundary, not `mp-tree-select`'s, and breaks encapsulation
   for all other treeview consumers.)*

## Open questions / next steps

- [ ] Decide the suggestion-row approach (option 1 / 2 / 3 above).
- [ ] Move `header`/`footer`/`noResults`/`enterSearchTerm`/`button` from render-callbacks
      to light-DOM slots, with wrapper-provided default templates + styles.
- [ ] Wrappers ship default templates (so chips/rows look right out of the box even with
      no consumer template) carrying their own styles.
- [ ] Add the Dutch screenshots/recording to PR #378 before merge.

## Related
- `docs/issue_342_PRD.md` (original unified component, PR #377, Complete)
- `CLAUDE.md` — WC slot/shadow + codegen conventions
- Memory: `project_tree_select_merge`, `reference_bootstrap_classes_not_global`
