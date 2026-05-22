# WC Inventory — canonical list for `cross-framework-web-components.md` Phase 1

Produced 2026-05-22 from `grep -rE "customElements\.define" libs/mintplayer-ng-bootstrap` (Phase 0 step 4).

**50 production WC classes** + 1 new (`mp-code-snippet`) + 3 helper libs = **25 sub-entrypoints** in `libs/mintplayer-web-components/`.

Excluded from migration:
- `libs/mintplayer-ng-bootstrap/_spike-lit-context/spike.spec.ts` — Lit-context recursive provider/consumer spike. Two registrations (`mp-qb-spike`, `mp-qb-spike-leaf`). Stays in `_spike-lit-context/` as a verification artefact for [[reference_lit_context_recursive]]; not a production WC.

## Inventory by target sub-entrypoint

Layout = where the source currently lives. **A** = `<feature>/src/lib/web-components/*.element.ts` (older flat pattern). **B** = `web-components/<entry>/src/components/*.ts` (newer consolidated pattern).

| Sub-entry | Tag | Source file (current) | Layout |
|---|---|---|---|
| **calendar** | `mp-calendar` | `calendar/src/lib/web-components/mp-calendar.element.ts` | A |
| **card** | `mp-card` | `card/src/lib/web-components/mp-card.element.ts` | A |
| | `mp-card-body` | `card/src/lib/web-components/mp-card-body.element.ts` | A |
| | `mp-card-footer` | `card/src/lib/web-components/mp-card-footer.element.ts` | A |
| | `mp-card-group` | `card/src/lib/web-components/mp-card-group.element.ts` | A |
| | `mp-card-header` | `card/src/lib/web-components/mp-card-header.element.ts` | A |
| | `mp-card-img` | `card/src/lib/web-components/mp-card-img.element.ts` | A |
| | `mp-card-link` | `card/src/lib/web-components/mp-card-link.element.ts` | A |
| | `mp-card-subtitle` | `card/src/lib/web-components/mp-card-subtitle.element.ts` | A |
| | `mp-card-text` | `card/src/lib/web-components/mp-card-text.element.ts` | A |
| | `mp-card-title` | `card/src/lib/web-components/mp-card-title.element.ts` | A |
| **checkbox** | `mp-checkbox` | `web-components/checkbox/src/components/mp-checkbox.ts` | B |
| **code-snippet** | `mp-code-snippet` | *(new — Phase 1 step 10)* | new |
| **datatable** | `mp-datatable` | `web-components/datatable/src/components/mp-datatable.ts` | B |
| **datepicker** | `mp-datepicker` | `datepicker/src/lib/web-components/mp-datepicker.element.ts` | A |
| **datetime-picker** | `mp-datetime-picker` | `datetime-picker/src/lib/web-components/mp-datetime-picker.element.ts` | A |
| **dock** | `mint-dock-manager` | `dock/src/lib/web-components/mint-dock-manager.element.ts` | A |
| **file-manager** | `mp-file-manager` | `web-components/file-manager/src/components/mp-file-manager.ts` | B |
| **multi-range** | `mp-multi-range` | `multi-range/src/lib/web-components/mint-multi-range.element.ts` | A (file name uses `mint-` but tag is `mp-`) |
| **otp-input** | `mp-otp-input` | `otp-input/src/lib/web-components/mint-otp-input.element.ts` | A (file name uses `mint-` but tag is `mp-`) |
| **pagination** | `mp-pagination` | `web-components/pagination/src/components/mp-pagination.ts` | B |
| **query-builder** | `mp-query-builder` | `query-builder/src/lib/web-components/mp-query-builder.element.ts` | A |
| | `mp-query-condition` | `query-builder/src/lib/web-components/mp-query-condition.element.ts` | A |
| | `mp-query-group` | `query-builder/src/lib/web-components/mp-query-group.element.ts` | A |
| | `mp-query-subquery` | `query-builder/src/lib/web-components/mp-query-subquery.element.ts` | A |
| **radio** | `mp-radio` | `web-components/radio/src/components/mp-radio.ts` | B |
| **ribbon** | `mp-ribbon` | `ribbon/src/lib/web-components/mp-ribbon.element.ts` | A |
| | `mp-ribbon-tab` | `ribbon/src/lib/web-components/mp-ribbon-tab.element.ts` | A |
| | `mp-ribbon-group` | `ribbon/src/lib/web-components/mp-ribbon-group.element.ts` | A |
| | `mp-ribbon-contextual-tab-set` | `ribbon/src/lib/web-components/mp-ribbon-contextual-tab-set.element.ts` | A |
| | `mp-quick-access-toolbar` | `ribbon/src/lib/web-components/mp-quick-access-toolbar.element.ts` | A |
| | `mp-ribbon-button` | `ribbon/src/lib/web-components/items/mp-ribbon-button.element.ts` | A |
| | `mp-ribbon-checkbox` | `ribbon/src/lib/web-components/items/mp-ribbon-checkbox.element.ts` | A |
| | `mp-ribbon-color-picker` | `ribbon/src/lib/web-components/items/mp-ribbon-color-picker.element.ts` | A |
| | `mp-ribbon-combobox` | `ribbon/src/lib/web-components/items/mp-ribbon-combobox.element.ts` | A |
| | `mp-ribbon-dropdown-button` | `ribbon/src/lib/web-components/items/mp-ribbon-dropdown-button.element.ts` | A |
| | `mp-ribbon-gallery` | `ribbon/src/lib/web-components/items/mp-ribbon-gallery.element.ts` | A |
| | `mp-ribbon-gallery-item` | `ribbon/src/lib/web-components/items/mp-ribbon-gallery-item.element.ts` | A |
| | `mp-ribbon-group-button` | `ribbon/src/lib/web-components/items/mp-ribbon-group-button.element.ts` | A |
| | `mp-ribbon-menu-item` | `ribbon/src/lib/web-components/items/mp-ribbon-menu-item.element.ts` | A |
| | `mp-ribbon-menu-separator` | `ribbon/src/lib/web-components/items/mp-ribbon-menu-separator.element.ts` | A |
| | `mp-ribbon-split-button` | `ribbon/src/lib/web-components/items/mp-ribbon-split-button.element.ts` | A |
| | `mp-ribbon-template-item` | `ribbon/src/lib/web-components/items/mp-ribbon-template-item.element.ts` | A |
| | `mp-ribbon-toggle-button` | `ribbon/src/lib/web-components/items/mp-ribbon-toggle-button.element.ts` | A |
| **scheduler** | `mp-scheduler` | `web-components/scheduler/src/components/mp-scheduler.ts` | B |
| **splitter** | `mp-splitter` | `web-components/splitter/src/components/mp-splitter.ts` | B |
| **tab-control** | `mp-tab-control` | `web-components/tab-control/src/components/mp-tab-control.ts` | B |
| | `mp-tab-page` | `web-components/tab-control/src/components/mp-tab-page.ts` | B |
| **tile-manager** | `mp-tile-manager` | `tile-manager/src/lib/web-components/mint-tile-manager.element.ts` | A (file name uses `mint-` but tag is `mp-`) |
| **timepicker** | `mp-timepicker` | `timepicker/src/lib/web-components/mp-timepicker.element.ts` | A |
| | `mp-time-list` | `timepicker/src/lib/web-components/mp-time-list.element.ts` | A |
| **toggle-button** | `mp-toggle-button` | `web-components/toggle-button/src/components/mp-toggle-button.ts` | B |
| **treeview** | `mp-treeview` | `web-components/treeview/src/components/mp-treeview.ts` | B |

## Helper sub-entrypoints (no element classes)

| Sub-entry | Current path | Layout | Purpose |
|---|---|---|---|
| **a11y** | `web-components/a11y/` | B | Live-announcer + a11y primitives consumed by other WCs |
| **overlay** | `web-components/overlay/` | B | Overlay positioning + portal primitives |
| **scheduler-core** | `web-components/scheduler-core/` | B | Date/resource/timeline services + models for mp-scheduler (was `@mintplayer/scheduler-core` before the prior consolidation) |

## Totals

| Bucket | Count |
|---|---|
| Element classes — Layout A | 39 |
| Element classes — Layout B | 11 |
| Element classes — new (code-snippet) | 1 |
| **Element classes total in new lib** | **51** |
| Element-bearing sub-entrypoints | 22 |
| Helper sub-entrypoints | 3 |
| **Total sub-entrypoints** | **25** |

## File-naming inconsistency to fix during normalisation

Four Layout A files have `mint-` prefix on the filename but register `mp-` tag:
- `multi-range/src/lib/web-components/mint-multi-range.element.ts` → `mp-multi-range`
- `otp-input/src/lib/web-components/mint-otp-input.element.ts` → `mp-otp-input`
- `tile-manager/src/lib/web-components/mint-tile-manager.element.ts` → `mp-tile-manager`
- `dock/src/lib/web-components/mint-dock-manager.element.ts` → `mint-dock-manager` *(tag also uses `mint-` — no inconsistency here)*

Phase 1 step 8 (directory normalisation) is the natural place to rename the three `mint-*.element.ts` files to `mp-*.element.ts`. Use `git mv <old> <new>` followed by a search-and-replace pass on imports. Dock keeps its filename **and** its tag — both use `mint-` consistently.
