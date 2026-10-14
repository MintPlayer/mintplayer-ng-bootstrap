# PRD — `mp-card` must not leak broken global styles (#432)

Issue: [#432](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/432)
Status: **Proposed** (2026-10-14). Plan: [card-global-styles-432-plan.md](./card-global-styles-432-plan.md)

## 1. Problem

Loading any `<mp-card>` turns every Bootstrap `.text-bg-*` element on the page transparent,
whether it sits inside a card or not. The forced text colour still applies, so the text sits on a
transparent background. In dark mode the result is nearly invisible: a contrast of 1.36:1 was
measured downstream in MintPlayer.Spark. Three panels there are affected; one has a local
workaround that will be removed once the fix ships.

## 2. Root cause (investigated 2026-10-14)

All of it lives in one file, `libs/mintplayer-web-components/card/src/card-global.styles.scss`, and
the function that injects it, `ensureCardStylesInjected()` (`card/src/mp-card.element.ts:53-70`).
The file was added in #376.

1. **Invalid value.** Lines 96-101 hand-copy Bootstrap's `helpers/_color-bg.scss`, but pass the Sass
   colour where Bootstrap passes the CSS variable:

   ```scss
   background-color: RGBA($value, var(--bs-bg-opacity, 1)) if($enable-important-utilities, !important, null);
   // Bootstrap 5.3.8 writes: RGBA(var(--#{$prefix}#{$color}-rgb), var(--#{$prefix}bg-opacity, 1))
   ```

   Sass does not evaluate the upper-case `RGBA`, so it prints `RGBA(#ffc107, var(--bs-bg-opacity, 1))`
   for all 8 theme colours. The value contains a `var()`, so it cannot be rejected at parse time.
   It becomes invalid at computed-value time instead, and `background-color` falls back to
   `transparent`.
2. **Global and late in the cascade.** `ensureCardStylesInjected()` appends an unscoped
   `<style data-mp-card>` to the end of `document.head` at runtime. Its selectors have the same
   specificity as Bootstrap's, it is `!important`, and it comes later, so it beats Bootstrap's own
   correct `.text-bg-*` rules everywhere on the page.
3. **Re-ships a global partial.** `libs/mintplayer-ng-bootstrap/_bootstrap.scss` already loads
   `.text-bg-*` (the helpers, via `bootstrap-utilities`) and the `--bs-*-rgb` tokens (`root`). This
   breaks the CLAUDE.md rule against importing a Bootstrap partial the page already ships.
4. **Nothing guards it.** `_conformance/light-styles-scoping.spec.ts` only scans files ending in
   `*.light.styles.ts`, and the card's sheet doesn't match that name. Had it been scanned it would
   have failed: the decoy tree already contains `.card-title`. No spec checks declaration *values*.
   Visual specs are skipped in CI, and the committed baseline
   `apps/ng-bootstrap-demo-e2e/e2e/card.visual.spec.ts-snapshots/card-demo-chromium-win32.png`
   **already shows the bug**: the dark header and success footer render transparent.

### Wider audit (whole web-components library)

| Code that writes CSS to the document | Scoped? |
|---|---|
| `ensureCardStylesInjected()` (card) | **No.** All 25 selectors are unscoped |
| `installLightStyles()` (datatable, treeview, tree-select, query-builder ×4) | Yes. All 9 `@mps-global` blocks are anchored on `[data-mps]` |
| SSR `injectMpLightStyles()` | Yes. Same sheets as above; the card is not included |

- No other generated sheet, shadow or light, contains `RGBA(#`, a hex colour inside a colour
  function, or leftover Sass (`#{`, `$var`, `null`).
- In the local `dist`, `RGBA(#` appears only in `card/index.mjs`. The issue's suspicion of
  `chunks/install-light-styles-*.mjs` does not hold: that chunk doesn't exist locally (the installer
  is bundled into `light-dom/index.mjs`), and the installer only installs scoped sheets.

The card sheet has **further defects** that the issue does not mention but that are in scope here:

- **Unscoped `.card-*` rules** (`.card-header`, `.card-body`, `.card-footer`, `.card-img*`,
  `.card-title`, …) restyle *every* Bootstrap card on the page, not only `mp-card` content.
  `--mp-card-cap-bg` replaces `--bs-card-cap-bg`, which breaks themed and dark-mode headers on plain
  `.card`s. React and Vue demos load full Bootstrap, so they are hit hardest.
- **Dead rules:** `.text-bg-body`, `-white` and `-transparent` have no `!important`, so Bootstrap
  always wins over them.
- **No nesting support.** An `mp-card` rendered inside another WC's shadow root receives none of the
  document-level sheet. That is the nesting trap described in CLAUDE.md. `installLightStyles` +
  `adoptLightStyles` already solve it; the card does not use them.
- **Weaker SSR guard.** The card checks `typeof document`. The shared installer checks
  `document.head`, because Angular's and lit-ssr's DOM shims provide a `document` without a usable
  `head` (CLAUDE.md, `install-light-styles.ts:63-66`).

## 3. Goals

- G1. Loading `mp-card` changes nothing outside `mp-card` content. Page-level `.text-bg-*`,
  `.card-*` and every other Bootstrap rule keep the app's own styling, in light and dark mode.
- G2. Inside `mp-card`, header/footer colours (`text-bg-*`) and card regions render correctly,
  in light and dark mode, in all three frameworks. That includes the demo's "Header / footer
  colours" card, whose header is currently white-on-white.
- G3. No built `@mintplayer/web-components` module contains a hex colour inside a colour function
  (`RGBA(#`, `rgb(#`, `hsla(#`, …) or leftover Sass.
- G4. **Guards that can't miss this again.** They catch any document-level sheet with an unscoped
  selector or an invalid value, whichever code path installs it, and no longer depend on a
  filename glob.
- G5. Ship a patched package that Spark can adopt (version bump below).

## 4. Non-goals

- Converting `mp-card` to the light tier. It takes its content through real `<slot>`s, and CLAUDE.md
  is explicit: "Do not convert a slot-based component." The card keeps its shadow root.
- Restyling cards. Visual output inside `mp-card` must match today's *intended* look: the
  current visual baseline minus the transparent header and footer.

## 5. Design

### D1. Route the card sheet through the shared installer

Delete `ensureCardStylesInjected()`'s private `<style>` append and call
`installLightStyles('card', cardGlobalStyles)` instead. That one change gives the card:

- a single document-level writer with the correct SSR guard, a registry and an idempotency key;
- the nesting fix for free: hosts that already call `adoptLightStyles(this.renderRoot)` mirror the
  card sheet too;
- a single list of document-level sheets (`getLightStyleEntries()`) that the conformance guard (D4)
  can iterate.

The function name `ensureCardStylesInjected` stays exported if wrappers call it (audit: no wrapper
does). Otherwise it is removed. Breaking changes are acceptable when documented.

**Spike S2** must confirm that the installer accepts an un-rescoped, final-form sheet under a key,
and that the conformance spec can tell "anchored on `mp-card`" apart from "anchored on
`[data-mps]`" (see D2).

### D2. Anchor every rule on `mp-card`

Every selector in `card-global.styles.scss` gains an `mp-card` ancestor: `mp-card .card-header`,
`mp-card .card-title`, and so on. This is the "anchor on a scoped ancestor" technique from CLAUDE.md,
with the host tag as the anchor, because the card never stamps `data-mps` on consumer DOM, and must
not.

- Specificity rises from (0,1,0) to (0,1,1), so the card still beats Bootstrap's own `.card-header`
  inside an `mp-card`. That is the reason the sheet is global in the first place (the
  `::slotted()` weakness, see the CLAUDE.md cascade notes), and it is preserved.
- **Tag naming is safe here, unlike in `::slotted()`.** The CLAUDE.md trap ("never address slotted
  children by `mp-*` tag name") is about the *slotted element* being a wrapper. A descendant
  combinator from `mp-card` matches whichever wrapper sits in between: Angular's `bs-card` renders
  `<mp-card>` in its template and projects `bs-card-header` inside it. **Spike S1** verifies this in
  all three frameworks.
- **Over-reach into nested plain cards.** `mp-card .card-header` also matches a plain Bootstrap
  `.card` nested inside an `mp-card` body. S1 measures whether that matters and picks between:
  (a) accept it and document it, (b) child combinators for the region rules (`mp-card > .card-header`,
  only if every framework renders regions as direct light children of `mp-card`), or
  (c) `:not(.card .card) ` exclusion. **Preference: (b) where S1 shows it works in all three
  frameworks, (a) otherwise.** (c) is fragile.

### D3. `.text-bg-*`: stop re-shipping Bootstrap, keep the card's colour contract

- **Delete the `@each $theme-colors` block** and the three dead `.text-bg-body/white/transparent`
  rules. Bootstrap's helpers already ship them globally (`_bootstrap.scss`), with valid values that
  follow the page's theme and dark mode.
- For consumers who use the WC alone, without Bootstrap's utilities (the original reason for the
  block, see the header comment), **Spike S3** decides whether a card-scoped fallback is needed:
  `mp-card .text-bg-#{$name}` written with Bootstrap's exact value,
  `RGBA(var(--#{$prefix}#{$name}-rgb, <r>, <g>, <b>), var(--#{$prefix}bg-opacity, 1))`, and with
  `!important` only if S3 measures that Bootstrap's own `!important` rule would otherwise collide.
  **Default unless S3 says otherwise: no fallback** (the cleanest API, and Bootstrap is a documented
  peer). If a fallback ships, it is anchored on `mp-card` and so can never leak again.

### D4. Guards (conformance + e2e)

1. **Document-level sheet conformance:** a new spec, or an extension of
   `light-styles-scoping.spec.ts`. It iterates the *registered* document-level sheets, imported from
   their sources (light sheets + card sheet), not a filename glob. Rules:
   - every compound is anchored on `[data-mps=…]` **or** on a registered host tag (`mp-card`);
     exemptions are listed explicitly;
   - no selector matches the decoy tree, which gains `.text-bg-primary`, `.text-bg-warning`,
     `.card-header` and `.card-body` decoys **outside** any card.
2. **Invalid-value scan** `_conformance/no-invalid-color-functions.spec.ts`, modelled on
   `no-theme-attribute-selectors.spec.ts`. It scans every generated `*.styles.ts` /
   `*.light.styles.ts` / `*.element.template.ts` **and** every `dist/libs/mintplayer-web-components/**/*.mjs`
   for `/\b(rgba?|hsla?)\(\s*#/i`, `#{`, and `$identifier` outside comments. It asserts that the
   dist has at least one `.mjs` (an empty glob must fail, not pass). The existing `test` target
   already builds the dist first (via `codegen-ssr-chrome`), so this adds no CI step.
3. **Single-writer rule:** no source file other than `light-dom/src/install-light-styles.ts` (and the
   SSR injector) may call `document.head.append*`, `createElement('style')`, assign
   `document.adoptedStyleSheets`, or call `insertRule` on a document sheet. It is a source-text scan
   with an explicit exemption list, which stops a second private injector from appearing.
4. **E2E, real cascade:** `apps/ng-bootstrap-demo-e2e/e2e/card-global-styles.spec.ts` on
   `/basic/containers/card`. Readiness: the card's installed `<style>` exists (its marker changes
   with D1, so the spec waits on the installer's marker). Light, then dark via the
   `bs-theme-mode=dark` cookie (the `theme-toggle.spec.ts` pattern). Assertions:
   - a `<span class="badge text-bg-warning">` appended to `document.body` computes
     `rgb(255, 193, 7)`;
   - the demo's `bs-card-header.text-bg-dark` computes `rgb(33, 37, 41)`;
   - the footer `.text-bg-success` computes `rgb(25, 135, 84)`;
   - a plain Bootstrap `.card > .card-header` appended outside any `mp-card` keeps Bootstrap's
     `--bs-card-cap-bg` (this guards D2).

   All of these fail on master today. A plain span is required: `<bs-badge>` renders `bg-*`, not
   `text-bg-*` (`badge.component.ts:22`), so it would not reproduce the bug.
   The same check runs on React `/basic/card`, which loads full `bootstrap.min.css`, the setup
   closest to Spark's. Vue is optional, since the WC is shared.
5. **Refresh the card visual baseline** (`card-demo-chromium-win32.png`) locally on Windows with
   Chromium. The committed image encodes the bug.

## 6. Acceptance criteria

- After loading `<mp-card>`, a `.badge.text-bg-{primary,secondary,success,info,warning,danger,light,dark}`
  **outside** the card keeps Bootstrap's background in light and dark mode (issue AC1).
- A plain Bootstrap `.card` outside any `mp-card` renders exactly as without `mp-card` loaded.
- `mp-card` header and footer colours render opaque, with ≥ 4.5:1 contrast, in light and dark mode,
  in ng, React and Vue.
- No `RGBA(#…` or other hex-in-colour-function in any built module, enforced by spec (issue AC2).
- The regression e2e above is in the suite and fails on master (issue AC3).
- Only the shared installer writes CSS to the document, enforced by spec.
- The issue's `install-light-styles` concern is answered in the PR description: audited and clean.

## 7. Release

Versions are bumped by hand in the PR and published by `publish-master.yml` on merge.

| Package | Now | After |
|---|---|---|
| `@mintplayer/web-components` | 2.19.0 | **2.20.0** (minor: global `.card-*`/`.text-bg-*` rules are removed and `ensureCardStylesInjected` may be dropped; documented breaking cleanup) |
| `@mintplayer/ng-bootstrap` | 22.23.0 | 22.24.0, peer `^2.20.0` |
| `@mintplayer/react-bootstrap` | 19.23.0 | 19.24.0, peer `^2.20.0` |
| `@mintplayer/vue-bootstrap` | 3.24.0 | 3.25.0, peer `^2.20.0` |

If S3 keeps a card-scoped fallback **and** `ensureCardStylesInjected` stays exported, the change is
purely a fix, and patch bumps (2.19.1 / 22.23.1 / 19.23.1 / 3.24.1) are enough. Decide at the end
of S3. After release, MintPlayer.Spark updates and removes its merge-queue workaround (comment on
#432).

## 8. Open questions → spikes

| # | Question | Decides |
|---|---|---|
| S1 | Does `mp-card .card-*` / `mp-card > .card-*` match the region elements in ng, React and Vue, and how does it treat a plain `.card` nested in an `mp-card`? | D2 selector form |
| S2 | Can the card sheet go through `installLightStyles` unchanged (un-rescoped, final form)? What marker or key does it get, and does `adoptLightStyles` mirror it into a shadow host? | D1, D4.1 readiness marker |
| S3 | With Bootstrap's helpers loaded, do `mp-card` header/footer colours render correctly once the card's `.text-bg-*` block is gone? Without them (WC-only page), what breaks? | D3 fallback yes/no, version bump |
| S4 | Is the published npm 2.19.0 `card/index.mjs` byte-identical in this respect (`RGBA(#` present) to the local dist? | Confirms the fix targets what Spark actually installed |
