# PRD — Demo-app `<bs-code-snippet>` coverage

**Surface:** `apps/ng-bootstrap-demo/src/app/pages/**` — every demo page route
**Status:** Proposal
**Author:** Pieterjan (audit by 4-agent demo-coverage team)
**Date:** 2026-05-17

---

## 1. Problem

The demo site is the library's primary documentation. A visitor lands on a page like `/basic/datepicker`, sees a working datepicker, and — in the overwhelming majority of cases — has no idea how to reproduce it in their own app. There is no companion snippet they can copy.

Only a handful of pages pair their live demos with `<bs-code-snippet>`. The rest expect the reader to either inspect the demo's source on GitHub, guess from the live DOM, or read the d.ts of the corresponding library entry point. That's a documentation gap, not a stylistic one: the library *has* a copy-ready snippet component (`bs-code-snippet`), the homepage / theming / file-manager pages prove the pattern works well, but it has not been applied uniformly.

A 4-agent audit across all ~85 demo pages quantified the gap (see §4). 9 pages are **FULL**, 5 are **PARTIAL**, and **~70 pages have no snippet at all**. The component is good; the coverage is not.

## 2. Goals

- **G1.** Every live demo on a documentation page has an accompanying `<bs-code-snippet>` showing the minimum HTML (and TypeScript when the demo's behavior depends on it) required to reproduce that demo in a consumer app.
- **G2.** The pattern is uniform across pages — same anchor (`[codeToCopy]` + `[language]`), same field naming (`snippetXxx`), same placement (snippet *directly under* the live example or `<h2>/<h3>` it documents), so a contributor adding a new demo has one obvious template to follow.
- **G3.** Snippets are *copy-and-run*, not *copy-and-edit*. A consumer pasting the snippet into a fresh component should get a working example, including the `imports:` line where relevant.
- **G4.** Snippet content is authored as `dedent\`...\`` template strings on the component class (already the convention — see `theming.component.ts:60`), so they live in version control, get type-checked, and don't drift from the live example silently.
- **G5.** Flagship / enterprise components get the deepest coverage (multiple snippets covering common variations); simple primitives get a single representative snippet.

## 3. Non-goals

- A full API reference for every input/output/event. The demo page shows behavior; the snippet shows usage. API surface is out of scope and belongs to the per-component README / TS docstrings.
- An interactive playground (StackBlitz / Plunker embeds). The copy button on `<bs-code-snippet>` is sufficient; a playground is its own track.
- Rewriting demos. This PRD is **additive** — existing demos stay as they are; snippets are added next to them.
- i18n of snippet captions. English-only, same as the rest of the demo.
- Snippet coverage for pure-logic libraries (no demo page) — `mintplayer-dijkstra`, `mintplayer-encode-utf8`, etc.
- Snippet coverage for pages that have no `.component.html` of their own (e.g. `home`, `not-found`, route-only containers like `containers/`, `pipes/`).

## 4. Current state (audit results)

The audit walked every `*.component.html` under `apps/ng-bootstrap-demo/src/app/pages/**` and counted `<bs-code-snippet>` occurrences vs. visible "demo blocks" (live example + heading).

**Coverage summary**

| Category | Meaning | Page count |
|---|---|---|
| **FULL** | Every visible example has a paired snippet | 9 |
| **PARTIAL** | Some examples have snippets, others don't | 5 |
| **NONE** | No `<bs-code-snippet>` anywhere on the page | ~70 |

**FULL — keep as reference**

| Page | Snippets | Notes |
|---|---|---|
| `home` | 4 | Install, `angular.json`, `styles.scss`, quickstart |
| `additional-samples/theming` | 6 | SCSS overrides, runtime CSS vars, service, pre-boot script, adaptive navbar, custom variant |
| `additional-samples/collapse` | 3 | Module / HTML / TS triplet, single demo |
| `enterprise/file-manager` | 8 | Integration guide: ops, upload, dialog resolver, conflict, lazy tree, i18n, permissions, errors |
| `enterprise/ribbon` | 7 | Minimal, split-button, value items, contextual, QAT, theming, slot icons |
| `advanced/async-host-binding` | 2 | One snippet per demo block |
| `advanced/code-snippet` | 1 | Self-referential — shows how to use itself |

**PARTIAL — fill the gaps**

| Page | Snippets / Examples | What's missing |
|---|---|---|
| `basic/forms/multi-range` | 16 / 9 | Already deepest coverage in the repo; verify each variant has its own snippet (basic, 3-thumb, minDistance, currency, vertical, RTL, disabled, reactive) |
| `basic/forms/checkbox` | 14 / 7 | Verify reactive + non-adjacent (table) variants are covered |
| `basic/forms/radio` | 8 / 4 | Verify toggle-button variant has a snippet |
| `basic/icon` | 4 / 2 | Snippets cover setup; add usage snippets |
| `advanced/pipes/has-property` | 1 / 1 | Other pipe sub-pages (in same `pipes/` folder) have zero — see §6 |

**NONE — primary scope of this PRD** — ~70 pages. Full breakdown in §6.

## 5. Proposed pattern

Codified from the existing FULL pages (`theming`, `home`, `file-manager`, `ribbon`).

### 5.1 Template anchor

Place a `<bs-code-snippet>` **directly under** each `<h2>` / `<h3>` example heading, between the explanatory paragraph and the live example. The "snippet-then-demo" order matches how a reader scans the page (read the code, see it run).

```html
<h2 id="basic-usage">Basic usage</h2>

<p>Short paragraph explaining the example.</p>

<bs-code-snippet [codeToCopy]="snippetBasicUsage" [language]="'html'"></bs-code-snippet>

<!-- live example below -->
<bs-datepicker [(ngModel)]="date"></bs-datepicker>
```

Where the demo has both HTML and TS that the reader needs, emit two snippets in order: HTML first, TS second.

### 5.2 Component-class field naming

```ts
import { dedent } from 'ts-dedent';

@Component({ /* ... */ })
export class DatepickerComponent {
  protected readonly snippetBasicUsage = dedent`
    <bs-datepicker [(ngModel)]="date"></bs-datepicker>
  `;

  protected readonly snippetWithBounds = dedent`
    <bs-datepicker
      [(ngModel)]="date"
      [minDate]="today"
      [maxDate]="oneMonthAhead">
    </bs-datepicker>
  `;
}
```

Conventions, all already used by the FULL pages:

- `protected readonly snippet<PascalCaseName>` — `protected` keeps it out of the public API, `readonly` prevents mutation, `snippet` prefix groups them in IDE outline.
- `dedent\`...\`` from `ts-dedent` (already a workspace dep — `theming.component.ts:7`) — strips leading whitespace so the rendered snippet is flush-left regardless of indentation in source.
- `[language]` is always passed explicitly as `'html'`, `'ts'`, `'scss'`, or `'json'`. Don't rely on highlight.js auto-detection — it misfires on short HTML snippets.

### 5.3 What to include in a snippet

- **HTML snippets**: the markup the consumer needs, plus any directly-referenced `[input]` bindings. If the binding's value matters (e.g. `[minDate]="today"`), include the field declaration as a `// in component:` comment beneath, or split out a TS snippet.
- **TS snippets**: the imports line for the entry point being demoed (`import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';`), the standalone-component `imports:` array fragment, and any signal/field declarations the HTML depends on. Skip `@Component` boilerplate the reader already knows.
- **What to omit**: page-specific scaffolding (`<bs-grid>` / `bsRow` from the demo layout — unless the example *is* about the grid), `class="mb-3"` spacing, demo-only event-log code, anything wrapped in `@if (showFor === ...) { }` conditionals.

### 5.4 Self-check: does the snippet *run*?

A snippet is broken if a reader can't paste it into a fresh standalone component and see the same result. Before committing, the author copy-pastes their own snippet into a scratch component and confirms it compiles and renders.

## 6. Scope — per-section plan

Pages are ordered by **traffic value** (flagship components first; primitives next; rarely-used utilities last) within each section. This is a tracking list, not a phasing plan — there's no v1/v2 split, snippets get added in PRs as authors pick up pages.

### 6.1 `basic/` — Bootstrap primitives (24 pages)

Highest reader-volume section. Every page needs at least one HTML snippet.

| Page | Priority | Suggested snippets |
|---|---|---|
| `forms/select` | High | Single-value, multiple, template option |
| `forms/datetime-picker` | High | Minimal, reactive, bounds, disabled weekends, step, hour12 |
| `forms/floating-labels` | High | Email, password |
| `forms/input-group` | High | Prefix/suffix, button add-on |
| `forms/range` | High | Single, with disabled toggle |
| `datepicker` | High | Single, with disable callback |
| `timepicker` | High | With/without seconds |
| `calendar` | Medium | Default, keyboard model |
| `carousel` | High | Basic, autoplay, indicators/controls |
| `containers/accordion` | High | Single-level, multi-level, multi-open |
| `containers/card` | High | Simple, header/footer, list-group, images, colors, groups, tabs, pills — ~8 snippets (this page has 15 demos) |
| `containers/grid` | High | Flex columns, explicit size, minimum size |
| `containers/tab-control` | High | Basic, configurable orientation |
| `table` | High | Responsive, striped/bordered |
| `pagination` | Medium | Basic, capped, near-edge, uncapped — group the 8 demos into 3–4 snippets |
| `treeview` | High | Data-driven, keyboard |
| `progress-bar` | Medium | Simple, striped, animated, stacked, infinite |
| `spinner` | Low | Border, grow |
| `alert` | Medium | Static, dismissible, list with add |
| `badge` | Low | Basic, on heading |
| `breadcrumb` | Low | Basic |
| `button-group` | Medium | Basic, vertical, toolbar |
| `close` | Low | Basic |
| `color-picker` | Medium | Basic |
| `for-directive` | Medium | Template-driven form |
| `list-group` | Medium | Basic, with badges |
| `marquee` | Low | Basic |
| `placeholder` | Low | Basic |
| `rating` | Medium | Basic |

### 6.2 `advanced/` — directives & utilities (26 pages)

These exist because there's a non-obvious API. They are the section most in need of snippets — a reader who lands on `/advanced/autofocus` cannot guess from the demo alone how the directive attaches.

| Page | Priority | Suggested snippets |
|---|---|---|
| `autofocus` | High | Directive on input |
| `copy` | High | `[bsCopy]` directive, with template |
| `file-upload` | High | Drag-drop, button-triggered |
| `instance-of` | High | `bsInstanceof` on `@if` |
| `is-interface` | High | `bsIsInterface` discriminator |
| `lazy-loading` | High | `@defer` integration |
| `markdown` | High | Editor + viewer |
| `navigation-lock` | High | Form-aware lock, master-detail |
| `navigation-lock-master-detail` | High | Master-detail flow |
| `ordinal-number` | Medium | Pipe usage |
| `parallax` | Medium | Directive on container |
| `pipes/*` (7 sub-pages) | High | One snippet per pipe (currently only `has-property` covered) |
| `priority-nav` | High | Responsive nav with overflow |
| `resizable` | High | Directive on container |
| `scrollspy` | High | Page-scope, inside modal |
| `searchbox` | High | Basic |
| `select2` | High | Default, custom template |
| `signature-pad` | High | Basic, with reset |
| `splitter` | High | Horizontal, vertical |
| `sticky-footer` | Medium | Layout pattern |
| `toggle-buttons` | High | Navbar toggler, playlist |
| `track-by` | Medium | Performance pattern |
| `user-agent` | Medium | Service usage |
| `viewport` | High | Directive with breakpoints |

### 6.3 `enterprise/` — flagship widgets (8 pages, 2 already FULL)

Highest per-page snippet density. These are the components a consumer is most likely to pay attention to and most likely to need integration guidance for.

| Page | Status | Suggested snippets |
|---|---|---|
| `datatables` | NONE | Basic, sorting, pagination, virtual-scroll, custom cell templates, selection model — ~6 snippets |
| `dock` | NONE | Layout JSON, panel content slot, persistence, programmatic dock/undock, keyboard model — ~5 snippets |
| `file-manager` | **FULL** | Already covered |
| `otp-input` | NONE | Classic 6-digit, PIN, Office key (grouped), Windows key, sizes, validation — 6 snippets |
| `query-builder` | NONE | Basic tree, evaluator, custom field, JSON wire format (see `feedback_json_wire_format_only`) — 4 snippets |
| `ribbon` | **FULL** | Already covered |
| `scheduler` | NONE | Week / month / year view, controlled selection, custom event renderer — 5 snippets |
| `tile-manager` | NONE | Layout, drag/resize, persistence, programmatic tile add — 4 snippets |

### 6.4 `overlay/` — popups & dialogs (11 pages, all NONE)

Coverage of the overlay section is **0%**. Every page needs at least a basic snippet.

| Page | Priority | Suggested snippets |
|---|---|---|
| `modal` | High | Basic, with form, custom size |
| `offcanvas` | High | Side, nested |
| `popover` | High | 4 positions |
| `tooltip` | High | 4 positions, html content |
| `dropdown` | High | Basic, with template |
| `context-menu` | High | Basic, dynamic items |
| `multiselect-dropdown` | High | Basic, header/footer template |
| `shell` | High | Sidebar layout |
| `toast` | High | Service.show(), action button |
| `typeahead` | High | Basic, async source |

### 6.5 `animations/` (3 pages) + `additional-samples/` (9 pages, 2 already FULL)

| Page | Section | Status | Suggested snippets |
|---|---|---|---|
| `color-transition` | animations | NONE | Directive on element |
| `fade-in-out` | animations | NONE | `[fadeInOut]` |
| `slide-up-down` | animations | NONE | Reactive, `*ngIf` |
| `anchor-scrolling` | additional | NONE | Routerlink with fragment |
| `collapse` | additional | **FULL** | Already covered |
| `drag-drop` | additional | NONE | Task-board pattern |
| `focus-trap` | additional | NONE | Modal with trap |
| `qr-code` | additional | NONE | Basic |
| `select2-drag-drop` | additional | NONE | Sortable select |
| `stepper` | additional | NONE | Linear/non-linear × horizontal/vertical — 4 snippets |
| `swiper` | additional | NONE | Basic carousel |
| `theming` | additional | **FULL** | Already covered |

## 7. Acceptance criteria

A page is "done" when:

1. Every `<h2>` / `<h3>` example heading on the page has at least one `<bs-code-snippet>` between the heading paragraph and the live example.
2. Each snippet renders correctly in the demo (no `highlight.js` "unknown language" fallback — `[language]` is always set explicitly).
3. Each snippet is *copy-and-run*: the author has manually verified it compiles in a fresh standalone component.
4. Snippet field naming matches the convention in §5.2 (`protected readonly snippet<Name>`, `dedent\`...\``).
5. The page still renders without console errors on both light and dark mode (smoke test).

## 8. Out of scope

- Conversion of existing FULL pages to a different snippet pattern. They already work; leave them alone.
- StackBlitz embeds.
- Per-snippet "Edit on GitHub" link (could be a follow-up — see §10).
- A `<bs-code-snippet>` API change to auto-detect language. Auto-detect already happens via `onHighlighted` for the offcanvas badge but is not reliable enough to drop `[language]` from authoring.
- Visual restyling of `bs-code-snippet`. The existing visuals carry over.
- New page creation. This PRD is about coverage on existing pages.

## 9. Risks

- **Snippet drift.** Snippet strings are decoupled from the live demo's actual template. If the live demo changes, the snippet won't track automatically. Mitigation: §7.3 (manual verification) + a contributor checklist in the PR template. A future automated check (e.g. a vitest spec that asserts `snippetBasicUsage` parses as a known fragment of the page's own `.component.html`) is possible but out of scope here.
- **PR fragmentation.** ~70 pages is a lot of PR work. Mitigation: this PRD is explicitly a tracking doc; pages get filled in opportunistically as authors touch them, not all at once. The §6 tables let any contributor pick up the next page without coordination.
- **Snippet weight on the page.** Many snippets per page (e.g. `containers/card` ~8) increases scroll length. Mitigation: `<bs-code-snippet>` is collapsible (offcanvas-style preview already exists per `code-snippet.component.ts:25`) — verify long pages still feel scannable.

## 10. Open questions

- Should snippets include the `imports:` array fragment for standalone components? It bloats simple snippets but is genuinely needed for first-time readers. *Suggested:* include for the page's **first** snippet only (acts as the "how do I import this component" reference), omit for subsequent variant snippets that just change inputs.
- Should we add a small "Edit on GitHub" link next to each `<bs-code-snippet>` (deep-linking to the demo's `.component.ts` field at the right line)? Useful for readers who want to see the full example wired up. *Out of scope for this PRD* — log as a follow-up if the per-page work proves the appetite.
- For the `pipes/` sub-pages, the parent route is a container. Should each pipe demo live on its own route (status quo) or roll up to a single `/advanced/pipes` page with a pipe-by-pipe section list? *Suggested:* keep status quo; per-pipe routes match the rest of the section's structure.

---

## Appendix A — Audit methodology

A 4-agent team (one per section, in parallel) walked every `*.component.html` under `apps/ng-bootstrap-demo/src/app/pages/**`, counted `<bs-code-snippet>` occurrences vs. visible "demo blocks" (live example + heading), and classified each page as FULL / PARTIAL / NONE. Results in §4 + per-page tables in §6.

## Appendix B — Reference pattern (verbatim from `theming.component.html:33`)

```html
<bs-code-snippet [codeToCopy]="scssOverridesSnippet" [language]="'scss'"></bs-code-snippet>
```

```ts
// theming.component.ts:60
protected readonly scssOverridesSnippet = dedent`
  // your-app/src/styles.scss
  $primary: #ff5722;
  $body-bg:  #fafafa;
  @import "@mintplayer/ng-bootstrap/scss/index";
`;
```
