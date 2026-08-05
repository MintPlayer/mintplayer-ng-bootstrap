# CLAUDE.md

Project-wide technical conventions for the `@mintplayer/*-bootstrap` workspace. Read this before adding components.

## What this workspace is

A multi-framework Bootstrap component system. As of 2026 it is split into:

- **`@mintplayer/web-components`** (`libs/mintplayer-web-components`) — framework-agnostic **Lit** web components. The single source of UI truth.
- **`@mintplayer/ng-bootstrap`** (`libs/mintplayer-ng-bootstrap`) — Angular wrappers.
- **`@mintplayer/react-bootstrap`** (`libs/mintplayer-react-bootstrap`) — React wrappers.
- **`@mintplayer/vue-bootstrap`** (`libs/mintplayer-vue-bootstrap`) — Vue wrappers.
- Demo apps: `apps/{ng,react,vue}-bootstrap-demo` (+ `-e2e` Playwright projects).
- Backend for data-driven demos: `apps/api` (ASP.NET Core + EF Core).

New components default to **a Lit WC + hand-written wrappers per framework** (dock / scheduler / timeline / treeview / tree-select are the precedent). Wrappers are normal source, NOT codegen'd.

## Web component authoring

Each WC lives at `libs/mintplayer-web-components/<name>/` with this shape:

```
<name>/
  index.ts                       → export * from './src'
  (no ng-package.js — the WC lib builds with Vite; the 5 stray ng-package.js files in older WC dirs are inert)
  src/
    index.ts                     → public API barrel
    components/<el>.ts           → the LitElement (calls customElements.define at the bottom)
    styles/<name>.styles.scss    → hand-written styles  ──┐ codegen input
    styles/<name>.styles.ts      → GENERATED, do not edit ◄┘ (exports `<camelName>Styles`)
    types/ , providers/ , ...
```

Some larger components instead use `<el>.element.html` + `<el>.element.scss` → a GENERATED `<el>.element.template.ts` (exports `template` + `styles`). Either pattern is fine; inline `html\`\`` in `render()` suits dynamic templates, the `.element.html` pattern suits mostly-static structure.

### SCSS / template codegen (important)

`.styles.scss` and `.element.html`/`.element.scss` are **compiled into TypeScript** by `tools/scripts/build-web-components.mjs`. The element imports the *generated* `.ts`, never the `.scss` directly. So:

- **After editing any `.styles.scss`, `.element.scss`, or `.element.html`, re-run codegen or the change is invisible:**
  ```bash
  npx nx run mintplayer-web-components:codegen-wc
  # watch mode:
  npx nx run mintplayer-web-components:codegen-wc-watch
  ```
- `nx build mintplayer-web-components` runs `codegen-wc` + `cem` (custom-elements manifest) automatically as `dependsOn`.
- Generated files (`*.styles.ts`, `*.element.template.ts`, `custom-elements.json`) are **gitignored build artifacts** (`.gitignore`: `libs/**/*.styles.ts` etc.) — never stage or hand-edit them; only the `.scss`/`.html` sources are tracked.

### SSR chrome codegen (`*-chrome.generated.ts`)

WCs with a no-JS SSR path ship a Declarative-Shadow-DOM "chrome" constant, rendered from the **built** element via `@lit-labs/ssr`:

- `tools/lit-ssr-utils/gen-<name>-chrome.mjs` → `libs/mintplayer-web-components/<name>/ssr/mp-<name>-chrome.generated.ts`, produced by the Nx target `codegen-<name>-chrome`, which `dependsOn` the WC `build` (it imports the compiled `dist` element, so it can't be part of `build` — that would be circular).
- Like all generated files, `*-chrome.generated.ts` are gitignored build artifacts (`.gitignore`: `libs/mintplayer-web-components/**/*.generated.ts`). Never commit or hand-edit them.
- They regenerate automatically because every SSR demo build `dependsOn` the aggregate **`mintplayer-web-components:codegen-ssr-chrome`** (it fans out to the per-component `codegen-*-chrome` targets). **When adding a new SSR WC, add its `codegen-<name>-chrome` to that aggregate** — the demos need no change. After editing a WC's shadow markup/styles, rerun `nx run mintplayer-web-components:codegen-ssr-chrome` (or just build a demo) so the SSR chrome isn't stale.

### WC gotchas

- `static get observedAttributes()` must be a **static getter** (spread `super.observedAttributes`), not a static array.
- **Do not shadow read-only DOM properties.** `HTMLElement` already defines `scrollHeight`, `title`, `lang`, etc. as typed members — defining a same-named accessor fails to compile (`TS2416`). Pick a non-clashing name (e.g. `panelScrollHeight` with attribute `scroll-height`).
- **Bootstrap utility classes do not cross the shadow boundary.** `p-0`, `d-flex`, reboot defaults — none reach inside a WC's shadow root. Re-declare every rule you need in the component's own SCSS.
- Per-component templates that vary per row must be **render-callback functions** (see `mp-treeview.nodeRenderer`), not slots — slots can't be per-node in a dynamic tree.
- Composition over reinvention: reuse `OverlayController` (`libs/.../overlay`) for popups and `mp-treeview` for trees.
- **No backticks inside a comment inside ANY tagged template** — `css\`\`` *and* `html\`\`` (an HTML comment is still inside the JS template literal, so a backtick there terminates it and the build fails somewhere confusing). Use bare names in both.
- **Every dynamic `import()` specifier in lib source must be a static string literal.** A computed one (`` import(`./x/${k}.js`) ``, even with `/* @vite-ignore */`) survives into the published `.mjs` and then either hard-fails an esbuild consumer's build **or — worse, silently — globs the whole target directory into their bundle**. Generate a static loader map instead (`flags/src/flag-loaders.generated.ts` is the pattern).
- **Styling a slotted `mp-*` control from an outer WC: `::slotted()` is the weakest link in the cascade.** Measured order for one slotted element: `::slotted()` normal **<** the control's `:host` normal **<** the tree the element lives in (page CSS / the composing element) **<** `::slotted()` `!important`. So a container cannot restyle a slotted control's geometry with a plain rule when the page already sets that property (Bootstrap's `.form-control { border-radius }`, `width: 100%`) — the selector matches while the declaration silently loses. Mark container geometry `!important`, let a control size itself from `:host`, and reach *inside* a control only through inherited custom properties.
- **A container query can reach into a shadow root; a media query cannot see a narrow host.** `container-type: inline-size` on a WC's `:host` is matched by `@container` rules authored **inside a nested WC's own shadow root** — container-query ancestor lookup crosses shadow boundaries (measured, 3 engines). Use it instead of `@media` whenever a component can be narrow inside a wide viewport (sidebar, modal, grid cell). The container must be the host, never the flex container you are styling — an element cannot be its own container. **`container-type` no longer establishes a containing block** (that was an acknowledged spec mistake, removed in Chromium 129 and matched since): measured byte-identical geometry for a top-layer `::picker(select)` under containment. Note `getComputedStyle().contain` reports `none` while `containerType` reports `inline-size`, so assert on the latter.
- **In flex, `min-width: 0` cannot prevent wrapping** — line-breaking uses each item's *hypothetical main size* and shrinking happens only after the line is chosen. An intrinsically wide item (a native `<select>` sizes to its **widest option**) takes a whole line no matter what its `min-width` says; only `flex-wrap: nowrap` or a real `flex-basis` (`flex: 1 1 0`, not `1 1 auto`) changes that. And `nowrap` alone can be *worse* than the wrap it fixes: if a sibling cannot shrink, the overflow moves to the page (measured: a 26px-wide input and 131px of horizontal page scroll). Constrain the wide item's basis first.
- **`input[type=tel|url|email]` is UA-forced to `direction: ltr`, even inside `dir="rtl"`.** A logical property on such an input resolves against *its* direction, not its container's, so `border-start-*` / `margin-inline-*` land on the wrong side. Use physical properties under `:host(:dir())` guards when styling one from a container. (Elements whose whole chain inherits `rtl` — a slotted `<select>`, an overlay in your own shadow root — keep logical properties.)

### Module resolution

`tsconfig.base.json` maps `@mintplayer/web-components/*` → `libs/mintplayer-web-components/*` (wildcard). A new `<name>/src/index.ts` is auto-discovered as a sub-entrypoint by `vite.config.mts` and resolves in dev/build with no extra config.

## Framework wrappers

- **Angular** (`libs/mintplayer-ng-bootstrap/<name>/`): `@Component` with `CUSTOM_ELEMENTS_SCHEMA`, bridges `[attr.x]` inputs and `(custom-event)` outputs to the WC; `<ng-template>` directives are bridged to render-callbacks via `EmbeddedViewRef`. Form controls implement `ControlValueAccessor`.
- **React** (`libs/mintplayer-react-bootstrap/<name>/`): `@lit/react` `createComponent`; object/function props assigned via the element ref; controlled `value` + `onChange`.
- **Vue** (`libs/mintplayer-vue-bootstrap/<name>/`): `.vue` SFC; `v-model` via `defineModel`; object props assigned to the element ref `onMounted`/`watch`; named scoped slots.

## Accessibility

Non-negotiable for new components and for edits to existing ones. WCAG 2.2 AA + the WAI-ARIA
Authoring Practices pattern for the widget. Prefer a native element that owns its own state over
an ARIA attribute you have to remember to update — `<details>`, a real `<button>`, a `:checked`
input stay correct with no write path; `aria-expanded` on a `<div>` is correct only while every
code path remembers it.

- **Role and name.** Every interactive element exposes a role and a non-empty accessible name.
  Icon-only buttons, close/clear buttons, sort toggles, paginator arrows, drag handles, resize
  grips and chip-remove buttons are where this is always missed.
- **State on the role.** `aria-expanded` / `-selected` / `-checked` / `-current` / `-sort` /
  `-valuenow` belong on the element carrying the role, and must update in the same render as the
  visual change. State written only from an event handler is stale in SSR output — see the no-JS
  rules.
- **IDREFs never cross a shadow boundary.** `aria-labelledby` / `-describedby` / `-controls` /
  `-activedescendant` resolve only within their own tree. Never copy an IDREF from the host onto a
  node in the shadow root, and never point a host attribute into the shadow root. Use
  `ElementInternals` reflected element references (`ariaLabelledByElements`) or move the role to
  the host.
- **A WC whose role lives on an inner node must accept a `label`.** Expose a `label` (or
  `aria-label`) attribute and render it onto the role-bearing node. A consumer cannot reach inside
  a shadow root, and `aria-label` on a roleless host is ignored by browsers.
- **Wrappers are transparent.** A consumer's `aria-*`, `role`, `id` and `tabindex` on a wrapper
  must reach the `mp-*` element. Angular: forward host attributes, don't leave them on the `bs-*`
  host. React: props interfaces extend `React.HTMLAttributes<I>` and spread `...rest`. Vue:
  `inheritAttrs: false` + `v-bind="$attrs"` on the inner element.
- **Every pointer gesture has a keyboard equivalent.** Drag to resize, drag to reorder and swipe
  are each a keyboard-operable command too, with the keymap announced on entry via the live
  announcer. No keyboard path is a release blocker, not a follow-up.
- **Focus ring inside the shadow root.** Bootstrap's focus-ring utilities do not cross the
  boundary, so `outline: none` needs a `:focus-visible` replacement declared in the component's own
  SCSS. A background-colour change shared with `:hover` is not a focus indicator.
- **Hidden means hidden from both trees.** Content hidden visually must be out of the tab order and
  out of the accessibility tree (or in neither). Never `aria-hidden` a focusable element or an
  ancestor of one; never leave an off-screen panel's controls tabbable.
- **Accessible names are localized strings.** A name that only exists as a hard-coded English
  literal in a template is a translation bug. Route it through the same mechanism as visible text.
- **Focus survives a rebuild.** When a list, tree or grid is rebuilt imperatively, restore focus by
  stable item key, not by index or DOM position. Focus falling to `<body>` loses a keyboard user's
  place entirely.
- **Reduced motion.** Auto-advancing or animating widgets honour
  `@media (prefers-reduced-motion: reduce)` in their own SCSS.
- **One message, one channel.** A string goes to *either* a live region *or* a described-by node
  — never both, or screen readers speak it twice, often at two urgencies. A live region is for
  transient events the user need not revisit; it self-clears, so it cannot hold anything
  re-readable. A **validation message must persist**, so it belongs in an `errorFeedback()` node
  referenced by `aria-errormessage` + `aria-describedby` from the **role-bearing** control, and is
  spoken by *moving focus there* — which means a refused submit must move focus, or the message is
  silent. Never announce by INSERTING a node that already carries `role="alert"`: a region mounted
  in the same task as its text is unreliably announced. And a validation message for a control
  whose role lives inside a WC's shadow root **must** travel in as `error-text` —
  `aria-describedby` on the roleless host reaches nothing.

### No-JS: two tiers, and the rules differ

Declare which tier a component targets, in the element's class comment.

**Tier 1 — CSS `:checked` state machine (interactive with no JS).** The `<input>` *is* the state, so
it MUST keep its native role — `role="button"` on a checkbox suppresses the only state AT can read.
It MUST carry `aria-controls` naming the region it reveals, MUST be named by a `<label for>` or
`aria-label` that reads correctly in both positions, and `checked` MUST mean *revealed* with no
viewport- or mode-dependent inversion. Reference implementation:
`libs/mintplayer-web-components/accordion/src/components/mp-accordion.ts` (`#renderNoJsItem`).

**Tier 2 — DSD chrome via `@lit-labs/ssr` (visible but inert with no JS).** The chrome contains the
**shadow** markup only, so: emit no role whose ARIA contract depends on attributes JS assigns to
**light-DOM** children (`role="menu"` without `menuitem`s is invalid, not merely incomplete); gate
any such role behind the `data-js` branch with a degradation that is valid without it; parameterise
the chrome generator on every attribute that changes ARIA **state**, not only structure; and never
render a control as enabled when it cannot function.

Both tiers: `aria-expanded` (or any state) written only from an event handler is frozen at its
template literal in the generated chrome. If JS is its only writer, the no-JS DOM lies.

### Before you open the PR

1. Tab through it, keyboard only. Every control reachable, visibly focused, no trap, Escape closes.
2. Every pointer gesture has a keyboard equivalent, and the demo page documents the keymap.
3. Roles/names/state asserted in a `*.aria.spec.ts` — the states too, not just the initial render.
4. `aria-label` / `role` / `id` / `tabindex` set on the wrapper land on the `mp-*` element, in all
   three frameworks.
5. If it has an `ssr/` dir: view it with JS disabled and check the tier rules above.
6. No `outline: none` without a `:focus-visible` replacement in the same stylesheet.

## Build & test

**Run test suites only once ALL milestones of a task are implemented — never after each one.**
The suites here are slow (`nx test mintplayer-ng-bootstrap` alone is ~2.5 min, a full
cross-app e2e sweep far longer), so a per-milestone run costs more time than it saves.
Verify intermediate work by reading the code and type-checking; commit per milestone if you
like, but batch the build + unit + e2e sweep into a single pass at the end.

```bash
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap        # ng-packagr secondary entries
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components        # vitest + jsdom
# backend (no migration unless entities change):
dotnet build apps/api/Api.csproj -c Debug
```

Issue branches target **`master`** (not `development`). Breaking changes are acceptable when documented — the libraries favor a clean API over back-compat shims.

**All pull requests are squashed into `master`.** No intermediate commit ever lands on the default
branch, so a commit part-way through a PR does **not** have to build or pass tests — only the final
state of the branch does. Commit freely at each milestone to keep the work reviewable and revertable;
don't hold back a commit because the suite is mid-refactor, and don't spend a run proving an
intermediate commit green. This is the other half of the batching rule above: verify by reading and
type-checking as you go, and run the suites once at the end.

A corollary for commit messages: since they are squashed away, the durable record of *why* is the PR
description and the docs under `docs/prd/` — put reasoning that outlives the branch there, not only in
a commit body.

### Pushing costs money — commit freely, push rarely

**Every push triggers the GitHub workflow, and every workflow run is billed** (money or included
credits). So:

- **Commit** at every milestone — commits are free and keep the work reviewable and revertable.
- **Push only when a feature is fully implemented, or a review/update flow is fully finished.**
  Never push "so CI can have a look" mid-feature, and never push a follow-up commit two minutes
  after the last one — batch them.
- A push that lands while a run is in flight **cancels that run** (concurrency group), so rapid
  pushes don't just cost extra, they also throw away the verdict you were waiting for. Several
  cancelled runs in a row means you paid for nothing.
- Verify locally instead: type-check, the targeted specs you are iterating on, and the batched
  suite sweep at the end (above). Push once, then read the single run.
