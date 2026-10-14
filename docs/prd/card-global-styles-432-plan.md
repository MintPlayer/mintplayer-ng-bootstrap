# Plan — `mp-card` global-style leak (#432)

PRD: [card-global-styles-432.md](./card-global-styles-432.md)
Status: **S1–S4, M1–M4, M6 done; M5 visual baseline + M7 sweep pending** (2026-10-14), on `fix/432-card-global-styles` → `master`.
Everything lands in **one PR**.

Spike artifacts go in `docs/prd/spikes/issue-432/`, one short `S<n>-*.md` per spike. Each records
what was measured, in which engines, and the decision it settles. Throwaway harness code stays out
of the libs.

| Milestone | Scope |
|---|---|
| S1–S4 | Spikes: selector form, installer fit, `.text-bg-*` fallback, published-tarball check |
| M1 | Card sheet → `installLightStyles`; delete the private injector |
| M2 | Rewrite `card-global.styles.scss`: anchor on `mp-card`, drop re-shipped helpers |
| M3 | Conformance: document-level sheet scoping + decoys, single-writer rule |
| M4 | Conformance: invalid colour-function / leftover-Sass scan (sources + dist) |
| M5 | E2E regression (ng + React) + visual baseline refresh |
| M6 | Versions, docs, CLAUDE.md note |
| M7 | Single verification sweep, PR |

## Spikes (run first; each one decides something in the PRD)

### S1: selector form across frameworks
- In the running ng, React and Vue demos (`playwright_node` MCP), on the card page, evaluate
  `el.matches('mp-card .card-header')` and `el.matches('mp-card > .card-header')` for header, body,
  footer, title and img in each framework. Record the actual parent chain: does Angular put
  `bs-card-header` between `mp-card` and `.card-header`, or is the class on the wrapper host?
- Inject a plain Bootstrap `.card` into an `mp-card` body and record which rules hit it.
- **Decides** D2: (b) child combinator wherever every framework allows it, otherwise (a), documented.

### S2: installer fit
- Read `light-dom/src/install-light-styles.ts`. Check that `installLightStyles('card', cardGlobalStyles)`
  installs an un-rescoped sheet verbatim, and record the marker or attribute it writes (needed by
  the M5 readiness wait).
- Check that `adoptLightStyles()` mirrors it into a shadow host. Does any existing shadow WC render
  an `mp-card` (dock, tile-manager, file-manager)? If so, that host is a nesting-bug witness for M5.
- Check whether `getLightStyleEntries()` (or equivalent) can feed the M3 conformance spec. If
  `injectMpLightStyles` (SSR) needs the card sheet so it can render without JS, add it, and decide
  whether the card's SSR chrome needs it.
- **Decides** D1 details, the M3 data source and the M5 readiness selector.

### S3: `.text-bg-*` without the card's copy
- Temporarily delete the `@each` block, regenerate with `codegen-wc`, and view the demo "Header /
  footer colours" card in ng and React, light and dark. Then repeat on a page with no Bootstrap
  utilities loaded: a scratch HTML page importing only the WC dist.
- **Decides** D3 (no fallback by default) and therefore the version bump (PRD §7).

### S4: published tarball
- Run `npm pack @mintplayer/web-components@2.19.0` into a fresh empty scratchpad dir and grep
  `card/index.mjs` for `RGBA(#`. Note whether `chunks/install-light-styles-*.mjs` exists there
  (it does not locally) and grep it too, so the issue's third question is answered against what
  Spark really installed.

## M1: one document-level writer
- `card/src/mp-card.element.ts`: `connectedCallback` calls `installLightStyles('card', cardGlobalStyles)`.
  Remove the `cardStylesInjected` flag and the `document.createElement('style')` /
  `document.head.appendChild` path.
- Remove the export `ensureCardStylesInjected`, or keep it as a one-line delegate only if S3 calls
  for patch bumps. Fix the stale comment in `install-light-styles.ts:6` that refers to it.

## M2: rewrite `card-global.styles.scss`
- Prefix every rule with the S1-chosen anchor. Remove the `@each $theme-colors` `.text-bg-*` block and
  the three dead `.text-bg-body/white/transparent` rules, unless S3 calls for a fallback; in that
  case write it card-anchored, with Bootstrap's exact
  `RGBA(var(--#{$prefix}#{$name}-rgb, …), var(--#{$prefix}bg-opacity, 1))`.
- Update the file's header comment to say why it is anchored and why the helpers are not shipped.
- Check whether `variables-dark` / `mixins` are still needed once the `@each` block is gone, and drop
  any unused imports.
- `npx nx run mintplayer-web-components:codegen-wc`, then grep the generated `card-global.styles.ts`:
  zero `RGBA(`, every selector anchored.

## M3: document-level scoping conformance
- Extend `_conformance/light-styles-scoping.spec.ts`, or add `document-styles-scoping.spec.ts`
  beside it, so it iterates the registered document-level sheets (the S2 data source), not
  `*.light.styles.ts` filenames.
- Allowed anchors: `[data-mps=<scope>]` or a registered host tag (`mp-card`). Any exemption goes in
  an explicit, commented list.
- Add `.text-bg-primary`, `.text-bg-warning`, `.card-header` and `.card-body` decoys **outside** any
  card to the decoy tree.
- Single-writer scan: a source-text check over `libs/mintplayer-web-components/**/*.ts` (excluding
  specs and generated files). It rejects `document.head.append`, `createElement('style')`,
  `document.adoptedStyleSheets =` and document `insertRule` anywhere except
  `light-dom/src/install-light-styles.ts` and `light-dom/ssr/inject-mp-light-styles.ts`.
- Confirm by reading the code that the spec would fail against the master version of the card
  sheet. Do not run it yet.

## M4: invalid-value conformance
- `_conformance/no-invalid-color-functions.spec.ts`, modelled on `no-theme-attribute-selectors.spec.ts`.
- Scan the generated `*.styles.ts`, `*.light.styles.ts` and `*.element.template.ts`, plus
  `dist/libs/mintplayer-web-components/**/*.mjs`.
- Reject `/\b(rgba?|hsla?)\(\s*#/i`, a literal `#{`, and a Sass `$identifier` outside comments
  (comments are stripped first; `scheduler.styles.ts` has `$z-sticky-column` in a comment, which is
  allowed). `light-dark(#…)` is valid CSS and must not be flagged.
- Assert that the dist glob is non-empty.

## M5: e2e + visual
- Add `apps/ng-bootstrap-demo-e2e/e2e/card-global-styles.spec.ts` with the light and dark assertions
  from PRD §5 D4.4. Readiness uses the S2 marker; dark mode uses the `bs-theme-mode=dark` cookie.
- Add a React twin on `/basic/card`, covering the badge plus the plain-`.card` checks.
- If S2 found a shadow host that renders `mp-card`, add one assertion that the card regions are
  styled inside it.
- The demo pages are not changed; the test appends its own probe elements.
- Refresh `card.visual.spec.ts-snapshots/card-demo-chromium-win32.png` locally (Windows, Chromium)
  with `--update-snapshots`. Then inspect the new image: the header and footer must be opaque.

## M6: versions + docs
- Apply the bumps chosen after S3, using the PRD §7 table: web-components plus the three wrappers,
  with their peer floors raised.
- PR description: the root cause chain, the audit table (document-level writers, clean
  `install-light-styles`), the breaking cleanup (global `.card-*`/`.text-bg-*` gone; consumers rely
  on Bootstrap's helpers), and the S4 result.
- CLAUDE.md, Light-tier section: one bullet saying that *every* document-level sheet, light tier or
  not, goes through `installLightStyles`, and that host-tag anchoring is the allowed form for a
  slot-based component's document sheet.

## M7: verification sweep (once, at the end)
Every command writes its raw output to a scratchpad log (`> x.log 2>&1; echo EXIT $?`); filter
afterwards.
- `npx nx build mintplayer-web-components`, then grep the dist for `RGBA(#`: expect zero.
- `npx nx test mintplayer-web-components`, which includes the new conformance specs.
- `npx nx build mintplayer-ng-bootstrap`, `mintplayer-react-bootstrap` and `mintplayer-vue-bootstrap`.
- `npx nx test mintplayer-ng-bootstrap` (card wrapper specs).
- e2e: the new card spec(s), plus the existing card specs in ng, react and vue.
- Manual: tab through the card demo (no interactive changes are expected), and check it in dark
  mode in all three demos.
- Commit with `git commit -F`, push once, open a PR against `master` that references #432, and read
  the single CI run.
