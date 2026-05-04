# PRD: Pagination Ellipsis Support

## Problem

When `<bs-datatable>` has many pages (e.g. 1000), the `<bs-pagination>` component renders all page numbers, making the table extremely wide. The existing `numberOfBoxes` input truncates the visible window but does **not** show ellipsis indicators or anchor pages (first/last), so users lose orientation within the page range.

## Current State — Half-Built Feature

The ellipsis feature was clearly started but left incomplete. All the scaffolding is in place:

| Asset | Location | Status |
|-------|----------|--------|
| `numberOfBoxes` input | `pagination.component.ts:17` | **Working** — limits visible boxes; `0` = show all |
| `PageNumberType` | `page-number.type.ts:1` | **Ready** — already a union: `number \| '...'` |
| `PageWithSelection` | `page-with-selection.ts:3` | **Ready** — uses `PageNumberType` for `page` field |
| Template ellipsis guard | `pagination.component.html:12` | **Broken** — checks `pageNumber.page != '...'` but renders an empty `<li>` instead of a visible ellipsis box |
| `isLeftOverflow` / `isRightOverflow` | `pagination.component.ts:40-57` | **Unused** — computed signals that detect overflow but are never referenced |
| Commented-out demo | demo `pagination.component.html:23-27` | **Incomplete** — has `[numberOfBoxes]="9"` and a dangling `[]` attribute |

### What needs to be finished

1. The `shownPageNumbers()` computed signal does simple windowing — it never inserts `'...'` entries or pins first/last anchors.
2. The template renders an empty `<li>` for `'...'` entries (no visible ellipsis text, no `disabled` class).
3. The datatable does not pass `numberOfBoxes` to its page-navigation pagination instance.

## Two Usage Modes

The `<bs-pagination>` component is mode-agnostic — it renders whatever `pageNumbers` array it receives. In practice there are two distinct usage patterns:

### Mode A — Sequential page numbers (page navigation)

```
pageNumbers = [1, 2, 3, 4, ..., 99, 100]
showArrows = true
```

Used in `<bs-datatable>` footer (right side) and standalone pagination demos. This is the mode that benefits from ellipsis and anchoring.

### Mode B — Arbitrary page-size values (per-page selector)

```
pageNumbers = [10, 20, 50, 100, 200, 500, 1000]
showArrows = false
```

Used in `<bs-datatable>` footer (left side) as an items-per-page picker. Typically has fewer than 10 values, so ellipsis is rarely needed. The algorithm must still work correctly — it operates on array indices, not on the semantic meaning of the numbers.

## Requirements

### No new inputs needed

The existing `numberOfBoxes` input is sufficient. When `numberOfBoxes > 0`, the component will now show ellipsis and pin first/last anchors automatically. When `numberOfBoxes` is `0` (the default), all pages are shown — no change in behavior.

### Box allocation algorithm

When `numberOfBoxes > 0`, the component must decide which page numbers to show within the budget. The budget is `numberOfBoxes` (or `numberOfBoxes - 2` when `showArrows` is `true`, matching the existing `visibleNumberOfNumberBoxes` logic).

Let `B` = effective budget of number boxes (after deducting arrows).

**Allocation priority** (the order in which slots are filled as `B` increases):

| Priority | Action | Rationale |
|----------|--------|-----------|
| 1 | Always show the **selected page** | User must see where they are |
| 2 | Add pages **immediately left** of selected | Context around current position |
| 3 | Add pages **immediately right** of selected | Context around current position |
| 4 | Pin the **first page** (index 0) + left ellipsis | Orientation anchor — user can jump to start |
| 5 | Pin the **last page** (last index) + right ellipsis | Orientation anchor — user can jump to end |
| 6 | Continue expanding left/right neighbors alternately | Fill remaining budget |

Ellipsis entries (`'...'`) consume one slot each in the budget. They appear between the anchor and the neighbor window when there is a gap of **2 or more** omitted pages. If the gap is exactly 1 page, show that page instead of an ellipsis (showing `1 2 3` is better than `1 ... 3`).

### Rendering examples (sequential pages 1–100, selected = 50, effective budget shown)

| Budget | Rendered boxes |
|--------|---------------|
| `0` | `1 2 3 ... 100` (all) |
| `5` | `1 ... 50 ... 100` |
| `7` | `1 ... 49 50 51 ... 100` |
| `9` | `1 ... 48 49 50 51 52 ... 100` |
| `11` | `1 ... 47 48 49 50 51 52 53 ... 100` |
| `13` | `1 ... 46 47 48 49 50 51 52 53 54 ... 100` |

Note: extra budget goes to expanding the inner neighbor window, not to expanding anchor segments. This maximizes context around the selected page.

#### Edge cases — selected near boundaries (pages 1–100, budget = 9)

| Selected | Rendered |
|----------|----------|
| `1` | `1 2 3 4 5 6 7 ... 100` |
| `2` | `1 2 3 4 5 6 7 ... 100` |
| `5` | `1 2 3 4 5 6 7 ... 100` |
| `6` | `1 ... 4 5 6 7 8 ... 100` |
| `95` | `1 ... 93 94 95 96 97 ... 100` |
| `99` | `1 ... 94 95 96 97 98 99 100` |
| `100` | `1 ... 94 95 96 97 98 99 100` |

#### Edge case — small page count (pages 1–5, numberOfBoxes = 9)

| Selected | Rendered |
|----------|----------|
| `3` | `1 2 3 4 5` |

Budget exceeds page count — show all, no ellipsis.

#### Edge case — page-size mode ([10, 20, 50, 100, 200, 500, 1000], numberOfBoxes = 5, selected = 100)

| Rendered |
|----------|
| `10 ... 100 ... 1000` |

The algorithm treats these as indices, same as sequential pages.

### Template changes

Update the existing broken ellipsis rendering to show a **disabled, non-clickable** ellipsis box:

```html
@if (pageNumber.page === '...') {
    <a class="page-link disabled" aria-disabled="true">
        <span aria-hidden="true">&hellip;</span>
        <span class="visually-hidden">More pages</span>
    </a>
} @else {
    <a class="page-link" href="" (click)="onSelectPage($event, pageNumber.page)" [class.active]="pageNumber.selected">
        {{ pageNumber.page }}
        @if (pageNumber.selected) {
            <span class="visually-hidden">(current)</span>
        }
    </a>
}
```

### Datatable integration

Add `pageNumberOfBoxes` to `DatatableSettings` so consumers can configure it. Default to `11`. Pass it to the page-navigation pagination instance (right side) in `datatable.component.html`. The per-page selector (left side) remains unchanged.

## Implementation Plan

### Step 1 — Rewrite `shownPageNumbers()` computed signal

Replace the current windowing logic with the ellipsis-aware allocation algorithm.

### Step 2 — Update the template

Fix the broken `'...'` rendering to show a visible, disabled ellipsis box with proper accessibility.

### Step 3 — Clean up unused overflow signals

Remove `isLeftOverflow()` and `isRightOverflow()` — the new `shownPageNumbers()` handles everything internally.

### Step 4 — Integrate with datatable

Add `pageNumberOfBoxes` to `DatatableSettings` (default `11`). Pass it to the page-navigation pagination.

### Step 5 — Update demos

Uncomment and fix the "Show ellipsis" demo section. Add a large page range demo (e.g. 1000 pages).

## Out of Scope

- Keyboard navigation within the pagination
- "Jump to page" input field
- Responsive breakpoint-based `numberOfBoxes`
- Custom ellipsis templates

## Backward Compatibility

- `numberOfBoxes` defaults to `0` (show all) — **existing consumers see zero change**
- Consumers already using `numberOfBoxes` will now get ellipsis + anchors instead of plain windowing — this is strictly an improvement
