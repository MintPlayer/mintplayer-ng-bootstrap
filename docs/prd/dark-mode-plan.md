# Plan — Dark mode (issue #420)

PRD: [dark-mode.md](./dark-mode.md) (decisions D1–D11, locked in the 2026-09-30 grill)
Status: **Implemented** (2026-09-30), all milestones A–K on `feat/462-dark-mode`; not pushed. A4 folded into the K browser pass (no panel class needed).

## Conventions that apply throughout

- After any `.styles.scss` / `.light.scss` / `.element.scss` / `.element.html` edit, run
  `npx nx run mintplayer-web-components:codegen-wc`. After shadow markup or style changes, also run
  `codegen-ssr-chrome`. Generated files are gitignored; never stage or hand-edit them.
- Spikes live under `docs/prd/spikes/dark-mode/` (a throwaway harness plus a `FINDINGS.md`), following the
  `spikes/consumer-styles-in-shadow` precedent. Browser measurement uses the **playwright_node MCP**, never the
  `dcg:playwright` skill. Chromium + Firefox are required; WebKit is included where available.
- Core modules under `web-components/theming/` (`cookie.ts`, `resolve.ts`) are **pure and SSR-safe**: no `window` or
  `document` at module level, no Lit imports, and they use only the plain subset esbuild can downlevel to ES5
  (they feed the pre-boot bundle).
- Commit per milestone. **Run the suites once, at the end (milestone K)**. In between, verify by reading and running
  `tsc --noEmit`. Push once, when K is green.

## Milestone A — Spikes (throwaway; they gate C, E, F and I)

### A1 — Angular SSR attribute write (gates D4)
- [x] Add a temporary server branch in `BsThemeService`: `inject(REQUEST)` + `inject(DOCUMENT)` inside
      `isPlatformServer`, then a synchronous `documentElement.setAttribute` in the constructor. Also read
      `<meta name="bs-theme-default-mode">` from the server `DOCUMENT`.
- [x] On the SSR dev server, `curl -H 'Cookie: bs-theme-mode=dark'`. Check that the attribute is in the serialized
      `<html>`, that there is no NG0953, that the meta is readable on the server, and that prerender/extraction
      tolerates `REQUEST === null`.
- [x] With JS disabled the dark tokens apply; with JS, hydration leaves `<html>` alone.
- [x] Find the hook points for `Vary: Cookie` in `server.ts` and in the React/Vue `server.mjs`.

### A2 — Generated pre-boot bundle + packaging (gates D5)
- [x] Add an esbuild step in the WC Vite build (or a `tools/` script as an Nx target that `build` depends on) that
      bundles a stub `preboot.ts` → IIFE, ES5, minified. Check the output size, that it has no module syntax, and that
      it parses under an ES5 parser (e.g. `acorn --ecma5`).
- [x] Publish it at `@mintplayer/web-components/theming/bs-theme-preboot.js`: an explicit `exports` key beside the
      generated subpath exports (`tools/vite/multi-entry.mts`), plus `nxCopyAssetsPlugin` or an emitted file. Check
      `require.resolve` from a dist-linked folder.
- [x] Also publish `theming/color-mode.css` the same way, and confirm `_bootstrap.scss` can `@use` it: the source path
      in-workspace, the package path for consumers.
- [x] Angular demo production build: the assets glob copies the file, and the `<script src>` stays **before**
      critical-CSS `<link media="print" onload>` in the built `index.html`.

### A3 — Dark icons via style queries (gates D6, the main spike)
Harness: `<html data-bs-theme=dark>`, a nested `data-bs-theme=light` section, `mp-select` (plain, `-sm`/`-lg`, RTL,
disabled, `multiple`, rich), the query-condition value-editor select (light tier), and an `mp-checkbox` switch.
- [x] Global `color-mode.css` + `@container style(--mp-color-mode: dark) { … }` in the shadow sheet: check that the
      caret and knob flip, per engine, and that the nested light section wins.
- [x] The same rule in a `.light.scss`: does the rescoper pass `@container style()` through intact? If not, record the
      rescoper change it needs.
- [x] Forced-colors emulation on the data-URI icons, and on the existing accordion mask.
- [x] Record the per-engine × surface pixel colours in `FINDINGS.md`.
- **Outcome:** confirm Q (style queries), or trigger the **recorded mask fallback** (PRD D6) if any engine fails.

### A4 — Calendar in the CDK dropdown (gates D9/D10 detail)
- [x] Apply the D10 `.calendar-nav` rule and view `overlay/dropdown` in both themes. Decide whether the CDK pane
      needs a panel class.

## Milestone B — Core: pure helpers (web-components) [FR-2, FR-3, FR-4]
Files: `libs/mintplayer-web-components/theming/{index.ts, src/index.ts, src/cookie.ts, src/resolve.ts}`.
- [x] Add `BS_THEME_COOKIE_NAME`, `isValidThemeMode`, `readThemeCookie` and `writeThemeCookie` (D3), with a comment at
      the regex naming it a **security invariant**.
- [x] Add `resolveMode`, `readDefaultModeMeta(doc)`, `resolveServerTheme(cookieHeader, { defaultMode })` and
      `injectThemeAttribute(html, mode)` (merge into an existing `<html …>` tag; idempotent).

## Milestone C — Core: store (web-components) [FR-1, FR-5]
File: `theming/src/store.ts`.
- [x] Add the `bsTheme` singleton on `globalThis[Symbol.for('mintplayer.bs-theme')]`: lazy, browser-only.
      Its API is `getMode`, `effectiveMode`, `setMode`, `subscribe` and `configureBsTheme({ cookieDomain })`.
- [x] It owns the cookie write, the attribute write, one `matchMedia` listener, and the `BroadcastChannel`
      (applied without an echo). Add a test-only reset export.
- [x] Doc comment on `setMode` cross-referencing `BsThemeService` (the D4 invariant, naming the mirror spec).

## Milestone D — Pre-boot generation [FR-7] (per A2)
- [x] `theming/src/preboot.ts`: meta read → cookie → resolve → attribute, all in try/catch.
- [x] Add the build step, the size budget (≤ 1 KB), the no-module and ES5 checks, the explicit `exports` key and
      `color-mode.css` publishing.

## Milestone E — Dark icons + dead-rule removal + guard [FR-10, FR-11] (per A3)
Files: `theming/color-mode.css`, `libs/mintplayer-ng-bootstrap/_bootstrap.scss`, `_styles/form-select.styles.scss`,
`_styles/form-check.styles.scss`, `query-builder/src/mp-query-condition.light.scss`, navbar, carousel, accordion.
- [x] Add `color-mode.css`, and `@use` it from `_bootstrap.scss`.
- [x] Add `@container style(--mp-color-mode: dark)` rules for the `mp-select` caret, the query-condition caret and the
      switch knob. (The rescoper passes `@container style()` through unchanged.)
      *(A3 passed in all 3 engines: no mask fallback, no rescoper change needed.)*
- [x] Strip every dead `[data-bs-theme` rule from the generated output. Per partial, either restate the needed rules
      locally or neutralise them at the Sass level, and record the choice in the PRD as-built notes.
- [x] Add a forced-colors rule for the accordion mask (A3 outcome).
- [x] Add a comment documenting that the carousel controls stay white in both modes.
- [x] Add the dev-mode missing-token warning (once per page) in the shared helper that the affected components call.
- [x] Add `_conformance/no-theme-attribute-selectors.spec.ts`: it fails on `[data-bs-theme` in any generated
      `*.styles.ts` / `*.light.styles.ts`, with an explicit exemption list (empty).
- [x] Run codegen-wc and codegen-ssr-chrome.

## Milestone F — `mp-theme-toggle` WC [FR-9]
File: `theming/src/components/mp-theme-toggle.ts` (shadow tier; its class comment says "no-JS: none (control
requires script)").
- [x] Export `BS_THEME_DEFAULT_MODES`: auto (`circle-half`), light (`sun-fill`), dark (`moon-stars-fill`, two paths),
      with English label and announcement strings.
- [x] Add the `modes` property (property-only): validate the entries, cycle in array order, and have a not-in-list
      current mode show entry 0 and cycle to entry 1.
- [x] Name = the next entry's `label`. `aria-describedby` points at an in-shadow hidden node holding the current
      `announcement`, updated in the same render. `LiveAnnouncerController` announces on click.
- [x] Render the icons as `<path d>` inside a 16×16 viewBox, `aria-hidden` and `focusable="false"`.
- [x] Styles: a reserved 1.5em box, `color: inherit`, and a `:focus-visible` ring. Add a global
      `mp-theme-toggle:not(:defined)` size rule in `color-mode.css` so there is no shift before upgrade.
- [x] It subscribes to `bsTheme` in `connectedCallback` and unsubscribes on disconnect.

## Milestone G — Angular [FR-8, FR-4, FR-6]
Files: `libs/mintplayer-ng-bootstrap/theming/…`.
- [x] Rewrite `BsThemeService` as a thin mirror (per A1): browser = signals mirroring `bsTheme.subscribe`; server =
      `REQUEST` + `DOCUMENT` inside the server branch → `resolveServerTheme` with the meta default → seed the signals
      and write the attribute synchronously. Add the doc comment cross-referencing core `setMode`.
- [x] Reduce `provideBsTheme({ cookieDomain })` to forwarding to `configureBsTheme`.
- [x] Re-export the core helpers and constants. Delete `bs-theme-mode.ts`'s `BS_THEME_STORAGE_KEY`.
- [x] Add the `bs-theme-toggle` wrapper (`CUSTOM_ELEMENTS_SCHEMA`): a `modes` `input()` defaulting to
      `BS_THEME_DEFAULT_MODES`, forwarding host `aria-*`/`id`/`tabindex`.

## Milestone H — React + Vue [FR-1, FR-9]
- [x] React `libs/mintplayer-react-bootstrap/theming/`: `useBsTheme()` via `useSyncExternalStore` (server snapshot
      `auto`), and `BsThemeToggle` via `createComponent` (`modes` assigned through the ref, `...rest` spread).
- [x] Vue `libs/mintplayer-vue-bootstrap/theming/`: `useBsTheme()` (`shallowRef` + `subscribe`, released on scope
      dispose), and `BsThemeToggle.vue` (`inheritAttrs: false`, `v-bind="$attrs"`, `modes` prop).
- [x] Check that each lib's subpath exports include `theming` (the memory note records a missing-subpath-exports bug
      in the React/Vue libs).

## Milestone I — Demos, all three [FR-6, FR-7, FR-14]
- [x] **ng:**
  - replace the `index.html:9-31` inline script with the meta + `<script src>`, plus the `color-scheme` and two
        `theme-color` metas
  - add the assets glob (from the web-components source path)
  - `<bs-theme-toggle>` in `app.component.html:156-159`; delete `components/theme-toggle/` (keep the `.svg` loader
        and typings)
  - `server.ts`: `Vary: Cookie`; exclude the pre-boot file from the 1-year max-age
  - e2e locator → `bs-theme-toggle`
- [x] **react / vue:**
  - replace the inline OS-only script (react `index.html:12-27`, vue `index.html:~9-22`) and remove the "no toggle"
        comments
  - add `@import` for `color-mode.css` next to `bootstrap.min.css`
  - toggle in the navbar
  - `server.mjs`: `resolveServerTheme(req.headers.cookie, { defaultMode })` → `injectThemeAttribute`, plus
        `Vary: Cookie`
- [x] Theming docs page in each demo (live demo before the snippet), per FR-14. Update the ng `home.component.*`
      references.

## Milestone J — Colour fixes + calendar [FR-12, FR-13]
- [x] Scheduler: scrollbar `:1575,1579,1584`, and `:36`, `:37`. query-builder `:109`. datatable `:7` (delete the
      fallbacks at `:410,:421,:615`). treeview `:8`. code-snippet `:286`.
- [x] Dropdown CDK pane panel class: **not needed.** The K browser pass (standing in for A4) found the calendar fills the pane exactly and is opaque.
- [x] Demos:
  - ng: tab-control `:6`, scheduler `:3,:29`, anchor-scrolling `:4`, dock `:8`
  - ribbon tell-me box in ng, react and vue
  - accordion multi-level `#ccc` in ng, react and vue
- [x] Calendar: the D10 `.calendar-nav` rule, plus `.chevron-btn` as a `$cell-size` square. Run codegen-wc.
- [x] CHANGELOG `[Unreleased]` Breaking and Added entries (D11). Version bumps: ng-bootstrap **22.20.0**, plus a
      minor bump for web-components, react-bootstrap and vue-bootstrap.

## Milestone K — Tests + single verification sweep
- [x] Write the specs listed in PRD §5, in core, Angular, React, Vue and e2e for all three demos.
- [x] One sweep, each command's output redirected **raw** to a log in the scratchpad, reading the exit code, never
      piping:
  - `nx build` for mintplayer-web-components, -ng-, -react- and -vue-bootstrap
  - `nx test` for mintplayer-web-components, -ng-, -react- and -vue-bootstrap
  - e2e for ng, react and vue (theme-toggle + calendar + datepicker + query-builder), Chromium + Firefox
- [~] **Partial:** Chromium only for the manual pass (Firefox/WebKit are covered by the e2e suites, not by a manual pass). Browser pass (playwright_node MCP), light, dark and nested-light: every FR-10/12/13 surface, forced colors, the
      no-flash reload, and no layout shift on upgrade.
- [~] **Partial:** a manual keyboard pass was done in the Angular demo only; React/Vue are covered by e2e click-cycle specs. Keyboard pass on the toggle in all three demos: reachable, focus visible, Enter/Space cycles, the description
      reads the current state, and the announcement fires.
- [x] Fill in the PRD "As-built notes".
- [ ] Push once, then open the PR (waiting for explicit permission).

## Coordination
- [ ] Spark (#462) consumes ng-bootstrap **22.20.0** and the matching web-components once `publish-master` publishes
  both. Watch for the silent GitHub Packages half-publish flake.
- [ ] Spark's PRD must change its pre-boot path to `@mintplayer/web-components/theming/bs-theme-preboot.js` and add the
  `bs-theme-default-mode` meta if it wants a non-auto default.
