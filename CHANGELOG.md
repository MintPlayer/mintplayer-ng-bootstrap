# Changelog

All notable changes to `@mintplayer/ng-bootstrap` are documented here. The
package version aligns its major with the supported Angular major.

## [Unreleased]

### Breaking

- **`bs-query-builder`: the `timezone` input is removed.** It was declared but never reached the element, so
  binding it had no effect. Remove the binding.
- **Satellite libraries (found by the coverage phase 2 audit).**
  - `@mintplayer/ng-qr-code` 22.2.0:
    - The unused `height` input is removed; a QR code is square.
    - `qrCodeVersion` 1–40 now takes effect (it was silently ignored); `null`/`0` means auto.
    - Changing only the centre-image inputs now redraws, and a cached centre image survives a redraw.
  - `@mintplayer/ng-click-outside` 22.2.0:
    - The no-op `excludeBeforeClick` input is removed.
    - Re-initialising, or changing `clickOutsideEvents`, no longer leaks listeners.
  - `@mintplayer/qr-code` 1.8.0 encodes byte data with the platform `TextEncoder`, and no longer peer-depends on
    `@mintplayer/encode-utf8`. A spec proved the output identical over every code unit and surrogate pair before
    the switch, and `qr-code`'s own spec now pins the bytes.
  - **`@mintplayer/encode-utf8` is removed from the repository** and will receive no further releases. It had no
    remaining consumer. The last published version, 1.7.0, stays on npm. Use the platform `TextEncoder`
    instead.

- **The theme mode is stored in a cookie, not localStorage (issue #420).**
  - `BsThemeService` now persists the user's choice in the `bs-theme-mode` cookie (`Path=/`, `SameSite=Lax`, one
    year, `Secure` on https), so a server can render `<html data-bs-theme>` itself.
  - **Stored choices reset to `auto`.** There is no migration from localStorage.
  - `BS_THEME_STORAGE_KEY` is removed. Use `BS_THEME_COOKIE_NAME`, now exported from
    `@mintplayer/web-components/theming` and re-exported by `@mintplayer/ng-bootstrap/theming`.
  - Replace the inline localStorage pre-boot script with the shipped
    `@mintplayer/web-components/theming/bs-theme-preboot.js` (see the theming docs page). **It ships from
    `@mintplayer/web-components` only**, not from `@mintplayer/ng-bootstrap/theming/` as issue #420 proposed; an
    assets glob pointing at `node_modules/@mintplayer/ng-bootstrap/theming` finds nothing. The script is generated
    from the same helpers as the store, so it cannot drift from them.
  - Critical CSS: see the `inlineCritical` note below. The caret/knob dark variants use
    `@container style(--mp-color-mode: dark)` (measured in Chromium 151, Firefox 153, WebKit 26.5); an engine
    without custom-property style queries keeps the light icons.
- **`BsThemeService` is a thin mirror of the framework-neutral theme store** in `@mintplayer/web-components/theming`.
  Its public API (`mode`, `effectiveMode`, `setMode`) is unchanged. On the server it reads the request cookie and a
  `<meta name="bs-theme-default-mode">`, and writes `data-bs-theme` into the rendered HTML. `setMode` with an invalid
  value (outside `^[a-z0-9-]{1,32}$`) is now a no-op with a warning.
- **Dead `[data-bs-theme=dark]` rules are removed from the web components' sheets.** They could never match from
  inside a shadow root.
  - The `mp-select` caret, the query-builder value-editor caret and the `mp-checkbox` switch knob now follow the
    theme through `@container style(--mp-color-mode: dark)`.
  - This needs the `--mp-color-mode` token: `_bootstrap.scss` includes it, and React/Vue consumers add
    `@import '@mintplayer/web-components/theming/color-mode.css'`. A custom theme declares its own
    `--mp-color-mode: dark|light`.
- **Angular consumers using dark mode should set `optimization.styles.inlineCritical: false`.** The critical-CSS
  inliner prunes every `[data-bs-theme=dark]` rule, so dark users see light until the stylesheet loads.

- **The four components that mount consumer DOM render in the light DOM.** `<mp-datatable>`,
  `<mp-treeview>`, `<mp-tree-select>` and the `<mp-query-builder>` family (builder / condition /
  group / subquery) no longer attach a shadow root; their styles are scoped at build time onto a
  `data-mps` attribute instead. This is what makes a row template, node template or cell renderer
  styleable by your own CSS and by Bootstrap's utilities at all (issue #408) — inside a shadow root
  neither could reach it. **Migration**: `::part()` and `::slotted()` no longer address these
  components — use ordinary CSS, which now reaches descendants `::part()` never could; page CSS that
  broadly styles `table` / `td` / `li` / `input` now applies inside them too; `el.shadowRoot` becomes
  `el.renderRoot` (or `el.shadowRoot ?? el`), and focus assertions read the real element from
  `document.activeElement` rather than the retargeted host. If you host one of these inside your own
  shadow root, call `adoptLightStyles(this.shadowRoot)` or it renders unstyled. Full contract and
  migration table under **Styling and encapsulation** in the README.
- **`@mintplayer/web-components`**: `datatableStyles`, `treeviewStyles` and `treeSelectStyles` are
  renamed **`datatableLightStyles`**, **`treeviewLightStyles`** and **`treeSelectLightStyles`**.
  **Migration**: rename the import; the value is the same rescoped sheet.
- **`@mintplayer/web-components/query-builder`**: the family's 32 `part=` attributes are removed,
  since a light-DOM element has no parts. **Migration**: select the elements directly.

- **`@mintplayer/ng-bootstrap/code-snippet`**: `[codeToCopy]` is renamed **`[code]`**, matching the
  property it forwards to. **Migration**: rename the binding; nothing else about it changed.
- **`@mintplayer/ng-bootstrap/code-snippet`**: `(lineActivate)` now emits the
  `CustomEvent<{ line: number }>` rather than the bare line number, because the event is
  `cancelable` and a consumer routing the activation themselves needs `preventDefault()` on it.
  **Migration**: `$event.detail.line` for the number, and call `$event.preventDefault()` if you
  handle the navigation. Vue's `@line-activate` changed the same way; React was already correct.
- **`@mintplayer/web-components/code-snippet`**: the code block now follows the page's
  `data-bs-theme` instead of being permanently dark. **Migration**: pass `theme="dark"` to keep the
  old fixed-dark appearance; `theme="auto"` (the default) follows the page, `theme="light"` pins
  light.
- **`@mintplayer/web-components/code-snippet`**: highlighting is now **asynchronous** — only
  highlight.js's core is loaded up front and the grammar is fetched on demand (53.7 KB gzip →
  ~9–15 KB). The element paints escaped plain text immediately and upgrades in place.
  `updateComplete` is overridden to await the highlight, so `await el.updateComplete` still means
  "the output is on screen"; only code that reached inside the shadow root synchronously after a
  property write needs to change.

- **Datatable selection across pages (issues #422, #407).** Design and decisions in
  `docs/prd/datatable-selection.md`.
  - **`@mintplayer/web-components/datatable`**: the `mp-datatable-selection-change` event's `selectedRows` is now
    `(T | undefined)[]`, **index-aligned with `selectedIds`**, with `undefined` where a key's row was never seen (a
    key seeded without a row). Nothing is dropped any more. **Migration**: act on `selectedIds`, render from
    `selectedRows`, and narrow before use.
  - Tree parent rows: Enter now opens the row (selects, then emits `row-click`) and Space selects. Neither expands
    any more. **Migration**: expand and collapse with ArrowRight/ArrowLeft or the expander button.
  - A double-click in the checkbox cell no longer emits `row-dblclick`, in every mode.
  - The fallback key `row-${index}` on a paginated table uses the row's **global** index, so page 2 starts at
    `row-{perPage}` rather than reusing `row-0`. A stable, id-based `rowKey` is required with `fetch`.
  - The default row-checkbox name is "Select {first-cell text}" instead of "Select row N".
  - A Shift-range over rows that have not loaded yet is refused and announced, instead of selecting placeholders.
  - **`DatatableLabels` has two new required members, `selectRowNamed(label)` and `rangeIncomplete`.** A consumer
    that builds a complete `DatatableLabels` object (rather than a `Partial`) gets a type error until it adds them.
  - **`@mintplayer/ng-bootstrap/datatable`**: the `compareWith` input is removed (it was dead code). Identity is
    `rowKey`. **Migration**: delete the binding; supply a `rowKey` if rows have no `id`.
  - `bs-datatable`: when `[settings]` carries both `page` and `perPage`, the given `page` is kept (a `perPage`
    change no longer forces page 1). When the new page size leaves that page past the last page of the known row
    count, the element clamps it to the last page and reports it, so `[(settings)]` follows. **Migration**: none
    for two-way `[(settings)]`; a host with one-way `[settings]` should handle `(pageChange)`, or reset `page`
    itself.
- **Datatable column labels and resizing (issue #426).** Design and measurements in
  `docs/prd/datatable-columns-priority-nav.md`.
  - **`DatatableLabels` has seven new required members:** `resizeColumnHint`, `resizeColumnOptions(column)`,
    `narrowerColumn(column)`, `widerColumn(column)`, `columnWidth(px)`, `fitColumn` and `resetColumn`. A
    consumer that builds a complete `DatatableLabels` object (rather than a `Partial`) gets a type error until
    it adds them.
  - **Generated strings name a column by its header text when no `label` is set**, instead of by its `name`.
    This affects the resize handle, the filter trigger and panel, and the sort and filter announcements. For
    example, a header template reading "Artist" over a column named `Name` used to be announced "Resize column
    Name" and is now announced "Resize column Artist". **Migration**: none, unless a test asserts the old
    string. Set `label` (Angular `bsDatatableColumnLabel`) for an icon-only header.
  - **The first user resize freezes the layout.** All columns are pinned at their rendered widths, and the
    table takes their total as an explicit width instead of `100%`, so the dragged edge follows the pointer.
    Narrowing a column now leaves room on the right. Resetting the last user-resized column restores the
    full-width table.

### Added

- **Datatable column resizing, per column and by touch (issue #426).**
  - **`DatatableColumnDef.resizable`** / Angular **`bsDatatableColumnResizable`**: removes or adds one column's
    resize handle. The column's own value wins over the table-wide `resizableColumns` in either direction, and
    leaving it unset follows the table.
  - **Angular `bsDatatableColumnLabel`**: the column's name in generated accessible strings.
  - **A resize options dialog.** It opens on a tap or click on a resize handle without dragging, or on Enter,
    and offers Narrower, Wider, Fit to content and Reset. This is the single-pointer alternative to dragging
    that WCAG 2.5.7 requires. The keymap is announced on the first handle focus.
  - **A larger resize target.** The handle is now 24 px wide (WCAG 2.5.8), and 40 px on coarse pointers, with a
    resting grip line on touch devices.
- **`bs-priority-nav`: activating an item in the More menu closes it (issue #426).**
  - A link or button closes it and returns focus to More. Escape now returns focus to More as well.
  - Nested-menu triggers (`aria-haspopup` / `aria-expanded`, including inside shadow DOM), form fields and
    disabled items keep the menu open.

- **Dark mode across all three frameworks (issue #420).**
  - `@mintplayer/web-components/theming`: the framework-neutral theme core.
    - Cookie and resolution helpers: `readThemeCookie`, `isValidThemeMode`, `resolveServerTheme`,
      `injectThemeAttribute`.
    - A browser-only store (`getBsThemeStore`, `configureBsTheme`) that follows `prefers-color-scheme` live in
      `auto` and syncs across tabs through `BroadcastChannel`.
    - `color-mode.css`.
    - The generated no-flash `bs-theme-preboot.js` (ES5, under 1 KB).
  - `<mp-theme-toggle>` / `<bs-theme-toggle>` / `BsThemeToggle` (React, Vue): a cycle button driven by a `modes`
    array of `{ mode, label, announcement, icon }`. Consumers localize by overriding the strings, and can pass 2–5
    modes. The accessible name is the next action; the current state is its description, and each change is
    announced.
  - `provideBsTheme({ cookieDomain })` (Angular). `useBsTheme()` (React, Vue).
- `@mintplayer/web-components/light-dom`: `installLightStyles` / `adoptLightStyles` /
  `scopedHtml` / `stampScope` — the light tier's public machinery. `adoptLightStyles` is the one a
  consumer needs: it mirrors the light-tier sheets into a shadow root that hosts one of these
  components.
- `@mintplayer/web-components/light-dom/ssr`: `injectMpLightStyles(html)` inserts the light tier's
  stylesheets into a server-rendered page's `<head>`, so those components are styled with
  JavaScript disabled. Compose it with the Declarative Shadow DOM injectors, as the demo's
  `server.ts` does.
- `@mintplayer/web-components/query-builder`: `queryBuilderLightStyles`, `queryConditionLightStyles`,
  `queryGroupLightStyles` and `querySubqueryLightStyles` are now public, matching the other
  light-tier components — needed to adopt them into a shadow root.
- `@mintplayer/vue-bootstrap`: `BsDatatable` gains `rowRenderer`; `BsTreeview` gains `nodeRenderer`
  and `iconResolver`. Angular and React already exposed these, so the renderer APIs were
  unreachable from Vue.

- `@mintplayer/web-components/code-snippet`: `<mp-code-snippet>` becomes the workspace's code
  **viewer** rather than only a snippet. Adds `line-numbers`, `start-line`, `wrap`, `theme`,
  `annotations` (sparse per-line markers with an opaque `kind`, up to two gutter labels and a
  screen-reader description), `active-line`, `lineHref`, `scrollToLine()`, a cancelable
  `line-activate` event, and localisable `label` / `region-label` / `line-label` / `copied-label` /
  `copied-announcement` / `keymap-hint`. Line links carry a roving tabindex, so a 2 000-line
  listing is one tab stop rather than 2 000. Annotation colours are the consumer's:
  each row is exposed as `::part(annotation-<kind>)` and the component ships no colour for any
  kind. A fragment-only `lineHref` is resolved against the current URL, so the obvious `#L7`
  cannot navigate away from an Angular route via `<base href>`. Wrapped for all three frameworks.
- `@mintplayer/ng-bootstrap/code-snippet`: the Angular wrapper now forwards host `aria-*`, `role`,
  `id` and `tabindex` onto the `mp-*` element, where they reach the accessibility tree.
- **Localizable strings and new inputs (coverage phase 2 audit):**
  - `bs-resizable` `[labels]`: physical-side labels for the resize glyphs, driven by `Directionality`, so "start"
    is no longer called "left" in RTL.
  - `bs-file-upload`: `[fileAddedAnnouncement]`, `[filesAddedAnnouncement]` and `[progressLabel]` replace
    hard-coded English.
  - `bs-timeline` `[activatable]` and `mp-timeline` `activatable`: `(itemClick)` without `selectable` is now
    keyboard-operable.
  - `mp-dropdown-menu` reads an item's value from a documented `dropdownValue` property first (typed by
    `DropdownItemElement`), then `data-value`, then `value`. All three `BsDropdownItem` wrappers use it, so object
    and string values now reach the `select` event intact. Before, `<li>.value` coerced them to 0.
  - Vue `useBsTheme()` returns an idempotent `stop()`, for use outside an effect scope. Inside a scope it is called
    automatically.
- **Behaviour change:** `mp-datetime-picker` now closes on every pick, which is what it already did in practice.
  Pick events fire once instead of three times, and the inner pickers' events no longer leak out of the host.
- **Coverage phase 2:** thousands of behavioural specs across every library, the `tools/` scripts and the API.
  See `docs/prd/test-coverage.md` §10.
- **Datatable selection across pages (issues #422, #407).**
  - The selection survives server paging, sorting, `perPage` changes, virtual-scroll windows and re-fetches: the
    element remembers the row of every selected key, and a re-fetched row replaces the remembered one.
  - `selectionMode="checkbox"`: multi-select through the checkbox column only. A row click (any modifiers) only
    emits `row-click`, a right-click does not select, the whole checkbox cell toggles (`cursor: pointer`), Enter
    opens and Space toggles. There is no Shift-range.
  - A settable `selectedRows` on `mp-datatable`: it replaces the selection, deriving the keys through `rowKey`, and
    remembers rows that are not loaded. It emits no event, and an unchanged push costs nothing.
  - `reload({ resetPage? })` re-queries `fetch` for the current state and keeps the selection.
    `applyFetchState({ fetch, sortColumns, page, perPage })` applies several of those as one request. Re-assigning
    the same `fetch`, or a structurally equal `sortColumns`, is a no-op.
  - `rowLabel: (row) => string` names each row checkbox ("Select {label}"), falling back to the first cell's text,
    then the row number. Localized through the new `selectRowNamed` label.
  - `aria-multiselectable="true"` on the grid in `multiple` and `checkbox` modes.
  - Assigning `labels` now re-renders the table, so a language switch renames everything at once.
  - Wrappers: Angular gains `[rowLabel]`, `reload()` and the `'checkbox'` mode, and `[(selection)]` keeps the
    host's row objects by key. React gains `selectedRows` (pushed only when its reference changes; memoise it) and
    `rowLabel`. Vue gains `selectedRows` (a one-way seed), `rowLabel` and `defineExpose({ el, reload,
    applyFetchState })`.

### Fixed

- **Datatable (issue #426).**
  - **Phantom horizontal scrollbar.** Measured column widths were rounded up, so columns that fitted
    overflowed by up to 1 px each. They are now rounded down.
  - **Columns keep fitting after measurement.** The fitted widths are re-fitted when the container narrows or
    a classic vertical scrollbar appears, down to 75 %; below that the table scrolls.
  - **Column resizing on touch devices (Android).** The handle had no `touch-action`, so the browser took
    the drag as a scroll and cancelled the resize after a few pixels.
  - **The sort arrows no longer swallow clicks** 12–24 px from the right edge of a sortable header.
  - **A right- or middle-click on a resize handle** no longer starts a resize.
- **Found and fixed while raising coverage** (each pinned by a spec; full register in `docs/prd/test-coverage.md`
  §10.6):
  - **query-builder:** drag-and-drop never changed the tree, dropping into a sub-query didn't work, and value
    editors lost edits and were never style-scoped.
  - **scheduler:**
    - `selectedRange` returned the drag preview.
    - A `touchstart` listener leak, and `touchcancel` never ended an armed drag.
    - A re-attached scheduler rendered an empty grid.
  - **dock:** a floating window's intersection handle resized the docked splitter at the same position.
    `setPointerCapture` failures lost the resizing state, and a zero-size move wiped the stored ratios.
  - **tile-manager:** a zero-size cell hung the main thread in `pack()`.
  - **splitter:**
    - `minPanelSize` read NaN.
    - Removing the splitter mid-drag left it resizing forever.
    - A reconnected splitter lost its observers.
  - **Date/time/datetime pickers:** fired each pick three times.
  - **multi-range:** divided by a zero-size track.
  - **Ribbon:** the contextual band colour parsed only 6-digit hex.
  - **Carousel, swiper and signature-pad:**
    - Carousel: slides became focusable after a reconnect.
    - Swiper: one-slide wrap showed a blank cell.
    - Signature-pad: mutated the data it had already emitted.
  - **Angular wrappers:**
    - Stale cached views after a template swap (treeview, datatable).
    - `bs-select` never marked its form control touched.
    - Dropdown and context-menu overlays leaked on destroy.
    - The tab-control server render had no page content.
    - Offcanvas/modal dispose timers couldn't be cancelled.
    - `bs-scheduler` lost a date set together with `view`.
    - `bs-timeline` mis-keyed numeric and id-less items.
    - The tooltip overwrote `aria-describedby`.
    - `enum.service` dropped members of string and mixed enums.

- **Dark mode colours (issue #420).** Hard-coded light values are replaced with `--bs-*` tokens in:
  - the scheduler scrollbar and greyed slots
  - the query-builder toolbar buttons
  - the datatable and treeview hover
  - the code-snippet "Copied!" label
- **Forced colours:** the select caret, switch knob and accordion chevron stay visible in forced-colours mode.
- **Calendar:** the month header gets its 40px height, borders and background back. This was a regression from #393.
- **Packaging:** `@mintplayer/web-components` now actually ships `custom-elements.json`. It was missing from the
  2.16.0 tarball, because the asset copier skipped gitignored files.
- **Datatable selection (issues #422, #407).**
  - Selected rows that left the loaded data were silently dropped from `selectedRows`, and the Angular wrapper then
    pushed the shorter list back down, wiping the element's own keys.
  - K1: `resolveRows` keyed rows with index `-1`, so every id-less row became `row--1` and `selectedRows` was
    always empty for them.
  - K2: paginated tables used page-relative fallback keys, so `row-0` named a different row on every page.
  - K3: the Angular selection effect passed the selection-array index to `rowKey`.
  - K4: the Angular wrapper's `row-${index}` fallback key was unstable across pages. A stable `rowKey` is now
    documented as required with `[fetch]`, and the element warns once when a selectable or `fetch` table has rows
    without an `id` and no custom `rowKey`.
  - K5: `compareWith` was dead code (removed, see Breaking).
  - K6: switching `selectionMode` to `'none'` cleared the selection without an event, leaving wrapper models stale.
  - K7: a Shift-range selected `__placeholder-*` keys, and silently fell back to a plain select when its anchor had
    scrolled out of the rendered window.
  - #407: an unchanged `fetch` or `sortColumns` re-assignment restarted the load, and the Angular wrapper's two
    forwarding effects could split one settings change into two requests.
  - React: `@lit/react` re-assigns every property on every render, so with the replacing `selectedRows` setter any
    unrelated re-render reverted the user's clicks. `selectedRows` is now pushed only when its reference changes.
  - Vue: a one-way `selectedIds` (and `expandedIds`) was re-pushed on every unrelated prop change, reverting the
    user's clicks and overriding a `selectedRows` seed. Each is now pushed on mount and on its own change only.
  - Angular: a host's fresher row object for an already-selected key was never pushed (only key changes were), so
    the next event reported the element's stale copy (a stale etag). Restoring an earlier emitted selection after
    a clear was mistaken for an echo and ignored.
  - `mp-datatable`: `selectedIds` treated `['a', 'a']` as equal to `{a, b}` (a length check), and a key set while
    its row was loaded reported `undefined` once that page was gone.

### Removed

- **`ngx-highlightjs`** is gone from the workspace. The Angular demo had been loading the full
  highlight.js library through it *in addition to* the copy the web component already carried,
  plus a third copy of the a11y-dark theme as its own style bundle. `highlight.js` is now an
  explicit dependency rather than a transitive one.

### Added

- `@mintplayer/ng-bootstrap/file-manager`: new package. `<bs-file-manager>` + `<mp-file-manager>` provide a Syncfusion-style file-browser composing `mp-splitter` + `mp-treeview` (with `hide-borders`) + `mp-datatable`. v1 ships: tree + grid + breadcrumb navigation, single/multi selection (Ctrl/Shift modifiers), file operations (rename via F2, delete via Del, new folder via Ctrl+Shift+N, cut/copy/paste via Ctrl+X/C/V), search, sort, list/icons view-mode toggle, and an OS file-drop overlay (`[allowUpload]`) that emits an `(uploadRequest)` event with `File[]` + target folder. Consumer mutates `[nodes]` in response to `(operation)` events — the component never self-mutates. See issue #329.
- `@mintplayer/ng-bootstrap/web-components/treeview`: new Lit web component (`<mp-treeview>`). Data-driven `TreeNode[]` model, recursive rendering, ARIA tree pattern with roving tabindex, keyboard nav (arrow keys + Home/End/Enter/Space), `hide-borders` attribute, `iconResolver` for `iconKey` → SVG, and a `nodeRenderer` callback (Angular wrapper exposes this as the `*bsTreeviewNode` structural directive).
- `@mintplayer/ng-bootstrap/web-components/datatable`: new Lit web component (`<mp-datatable>`). Property-driven columns with `cellRenderer` callbacks, multi-column sort via shift+click, single/multi selection (range-extend on shift, additive on ctrl), row click/dblclick/contextmenu events, pointer-driven resizable columns, pagination footer, built-in scroll-position-driven virtual scroll (`virtualScroll` + `itemSize`), and a `rowRenderer` callback (Angular wrapper bridges `*bsRowTemplate` into this). ARIA `role="grid"`. Pure helpers `computeNextSort(current, columnName, shiftKey)` + `sortRows(rows, sortColumns)` exported for reuse.
- `@mintplayer/ng-bootstrap/web-components/file-manager`: new Lit web component (`<mp-file-manager>`) implementing the file-manager listed above, including a right-click context menu and `ContextMenu` / `Shift+F10` keyboard equivalents.
- `@mintplayer/ng-bootstrap/web-components/pagination`: new Lit web component (`<mp-pagination>`). Mirrors the existing `bs-pagination` API (`pageNumbers`, `selectedPageNumber`, `numberOfBoxes`, `showArrows`, `size`, `aria-label`) and is now what `bs-pagination` renders under the hood. Responsive: when `number-of-boxes` would exceed the available width, the WC clamps to whatever fits the host, so the same pagination renders correctly on both mobile and desktop without consumer-side breakpoints. Pure helper `buildPaginationItems(pages, current, budget)` exported for reuse. `bs-pagination` itself remains source-compatible.
- `@mintplayer/ng-bootstrap/datatable`: `[fetch]` now drives the WC's built-in pagination footer (powered by `<mp-pagination>`) — previously the footer was suppressed in fetch mode. The wrapper forwards `totalRecords` to the WC so page counts reflect the server total instead of the in-memory slice. Virtual scroll + `[fetch]` now preloads every page through the fetcher up front (in-memory virtualizer); the WC's scroll viewport falls back to `var(--mp-datatable-virtual-max-height, 480px)` so the table actually scrolls when the host isn't explicitly sized.

### Breaking

- **`@mintplayer/ng-bootstrap/treeview`**: `BsTreeviewItemComponent` removed; content-projected `<bs-treeview-item>` API replaced by data-driven `[items]: TreeNode[]` input. Custom per-node rendering is now provided via the new `*bsTreeviewNode` structural directive (with `$implicit: TreeNode` context). **Migration**: collect your treeview content into a nested `TreeNode` array (`{ id, label, iconKey?, children?, meta? }`) and bind `<bs-treeview [items]="treeNodes()">` with an inline `<ng-template bsTreeviewNode let-node>` rendering arbitrary content (icons, labels, badges). Two-way bindings `[(expandedIds)]` and `[(selectedIds)]` control state; `(nodeSelect)` / `(nodeExpand)` / `(nodeCollapse)` events replace per-item click handlers.
- **`@mintplayer/ng-bootstrap/datatable`**: column-projection contract changed. `*bsDatatableColumn` (header template + `bsDatatableColumnSortable`) and `*bsRowTemplate` (per-row `<td>` template) are preserved and now bridge into the new Lit web component (`<mp-datatable>`) via Angular `EmbeddedViewRef`s — the same pattern the query-builder uses to host Angular editors inside its Lit host. Programmatic `[columns]: DatatableColumnDef[]` with `cellRenderer` callbacks is also supported. **Migration**: existing template-directive consumers work unchanged; `DatatableSortBase`, `ColumnDef`, and `SyntheticColumn` are no longer exported (use the new `DatatableColumnDef<T>` type), and `computeNextSort` is exposed as a pure helper. The CDK virtual scroll implementation is replaced by a built-in scroll-position-driven virtualizer (no `@angular/cdk` peer dep); behaviour and `[virtualScroll]` / `[itemSize]` inputs are preserved.

- **`@mintplayer/ng-bootstrap/navbar`**: `BsNavbarComponent` has been modernized to align with Bootstrap 5.3's `data-bs-theme` pattern.
  - The component no longer emits the deprecated `.navbar-light` / `.navbar-dark` classes. It now writes `[data-bs-theme="light|dark"]` directly on the rendered `<nav>` element, and emits a `bg-{color}` utility class to set the background.
  - The `[color]` input has been widened from `Color | null` to `Color | string | null`. String values (e.g. `[color]="'body-tertiary'"`) emit a `bg-{value}` class and allow the page theme to cascade (no `data-bs-theme` override).
  - **Migration**: This change only affects consumers with custom CSS keyed off the deprecated `.navbar-light` / `.navbar-dark` classes (no such usage in this repo). See `docs/issue_324_navbar_modernize_PRD.md` for the full mapping table.

### Added

- `@mintplayer/ng-bootstrap/theming`: new package for managing Bootstrap color modes.
  - **`BsThemeService`**: a signal-first, SSR-safe service that owns the user's color-mode choice and writes the resolved value to `<html data-bs-theme>`.
  - **API**: `setMode('auto' | 'light' | 'dark' | string)`. Signals: `mode` (authored), `effectiveMode` (resolved).
  - **`auto` resolution**: resolves to `light` / `dark` via `matchMedia('(prefers-color-scheme: dark)')` and live-updates when the OS preference changes.
  - **Persistence**: persists to `localStorage` under `BS_THEME_STORAGE_KEY` (`'bs-theme-mode'`).
  - **Custom variants**: the string-typed mode admits user-defined themes — ship your own `[data-bs-theme="sepia"] { … }` block and call `setMode('sepia')`.
  - **SSR-safe**: no `localStorage` / `matchMedia` / DOM access on the server.
  - **No-flash reload**: pair with a tiny inline pre-boot `<script>` in `<head>` to apply the persisted mode before any CSS evaluates, preventing a light-mode flash on reload.
  - See `/additional-samples/theming` in the demo for the full recipe (build-time SCSS overrides, runtime `--bs-*` mutation, mode switching, per-component variable reference, custom variants, SSR integration).
- `@mintplayer/ng-bootstrap/scheduler`: keyboard grid navigation across day/week/timeline views. Cells expose `role="gridcell"` with roving tabindex and a deterministic id. Arrow keys walk cells (week: up/down = time, left/right = day; timeline: left/right = time, up/down = resource), Shift+Arrow extends a linear time-range selection that crosses day boundaries on week view, Home/End jump to the column extremes, Ctrl+Home/End to the view extremes, PageUp/PageDown advance one period. Enter on a cell or selection emits `event-create` with the same payload mouse drag-create produces. Every event is in the Tab order; Enter on a focused event enters move-mode (`aria-pressed="true"`), where Arrow keys nudge time/resource, Shift+Arrow resizes the end edge (Alt+Shift the start edge), week-view Shift+ArrowLeft/Right resizes across day boundaries, Enter commits, Escape reverts. The focused cell and the move-mode preview auto-scroll into the viewport. Live-region announcements narrate each transition. See `docs/prd/scheduler-keyboard-grid-nav.md`.
- `@mintplayer/ng-bootstrap/navbar`: `BsNavbarTriggerDirective` (`[bsNavbarTrigger]`) for dropdown trigger anchors. Replaces `routerLink` + `routerLinkActive` on triggers — drives the active CSS class via `Router.events` without RouterLink's programmatic-navigate behaviour. Use `routerLink` on the items INSIDE the dropdown for actual navigation; use `bsNavbarTrigger` on the trigger anchor that opens the dropdown.
- `@mintplayer/ng-bootstrap/navigation-lock`: `provideNavigationLockRouter(routes, ...features)` — single-call router setup that wraps your routes in the required `canMatch: [bsNavigationLockGuard]` and applies `canceledNavigationResolution: 'computed'`. Use in place of `provideRouter(...)` to avoid having to remember both pieces.
- `@mintplayer/ng-bootstrap/tile-manager`: new package. `<bs-tile-manager>` + `<bs-tile>` + `<bs-tile-header>` for dashboard-style grids of self-similar tiles users can drag, resize, and rearrange. Tiles push neighbours out of the way with vertical-compact gravity in real time; the layout serializes to a stable typed `TileLayoutSnapshot` you can persist and restore by re-binding `[(position)]` per tile. Header-only drag by default; touch arms via 600 ms long-press (mirrors `BsDock`); `prefers-reduced-motion: reduce` bypasses the FLIP animator. Architecture mirrors `BsDock`: a Lit web component (`<mp-tile-manager>`) owns gesture mechanics, the packer, FLIP animations, keyboard mode, and shadow-DOM rendering; the Angular wrappers marshal inputs and re-emit custom events as Angular outputs. See `docs/prd/tile-manager.md`.
- `@mintplayer/ng-bootstrap/checkbox`: new package. `<bs-checkbox>` exposes a narrowed `type` union (`'checkbox' | 'switch' | 'toggle_button'`) and a `[bsCheckboxGroup]` directive. Single-mode binds a `boolean`; multi-mode binds `string[]` via `[bsCheckboxGroup]` (the group carries the shared `[name]` with `[]` suffix auto-applied). Group resolution is "explicit `[group]` input wins over DI-injected ancestor", so non-adjacent layouts (e.g. one checkbox per table row) work via `#g="bsCheckboxGroup"` + `[group]="g"`. Implements `ControlValueAccessor` end-to-end for `[(ngModel)]` and `[formControl]`. ARIA host→input mirroring preserved. See `docs/prd/toggle-button-split.md`.
- `@mintplayer/ng-bootstrap/radio`: new package. `<bs-radio>` exposes a narrowed `type` union (`'radio' | 'toggle_button'`) and a `[bsRadioGroup]` directive. Radios participate in form binding only through the group: `[name]` lives only on `[bsRadioGroup]`, and `BsRadioValueAccessor` is hosted there too — `[formControl]` / `[(ngModel)]` bind on the group element and the form value is a single `string`. Same explicit-vs-ancestor `[group]` resolution as `<bs-checkbox>` for non-adjacent layouts. See `docs/prd/toggle-button-split.md`.

### Breaking

- **`<bs-toggle-button>` split into `<bs-checkbox>` and `<bs-radio>`** (see `docs/prd/toggle-button-split.md`). The single god-component that fronted five `type` values is replaced by two per-family components with narrowed type unions.

  Removed from `@mintplayer/ng-bootstrap/toggle-button`:
  - `BsToggleButtonValueAccessor`
  - `BsToggleButtonGroupDirective`
  - `BsCheckStyle` (type union)

  `BsToggleButtonComponent` survives at the same import path but is now a styling-wrapper-only component with no inputs and no behaviour. The wrapper carries the Bootstrap `form-check` SCSS via `:host ::ng-deep` and is consumed internally by `<bs-checkbox>` / `<bs-radio>` templates — consumers should not import it directly.

  Migration table:

  | Before | After |
  | --- | --- |
  | `<bs-toggle-button>` (default checkbox) | `<bs-checkbox>` |
  | `<bs-toggle-button type="checkbox">` | `<bs-checkbox type="checkbox">` |
  | `<bs-toggle-button type="switch">` | `<bs-checkbox type="switch">` |
  | `<bs-toggle-button type="toggle_button">` | `<bs-checkbox type="toggle_button">` |
  | `<bs-toggle-button type="radio">` | `<bs-radio>` inside `<div bsRadioGroup name="x">` |
  | `<bs-toggle-button type="radio_toggle_button">` | `<bs-radio type="toggle_button">` inside `<div bsRadioGroup name="x">` |
  | `[bsToggleButtonGroup]` (checkbox group) | `[bsCheckboxGroup]` (also gains a shared `[name]` input) |
  | `[bsToggleButtonGroup]` (radio group) | `[bsRadioGroup]` (carries the shared `[name]` input; per-radio `[name]` removed) |
  | `formControlName="x"` on every `<bs-toggle-button type="radio">` | `formControlName="x"` on the `[bsRadioGroup]` element (form value: single `string`) |
  | `formControlName="x"` on every grouped `<bs-toggle-button type="checkbox">` | `formControlName="x"` on the `[bsCheckboxGroup]` element (form value: `string[]`) |
  | `import { BsCheckStyle } from '@mintplayer/ng-bootstrap/toggle-button'` | `BsCheckboxType` from `/checkbox` or `BsRadioType` from `/radio` |

  Mode-aware `[name]` resolution:
  - Radio always-grouped: name on `[bsRadioGroup]` only.
  - Checkbox standalone (single-mode): name per-instance on `<bs-checkbox>`; binds `boolean`.
  - Checkbox grouped (multi-mode): name on `[bsCheckboxGroup]`, `[]` suffix auto-applied; per-instance `[name]` is ignored. Binds `string[]`.

  Demo routes: `/forms/toggle-button` is removed. Two new routes replace it: `/forms/checkbox` and `/forms/radio`, each demonstrating its type variants and group behaviour. No redirect.

- **Scheduler keyboard model rewrite** (see `docs/prd/scheduler-keyboard-grid-nav.md`).
  - `event-click` custom event renamed to `event-selected`. Fires on mouse click and on keyboard Tab landing on an event ("click" no longer described the trigger). `event-dblclick` is unchanged. Migrate listeners; no shim provided.
  - `BsSchedulerComponent`: Angular output `(eventClick)` → `(eventSelected)`; type `SchedulerEventClickEvent` → `SchedulerEventSelectedEvent`. Type `EventClickDetail` (scheduler-core) → `EventSelectedDetail`.
  - Move-mode entry key: `M` on a focused event is removed. Press `Enter` on the focused event instead.
  - Bare letter shortcuts `T` / `Y` / `M` / `W` / `D` are removed. Use `Alt+T` (today) / `Alt+Y` (year) / `Alt+M` (month) / `Alt+W` (week) / `Alt+D` (day). Frees single letters for future input surfaces inside the scheduler.
  - Bare `ArrowLeft` / `ArrowRight` no longer navigate periods (they now walk cells inside the grid). Use `PageUp` / `PageDown` for previous/next period. Header prev/next buttons still work.
  - Events lose their roving tabindex — every event is now `tabindex="0"` so Tab walks through them in document order.

- **Navigation-lock redesign** (#169, see `docs/prd/navigation-lock-redesign.md`).
  The opt-in directive + per-route guard pair is replaced by a global
  `CanActivateChild` guard backed by a registry service. Migration:

  1. Drop `canDeactivate: [BsNavigationLockGuard]` from any route definition.
  2. Drop `implements BsHasNavigationLock` and any
     `viewChild.required<BsNavigationLockDirective>('navigationLock')` from
     your page component.
  3. Drop the `#navigationLock="bsNavigationLock"` template ref unless you
     use it for your own logic.
  4. Move `[bsNavigationLock]` from an empty `<ng-container>` onto a
     meaningful element (the `<form>`).
  5. Replace your `provideRouter(routes, ...features)` call with
     `provideNavigationLockRouter(routes, ...features)`. The helper wraps
     your routes in the required `canMatch: [bsNavigationLockGuard]` and
     applies `withRouterConfig({ canceledNavigationResolution: 'computed' })`
     (needed for popstate-cancel to restore the history stack).

     If your router setup is too custom for the helper, wire it manually:
     wrap your top-level routes in
     `{ path: '', canMatch: [bsNavigationLockGuard], children: [...] }`
     (use **`canMatch`**, not `canActivateChild` — `canActivateChild` fires
     once per descendant activation, so deep destinations would prompt N
     times) and add
     `withRouterConfig({ canceledNavigationResolution: 'computed' })` to
     your `provideRouter(...)` call.

  API delta:
  - REMOVED: `BsNavigationLockGuard` (class), `BsHasNavigationLock`
    (interface).
  - ADDED: `bsNavigationLockGuard` (functional `CanMatchFn`),
    `BsNavigationLockService`, `BsNavigationLockHandle`,
    `BS_NAVIGATION_LOCK_CONFIRM`, `provideNavigationLock`,
    `provideNavigationLockRouter`.
  - CHANGED: `BsNavigationLockDirective.requestCanExit()` returns
    `boolean | Promise<boolean> | Observable<boolean>` (was
    `Promise<boolean>`); the `canExit` function-shape input now accepts an
    optional `reason: string` argument.

  Note: `canMatch` returns false to indicate non-match; if your app has a
  wildcard `**` route the navigation may fall through there instead of
  staying put. If that's a concern, also apply `bsNavigationLockGuard` to
  the wildcard route.

### Fixed

- `@mintplayer/ng-bootstrap/dock` (#326): `renderIntersectionHandles` no longer pairs splitter dividers from different dock layers, so coincidental on-screen alignment between a docked splitter and a floating pane's splitter (or between two floating panes) no longer produces a phantom intersection grip between unrelated splitters.
- `@mintplayer/ng-bootstrap/datatable`: `<bs-datatable>` rows now span the full host width even when the sum of pinned column widths is narrower than the host. A trailing `.bs-datatable-spacer` cell (`aria-hidden`) is appended to every header and body row and absorbs the leftover under `table-layout: fixed`, so pinned widths stay frozen instead of being redistributed across data columns. The CSS pairs `width: max-content; min-width: 100%` on the table (the inverse order — `width: 100%; min-width: max-content` — triggers a layout loop with CDK's virtual-scroll content wrapper). The bs-table wrapper also gets an unconditional `overflow-x: auto` in resizable mode, so a table whose pinned widths exceed the host scrolls horizontally inside its own region instead of expanding the page body. The footer `<td colspan>` was bumped by 1 to span the spacer.

## [21.18.0] — 2026-04-27

### Breaking

- `BsSearchboxComponent.suggestionTemplate`, `.enterSearchtermTemplate`, and
  `.noResultsTemplate` are now `WritableSignal<TemplateRef<…> | undefined>`.
  Code that wrote `component.suggestionTemplate = ref` (or either of the
  others) must call `.set(ref)`. The `BsSuggestionTemplateDirective`,
  `BsEnterSearchTermTemplateDirective`, and `BsNoResultsTemplateDirective`
  do this transparently — only direct assignments to the fields are
  affected.
- `BsCarouselComponent.imageCounter` is now a `WritableSignal<number>`.
  `BsCarouselImageDirective` reads it via `imageCounter()` and updates
  via `.update(c => c + 1)`, preserving the original post-increment
  semantics (each image still gets a unique sequential `id`). External
  code that read or wrote the field directly must adopt the same pattern.
- `BsCarouselComponent.animationsDisabled` is now a `WritableSignal<boolean>`.
  Read access changes from `cmp.animationsDisabled` to
  `cmp.animationsDisabled()`. The host binding `'[@.disabled]'` was
  updated to `'animationsDisabled()'` accordingly. No external writers
  exist in the repo.

## [21.17.0] — 2026-04-27

### Breaking

- `BsSelect2Component.itemTemplate` and `BsSelect2Component.suggestionTemplate`
  are now `WritableSignal<TemplateRef<T> | undefined>`. Code that wrote
  `component.itemTemplate = ref` or `component.suggestionTemplate = ref` must
  call `.set(ref)`. The `BsItemTemplateDirective` and
  `BsSuggestionTemplateDirective` do this transparently — only direct
  assignments to the fields are affected.

### Fixed

- `BsSuggestionTemplateDirective`'s spec mock declared `itemTemplate`
  (a copy-paste from the item-template spec) instead of
  `suggestionTemplate`. Plain assignment masked the bug at runtime; the
  signal migration surfaced it. Now declares `suggestionTemplate`.

## [21.16.0] — 2026-04-27

### Breaking

- `BsFileUploadComponent.fileTemplate` is now a
  `WritableSignal<TemplateRef<FileUpload> | undefined>`. Code that wrote
  `component.fileTemplate = ref` must now call
  `component.fileTemplate.set(ref)`. The `BsFileUploadTemplateDirective` does
  this transparently — only direct assignments to the field are affected.

## [21.15.0] — 2026-04-27

### Breaking

- `BsNavbarItemComponent.hasDropdown` is now a `Signal<boolean>` derived from
  `dropdowns()` (a `computed`, not a `WritableSignal`). Read access changes
  from `cmp.hasDropdown` to `cmp.hasDropdown()`. Code that wrote to
  `hasDropdown` should drop the write — the value is now derived
  automatically. The previous manual update in
  `DropdownToggleDirective.ngAfterContentInit` has been removed.
- `BsSignaturePadComponent.isDrawing` is now a `WritableSignal<boolean>`. Read
  access changes from `cmp.isDrawing` to `cmp.isDrawing()`. No external
  writers exist in the repo.

### Fixed

- `BsNavbarDropdownComponent` now disposes its `OverlayRef` in `ngOnDestroy`.
  Previously the overlay (and any attached DOM portal) leaked when the
  component was destroyed.
- `BsSignaturePadComponent.onPointerEnd` no longer keeps `isDrawing` stuck at
  `true` when `context` is unavailable. The flag was set unconditionally in
  `onPointerStart` but only reset when `context` was non-null, leaving the
  pad in an inconsistent "still drawing" state under SSR/getContext failure.

### Internal

- Added `readonly` to fields that are initialized once and never reassigned
  across the carousel, datepicker, file-upload, spinner, timepicker, select2,
  signature-pad, and typeahead components. No public API change.
- Converted the private boolean flags `isAttached` and `isDestroyed`
  (`BsNavbarDropdownComponent`) and `isPointerDown` (`BsColorWheelComponent`)
  to signals. These fields are `private`, so no external API change.

## [21.14.0] — 2026-04-26

### Removed

- **Breaking:** `provideAsyncHostBindings()` and `BsBindEventPlugin` (the
  `async-host-binding` lib entry). The plugin relied on `NgZone.onStable`,
  which no longer reflects app stability under
  `provideZonelessChangeDetection()`. Use signal-based host bindings instead
  (`host: { '[prop]': 'mySignal()' }`) and wrap RxJS observables with
  `toSignal()` from `@angular/core/rxjs-interop`. The demo page
  `/advanced/async-host-binding` shows both patterns.

### Other

- Library now operates fully zoneless. zone.js is no longer pulled in
  transitively or required at runtime.
- Migrated remaining template-bound plain class fields to Angular signals
  (`BsDatatableComponent.rowTemplate`, `BsVirtualDatatableComponent.rowTemplate`,
  `BsTimepickerComponent.presetTimestamps`).
- Migrated the last `@Input()` decorators (`BsDatatableColumnDirective`) to
  the signal-based `input()` API.
- Bumped `ng-mocks` peer to `^14.15.2`.
