# PRD — Angular-only components → headless cores + four fronts (issue #455)

Status: **draft** (2026-11-01). It depends on #452 (`docs/prd/per-component-styles-452.md`) and starts after
#452 merges.

## 1. Problem

Invariant 3 says every component is one framework-neutral core in `@mintplayer/ui-core`, consumed by Angular,
React, Vue and Lit fronts. 33 UI components break it today: they exist only in `@mintplayer/ng-bootstrap`.
None has a ui-core core or a React/Vue front. Only `badge` has a Lit element, and it is hand-written. So
React and Vue users have no alert, modal, toast, tooltip, table, ….

#452 hand-stamps these components with `data-mps` and gives them part installs, as an interim step. This
work replaces that step with generated fronts.

## 2. Inventory (measured on master, 2026-11-01)

The LOC columns count Angular TypeScript only, excluding specs.

**Tier A — presentational, no behaviour beyond inputs** (10–80 LOC each):

| Component | Partial |
|---|---|
| alert | alert, close |
| badge | badge |
| breadcrumb | breadcrumb |
| button-group | button-group |
| close | close |
| container | containers |
| list-group | list-group |
| placeholder | placeholders |
| progress-bar | progress |
| spinner | spinners |
| table | tables |
| navbar-toggler | navbar |
| sticky-footer | — |
| marquee | — |
| parallax | — |

**Tier B — form layout, mostly attribute directives** (40–110 LOC each):

| Component | Partial |
|---|---|
| grid: `bs-grid`, `bsRow`, `[col]`/`[md]`…, `[bsColFormLabel]` | grid |
| form | forms |
| floating-labels | forms |
| range | forms |

**Tier C — overlays** (140–440 LOC each). They need focus management, stacking and dismissal.

| Component | Partial |
|---|---|
| modal | modal, transitions |
| offcanvas | offcanvas, modal |
| popover (`bs-popover` + directive) | popover, transitions |
| tooltip (`bs-tooltip` + `*[bsTooltip]`) | tooltip |
| toast + toast-container | toasts, transitions |
| dropdown (`[bsDropdown]`, `[bsDropdownToggle]`, `[bsDropdownMenu]`) | dropdown |
| context-menu | dropdown |

**Tier D — complex interactive** (150–740 LOC each):

| Component | Partial |
|---|---|
| color-picker | — |
| rating | — |
| resizable | — |
| priority-nav | — |
| scrollspy | nav |
| file-upload | forms |
| calendar-month | — |

**Reusable ui-core infrastructure that already exists:** `overlay`, `focus`, `roving`, `announce`,
`store`, `async`, `drag`, `scoped-styles`, and the cores `dropdown-menu` and `calendar`.

## 3. Design questions (resolve before tier A starts)

1. **Attribute directives.** `[bsDropdown]`, `*[bsTooltip]`, `[bsColFormLabel]`, `bsRow`/`[col]` and the
   popover directive decorate a *consumer's* element. The D10 compiler only generates components. Options:
   - (a) The compiler learns a `kind: 'directive'` manifest that emits an Angular directive, a Vue custom
     directive (`v-bs-tooltip`), a React hook (`useBsTooltip(ref, opts)`) and a Lit element-part
     directive.
   - (b) The core stays headless and each front's directive or hook is a hand-written extension file.
   - (c) Replace the directives with components (`<bs-tooltip-trigger>`). This is a breaking change, and it
     adds a wrapper element, which is awkward for `[col]` on a grid cell.

   **Proposal: (a) for tooltip, popover and dropdown; (b) for the grid classes.** The grid directives are
   pure class mapping with no state, so a shared `gridClasses(opts)` function in ui-core is the core, and
   each front applies it.
2. **Overlap with existing cores.**
   - Angular `dropdown` overlaps the `dropdown-menu` core. Proposal: fold it in, so the directive becomes a
     thin trigger over the existing core.
   - `calendar-month` overlaps the `calendar` core. Proposal: fold it in or delete it, after checking who
     uses it.
3. **Overlays.** Modal, offcanvas, popover, tooltip and toast share stacking, focus trap and return,
   Escape and backdrop behaviour.
   - Proposal: one ui-core `overlay-stack` core that each overlay core composes. It replaces the Angular
     `a11y` overlay-stack and overlay-focus services.
   - Server rendering: the closed state is rendered and inert (tier 2 under no-JS). A modal shown at load
     is rendered open.
4. **Template-driven content.** A modal body or a toast's content is consumer content. It comes in through
   slots in every front (`<ng-template>` directive, render prop, scoped slot, `slot=`), never a render
   callback (`CLAUDE.md`). A toast created imperatively (`toastService.show(template)`) needs a
   framework-specific service over a framework-neutral toast queue core.
5. **Angular API breaks.** These are allowed when documented. Each tier lists its breaks in the PR
   description and in the library README's changelog section.

## 4. Per-component definition of done

Every component in the scope must have all of the following:

- a D10 source: core + `.view.vue` + manifest, with `style: { scope, bootstrap: [...] }`;
- generated Angular, React, Vue and Lit fronts, with no hand-written front left (Angular extension files
  only where `CLAUDE.md` allows them);
- the Angular `data-mps` hand-stamping and part install from #452 removed, because the compiler now does both;
- a demo page in all three demos (demo first, snippet second), with the keymap documented where there is
  any interaction;
- a `*.aria.spec.ts` asserting roles, names and *states*, plus the passthrough conformance for `aria-*`,
  `id` and `tabindex`;
- the no-JS tier declared in the class comment and checked with JS off;
- the conformance import lists (`no-custom-elements-in-fronts`, the scoping specs) extended in the same
  commit.

## 5. Delivery

The owner's rule is one PR per task, and the split is the owner's decision. Proposal:

| PR | Tiers | Why |
|---|---|---|
| 1 | A + B | Small and mechanical. It also proves the directive approach (§3.1) on the grid, and lands the `kind: 'directive'` compiler support if (a) is chosen. |
| 2 | C | Overlays. It lands the shared `overlay-stack` core first, then modal → offcanvas → toast → popover → tooltip → dropdown → context-menu. |
| 3 | D | Each is independent, so it can be split further if one grows. |

**Acceptance for every PR:**

- `nx run mintplayer-ui-core:compile-components-check` is clean.
- The bundle gate from #452 still holds: no component CSS in any app's global stylesheet, and only the
  shell in initial JS.
- The unit and e2e sweep runs once, at the end of each PR.

## 6. Out of scope

Non-UI Angular entries stay Angular-only. These are pipes and utilities: `copy`, `enum`, `for`, `has-id`,
`has-property`, `in-list`, `instance-of`, `let`, `linify`, `markdown`, `ordinal-number`, `slugify`,
`split-string`, `trust-html`, `uc-first`, `user-agent`, `viewport`, `word-count`, `observe-size`,
`enhanced-paste`, `no-noscript`, `navigation-lock`, `font-color`, `button-type` and `a11y`. Where React or
Vue need an equivalent, it is a separate request.
