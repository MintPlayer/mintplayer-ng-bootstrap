# PRD — Dark mode: framework-neutral theme core, cookie + SSR, no-flash pre-boot, `mp-theme-toggle`, shadow-DOM dark fixes

Issue: [#420](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/420)
Plan: [dark-mode-plan.md](./dark-mode-plan.md)
Status: **Implemented** on `feat/462-dark-mode` (2026-09-30, grilled Q1–Q11, spikes A1–A3 passed). Not pushed; no PR yet. See §9 As-built notes.
First consumer: MintPlayer.Spark [#462](https://github.com/MintPlayer/MintPlayer.Spark/issues/462) (`docs/issue_462_PRD.md` on its
`feat/462-dark-mode` branch). Spark is blocked until `@mintplayer/ng-bootstrap@22.20.0` is on npm.

## 1. Problem

Dark mode already *half* works. Bootstrap 5.3.8's `[data-bs-theme=dark]` token block is in every consumer's global CSS
(`_bootstrap.scss` imports `root`), and `BsThemeService` already resolves `auto`/`light`/`dark`/custom and writes the
attribute. The rest does not hold up:

- **The choice cannot be read by a server.** It lives in localStorage, so no SSR app and no server-rendered page
  outside the SPA can render the right theme. The demo papers over this with an unvalidated inline localStorage script.
- **There is no shippable no-flash story.** Every consumer has to copy that inline script and keep a duplicated
  literal in lockstep with `BS_THEME_STORAGE_KEY`.
- **The toggle exists only in the demo.** It loads its icons with a dynamic `import()` that depends on a demo-only
  `.svg` loader, so the icon is empty in SSR output and pops in later. Its English labels are hard-coded.
- **Some components stay light inside dark pages.** Bootstrap's `color-mode(dark)` rules can never match from inside
  a shadow root, or from a light-tier sheet after rescoping. Several sheets also hard-code light values.
- **The calendar month header collapsed** (regression from #393, visible in light mode too).

## 2. Current state (investigated 2026-09-30 by five parallel read-only agents, file:line evidence)

### 2.1 Theming entry (`libs/mintplayer-ng-bootstrap/theming/`)

- API: `BsThemeMode` (`'auto'|'light'|'dark'|(string & {})`, `bs-theme-mode.ts:11`), `BsEffectiveThemeMode` (:17),
  `BS_THEME_STORAGE_KEY = 'bs-theme-mode'` (:25). `BsThemeService` is `providedIn: 'root'` (`bs-theme.service.ts:48`)
  and exposes `mode` (:56), `effectiveMode` as a `computed` (:62-66), and `setMode()` (:108-117).
- Everything runs inside an `isPlatformBrowser` branch (:69-100). That branch holds the NG0953 comment (:70-74) and
  injects `DestroyRef`/`DOCUMENT` there (:75-76). It reads localStorage without validation (:81-82), wires the
  `matchMedia` `change` listener (:87-93), and uses an `effect` to write `data-bs-theme` (:96-99). The server does nothing.
- Spec: 17 tests on vitest + jsdom 27.4 (`pool: 'forks'`, analog JIT). Almost all of them touch localStorage.
- Consumers: the demo's `theme-toggle` (rendered in the app shell, `app.component.html:158`, so the service runs on
  **every SSR render**), and the theming docs page (snippets at `theming.component.ts:86-139`; the API table lists
  `BS_THEME_STORAGE_KEY`), plus `home.component.*`.

### 2.2 SSR facts

- `REQUEST` is public in `@angular/core` 22.0.8 (`core.d.ts:3021`): `InjectionToken<Request | null>`,
  `providedIn: 'platform'`, factory `() => null`. Injecting it never throws. It is `null` in the browser, during
  build and prerender, and during route extraction. `@angular/ssr` fills it only for `RenderMode.Server`, and the
  demo uses `'**' → RenderMode.Server`.
- `server.ts` → `AngularNodeAppEngine.handle(req)` produces a WHATWG `Request`, so `headers.get('cookie')` is standard.
- **Correction to a stale assumption:** the demo **hydrates**. `app.config.ts:26` has
  `provideClientHydration(withEventReplay())`; there is no destructive bootstrap. Hydration manages only the root
  component subtree, so a server-written `<html data-bs-theme>` survives client boot.
- `server.ts:56-62` serves static files with `maxAge: '1y'`. There is no CSP anywhere in the repo.

### 2.3 Packaging

- The primary `ng-package.json` `assets` are exactly `./src/assets/**`, `./src/styles/**` and `./_bootstrap.scss`,
  which confirms the issue's claim. `theming/ng-package.json` has no assets.
- `package.json` `exports` is hand-written as `{"./bootstrap.scss": ...}`, and ng-packagr merges one key per entry.
  There is no `"./*"`. So an assets-glob **copy** works, but `import`/`require.resolve` of
  `@mintplayer/ng-bootstrap/theming/bs-theme-preboot.js` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` unless an
  explicit key is added.
- The demo consumes the lib **from source** (`tsconfig.base.json` paths; `styles.scss` `@forward`s
  `libs/.../bootstrap`). Its assets glob therefore points at `libs/…`, while real consumers point at
  `node_modules/…`.

### 2.4 Toggle

- `apps/ng-bootstrap-demo/src/app/components/theme-toggle/`: `CYCLE` (:13), `LABELS` "Switch to light/dark/auto
  theme" (:15-19, naming the **next** state), icons via `import('bootstrap-icons/icons/*.svg')` → `bypassSecurityTrustHtml`
  → `[innerHTML]` (:56-64), and `cycle()` (:67-72). `cycle()` maps a custom mode to `'auto'` (:70).
- The navbar's `::slotted(button)` rules do **not** reach the button, because the Angular host is what gets slotted
  (the CLAUDE.md wrapper trap). `.nav-link` is inert because the `nav` partial is not global. So the button currently
  looks right by accident, and the lib component must style itself.
- The e2e test `apps/ng-bootstrap-demo-e2e/e2e/theme-toggle.spec.ts` pins the locator `demo-theme-toggle button` and
  the label regexes.
- Precedent for inline icons: `mp-treeview.ts:59-62` and `mp-datatable.ts:1894` (`aria-hidden`, `focusable="false"`).
  bootstrap-icons is 1.11.4, all `viewBox 0 0 16 16`. **`moon-stars-fill` has two `<path>`s.**
- `BsLiveAnnouncerService` (`a11y/src/live-announcer/`) exists. `copy.directive.ts:3,13` is the precedent for
  announcing on click.
- React/Vue: **no theme service and no toggle.** Their demos' inline scripts follow the OS only, by design
  (`apps/react-bootstrap-demo/index.html:12-27`).

### 2.5 Dead dark rules (issue item 4a)

No WC `.scss` calls `color-mode(` itself. Every dead rule comes from an imported Bootstrap partial.

| Sheet | Tier | Symptom | Verdict |
|---|---|---|---|
| `_styles/form-select.styles.scss:13` → `mp-select` | shadow | caret `%23343a40` on dark bg | **bug** (query builder inherits it) |
| `query-builder/src/mp-query-condition.light.scss:22` (form-select, 2nd copy) | **light** | rescoper stamps the ancestor → `[data-bs-theme=dark][data-mps=query-condition] .form-select[…]`, dead (`rescope-css.spec.ts:154-159` documents the trap) | **bug, missed by the issue.** Styles the imperative value-editor `<select>`s (`builtin-editors.ts:136,166`) |
| `_styles/form-check.styles.scss:17` → `mp-checkbox`, `mp-radio`, toggle-button | shadow | unchecked switch knob `rgba(0,0,0,.25)` | **bug** (switch only) |
| navbar `.navbar-toggler-icon` dark variant | shadow | none: the icon is not rendered (bars use `var(--bs-navbar-color)`), and `mp-navbar.ts:129` already sets `data-bs-theme` on the host | dead code only |
| carousel `:root,[data-bs-theme=light]` / `[data-bs-theme=dark]` token blocks | shadow | controls stay white | dead code; white-in-both is the right look over photos |
| accordion chevron dark rule | shadow | none: the mask (`accordion.styles.scss:105-114`) ignores the baked colour | dead code only |

**The issue's datatable claim is wrong:** `mp-datatable`'s `.filter-operator` is a native `<select>`, not `mp-select`.
Checked clean: checked-state check/radio/switch icons (`#fff` on primary), validation icons (partial never imported),
btn-close (no SVG in WC sheets), dropdown carets (border triangles), pagination, datepicker, nav.
**No WC sheet has `forced-colors` handling**, the accordion's mask included.

### 2.6 Hard-coded light values (issue item 4b), verified

| Item | Verdict |
|---|---|
| scheduler scrollbar `#f1f1f1/#c1c1c1/#a1a1a1` (`scheduler.styles.scss:1575,1579,1584`) | verified. **The proposed token pair is too weak:** in dark, `--bs-secondary-bg` #343a40 vs `--bs-tertiary-bg` #2b3035 is nearly invisible |
| query-builder `--bs-btn-color: #646b72` (`mp-query-builder.light.scss:109`) | verified; ~2.4:1 in dark, fails AA |
| datatable hover `rgba(0,0,0,.04)` (`datatable.light.scss:410,421,615`) | **misplaced:** those are unreachable 2nd fallbacks. The real bug is `:7`, where `--bs-table-hover-bg` is undefined outside `.table`. The same bug is in `treeview.light.scss:8` (`--bs-list-group-action-hover-bg`) |
| card literals (`card-global.styles.scss:32-33,39-40`, `mp-card.element.scss:87`) | **wrong claim:** fallbacks that never fire inside `mp-card`, and `$card-bg` compiles to `var(--bs-body-bg)` in 5.3.8. No change |
| code-snippet "Copied!" `color: var(--bs-body-bg)` (`code-snippet.styles.scss:286`) | verified; #212529 on #198754 ≈ 3.2:1 in dark |
| dropdown containing a `bs-calendar` | partly right: `dropdown-menu.directive.ts:52` uses a CDK overlay with no panel class; the calendar table is opaque and only `.calendar-nav` is see-through (fixed by item 5) |
| tab-control demo `border-bottom: 10px solid black` (`tab-control.component.scss:6`) | verified |

**Found by the sweep, beyond the issue:**
- `scheduler.styles.scss:37` `--scheduler-greyed-slot-bg: rgba(0,0,0,.1)`: invisible in dark.
- `:36` `rgba(0,123,255,.3)`: should derive from `--bs-primary-rgb`.
- Demo "tell-me" ribbon box in **all three demos**: `rgba(255,255,255,.92)` bg + inherited text, so light on white.
  ng `ribbon.component.scss:8-19`, react `RibbonPage.css:20-32`, vue `RibbonView.vue:815-827`.
- Demo accordion multi-level `::part(content) { background: #ccc }` with inherited text, in all three demos.
- ng demo borders: scheduler `:3,:29`, anchor-scrolling `:4`, dock `:8`.
- Intentional, leave alone: `#fff` over coloured fills, carousel controls, hierarchy-chart label pair, shadows.

### 2.7 Calendar header (item 5), verified with one correction

`ec05bfaf` replaced the `tr:first-child > td` row with `div.calendar-nav` (`mp-calendar.element.ts:415`;
`.scss:71-86`). `$cell-size: 40px` exists (:11). The calendar is **shadow** tier. **Correction:** the nav *has* a
bottom border. It lacks height, top and side borders, and a background. The issue's fix is right, including
`border-bottom: 0`, because the table's top border draws the separator.

## 3. Design decisions (grilled with the user 2026-09-30; "Qn" = the grill question that locked it)

### D1 — Architecture: a framework-neutral core, adapters per framework, and a WC toggle (Q1 = C, Q3a)

All theme logic lives in **`@mintplayer/web-components/theming`**. The frameworks only adapt it:

```
@mintplayer/web-components/theming
├─ cookie.ts        BS_THEME_COOKIE_NAME, isValidThemeMode, readThemeCookie, writeThemeCookie   (pure, SSR-safe)
├─ resolve.ts       resolveMode(mode, prefersDark), resolveServerTheme(cookieHeader, {defaultMode}),
│                   injectThemeAttribute(html, mode)                                          (pure, SSR-safe)
├─ store.ts         bsTheme: getMode / effectiveMode / setMode / subscribe / configureBsTheme  (browser-only)
├─ preboot.ts       entry → GENERATED bs-theme-preboot.js                                     (D5)
├─ color-mode.css   --mp-color-mode rules                                                     (D6)
└─ mp-theme-toggle  Lit WC                                                                    (D7)
@mintplayer/ng-bootstrap/theming    BsThemeService (thin mirror + SSR), provideBsTheme, bs-theme-toggle wrapper
@mintplayer/react-bootstrap/theming useBsTheme() (useSyncExternalStore), BsThemeToggle
@mintplayer/vue-bootstrap/theming   useBsTheme() (shallowRef + subscribe), BsThemeToggle
```

The toggle **is** a Lit WC plus three wrappers, following CLAUDE.md's default. This reverses the earlier
Angular-only proposal: the user chose full parity.

### D2 — The store is a browser-only document singleton (Q2 = A)

- Registered on `globalThis[Symbol.for('mintplayer.bs-theme')]`, so duplicate bundle copies share one instance.
  It is created **lazily on first browser access and never exists on the server**, because a module singleton would
  leak between SSR requests.
- It owns every invariant:
  - validation
  - the cookie write (D3)
  - the `data-bs-theme` attribute write
  - the one `matchMedia` listener
  - the `BroadcastChannel('bs-theme-mode')` cross-tab sync: the receiver applies without posting or writing, so there
    is no echo
- `configureBsTheme({ cookieDomain })` is the only runtime option. Its shape stays backward-compatible, because two
  library versions on one page share whichever instance registered first.
- Specs reset the singleton between tests, and the channel is `close()`d so vitest forks don't hang.
- **Invalid `setMode()` argument:** a no-op with a dev-mode `console.warn`.

### D3 — Cookie contract (unchanged from the issue)

- The cookie is `bs-theme-mode`, not HttpOnly, with `Path=/`, `SameSite=Lax` and `Max-Age=31536000`. `Secure` is set
  only on `https:`, the cookie is renewed on every `setMode`, and `Domain` is set only when `cookieDomain` is given.
  `cookieDomain` is passed through as given and never derived.
- localStorage is **removed**, with no migration: stored choices reset to `auto` (breaking, CHANGELOG).
- Validation: `^[a-z0-9-]{1,32}$` (case-insensitive), lower-cased on read.
  **This is a security invariant**: `resolveServerTheme` output is spliced into markup unescaped, and a spec names it
  that way.
- Parsing: split on `;`, trim, take the **first** `bs-theme-mode=` pair, `decodeURIComponent` inside try/catch,
  invalid → absent.

### D4 — `BsThemeService` stays, as a thin mirror (Q3a = A)

It exists for what only Angular can do: **per-request server state**, since Angular SSR creates a root injector per
request; **injection of `REQUEST` and `DOCUMENT`**; and **signals**.

- **Browser:** `mode` / `effectiveMode` signals mirror `bsTheme.subscribe()`, and `setMode` forwards to `bsTheme.setMode`.
  It holds **no copy** that could drift: a toggle click (which talks to the store directly) must update the signal.
- **Server:** `REQUEST` and `DOCUMENT` are injected **inside the `isPlatformServer` branch** (keeping the NG0953 rule;
  `DestroyRef` stays browser-only). It computes `resolveServerTheme(request?.headers.get('cookie'), { defaultMode:
  <meta from server DOCUMENT> })`, seeds the signals, and for an explicit result writes `data-bs-theme` on the server
  `<html>` **synchronously in the constructor**. `REQUEST` is null during prerender and extraction, which is handled as
  "no cookie".
- `provideBsTheme({ cookieDomain })` forwards to `configureBsTheme`. `defaultMode` is **not** an option here (D5b).
- **Cross-reference comments are required:** both `BsThemeService` and the core `setMode()` carry a doc comment
  pointing at each other. It states that the service is a pure mirror of the store, that behaviour added to one must
  be reflected in the other, and which spec pins it. This is so future sessions keep them converged.

### D5 — `bs-theme-preboot.js` is generated from the core and shipped once (Q4 = A)

- An esbuild step bundles `preboot.ts` (which imports `readThemeCookie`, `resolveMode` and the meta read) into
  `theming/bs-theme-preboot.js`: IIFE, **ES5 target**, minified, try/catch around the whole body.
- It publishes as `@mintplayer/web-components/theming/bs-theme-preboot.js`, with an explicit `exports` key. **No
  copies in the framework packages.** Angular, React and Vue docs all point at that one path.
- **Build guards:** a size budget (fail over **1 KB**); the output must contain no `import`/`export` and must parse as
  ES5. The core modules it pulls in stay side-effect-free and use only the plain subset esbuild can downlevel to ES5.
- Consumers copy it with an assets glob and load it with a blocking `<script src>` in `<head>`, **after** the meta
  (D5b) and before the stylesheets. Spike A2 verifies that it stays ahead of Angular's critical-CSS rewrite.
- It always runs, even after a server wrote the attribute. The result is the same, and that keeps cached and non-SSR
  pages correct. The demo servers exclude it from the one-year max-age.
- The spec shrinks to a smoke test of the bundle across cookie cases, because generated code cannot drift from the
  core.
- **Spark note:** the issue text says it ships from ng-bootstrap. Spark's PRD must point at the web-components path.

### D5b — `defaultMode` is declared once, in the HTML (Q5 = B)

- `<meta name="bs-theme-default-mode" content="dark">` in `<head>`, **before** the pre-boot script. The value is
  validated with the D3 regex, and absent or invalid means `auto`.
- It is read by the pre-boot script (synchronously), by the store on init, and by `BsThemeService` from the **server
  `DOCUMENT`**. Angular therefore needs no option at all.
- React/Vue `server.mjs` pass it to `resolveServerTheme({ defaultMode })` explicitly. They splice the attribute before
  any parsed DOM exists, so this is the one remaining duplicate, and the docs show it right beside the meta tag.
- A non-`auto` default counts as explicit on the server: it renders the attribute.
- **Precedence** (confirmed in spike A1): a valid cookie wins, including a valid `auto` cookie over a non-auto meta,
  since the user's explicit choice beats the site default. Then the meta. Then `auto`. An invalid cookie counts as
  absent, so the meta applies.

### D5c — Critical CSS keeps the dark tokens (Q11 = B, found by spike A2)

Angular's critical-CSS inliner (beasties) prunes every `[data-bs-theme=dark]` rule, because the static `index.html`
carries no attribute. The effect: a dark user paints light until the async stylesheet arrives. That hits `auto`,
prerendered pages, cached pages and CSR builds.

- **Fix:** `_bootstrap.scss` wraps the dark token block (Bootstrap's `[data-bs-theme=dark]` `--bs-*` block plus the
  `color-mode.css` rules) in beasties' `/* beasties:include start */ … /* beasties:include end */` markers. The
  implementation must first verify that the markers survive Angular's CSS minification (loud `/*!` comments, if
  needed).
- **Recorded fallback:** if they don't survive, set `optimization.styles.inlineCritical: false` in the demo and in
  the docs.
- **As built, the fallback applies.** Angular's CSS minifier strips every comment (`removeSpecialComments`), and
  beasties 0.4.2 only honours markers matching `^(?<!! )beasties:`, which excludes the loud `/*!` form. So neither
  marker form can reach it. `html:is([data-bs-theme=dark])` fails too: beasties never matches `<html>` itself. The
  outcome:
  - The demo sets `inlineCritical: false`.
  - The theming docs tell Angular consumers to do the same.
  - `nx run ng-bootstrap-demo:check-critical-css` (`tools/scripts/check-critical-dark-tokens.mjs`) fails the moment
    inlining is re-enabled without the dark tokens.
- **Guard:** a production-build check asserts that the inlined `<style>` in the built `index.html` contains
  `[data-bs-theme=dark]`. This catches a silent regression if Angular swaps inliners again.

### D5d — Static-file shipping fix (found by spike A2, in scope)

`nxCopyAssetsPlugin` silently skips gitignored files, so **`custom-elements.json` is missing from the published
`@mintplayer/web-components@2.16.0`**. An `emitStaticFiles()` Vite plugin (in `tools/vite/`, calling `this.emitFile`
in `generateBundle` and failing when a file is missing) ships `custom-elements.json`, `theming/bs-theme-preboot.js`
and `theming/color-mode.css`.

### D6 — Dark icons inside shadow and light-tier sheets: style queries (Q10 = C′, gated by spike A3)

- **Global token:** `@mintplayer/web-components/theming/color-mode.css` holds only
  `:root,[data-bs-theme=light]{--mp-color-mode:light}` and `[data-bs-theme=dark]{--mp-color-mode:dark}`.
  - `_bootstrap.scss` `@use`s it, so Angular gets it automatically.
  - React/Vue consumers load stock `bootstrap/dist/css/bootstrap.min.css` (verified in both demos), so they add
    **one `@import`** beside it, and the demos do exactly that.
  - Custom themes declare their own `--mp-color-mode: dark|light` in their block. The docs say so.
- **Component sheets** replace Bootstrap's dead `[data-bs-theme=dark] .x { … }` with
  `@container style(--mp-color-mode: dark) { .x { … } }`. Style-container lookup crosses shadow boundaries, and the
  light-tier rescoper must pass `@container style()` through; the spike verifies that. Bootstrap's own data-URIs stay
  untouched. The surfaces are:
  - the `mp-select` caret
  - the query-condition native select caret (light tier)
  - the `mp-checkbox` / toggle-button switch knob
- **Dev-mode warning:** the first component that relies on the token checks
  `getComputedStyle(document.documentElement).getPropertyValue('--mp-color-mode')`. If it is empty, it logs one
  `console.warn` naming the missing import. This costs nothing in production.
- **Recorded fallback:** if A3 shows custom-property style queries unsupported in any of the three engines, fall back
  to **masks** (the accordion pattern, `currentColor`/`var(--bs-*)` fill, per-icon `:host::after` / wrapper layer,
  plus a forced-colors rule). That fallback is part of this decision, not a surprise.
- **Whichever mechanism ships:**
  - Every dead `[data-bs-theme` rule is removed from the generated output: form-select, form-check, navbar,
    carousel, accordion, and the query-condition light copy.
  - A conformance spec fails the build if any generated `*.styles.ts` / `*.light.styles.ts` contains `[data-bs-theme`.
    Exemptions are explicit and expected to be none.
  - Forced-colors emulation is checked for every icon touched, the accordion's mask included.
- Carousel: the dead blocks are deleted, and white controls in both modes are documented. There is no dark inversion.

### D7 — `mp-theme-toggle` (Q6 = A, Q7 = B′, Q8 = A + description)

- **Tier:** shadow (it mounts no consumer DOM). It has **no no-JS tier and no DSD chrome**, and nothing is added to
  `codegen-ssr-chrome`, because a toggle cannot work without script and must never render enabled when it can't
  function. `:host` and a global `mp-theme-toggle:not(:defined)` rule reserve a 1.5em box, so upgrading causes no
  layout shift. The class comment declares "no-JS: none (control requires script)". No-JS users still get OS-following
  colours via the pre-boot script and CSS.
- **`modes` property (property-only, not an attribute):** an array of `{ mode, label, announcement, icon }`.
  - `icon` is SVG path data (a string or `string[]`; `moon-stars-fill` has two paths), rendered as `<path d>` in a
    16×16 viewBox with `fill: currentColor`, `aria-hidden="true"` and `focusable="false"`.
  - The default is the exported `BS_THEME_DEFAULT_MODES` (auto, light, dark). The cycle order is the array order.
    Consumers localize by spreading the default and overriding the strings, and they can pass 2, 4 or 5 entries.
  - Entries whose `mode` fails `isValidThemeMode` are dropped with a dev warning.
  - A current mode not in the list shows the first entry's icon and cycles to the second.
  - The docs note that more than about three modes wants a menu (radio group) instead. That is a different widget and
    out of scope.
- **Name, description and announcement:**
  - The accessible name is the **next** entry's `label` (the action, e.g. "Switch to dark theme").
  - `aria-describedby` points to a visually hidden node **in the same shadow root** holding the **current** entry's
    `announcement` (e.g. "Light theme"). Both update in the same render as the mode change.
  - After a click, `LiveAnnouncerController` (`a11y/src/live-announcer.ts`) announces the new entry's `announcement`.
    That is one channel per message: the description is persistent, the announcement transient.
  - No `aria-pressed`, and no arrow symbol in the name.
- **Styling:** `color: inherit`, no background or border, and its own `:focus-visible` ring.
- **Wrappers** are transparent (CLAUDE.md): Angular forwards host `aria-*`/`id`/`tabindex`; React spreads `...rest`;
  Vue uses `inheritAttrs: false` + `v-bind="$attrs"`. `modes` is an Angular `input()`, a React prop assigned via the
  ref, and a Vue prop.

### D8 — React/Vue adapters and demos at full parity (Q3 = A, Q9 = A)

- `useBsTheme()` returns `{ mode, effectiveMode, setMode }`: React via `useSyncExternalStore` (its server snapshot is
  `auto`), Vue via `shallowRef` + `subscribe`, released on scope dispose.
- All three demos:
  - load the generated pre-boot file + the meta tag, replacing the inline scripts (ng `index.html:9-31`,
    react `index.html:12-27`, vue `index.html:~9-22`)
  - render the toggle in the navbar
  - have `server.ts`/`server.mjs` call `resolveServerTheme` and splice the attribute onto `<html>` through the shared
    `injectThemeAttribute(html, mode)` helper (which merges with existing `<html>` attributes and has its own spec)
  - set `Vary: Cookie` on SSR responses
  - get a theming docs page (live demo before the snippet)
  - get e2e coverage
- The old "intentionally NO in-app theme toggle" comments are removed, not left behind.

### D9 — Hard-coded values

- Scheduler scrollbar: `scrollbar-color: var(--bs-secondary-color) var(--bs-tertiary-bg)`, with the same tokens in
  the webkit rules. The thumb uses `--bs-secondary-color`, not `--bs-secondary-bg` (§2.6).
- Scheduler `:36,:37` → `rgba(var(--bs-primary-rgb), .3)` / `rgba(var(--bs-emphasis-color-rgb), .1)`.
- query-builder `:109` → `var(--bs-secondary-color)`.
- datatable `:7` and treeview `:8` → `rgba(var(--bs-emphasis-color-rgb), .04)` fallback.
- datatable `:410,:421,:615`: the fallbacks there are **not** dead, despite what §2.6 says. The filter panel is
  portaled outside the datatable host (#415), where `--mp-datatable-row-hover-bg` is undefined. They stay, and are
  retokenized the same way. This was caught by `mp-datatable.filter-panel-styles.spec.ts`.
- code-snippet `:286` → `var(--bs-white)`.
- **Card: no change.**
- Dropdown CDK pane panel class, **only if** spike A4 says so after D10.
- Demos, all three: ribbon tell-me box → `var(--bs-body-bg)`/`var(--bs-border-color)`/`var(--bs-secondary-color)`,
  and accordion multi-level `#ccc` → `var(--bs-secondary-bg)`. ng demo: tab-control, scheduler, anchor-scrolling and
  dock borders → tokens.

### D10 — Calendar header

Use the issue's `.calendar-nav` rule verbatim. `.chevron-btn` becomes a `$cell-size` square with its focus ring kept.
It is checked in light and dark, standalone, inside the dropdown, and inside the datepicker popup.

### D11 — Release

- `@mintplayer/ng-bootstrap` **22.20.0** (minor, as the issue decides).
- `@mintplayer/web-components`, `@mintplayer/react-bootstrap` and `@mintplayer/vue-bootstrap` get **minor** bumps,
  because they gain the theming entries and the toggle. All publish together, since Spark needs ng-bootstrap
  22.20.0 **and** the matching web-components.
- CHANGELOG **Breaking**:
  - the cookie replaces localStorage (choices reset)
  - `BS_THEME_STORAGE_KEY` is gone, replaced by `BS_THEME_COOKIE_NAME` from the WC core
  - `bs-theme-toggle` is now a wrapper over `mp-theme-toggle` with a `modes` input
  - dead `[data-bs-theme]` rules are removed from WC sheets
  - React/Vue consumers must import `color-mode.css`

## 4. Functional requirements

- **FR-1** `auto` follows `prefers-color-scheme` live, and explicit/custom modes are sticky, in all three frameworks.
- **FR-2** The mode persists in the `bs-theme-mode` cookie (D3). localStorage is never touched.
- **FR-3** An invalid cookie value is absent. `setMode(invalid)` is a no-op with a dev warning.
- **FR-4** `configureBsTheme` / `provideBsTheme` apply `cookieDomain`. The meta tag sets the default mode for the
  pre-boot script, the store and the Angular server.
- **FR-5** `setMode` in one tab re-themes the others without a reload or an echo.
- **FR-6** SSR in all three demos renders `<html data-bs-theme>` for an explicit cookie or a non-auto default, and
  nothing for auto. Responses carry `Vary: Cookie`.
- **FR-7** The generated `bs-theme-preboot.js` is published from web-components, is ES5, stays at 1 KB or under, and
  is loaded by all three demos.
- **FR-8** `BsThemeService` mirrors the store with no drift, and the cross-reference comments are present.
- **FR-9** `mp-theme-toggle` + three wrappers:
  - `modes` drives the cycle, icons, labels and announcements
  - the name is the next action, the description is the current state, and each click is announced
  - no layout shift on upgrade
  - a visible focus ring
  - wrapper passthrough in all three frameworks
- **FR-10** The `mp-select` caret, the query-condition caret and the switch knob follow the theme, including nested
  `data-bs-theme=light` sections and forced colors. A missing `color-mode.css` triggers a dev warning.
- **FR-11** No generated WC sheet contains `[data-bs-theme`, enforced by a conformance spec.
- **FR-12** Every D9 item is fixed and checked in both themes.
- **FR-13** The calendar header is restored in both themes.
- **FR-14** Theming docs pages exist in all three demos: the cookie, the meta tag, the assets glob plus
  `<script src>`, `color-mode.css` (React/Vue), `<meta name="color-scheme">` + two `theme-color` metas, the server
  splice + `Vary: Cookie`, the toggle with `modes` and localization, and "more than 3 modes → use a menu".

## 5. Testing requirements

- **Core (WC lib, vitest):**
  - cookie helper tables, including the regex-as-security-invariant case
  - `resolveServerTheme`
  - `injectThemeAttribute` (merges existing `<html>` attributes, idempotent)
  - store: auto live, sticky explicit, restore, invalid, `cookieDomain`, Secure only on https, broadcast with no echo,
    singleton reset
  - pre-boot bundle smoke test across cookie and meta cases, plus the size, no-module and ES5 assertions
  - the `mp-theme-toggle` spec and `*.aria.spec.ts`: cycle order, custom and not-in-list modes, invalid entries
    dropped, name = next label, description = current announcement updating in the same render, announcement fired,
    icons `aria-hidden`
  - the conformance spec for no `[data-bs-theme`
  - the dev warning for a missing token
- **Angular:**
  - service mirror spec: a store write updates the signal, and `service.setMode` reaches the store
  - server spec: `PLATFORM_ID='server'` + `REQUEST = new Request(url, {headers: {cookie}})` + a server document with
    or without the meta; explicit / auto / none / null REQUEST
  - wrapper spec with a signal-driven host: `modes` input and attribute passthrough
- **React/Vue:** hook/composable specs (subscribe/unsubscribe, server snapshot) and wrapper passthrough specs.
- **e2e, all three demos:**
  - toggle cycle + cookie set
  - reload with the cookie and **JS disabled** → `data-bs-theme` present (proves the SSR splice)
  - pre-boot file served
  - no layout shift on upgrade (bounding box before and after `:defined`)
- **Manual browser pass** (playwright_node MCP), light, dark and nested-light, Chromium + Firefox (+ WebKit where
  available): every FR-10/12/13 surface, forced-colors emulation, and the no-flash reload.

## 6. Out of scope

- A menu/radio-group theme picker (the recommended widget for more than 3 modes). It is a different component.
- Deriving `cookieDomain` automatically (needs the public-suffix list).
- `Sec-CH-Prefers-Color-Scheme` (Chromium-only, absent on the first request).
- Dark inversion of carousel controls.
- `$color-mode-type: media-query` (it would break the scoped navbar and the precompiled CSS).
- A no-JS tier or SSR chrome for the toggle (D7).

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Server `DOCUMENT`/`REQUEST` inject reintroduces NG0953 | inject inside the server branch only; spike A1 |
| Module singleton leaks across SSR requests | the store is browser-only by construction; the server uses pure helpers and Angular's per-request injector |
| Service and store drift apart | pure mirror, cross-reference comments, mirror spec (D4) |
| Shared caches serve one user's theme to another | `Vary: Cookie` in all demo servers; docs warning |
| Pre-boot bundle bloats through a stray import | 1 KB budget + no-module + ES5 assertions |
| Unescaped server splice | the regex is a named security invariant, with a spec |
| Style queries unsupported in one engine | the recorded mask fallback (D6), decided by spike A3 |
| React/Vue forget `color-mode.css` | dev-mode warning naming the import |
| The rescoper mangles `@container style()` | spike A3 checks the light-tier output; rescoper fix in F if needed |
| `BroadcastChannel` keeps vitest forks alive | `close()` + singleton reset per test |
| The toggle's `auto` icon in SSR disagrees with the pre-boot result | no chrome; reserved empty box until upgrade (D7) |
| Two library versions on one page share the store | a backward-compatible store shape; documented |

## 8. Open questions

None. All were resolved in the 2026-09-30 grill (Q1–Q11).

**Spike outcomes** ([spikes/dark-mode/FINDINGS.md](./spikes/dark-mode/FINDINGS.md)):
- A1 confirmed D4.
- A2 confirmed D5 and produced D5c and D5d.
- A3 confirmed D6 (style queries pass in Chromium 151, Firefox 153 and WebKit 26.5; the rescoper needs no change),
  so the mask fallback is **not** used. Forced colours still need their own rules:
  - select: `appearance: auto; background-image: none`
  - switch knob: an override
  - accordion mask: `background-color: CanvasText`

**Implementation notes from the spikes:**
- The esbuild ES5 pipeline must be es2015 IIFE → `ts.transpileModule` → es5 minify.
- React/Vue Vite need a `resolve.alias` for the `color-mode.css` import.
- Local SSR runs need `NG_ALLOWED_HOSTS=localhost` and requests to `127.0.0.1`.

## 9. As-built notes (2026-09-30)

**Deviations from the decisions above:**
- **D5c:** the fallback applies. `inlineCritical: false` is used, guarded by `check-critical-css`.
- **D9:** the datatable portal fallbacks are kept, not deleted.
- **D4:** SSR construction. `BsThemeService` renders the server attribute in its constructor, but once the toggle
  talked to the store directly, nothing guaranteed the service got constructed. The demo's SSR check caught it:
  `/` with a dark cookie rendered no attribute. Now both `provideBsTheme()` and `bs-theme-toggle` inject it.

**How the dead dark rules were removed, per partial (D6):**
- form-select, form-check, accordion and query-condition: `$enable-dark-mode: false` before the variables import.
- navbar and carousel: the rules they use are restated locally. The carousel tokens are pinned light on `:host`, so a
  page's dark swap from stock `bootstrap.min.css` can't invert the controls.

**`mp-theme-toggle` (D7):**
- Pre-upgrade box: the `mp-theme-toggle:not(:defined)` rule must match the `:host` `vertical-align`/`line-height`,
  or upgrading shifts the toggle 4px. The e2e layout-shift specs pin this.
- `modes` setter: `null`/`undefined`, an empty list or an all-invalid list all fall back to `BS_THEME_DEFAULT_MODES`.
  A toggle with zero modes is never rendered.

**Packaging:**
- `esbuild` (pinned to 0.28.1 to match `@angular/build`) and `acorn` are now explicit devDependencies of the
  workspace.
- The React/Vue peer range on `@mintplayer/web-components` is `^2.17.0`, and ng-bootstrap's dependency is too.

**Verification:**
- **Builds:** the four library builds pass.
- **Unit tests:** web-components, ng, react and vue all pass. Two failures surfaced and were fixed: the `preboot.spec`
  path, and the datatable portal fallback.
- **e2e:** all theme specs pass in every engine for all three demos.
- **Pre-existing failures,** confirmed identical on `master` 26ab9813:
  - `card.visual.spec.ts:39`: a stale baseline; code-snippet toolbars are about 20px taller since #402.
  - `datatable-filter.spec.ts:230` (the flip-above check).
  - `scheduler-views.spec.ts:1165`: depends on today's date.
- **Flakes that passed on rerun:** dock-intersections :39/:87, dock-keyboard :135, and the axe
  `/basic/forms/phone-input` "on load" check.
- **Browser pass** (playwright_node, Chromium, light, dark and nested-light): every FR-10/12/13 surface OK; forced
  colours OK. The toggle's keyboard behaviour, name, description, announcement and cookie are OK. SSR attribute and
  `Vary` OK in Angular and React.
- **A4:** the CDK pane is transparent, but the calendar fills it exactly and is opaque, so no panel class is needed.
