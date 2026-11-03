# PRD + plan — one mechanism for every component: sub-elements styled by the import alone, every front generated (issue #458, absorbs #455)

Status: **decisions locked (grill, 2026-11-03); spikes S1–S8 read (§5.1); next: M1.** Base: `master` after #456 (the #452 squash,
`54792702`).

This PRD amends three documents:
- `docs/prd/per-component-styles-452.md` §3.2.4, the "accepted limitation";
- `docs/prd/angular-only-to-d10.md` (#455), which this PRD **supersedes**, keeping its inventory (§2) and
  definition of done (§4);
- `CLAUDE.md`, as listed in §4.8.

`docs/prd/navbar-noscript.md` stays the no-JS contract for the navbar and dropdowns.

Read `CLAUDE.md` INVARIANTS 1–5 and `docs/styles-mechanism.md` first.

## 1. Goal

1. **The import is enough.** A consumer imports the component, as always. Every class the component's
   Bootstrap partial styles is styled when it sits inside that component. No `useBootstrap(...Page)` and
   no extra directive to remember.
2. **One mechanism.** Every UI component is a D10 source (core + `.view.vue` + manifest). The compiler
   generates all four fronts from it. That covers:
   - the hand-written fronts;
   - the shadow-root Lit elements;
   - the Angular-only components.

   No hand-written front, no shadow root, no `_styles` copy and no page-variant install remains inside
   a component. Breaking changes are accepted and documented.

```html
<bs-form>                                   <!-- import BsFormComponent: nothing else -->
  <label class="form-label">Name</label>    <!-- styled -->
  <input bsFormControl>
  <div class="form-text">Shown to others</div>
</bs-form>
<bs-table><tr class="table-active">…</tr></bs-table>   <!-- styled -->
<div bsModalHeader><h5 class="modal-title">…</h5></div> <!-- styled -->
```

Non-goals:
- Raw Bootstrap markup **outside** any component, such as a plain `<a class="nav-link">` in an app's side
  menu. That stays the `…Page` case of #452 §3.6.
- The non-UI Angular entries (pipes and utilities, #455 §6). They stay Angular-only.

## 2. Problem (measured on master)

### 2.1 Sub-elements

`tools/scripts/lib/scope-bootstrap.mjs` guards the leftmost owned compound, turning `.form-label` into
`.form-label:where([data-mps])`. Every element a library template renders is stamped, across a whole
family: a D10 group shares one scope (S15), and the modal's sections all stamp `"modal"`. But a
sub-element **written in the consumer's template and projected in** is not stamped. It behaves like
Angular's emulated encapsulation without `::ng-deep`. Before #452 these elements were styled only because
Bootstrap was global.

| Class | Part | Owning component | Today |
|---|---|---|---|
| `.form-label`, `.form-text`, `.(in)valid-feedback`, `.form-check-input` on a plain input | forms | `bs-form` | unstyled. `bs-form` stamps nothing on its `<form>` **and installs no part** (`form/src/form/form.component.html:4`) |
| `.input-group-text` | forms | input group (4 fronts) | unstyled |
| `.modal-title` | modal | modal + `bsModalHeader` | unstyled |
| `.offcanvas-title` | offcanvas | offcanvas header | unstyled |
| `.table-active`, `.table-primary`, … on `<tr>`/`<td>` | tables | `bs-table` | unstyled |
| `.dropdown-item-text` | dropdown | dropdown menu (4 fronts) | unstyled |
| `.alert-link`, `.alert-heading` | alert | `bs-alert` | unstyled |

### 2.2 Two mechanisms

- **Eight hand-written Lit groups still have a shadow root**, each with its own Bootstrap copies in
  `web-components/_styles`: accordion, card, charts, checkbox, pagination, shell, tab-control and
  tile-manager. `mp-card` even installs the unscoped `bootstrapCardPage` from inside the component
  (`mp-card.element.ts:51`).
- Their Angular, React and Vue fronts are hand-written per framework. They don't wrap the web component
  (INVARIANT 3 holds), but they drift apart independently.
- So do the light-DOM hand-written groups: input-group, typeahead, sparkline, dropdown-menu, radio and
  radio-group, and toggle-button.
- About 40 components exist only in Angular (#455 §2).

## 3. Decisions (owner, grill of 2026-11-03)

| # | Decision |
|---|---|
| Q1 | **Anchored descendant guard.** A sub class is styled when it is itself stamped, or sits inside a stamped root *of its own partial*. It is not styled inside just any stamped element: `bs-shell`'s stamped `.content` wraps the whole app, so the bare `:where([data-mps]) .x` from the issue comment would make the part global. Stamping consumer content at runtime is rejected: it brands consumer DOM and is missing from the SSR HTML |
| Q2 | **Every class Bootstrap documents as content of the component is a sub class.** That includes the `form-check` family, `card-title/-subtitle/-text/-link`, `nav-link` and `navbar-text`. One rule, no per-class judgement |
| Q3–Q5 | **Uniform, all in scope.** Every hand-written group, shadow-root or light, and every Angular-only UI component becomes a D10 source with generated fronts. #455 is absorbed |
| Q6 | **One PR** for the whole programme |
| Q7 | **The compiler gains `kind: 'directive'`, designed as the most capable general mechanism.** It covers attribute directives, structural/template directives (`*[bsTooltip]`), host composition, and prop/ref/handler merging for React hooks. The fronts are an Angular directive, a Vue custom directive, a React hook and a Lit element-part directive. No hand-written directive path remains |
| Q8 | **Overlays are `div`s in `<body>`**, stacked by one ui-core `overlay-stack` that composes `focus-trap`, `inert-regions` and `dismiss-stack`, with z-index ordering. This applies to modal, offcanvas, popover, tooltip, toast, dropdown and context-menu. The Angular `a11y/overlay-*` services move into it. The pickers' top-layer popups stay where they are: they paint above a modal, which is correct, and opening a modal dismisses open popups through `dismiss-stack` |
| Q9–Q11 | **The overlay host is created at the end of `<body>`.** The front calls `document.createElement`, appends the host and renders the overlay's template into it. Nothing is moved, so no `position: relative; overflow: hidden` ancestor can clip it. The host copies `data-bs-theme` and `dir` from where the overlay is declared. **Server-rendered where the framework allows it**: Vue through `<Teleport>`, Angular through the server `document` with `ngSkipHydration` on the host. **React renders it client-only** (`createPortal` cannot server-render). That is the one documented exception |
| Q12 | **Behaviour and presentation are separate.** `[bsDropdown]` / `[bsDropdownToggle]` / `[bsDropdownMenu]` are pure-behaviour directives: open state, `aria-expanded`/`-controls`, dismissal, placement, the body overlay; no part, no styles. `bs-dropdown-menu` / `bs-dropdown-item` are the presentational components: the `dropdown` part plus the `dropdown-menu` core's in-menu contract (`role=menu`, roving, arrows, submenus). `calendar-month` folds into the `calendar` core as the month-grid building block shared by `bs-calendar` and `bs-scheduler`. That part is at the implementer's discretion |
| Q13 | **The navbar dropdown and `bs-dropdown-menu` become one component.** Hard requirement: the navbar stays fully usable with JS off under SSR. Everything is rendered, and hidden until it opens |
| Q14 | **No-JS reveal: `<details>` plus a gated `:focus-within`.** `<details>`/`<summary>` holds the open state for click, tap and Enter in every state. A `:focus-within` reveal applies **only until hydration**: `:not([data-mp-hydrated])`, ui-core `hydratedAttr()`. Without JS, nested submenus open inline inside their parent (`docs/prd/navbar-noscript.md` §3, §6). `BsNoNoscript` is deleted. `hydratedAttr()` is its framework-neutral replacement, and `priority-nav` and `tab-control` switch to it |
| Q15 | **Content queries carry slots (owner, 2026-11-03).** A parent may render a queried child's named slot, so the tab control renders each `bs-tab-page`'s rich `header` inside its own `ul.nav-tabs > li > label`, on the server too. The compiler gains it in all four fronts: Angular renders the child's slot `TemplateRef`, React the child element's slot prop, Vue the child vnode's slot, Lit the child's `slot="…"` light children. Rejected: a text-only header with a client-only teleport (rich headers missing from SSR and no-JS), and pages that render their own tabs (drops `nav-tabs > li` and the scrolling strip) |

## 4. Design

### 4.1 Scoper: root classes stay strict, sub classes get the anchored guard

```css
/* root class: unchanged, byte-identical to master */
.table:where([data-mps]) > :not(caption) > * > * { … }
/* sub class: itself stamped, OR inside a stamped root of its own partial */
.table-active:where([data-mps], .table[data-mps] *) { … }
.modal-title:where([data-mps], .modal-content[data-mps] *) { … }
.form-label:where([data-mps], form[data-mps] *, .input-group[data-mps] *, .form-floating[data-mps] *) { … }
```

- **One classification table, fail-closed** (refined by S2, §5.1). Per partial it lists `root` (the
  outer element and its modifiers), `sub` (documented content) and `anchors`. An owned class that is
  neither root nor sub is a codegen error, and so is a partial with sub classes but no anchors. The table
  below is the first draft. §5.1 has the full classification.
- The guard stays in place on the element. `:where()` counts 0, so specificity, layers and stock order
  are unchanged.
- The self arm (`[data-mps]`) keeps a stamped sub-element matching even when nothing stamped sits above
  it.
- **Measured cost (prototype):** about 40 selectors change, at about 25 bytes each. Per partial: forms
  12/144, tables 9/29, nav 5/23, card 4/32, alert 2/13, navbar 2/78, modal, offcanvas and dropdown 1
  each.
- **Selectors that do not change**, because their leftmost owned class is a root:
  - `.table > :not(caption) > * > *`
  - `.input-group > .form-control`
  - `.was-validated .form-control:invalid`
  - `.modal-header .btn-close`
  - `.form-floating > label`
  - `.navbar-nav .nav-link`

| Partial | `SUB_CLASSES` | `SUB_ANCHORS` |
|---|---|---|
| forms | `form-label`, `col-form-label(-sm/-lg)`, `form-text`, `input-group-text`, `(in)valid-feedback`, `(in)valid-tooltip`, `form-check(-input/-label/-inline/-reverse)`, `form-switch` | `form[data-mps]`, `.input-group[data-mps]`, `.form-floating[data-mps]` |
| modal | `modal-title` | `.modal-content[data-mps]` |
| offcanvas | `offcanvas-title` | `.offcanvas[data-mps]` |
| tables | `table-active`, `table-{primary…dark}` | `.table[data-mps]` |
| dropdown | `dropdown-item-text` | `.dropdown-menu[data-mps]` |
| alert | `alert-link`, `alert-heading` | `.alert[data-mps]` |
| card | `card-title`, `card-subtitle`, `card-text`, `card-link` | `.card[data-mps]` |
| nav | `nav-link` | `.nav[data-mps]` |
| navbar | `navbar-text` | `.navbar[data-mps]` |

The anchors are Bootstrap's root classes, not scope values. Partials cross families (the navbar renders
`.dropdown-menu` under `"navbar"`), and a scope value is a compiler-internal name.

### 4.2 Scope of the conversion

Every group below becomes a D10 source, and its hand-written fronts are deleted.

| Tier | Groups |
|---|---|
| Shadow-root Lit, hand-written ng/react/vue | accordion, card, charts, checkbox, pagination, shell, tab-control, tile-manager |
| Light-DOM hand-written, 4 fronts | input-group, typeahead, sparkline, dropdown-menu (merged with the navbar dropdown, §4.5), radio, radio-group, toggle-button |
| Angular-only (#455 §2, tiers A–D) | alert, badge, breadcrumb, button-group, close, container, list-group, placeholder, progress-bar, spinner, table, navbar-toggler, sticky-footer, marquee, parallax; grid, form, floating-labels, range; modal, offcanvas, popover, tooltip, toast, dropdown, context-menu; color-picker, rating, resizable, priority-nav, scrollspy, file-upload, calendar-month (folded, §4.6) |

Each group meets #455 §4's definition of done:
- the generated fronts;
- the `#452` hand-stamping removed;
- demo pages in all three demos;
- a `*.aria.spec.ts` with states;
- the passthrough conformance;
- the no-JS tier declared and checked;
- the conformance import lists updated.

### 4.3 `kind: 'directive'` in the compiler

**As built (M2):** a group lists them under `directives: { row: {…} }` beside `components`, typed
`DirectiveManifest` (no template, provides, content, methods or two-way inputs), so the compiler models
carry `kind: 'directive'`. A directive core's `view` returns the element's bag itself. A group may hold
directives only (`ui-core/grid`); it then needs no `templates/`. The runtimes:
- Angular: the generated `@Directive` calls `useCore` with a `hostBag`;
- React: `useBs<Name>(options)` returns props with a callback `ref`, and `mergeProps(ours, theirs)`
  combines them with the consumer's;
- Vue and Lit: `vueCoreDirective` / `coreDirective`, both over ui-core's imperative
  `elementCore`, and Vue's `getSSRProps` over `directiveServerBag`.
- The grid (`bsRow`, `[col]`, the breakpoint columns) is the pilot.

A directive manifest describes:
- a core whose bags apply to **the consumer's element** (the element opts in, so stamping `data-mps` and
  installing parts there is legitimate);
- inputs and outputs, as for components;
- optionally, a template slot, for structural use (`*[bsTooltip]` renders its content as an overlay).

The emitters:

| Front | Emits |
|---|---|
| Angular | an attribute or structural directive, usable through `hostDirectives` |
| Vue | a custom directive, including `getSSRProps` so server HTML carries the bags |
| React | a hook returning mergeable props (`className` concatenated, refs composed, handlers chained, `aria-*`/`id` precedence per the passthrough rules) |
| Lit | an element-part directive |

It is designed as the most capable general mechanism. Every directive in scope must be expressible
without an extension file:
- `bsRow` / `[col]` / `[md]` …;
- `[bsColFormLabel]`, `[bsFormControl]`;
- `bsModalHeader`/`Body`/`Footer`;
- `[bsDropdown]` and its parts;
- `*[bsTooltip]`, popover;
- `bsNoNoscript`, which is deleted (Q14).

### 4.4 Overlays

`ui-core/overlay-stack` is a core composed by every overlay core:
- z-index ordering;
- focus trap and return;
- `inert` behind modal overlays;
- Escape and backdrop dismissal through `dismiss-stack`.

Each bridge provides a **body host**: on open, a `div` is appended to the end of `<body>`, and the
overlay's template is rendered into it. The host copies `data-bs-theme`, `dir` and `lang` from the
declaring position. It is removed on close or destroy.

| Front | Render into the host | Server HTML |
|---|---|---|
| Angular | detached embedded view of the overlay template (`mpBodyTeleport`) | at the end of the body; the client replaces it, no `ngSkipHydration` needed (measured, M2) |
| Vue | `<Teleport to>` inside the runtime `MpBodyTeleport` | none (client-only since M2: no SSR teleport injection needed in apps) |
| React | `createPortal` | none (client-only, documented exception) |
| Lit | `render()` | at the end of the body (Lit SSR is out of scope, so client in practice) |

Without JS a closed overlay cannot be opened, so nothing depends on its server copy. That copy matters
only for an overlay that is open at load. The imperative toast API (`toastService.show(template)`) is a
per-front service over a framework-neutral toast queue core.

**As built (M6).** The queue IS the service: `ToastQueue` (`ui-core/toast`, `push(data)` / `close(id)` /
`hold` / `release`) is plain TypeScript any front can own (an Angular service, a React context, a
module). The rendering half is a generated D10 component, `toaster`, which takes `[queue]` and renders its
`toast` slot once per entry inside a fixed `.toast-container`; no front needs hand-written service code.
The toaster renders in place (it is `position: fixed`), not in a body host. A toast announces its text
when it turns visible through `announceToPage` (`ui-core/announce`), a page-level live region that exists
before its text; autohide (default 5 s) pauses while the pointer or focus is on the toaster (WCAG 2.2.1).

**Overlay directives (M6, tooltip and popover).** A manifest directive with `overlay: '<panel component>'`
renders that panel into a body host while its core's `props.overlay` is non-null; `props.anchor` is the
trigger's bag. Per front: Angular `<ng-template bsTooltip="top">…</ng-template>` inside the trigger (the
template is the content; input `alias` gives the structural microsyntax), React
`const [props, node] = useBsTooltip({ position, content })`, Vue the renderless
`<BsTooltip v-slot="{ props }">` with a `#content` slot (its `$attrs` join the trigger's props), Lit
`${bsTooltip({ position }, () => content)}`. Placement is `ui-core/overlay` `placeBeside`: the requested
side, the opposite one when it does not fit, then clamped; always tracked (scroll, resize, panel size), so
the former `updatePosition()` is gone. The popover's title is `bsPopoverTitle` (Angular) / `title`; its
header and body directives are gone.

**Dropdown and context menu (M6).** `[bsDropdown]` is one overlay directive on the trigger, the same
mechanism as the popover: `bsDropdown` / `bsDropdownToggle` / `bsDropdownMenu` collapse into it, because
the directive's element IS the toggle and its template IS the menu (Q12's split still holds: the
directive is behaviour only, the `dropdown` group's `dropdown-menu` / `-item` / `-header` / `-divider`
are the presentation and work in place without a trigger). It is an APG menu button: click toggles,
ArrowDown / ArrowUp open on the first / last item, Escape and a choice close and refocus the trigger, a
press outside or focus leaving closes. `placement` is `bottom-start` (default) / `bottom-end` /
`top-start` / `top-end` (`placeBeside` gained an `align`), `sameWidth` makes the menu at least the
trigger's width, `hasPopup="dialog"` holds non-menu content (a calendar) and focuses the panel. The menu,
items, headers and dividers are `div`s (an Angular or Lit item host may not sit in a `ul`); the menu's
`select` output is `itemSelect` (a DOM `select` event would collide). `[bsContextMenu]` is the same
pattern at the pointer (`placeAtPoint`): right-click, Shift+F10 and the ContextMenu key open it, Escape /
a press elsewhere / scrolling / window blur / a choice close it, `disabled` leaves the browser's menu.
Both are tier 2: a standalone dropdown does not open without JavaScript (the navbar's dropdowns do). The
Angular `has-overlay` entry, the CDK overlay use and `dropdown-divider` entry are gone.

### 4.5 Unified dropdown

`bs-dropdown-menu` / `bs-dropdown-item` are the presentational component, used both standalone (under
`[bsDropdown]`) and inside the navbar. The separate navbar dropdown component disappears.

| State | Open state | Reveal | Placement |
|---|---|---|---|
| No JS (server HTML, not hydrated) | `<details>`/`<summary>` | `<details open>` **and** `:focus-within`, gated on `:not([data-mp-hydrated])` | inline; nested submenus open inline inside their parent |
| Hydrated, in the navbar | the core (`<details>` kept as the carrier) | the core only | inline when the navbar is collapsed; as today when wide |
| Hydrated, standalone (`[bsDropdown]`) | the `[bsDropdown]` core | the core only | body overlay (§4.4) |

### 4.6 `calendar-month`

`calendar-month` becomes the month-grid part of the `calendar` core, composed by `bs-calendar`,
`bs-datepicker` and `bs-scheduler`. The standalone `calendar-month` component is deleted.

### 4.7 Lit fronts of slot-based groups

The groups that used real `<slot>`s (the shell's regions, the card's header and footer, the tab-control
pages, the accordion rows) render in the light DOM like every other generated front. Consumer content
arrives through front-native slots: `slot=` in Lit, where the compiler places the host's light children.
Content that must survive a move uses a core-owned host (`<teleport :to>`, the dock). Declarative
children use a manifest `content:` query (the ribbon). After conversion, `::part()` and `::slotted()`
hooks on these elements no longer exist.

### 4.7a Consumer links inside nav and navbar items (owner requirement)

`bs-navbar` > `bs-navbar-nav` > `bs-navbar-item` (and `bs-nav-item`, and an item inside a dropdown) always
holds a **consumer-provided `<a>`** (or `<button>`). That element must get the stock Bootstrap link styles
with nothing beyond the group's import:
- `.nav-link` in the bar;
- `.dropdown-item` in a dropdown panel.

**Today.**
- React, Vue and Lit mark the link through extension files (`markLinks(nodes, 'nav-link', scope)`). These
  add the class *and* `data-mps`.
- Angular needs the consumer to import `BsNavbarLinkDirective` / `BsNavLinkDirective` themselves
  (`selector: 'a, button'`). The demo's `app.component.ts` does that, and it is exactly the boilerplate
  #458 removes.

**Design.**
1. **The class is added, the scope is not.** The anchored guard styles the link, because `nav-link` is a
   sub class of `.nav` / `.navbar-nav` and `dropdown-item` a sub class of `.dropdown-menu`. So marking
   adds only the Bootstrap class. A consumer's class list is extended, never their attributes.
2. **A compiler feature, not an extension file.** A manifest slot option such as
   `slots: { default: { linkClass: 'nav-link', inMenu: 'dropdown-item' } }` generates the marking in every
   front:
   - React and Vue: a vnode/element clone (today's `markLinks`, without the scope);
   - Lit: the captured light children;
   - Angular: a generated marker directive (`a, button`, acting only inside the item, before the first
     render so the server HTML carries the class).
3. **Angular "import" means the group's export.** An Angular component cannot apply a directive to
   content projected into it, so the compiler emits a **group import array**
   (`BS_NAVBAR = [BsNavbarComponent, BsNavbarNavComponent, BsNavbarItemComponent, …, BsNavbarLinkDirective]`,
   with the same shape for every group). The docs and demos import that array, so the consumer never names
   the marker directive.
   - It works for **standalone** components: Angular flattens nested arrays in a standalone `imports`, so a
     consumer writes `imports: [BS_NAVBAR]`.
   - An `NgModule` can re-export the same array if one is ever wanted, but none is generated.
   - The individual classes stay exported. A consumer who cherry-picks also names the marker directive,
     and the demos and docs never do that.
4. **Guard.** An e2e in all three demos renders a navbar and a nav with plain `<a>` links (at depth 0 and
   inside a dropdown) and asserts the computed Bootstrap link styles: padding, colour, and the
   hover/active state.

### 4.8 Doc changes in the same PR

`CLAUDE.md`:
- Drop "Do not convert a slot-based component" and the hand-written shadow-root exception (C5).
- Rewrite "Hand-written Lit elements" as history, keeping `mp-typeahead` only if S6 finds it cannot be
  generated.
- Retire the `light-styles-nesting` rule.
- Amend "Angular renders the whole tree, including hidden popups" with the body-overlay rule (§4.4).
- Document `kind: 'directive'`.
- Document the anchored guard under C1a.

Other docs:
- #452 PRD §3.2.4.
- `docs/styles-mechanism.md`.
- `docs/prd/navbar-noscript.md`: the gate becomes `data-mp-hydrated`, and it applies to the unified
  dropdown.
- #455's PRD gets a "superseded by #458" header.
- The CHANGELOG lists every API break per package, including the MintPlayer.Spark#557 note that the
  `…Page` stopgaps can go.

## 5. Spikes (before M1; results go back into this PRD)

| Spike | Question | Done when |
|---|---|---|
| S1 Anchors | Does every anchor element carry its root class and `data-mps`, in every front, after conversion? Known missing today: `bs-form`'s `<form>`. | list of anchors per generated template |
| S2 Scoper | Prototype the two tables and the guard builder. Diff every compiled part before and after. Finalise §4.1's table. | no root selector changed |
| S3 Selector support | Does jsdom's nwsapi match `:where(A, B *)`? Check in the browser too (`playwright_node`): `.form-label` is styled in `bs-form` and not in a card under the shell. | both pass |
| S4 Directive kind | Prototype `kind: 'directive'` with three cases: one stateless (`bsRow`/`[col]`), one stateful with a template (`*[bsTooltip]`), one host-composed (`bsModalHeader`). Cover React prop merging and Vue `getSSRProps`. | the three generate, type-check, and server-render in Angular and Vue |
| S5 Body host | Build the body host per front: Angular embedded view into a `<body>` child under SSR with `ngSkipHydration`; Vue Teleport SSR; React portal; Lit. Copy theme/dir. Check overlay-stack z-order against a top-layer picker popup. | a modal containing a datepicker works in all four demos |
| S6 Slot groups | How the generated Lit front places light children for named regions (shell, card, tab-control). Can charts, tile-manager and typeahead be expressed in the template subset? What compiler features are missing? | a gap list, each gap with a compiler change or an extension-file justification |
| S7 No-JS dropdown | The unified dropdown with JS off under SSR in all three demos: `<details>` plus the gated `:focus-within`, nested submenus inline, hydration handoff. `priority-nav` and `tab-control` on `data-mp-hydrated`. | the `navbar-noscript.md` behaviour matrix passes |
| S8 Calendar | Map what `calendar-month` and the scheduler use from it onto the `calendar` core. | fold plan |

### 5.1 Spike results

**S1 Anchors (2026-11-03).** On master, the anchor class sits on the stamped root in every front that
exists today:
- the input group `div.input-group`;
- the dropdown menu `<ul class="dropdown-menu">` (`dropdown-menu.component.html:1`);
- floating-label `.form-floating` (`floating-label.component.html:1`);
- `.modal-content`, `.offcanvas`, `.alert`, `.table`;
- the `bs-nav` host.

The only missing anchor is **`bs-form`'s `<form>`**: no stamp, no install. Because every group is
regenerated by this PR, S1 is not a one-off check. It becomes an M1 spec requirement: the sub-element spec
renders each owning component and asserts that its anchor carries the root class and `data-mps`.

**S2 Scoper (2026-11-03).** Prototype: `docs/prd/_spike-458-scoper.mjs` (run with a directory of compiled partials).
- **Every owned class is classified as ROOT or SUB.** An owned class in neither list is a codegen error
  (fail-closed). All 26 partials pass.
- **Q2 applied strictly:** "documented content of the component" is SUB. So `forms` has *no* root
  class. Its roots are the anchors `form`, `.input-group` and `.form-floating`, and every forms class is
  SUB, with the self arm keeping generated controls matched.
- **Grid:** `col-*` / `offset-*` are SUB of `.row`. `row`, `row-cols-*` and `g-*` are ROOT.
- **No ROOT selector changed in any partial.**

Selectors rewritten, out of the partial's total:

| Rewritten | Partials |
|---|---|
| all | forms 144/144, card 32/32 |
| more than half | grid 155/272, carousel 25/29, accordion 18/23, pagination 10/13 |
| fewer than half | list-group 18/60, navbar 15/78, tables 10/29, dropdown 7/52, modal 6/49, button-group 5/19, nav 5/23, placeholders 5/9, progress 5/9, offcanvas 4/71, breadcrumb 3/4, popover 3/23, toasts 3/8, alert 2/13, tooltip 1/13 |
| none | badge, close, containers, spinners, transitions |

- **Emitted guard:** one arm per partial. With several anchors it is written as
  `:is(form, .input-group, .form-floating)[data-mps] *`, rather than one arm per anchor, which cost forms
  +16 KB uncompressed.

  ```css
  .form-label:where([data-mps], :is(form, .input-group, .form-floating)[data-mps] *)
  .table-active:where([data-mps], .table[data-mps] *)
  .col-md-6:where([data-mps], .row[data-mps] *)
  ```

**S3 Selector support (2026-11-03).**
- **jsdom 27.4 (nwsapi)** matches every guard form, both the multi-arm and the `:is()` single arm.
  Positives: inside the anchor, deep inside it, and the self arm. Negatives: a `.form-label` under the
  stamped shell `.content`, and one in a raw unstamped `<form>`.
- **Chrome 156:** the cascade behaves as designed.

  | Case | Result |
  |---|---|
  | `.form-label` in the shell | not styled |
  | `.form-label` in `form[data-mps]` | styled |
  | `.form-label` on a lone stamped element | styled |
  | A consumer's unlayered `.consumer .form-label` | beats the part |
  | `.input-group > .form-control` vs the base `.form-control` | keeps stock precedence |
  | `tr.table-active` in a stamped table | styled |

**S4 Directive kind (2026-11-03): design read; the code prototype moves into M2.** A directive is a
`ComponentCore` with no template. Its bag is the core's existing `host(props)` hook (`ui-core/component`),
applied to the consumer's element. Per front:

| Front | How it emits | Runtime work |
|---|---|---|
| Angular | The generated component class body, as is, under `@Directive({ selector: '[bsX]' })`: `useCore(…, { hostBag })` plus `useScopedStyles` (compare `nav.component.generated.ts`). Structural use is a `TemplateRef` rendered into the body host (§4.4) | none |
| Lit | An `AsyncDirective` that runs `coreRuntime(core)` and writes the bag with the existing `applyHostProps(element, prev, bag)`. Template use renders into the body host with `render()` | new `coreDirective()` helper |
| React | `useBsX(inputs) → props`, built on `useCore`. It needs a new `mergeProps(ours, theirs)`: `className` joined, refs composed (its ref is `rootRef`), handlers chained, and the consumer's `aria-*`/`id`/`tabindex` winning except a fixed `role`. Template use returns `[props, overlay]`, where `overlay` is a portal node | `mergeProps`, ref composition |
| Vue | `useCore` relies on `useAttrs`/`useId`/`inject`, so it **cannot run inside a custom directive**. It needs a separate `vueCoreDirective(core)`: `created`/`mounted`/`updated`/`unmounted` over `coreRuntime`, plus `getSSRProps(binding)`, which computes `host(view(state(inputs)))` purely so the server HTML carries the bag | new runtime |

Two Vue limits follow, and they decide the Vue API shape:
- A custom directive cannot `inject`, so it **cannot consume a core context**. `bsModalHeader` reads the
  modal's context, for example.
- A custom directive **cannot render slot content**. That affects `*[bsTooltip]`, the popover and
  `[bsDropdownMenu]`.

**Decided (owner, 2026-11-03): for those cases, the Vue front emits a renderless component instead.** For example
`<BsTooltip v-slot="{ props }"><button v-bind="props">…</button></BsTooltip>`, the standard Vue
headless pattern. A directive that consumes no context and renders no template stays a custom directive
(`v-bs-row`, `v-bs-col`).

**S5 Body host (2026-11-03): design read; the M2 opening task proves the Angular half.** No front puts
overlays in `<body>` today: the modal renders inline as a fixed `div`. The compiler's `<teleport :to>`
(`MpTeleportDirective`, React `createPortal`, Vue `<Teleport>`, Lit `teleport()`) already renders a view
into a core-owned element. The overlay host builds on it with a new static target, `<teleport to="body">`.

| Front | Client | Server |
|---|---|---|
| Vue | `<Teleport to="body">` | native Teleport SSR, which hydrates through its body markers |
| Angular | today's teleport into a body host `div[data-mp-overlay=<id>]` | see below |
| React | `createPortal` into the host after mount | nothing (decided, Q9–Q11) |
| Lit | `render()` into the host | nothing (no Lit SSR) |

**Angular server and client.** The server creates the view **detached** (`createEmbeddedView` plus
`ApplicationRef.attachView`, not in the component's `ViewContainerRef`), so the component's hydration
info has no view whose nodes went missing, and appends it to a body host. The client's bridge removes
any server host with the same id before it creates its own. That turns Q10's `ngSkipHydration` into a
fallback, needed only if the detached view shows up in the hydration info anyway, which is what M2's
first task measures.

**Shared rules.**
- The host copies `data-bs-theme`, `dir` and `lang` from the closest declaring ancestor when it opens.
- The pickers' popups stay in the top layer.
- Opening an overlay calls `dismiss-stack` first.

**S6 Slot groups (2026-11-03).** No compiler gap blocks the eight shadow-root groups.
- Named regions are already supported in the generated Lit front: `slot="x"` light children are captured
  per slot (`LightChildren`), and Angular, React and Vue use their native slots. Shell, card,
  tab-control, accordion and checkbox map onto them.
- SVG renders in templates already (datatable, theme-toggle), so the three charts (hierarchy, sparkline,
  trend, whose cores exist in `ui-core/charts`) are expressible.
- Two cases need a closer look in M4:
  - tile-manager's imperative `dom.ts`, which probably becomes core-owned teleport hosts like the dock;
  - typeahead, the last light-tier reference.

**S7 No-JS dropdown (2026-11-03).** The navbar sheet already gates rules on `:not([data-mp-hydrated])`
(`navbar.scoped.scss:184`) and uses `<details>` for every dropdown. Nothing reveals on `:focus-within`
today: the `data-js` gates went away with #437. Q14 adds one rule family, gated the same way:
`:not([data-mp-hydrated]) .nav-item.dropdown:focus-within > .dropdown-menu`, with nested submenus shown
inline. The unified `bs-dropdown-menu` carries it, so a standalone dropdown gets it too. The
`navbar-noscript.md` matrix becomes M6's e2e.

**S8 Calendar (2026-11-03).** `@mintplayer/ng-bootstrap/calendar-month` is an orphan. It holds only a
service and two pipes, nothing in `libs/` or `apps/` imports it, and the `calendar` core is already
self-sufficient (the datepicker and the scheduler use it). **M7 deletes the entry.** The month-name and
weekday-name pipes go too, because the core localises through `Intl`.

Related finding: the `markLinks` helpers in every front add `.nav-link` and the scope to a consumer's
link, which means they stamp consumer DOM. With the anchored guard (`nav-link` is a sub class of `.nav` /
`.navbar-nav`), the scope stamp is no longer needed for styling. M6 removes the stamp and keeps the class
only.

## 6. Milestones (one PR, one branch off `master`; commit per milestone, no per-milestone test runs)

0. **Spikes S1–S8.** Update this PRD with the results.
1. **The #458 fix.**
   - Scoper `SUB_CLASSES` / `SUB_ANCHORS` and the guard builder.
   - `scope-bootstrap.spec.ts`.
   - `bootstrap-parts-scoping.spec.ts`: `isGuard`, the guard stripping and `matchable()` accept the sub
     guard.
   - The new sub-element spec: matches inside the anchor, matches on the self arm, does not match
     inside a stamped non-anchor (the shell) or in an unstamped tree.
   - `bs-form` stamps its `<form>` and installs forms (interim, until M5 generates it).
2. **Compiler and infrastructure.**
   - `kind: 'directive'` (§4.3).
   - Body host per bridge and the `overlay-stack` core (§4.4).
   - `hydratedAttr()`-gated no-JS styling helpers.
3. **Light-DOM hand-written groups → D10:** input-group, typeahead, sparkline, radio, radio-group.
   Toggle-button moved to M4, next to the checkbox it shares a core shape with (owner, 2026-11-03).
   - **Radio groups (owner, 2026-11-03).** `radio` and `radio-group` are ONE D10 group
     (`ui-core/radio`). The group hands its radios a `RADIO_GROUP` context (name, selection,
     disabled, required), so the nearest group wins and groups nest: a row selection on a `<tbody>`
     and a radio list in one of its cells are two independent sets. Each group handles only the
     `change` events of its own radios (`ownsRadio`: the radio's closest `[data-radio-group]` is
     this group). The `[group]` input is gone.
   - **Angular adds an attribute form**, `[bsRadioGroup]`, by hand. It goes on a host the page
     already has (a `<tbody>`, a cell, a button group), provides the same context through
     `coreContextToken(RADIO_GROUP)` and adds no role. `bs-radio-group` and `[bsRadioGroup]` share one
     `ControlValueAccessor` (`BsRadioGroupValueAccessor`) as a host directive. React and Vue get
     the element form only.
   - **Known gap, fixed in M5.** A `type="toggle_button"` radio renders a `display: contents`
     wrapper around `.btn-check + .btn`. A `.btn-group`'s corner joining (`> .btn:not(:first-child)`)
     cannot see through it in any front. The M5 `bs-button-group` sheet joins hosted children
     (`.btn-group[data-mps] > * > .btn`) rather than the radio knowing about button groups.
   - The compiler now refuses a `<slot>` that `defineSlots<…>()` does not declare. The Lit and React
     fronts type their `slots` from that declaration, so the old failure appeared in tsc, far from
     its cause.
   - **Typeahead.** `typeaheadCore` mirrors `TypeaheadMachine`'s snapshot into core state and
     owns the listeners on the host, so every front shares one event path. Outputs are renamed
     where the old name collided with a native event: `select` → `itemSelect` (detail
     `{ item, value }`), `submitted` → `termSubmit`, `opened`/`closed` → `openChange`. The
     `provider` accepts a Promise or any observable-like answer (`TypeaheadSource`), so Angular's
     `HttpClient` needs no Angular-only adapter. `selectedItem()` is gone: the pick arrives with
     `itemSelect`. The Lit element is no longer form-associated; its light-DOM input carries
     `name` and submits natively. The Angular CVA and the pre-hydration text replay live in
     `typeahead.angular.ts` / `typeahead.accessor.ts`.
   - **Host transparency in generated Angular fronts.** Where the template's root is the host
     but the role lives on an inner `mp-attrs` node, the generated component forwards the host's
     `aria-*`, `id` and `tabindex` to that node (`useHostAttrs` + `[mpHostAttrs]`), as the
     hand-written fronts did with `takeHostAria`. A forwarded `id` yields to an `id` the core's bag
     sets itself (the radio's input, which its `label for` names) and stays on the host.
   - **Sparkline.** One `<svg>` as the `mp-attrs` node inside a host `<span>`; with no points it
     renders an empty, `aria-hidden` svg rather than nothing, so the box keeps its size.
4. **Shadow-root groups → D10:** accordion, card, charts, checkbox, toggle-button, pagination,
   shell, tab-control, tile-manager. Delete `web-components/_styles` and the page-variant install.
   Retire `light-styles-nesting`.
   - **Checkbox.** `checkbox`, `toggle-button` and `checkbox-group` are ONE D10 group
     (`ui-core/checkbox`), mirroring the radio group. Markup is Bootstrap's canonical form in every
     type: `div.form-check[.form-switch] > input + label[for]`, or a `display: contents` root around
     `.btn-check + label.btn` (the old wrapping `<label>` is gone). `toggle-button` is the same core
     with its type fixed and renders the checkbox template. `isToggled` is renamed `checked`;
     `checked` and `indeterminate` are two-way, and a user toggle clears the mixed state.
   - **Checkbox group.** `CHECKBOX_GROUP` hands the checkboxes the name (`<name>[]`), the selection
     and `disabled`; the nearest group wins, and a group handles only its own checkboxes
     (`ownsCheckbox`). Its value is read from the DOM in document order (`groupSelection`), as the
     Angular directive did. `[bsCheckboxGroup]` stays as the Angular attribute form (role `group`
     only on a generic host); its `label` and the checkbox's `[group]` inputs are gone. React and Vue
     gain `BsCheckboxGroup`. The `toggle-button` entries of React, Vue and Lit are folded into
     `checkbox`.
   - The Lit `FormAssociatedMixin` lost its last user (the hand-written `mp-checkbox`) and is
     deleted: every form control is a light-DOM native input that submits on its own.
   - **Accordion.** `accordion` + `accordion-tab` are one D10 group on native `<details name>`. The
     accordion PROVIDES `ACCORDION` (the shared `name`, null when `multi`, and
     `highlightActiveTab`); each tab renders its own `<details>` and derives its ids from its own id,
     so the React index counting and the Vue provide/inject registry are gone. `isActive` is renamed
     `open` (two-way); React/Vue `BsAccordionItem` becomes `BsAccordionTab` with a `header` slot.
     Rows belong to the accordion whose `[data-accordion]` root is their closest marked ancestor,
     which keeps nested accordions apart. `data-highlight-active` moves from the root to each row.
     Angular and Lit put a `display: contents` tab host around each row, so the sheet restates
     Bootstrap's first/last-of-type joining on `.accordion-tab`.
   - **Card.** The ten card parts are one D10 group of presentational cores (`ui-core/card`). Each
     part's root is the Bootstrap element (the host in Angular and Lit, a `div` in React and Vue);
     the sheet gives the hosts a block box. `color` is a `CardColor` string in every front (the
     Angular `Color` enum input is gone). `bs-card-title` is `role="heading"` at `level` in every
     front. The image is a `card-img-*` box around the `<img>` (the attribute node) with the overlay
     content inside it; the link is a `card-link` box around a real `<a>`. URLs (`src`, `href`) are
     bound by the template, never carried in a bag. `mp-card` and its unscoped page-part install
     are gone; raw card markup on a page still installs `bootstrapCardPage` from that page.
   - **Pagination.** `paginationCore` (`ui-core/pagination`) wraps `connectPagination`: the
     selected page is a two-way `selectedPageNumber` in every front (`onSelectedPageNumberChange`
     in React, `v-model:selectedPageNumber` in Vue, `selectedpagenumberchange` in Lit; the old
     React `onPageChange` and the Lit `mp-pagination-page-change` event are gone). Every link
     carries `data-page`, so one delegated click selects; a modified click on an `hrefFor` link
     stays the browser's. The consumer `aria-label` names the `<nav>`. `pageNumbers` is
     property-only in Lit (the comma-list attribute is gone). The layout table moved to the
     ui-core spec.
   - **Shell.** `shellCore` (`ui-core/shell`) wraps `connectShell`; the root is the host in Angular
     and Lit. `topbar` and `sidebar` are slots (`*bsShellTopbar` / `*bsShellSidebar`, React props,
     Vue named slots, Lit `slot="topbar"`), the default content is the main region. `toggle()` is a
     method in every front; the Angular `size` model and `setSize()` are a plain `size` input,
     lowered onto `.sidebar-root` as `--mp-shell-size` (`:style` is refused on the root). The
     `BsShellState` / `BsShellStateChange` aliases are `ShellState` / `ShellStateChange`.
   - **Tab control (Q15).** `tabControlCore` (`ui-core/tab-control`) wraps `connectTabControl`;
     the bags carry no `data-mps` any more (the compiler stamps the scope). `tab-page` is a
     **declaration**, a new manifest kind (`declarations:` beside `components:`): inputs and
     slots, no core and no template, and it renders nothing. The parent queries it
     (`content: { pages: { component: 'tab-page' } }`) and renders its slots with
     `<content-slot query="pages" name="header" :index="i" />` (no `name`: the default slot).
     The transports: Angular, the declaration's `contentSlots` TemplateRefs (default content
     through an `<ng-template>` view child) rendered by `ngTemplateOutlet`; React, the child
     element's `children` and slot props (`lentSlots`); Vue, the child vnode's slot functions,
     forwarded as `content:<query>:<i>:<slot>` slots (`useLentSlots`); Lit, the child's light
     children moved by `slot=` (`LightChildren`, `ContentQuery.lent`). A nested control keeps
     its own pages: Lit's query skips children whose closest host is another control, Angular's
     filters on `contentParent`. `activeTab` is the page's `tabId` (else its position) and
     two-way everywhere (`onActiveTabChange`, `v-model:activeTab`, `activetabchange`); React's
     `onTabActivate`, the Angular `BsTabsPosition` alias and the Vue `BsTabPage.vue` registry are
     gone. `border` is a boolean in every front.
   - **Tile manager.** `tileManagerCore` hosts one `TileManagerMachine` per instance and wires
     what the four hand-written fronts did: delegated pointer, key and focus handlers on the
     board (a nested board's tiles are skipped), the grid's ResizeObserver → `measure` in the
     next frame, pointer capture, the FLIP reflow and the keyboard focus requests. `view` feeds
     the inputs to the machine idempotently (only changed inputs, never the echo of its own
     commit), so the server render and the first client render agree. `connect()` lost its
     scope and changed shape: `board` is a flat bag and the input custom properties moved to
     `container.style`, because a compiled root may not bind `:style`. The server layout rules
     (D14) ride a new template primitive, `<instance-style :name :css>`. Consumer API: the
     header and content are scoped slots receiving `{ tile }` (`*bsTileManagerHeader="let tile
     = tile"`, React `header={({ tile }) => …}`, Vue `#header="{ tile }"`, Lit `headerRenderer`)
     instead of the Angular `*bsTile` loop and React `renderHeader`; `tiles` is an input in
     every front. `layouts` is two-way (`layoutsChange` keeps React controlled); outputs follow
     the lowercase rule (`layoutchange`, `columncountchange`, `gestureblocked`), and
     `TileColumnCountChange` replaces the per-front `BsTileColumnCountChange`.
   - **Cleanup (done).** No shadow root and no hand-written Lit element remains but
     `mp-dropdown-menu` (M6). `web-components/_styles` and `light-styles-nesting.spec.ts` are
     deleted; `adoptLightStyles` stays as public API for a consumer's own shadow host. No
     `…Page` install exists inside the libs. Lit gained the host transparency Angular already
     had for a host-rooted template whose role lives on an inner `mp-attrs` node:
     `takeHostAttrs` (once, before the first render) moves `id` / `tabindex` and copies
     `aria-*`, and the template binds `forwardHostAttrs(bag, hostAttrs)` on that node, with the
     same rule as `[mpHostAttrs]` (an id the core writes wins; the consumer's goes back to the
     host). CLAUDE.md's "Hand-written Lit elements" section is now history (§4.8).
5. **#455 tiers A and B:** presentational components, grid, form, floating-labels, range. Includes
   `bs-button-group` as a D10 group whose sheet joins hosted children (see M3).
   - **Colour (`ui-core/color`).** One `ThemeColor` / `BsColor` string type, `THEME_COLORS`,
     `isThemeColor` and `fillClasses` for every coloured component; the Angular `Color` enum input
     is gone from each component as it converts (`color="warning"`, not `[color]="colors.warning"`).
   - **Badge, close, button group.** Presentational cores. The badge's `type` is `color`; close
     and button group take their accessible name as `label` (`ariaLabel` is gone). The button-group sheet joins hosted children
     (`.btn-group[data-mps] > * > .btn`), closing the M3 gap.
   - **Alert.** `bs-alert-close` is replaced by a `dismissible` input: the core renders the
     `.btn-close` (hidden until hydrated, tier 2), rescues focus and writes back the two-way
     `visible` (was `isVisible`). `role="alert"` only with `announce`, so a static alert does not
     interrupt. `afterOpenedOrClosed` is gone; `visibleChange` reports the dismissal.
   - **Breadcrumb, list group.** Host-rooted items (`li.breadcrumb-item`, `.list-group-item`) so
     Bootstrap's sibling selectors see them; each carries an explicit `listitem` role and the
     state (`aria-current`, `aria-disabled`).
   - **Progress.** A bar's width is `data-progress="<0–100>"` matched by a generated sheet rule,
     never an inline `style` (CSP-safe, and `:style` is refused on an mp-attrs node). The
     indeterminate track renders one valueless progressbar named by `label`.
   - **Placeholder.** `loading` drives `aria-busy` and a polite status that announces `loadedText`
     once and clears itself. The Angular-only `bsPlaceholderField` directive is a plain
     `data-placeholder-field` attribute, styled by an `@mps-global` rule anchored on the region.
   - **Table.** A `table-host` around a real `<table mp-attrs>`; the consumer's `aria-rowcount`
     and friends land on the table, so the `ariaRowCount` input is gone. `isResponsive` →
     `responsive`, `border` → `bordered`.
   - **Grid.** `bs-grid` joins the M2 grid group as a component: the container class is on its
     root (the host in Angular and Lit) instead of an inner div.
   - **Navbar toggler.** A real button, `open` two-way (was `state`), named by `label`, with
     `aria-expanded` / `aria-controls`; disabled until hydrated (tier 2).
   - **Marquee.** `role="marquee"` named by `label`; the pause button's text is localisable
     (`pauseText` / `resumeText`) and, since it changes, the button reports no `aria-pressed`.
     Hover and focus pause it too.
   - **Parallax.** Image and height ride custom properties on an inner band (the URL quoted by
     `cssUrl`); reduced motion lets the background scroll.
   - **Sticky footer.** Pure CSS: the `sticky-footer-parent` directive makes a flex column at
     least `--mp-sticky-footer-min-height` (default `100dvh`) tall and the footer takes
     `margin-top: auto`. The ResizeObserver, the inline margin and the `::ng-deep html` rule are
     gone (an `html` rule cannot be anchored on a stamped element).
   - **Form, floating labels, range** (three groups, each installing `forms`). `bs-form`'s
     stamped `<form>` is the forms anchor; the `form-control` directive keeps its Angular
     selector (every input/textarea in a `bs-form`) and `col-form-label` moved here from grid.
     `bsFormGroup` is gone (`.form-group` is a Bootstrap 4 class with no rule in 5). Without an
     `action` the native submit is cancelled; with one the browser submits. The floating label no
     longer needs a `bs-form` (`.form-floating` is an anchor) and points a label without `for`
     at its control. The range is a native slider with a two-way `value`, `disabled` and
     `label`; Angular keeps a CVA (`range.angular.ts`).
6. **#455 tier C:** the overlays on `overlay-stack`, the `[bsDropdown]` behaviour directives, and the
   unified dropdown with the navbar (§4.5).
7. **#455 tier D and the calendar fold:** color-picker, rating, resizable, priority-nav, scrollspy,
   file-upload, calendar-month → calendar.
8. **Cleanup.**
   - Delete `BsNoNoscript`, the Angular `a11y/overlay-*` services and every hand-written front.
   - Conformance import lists.
   - The docs from §4.8 and the CHANGELOG.
9. **Verify once, at the end.**
   - `compile-components-check`.
   - Build `mintplayer-web-components`, ng-bootstrap, react-bootstrap and vue-bootstrap.
   - The ui-core, web-components, ng, react and vue unit suites.
   - The three demo e2e projects, with computed-style checks for §8.
   - **The full sweep takes far longer than a few minutes: get the owner's go-ahead before starting it.**

## 7. Risks

- **Size.** This is the largest PR in the repo. The scoper fix (M1) ships only with the last
  conversion, so Spark keeps its `…Page` stopgaps until then. The owner accepted this (Q6).
- **Anchor drift.** If a conversion changes which element carries a root class, the anchor silently
  misses it. The M1 sub-element spec renders the real component, not selector fixtures, so the drift
  breaks loudly.
- **Lost inherited context.** A body overlay loses inherited CSS. The theme, `dir` and `lang` copy covers
  the known cases. Consumer custom properties set on an ancestor do not follow, so the CHANGELOG
  documents this.
- **React SSR.** React overlays are absent from server HTML, which matters only for an overlay that is
  open at load.
- **No-JS clipping.** A standalone `[bsDropdown]` without JS opens inline and can be clipped by an
  `overflow: hidden` ancestor. That is inherent: nothing can render into the body without JS.

## 8. Acceptance

- In all three demos, with no `useBootstrap(...Page)` on the page, the sub-elements in §2.1 are styled
  inside their component. The same classes outside their owning component (in the shell, a card or a
  grid row) stay unstyled.
- The root selectors of every part are byte-identical to master's. Specificity is unchanged everywhere.
- No hand-written front, no shadow root and no `_styles` copy remains for any UI component.
  `compile-components-check` is clean.
- All four fronts expose every in-scope component.
- Consumer `<a>`/`<button>` links in `bs-navbar-item` and `bs-nav-item` are styled like stock Bootstrap
  `.nav-link`, and like `.dropdown-item` inside a dropdown, in all four fronts. The consumer imports only
  the group's export (§4.7a).
- With JS disabled, every navbar item and nested dropdown in the three demos can be reached and opened
  by mouse and keyboard.
- Overlays render at the end of `<body>`, are not clipped by `overflow: hidden` ancestors, keep the
  declaring theme, and trap and return focus.
- The conformance specs fail if a Bootstrap upgrade adds an unclassified class or a sub class without an
  anchor.
