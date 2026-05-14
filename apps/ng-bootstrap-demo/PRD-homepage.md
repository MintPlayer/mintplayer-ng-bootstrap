# PRD — Demo site homepage

**Surface:** `apps/ng-bootstrap-demo/` — landing route `/`
**Status:** Proposal
**Author:** Pieterjan
**Date:** 2026-05-14

---

## 1. Problem

`/` lands on an empty `<router-outlet>`. `apps/ng-bootstrap-demo/src/app/pages/pages.routes.ts` has no entry for `''`, and there is no `HomeComponent`. The "Home" link in the navbar (`app.component.html:12`) goes nowhere meaningful.

A first-time visitor — typically an Angular developer who arrived from npm, GitHub, or a blog post — sees a blank page and has no idea what the library does, why it exists, or how to install it. The navbar lists ~120 components across five categories, but there is no curated entry point that says *"start here."*

## 2. Goals

- **G1.** A visitor who lands on `/` understands within 10 seconds: what this library is, what makes it different from vanilla Bootstrap / ng-bootstrap / Angular Material, and how to install it.
- **G2.** The page sets expectations correctly. A reader who clicks through to a demo afterwards should not be surprised by what they find (signals, OnPush, zoneless, standalone-only, Angular 21+, web components for the heavy widgets).
- **G3.** The page surfaces the library's *flagship* components — the ones a competitor's library does not have — and links directly to their demos.
- **G4.** The page visually belongs to the same family as the existing demo pages. It composes the library's own primitives (`bs-alert`, `bs-code-snippet`, `bs-grid` + `bsRow`, `bs-badge`) rather than introducing a custom layout system.
- **G5.** The page works in dark mode, light mode, and the SSR pre-paint without flashing — same as the rest of the demo.

## 3. Non-goals

- Marketing-website flourishes: animated gradients, scroll-jacked hero, parallax illustrations, testimonial carousels. The aesthetic stays consistent with the rest of the demo (centered `<h1>`, `lead` paragraph, Bootstrap typography, themed alerts).
- A search box / fuzzy component finder. The navbar already enumerates everything; reproducing it on the homepage adds maintenance burden with no benefit.
- A full API reference / migration guide / FAQ. Those belong on dedicated pages (some already exist — e.g. `/additional-samples/theming`).
- Performance benchmarks vs other libraries.
- A separate `/home` alias route. The canonical path is `/`; the navbar's "Home" link already targets `/`.

## 4. Current state

| Concern | Today |
|---|---|
| `/` route | Not defined in `pages.routes.ts` — empty `<router-outlet>` |
| HomeComponent | Does not exist |
| Navbar "Home" link | `routerLink="/"` (`app.component.html:12`) — works, lands on nothing |
| Branding | Text `ng-bootstrap` in `<bs-navbar-brand>` (`app.component.html:6-7`); no logo asset |
| Version chip | Already in navbar (`{{ versionInfo }}` → `21.34.0`) |
| Existing landing-style precedent | `apps/ng-bootstrap-demo/src/app/pages/additional-samples/theming/` — centered `<h1>`, `lead` paragraph, `bs-alert` callouts, `bs-code-snippet` blocks, anchored `<h2>` sections |

## 5. Target audience

A single primary persona, sized for the homepage:

> **Mid/senior Angular developer evaluating a UI library** for a new app or a Bootstrap-based existing app. Comfortable with signals and standalone components. Knows ng-bootstrap and Angular Material exist; wants to know why they'd pick this instead. Will skim, not read. Will form an opinion in under a minute.

Secondary: returning users looking for the install command or version. Tertiary: contributors landing on the demo from GitHub.

## 6. Content (the meat)

Six sections, in order. Each one earns its place by answering a specific question the persona is asking.

### 6.1 Hero — *"What is this?"*

- `<h1 class="text-center">@mintplayer/ng-bootstrap</h1>`
- One-sentence `lead` paragraph. Working draft:
  > "A signal-first, zoneless-ready Angular component library built on Bootstrap 5.3 — from form primitives to a full dock manager, scheduler, and ribbon."
- Version + license badges row (use `<bs-badge>` for inline labels), centered. Pull version from the existing `BOOTSTRAP_VERSION` provider already wired in `app.config.ts:9`.
- No illustrated hero / no buttons — the value pitch is in the words.

### 6.2 Why this library — *"Why not vanilla ng-bootstrap or Material?"*

A `<bs-alert [type]="colors.info">` block listing the differentiators as a short bullet list. Authoritative claims only — anything aspirational gets moved to a "Roadmap" section or dropped.

Confirmed claims to lead with (verified during PRD research):
- **Signal-first APIs.** Components expose `input()` / `model()` / `output()` / `computed()` — no RxJS Subjects on public surfaces. Saved memory: prefer `computed()` over inline template ternaries.
- **Zoneless-ready.** `provideZonelessChangeDetection()` is the demo's actual config (`app.config.ts:15`). OnPush throughout.
- **Standalone-only.** No `NgModule`s on public exports.
- **Built on Bootstrap 5.3** with first-class dark-mode + custom-variant support via `BsThemeService` (the `/additional-samples/theming` page is the canonical reference).
- **Lit 3 web components under the hood** for the heavy widgets (dock, scheduler, tile-manager, ribbon) — accessible, encapsulated, framework-agnostic at the core.
- **Tree-shakeable subpath imports** (e.g. `@mintplayer/ng-bootstrap/theming`) — each component is its own secondary entry point.
- **Per-component styles instead of one global stylesheet** — each component ships its own scoped CSS, so unused components are dropped at build time and the main bundle stays small.
- **SSR-safe.** Theming defers `DOCUMENT` / `DestroyRef` injection behind `isPlatformBrowser` (commit `efbcbda4`); pre-paint script pattern documented.
- **Angular 21+** (peer dep `^21.0.0` — `libs/mintplayer-ng-bootstrap/package.json:14-15`).

Three to five bullets max. Anything weaker than the above gets cut — the section is a magnet, not a brochure.

### 6.3 Install — *"How do I start?"*

Two `<bs-code-snippet>` blocks back-to-back:

1. **`npm install` line.** Working draft:
   ```
   npm install @mintplayer/ng-bootstrap bootstrap bootstrap-icons
   ```
   Peer deps to mention but **not** in the install line: `@angular/cdk`, `lit`, `rxjs`. Note them in a small follow-up paragraph; most users already have these.

2. **`angular.json` styles entry** — the canonical way to wire the library's Bootstrap bundle in:
   ```json
   {
     "projects": {
       "your-app": {
         "architect": {
           "build": {
             "options": {
               "styles": [
                 "node_modules/@mintplayer/ng-bootstrap/bootstrap.scss",
                 "src/styles.scss"
               ]
             }
           }
         }
       }
     }
   }
   ```
   Followed by one sentence: "Alternatively, `@forward '@mintplayer/ng-bootstrap/bootstrap';` from your `styles.scss` — useful when you want to override Bootstrap 5.3 SCSS variables (`$primary`, `$body-bg`, …) *before* the import. See [Theming](/additional-samples/theming) for the runtime story."

No "ng add" schematic is currently published, so don't mention one.

### 6.4 Flagship components — *"What can it do that the others can't?"*

A `<bs-grid>` of feature cards (use `bsRow` + `[md]="4"`, never raw `class="row"` — saved memory rule). Each card: title, one-sentence pitch, link to the demo page. Six cards, in a 3×2 grid on `md+`.

Recommended six (drawn from the Explore agent's inventory, ranked by *uniqueness vs other libraries*):

| Card | Pitch | Link |
|---|---|---|
| **Scheduler** | Day / week / month calendar with drag-drop event editing, ARIA-keyboard navigation, signal-driven data binding. Built on Lit 3 internally. | `/enterprise/scheduler` |
| **Dock manager** | VS Code-style splittable, draggable panel manager with same-layer splitter intersection glyphs. | `/enterprise/dock` |
| **Ribbon** | Microsoft-style command surface — nine item kinds, quick-access toolbar, touch mode. | `/enterprise/ribbon` |
| **Tile manager** | Windowless push-and-reflow tiling layout. Alternative to dock for dashboard shells. | `/enterprise/tile-manager` |
| **Datatable** | CDK virtual-scroll-backed table with pagination, selection, and resizable columns; one signal-driven data contract. | `/enterprise/datatables` |
| **Theming** | Live light / dark / `auto` + custom variants like `sepia`, all via a single signal-based service. SSR-safe. | `/additional-samples/theming` |

Each card uses Bootstrap's `card` classes inside the `bsRow` columns. No custom CSS. Title as `<h3>`, body as `<p class="small text-muted">`, footer as a routerLink to the demo.

### 6.5 Quickstart usage example — *"Show me what code looks like."*

One `<bs-code-snippet [language]="'ts'">` block with a minimal, realistic component using the library. Working draft: a standalone component that imports `BsAlertComponent` + `BsButtonTypeDirective` + the theme service, demonstrating the signal-input style. Keep it under 25 lines.

This single snippet is the conversion lever — if a reader copy-pastes it and it works, they keep going.

### 6.6 Where to next — *"Where do I go?"*

A compact `<dl class="row">` (matches the theming page's API-reference styling — `theming.component.html:220-246`):

- **Browse components** → `/basic`
- **Overlays** → `/overlays`
- **Power widgets** → `/advanced`
- **Theming guide** → `/additional-samples/theming`
- **GitHub** → external link, existing icon already in the navbar
- **NPM** → external link to the package

No need to enumerate everything — the navbar does that.

## 7. Implementation

### Files to add

- `apps/ng-bootstrap-demo/src/app/pages/home/home.component.ts`
- `apps/ng-bootstrap-demo/src/app/pages/home/home.component.html`
- `apps/ng-bootstrap-demo/src/app/pages/home/home.component.scss` (likely empty — Bootstrap utilities cover everything)

### Files to modify

- `apps/ng-bootstrap-demo/src/app/pages/pages.routes.ts` — add `{ path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) }` as the **first** entry so deep-link priority is preserved.

### Imports the component pulls in

- `BsAlertComponent` from `@mintplayer/ng-bootstrap/alert`
- `BsBadgeComponent` from `@mintplayer/ng-bootstrap/badge`
- `BsCodeSnippetComponent` from `@mintplayer/ng-bootstrap/code-snippet`
- `BsGridComponent` + `BsGridRowDirective` + the column-sizing directives from `@mintplayer/ng-bootstrap/grid`
- `Color` enum from `@mintplayer/ng-bootstrap`
- `RouterLink` for the in-app links
- `BOOTSTRAP_VERSION` injection token (already provided in `app.config.ts:34`) to render the version chip

### Code style

- `ChangeDetectionStrategy.OnPush` (saved memory rule + library-wide convention).
- All template-derived strings (install command, code snippet) live in `readonly` fields with `dedent` — match the theming page's pattern (`theming.component.ts:60-115`).
- No `forEach` / no imperative iteration (saved memory rule). The feature-card grid uses an array + `@for`.
- No emojis in code or in the page copy.

## 8. Acceptance criteria

1. Navigating to `http://localhost:4200/` (and clicking the navbar "Home" link from any deep page) renders the homepage — not an empty viewport.
2. The page renders correctly under both light and dark mode without flashing.
3. The page renders correctly under SSR (`waitForLoadState('networkidle')` after goto, per saved e2e rule).
4. Every card / link on the page routes to an existing page that loads without console errors.
5. The install snippet copies the correct command to the clipboard when the copy button is clicked.
6. The flagship feature claims in §6.2 each correspond to a *real, demonstrated* capability somewhere in the library — no aspirational marketing.
7. No raw `class="row"` / `class="col-*"` in the template; all grid usage goes through `<bs-grid>` + `[bsRow]` (saved memory rule).
8. No `forEach`; no inline-template ternary that should be a `computed()`.

## 9. Resolved decisions

- **D1. Logo.** Ship without a logo asset. The text wordmark in the navbar (`app.component.html:6-7`) is the brand. Revisit later if a logo is designed.
- **D2. Hero pitch.** Use:
  > *"A signal-first, zoneless-ready Angular component library built on Bootstrap 5.3 — from form primitives to a full dock manager, scheduler, and ribbon."*
- **D3. Flagship grid.** Six cards (3×2 on `md+`). Non-negotiable — six is what represents the library's scope; trimming to three undersells it.
- **D4. Install story.** Stays inline in §6.3. No separate "Getting started" page in this scope.
