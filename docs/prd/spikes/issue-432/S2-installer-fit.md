# S2 — installer fit (issue #432)

Date: 2026-10-14. Read-only spike; no tracked file changed.

## 1. `installLightStyles('card', cardGlobalStyles)` installs verbatim

`light-dom/src/install-light-styles.ts` does **no rescoping**. Rescoping is codegen-time only
(`*.light.scss` -> `*.light.styles.ts`). The installer takes `CSSResult | string`, stores
`cssText`, and uses lit's own `styles.styleSheet` when present (else `new CSSStyleSheet()` +
`replaceSync`). So the card sheet goes in byte-for-byte as codegen emitted it; anchoring
(`mp-card .card-header`) must be written in the SCSS.

DOM it produces:

- Constructable sheets supported (Chromium, Firefox, WebKit, all current): the sheet is appended
  to **`document.adoptedStyleSheets`**. **No `<style>` element is written**, so there is no DOM
  marker in the normal browser path.
- Fallback (no constructable sheets): `<style data-mp-light-styles="card">` appended to
  `document.head`.
- If an SSR copy `<style data-mp-light-styles="card">` is already in `<head>`, nothing is
  written; only the registry entry is added.
- In all three cases the registry entry is set: `globalThis[Symbol.for('mp.lightStyles')].entries`
  (a `Map`) gains key `'card'`.
- Guard: `typeof document === 'undefined' || !document.head` -> no-op. This is stricter than
  today's `ensureCardStylesInjected` (`typeof document` only), which would throw on Angular's SSR
  DOM shim (a `document` with no usable `head`).
- Ordering: adopted sheets cascade after every `<style>`/`<link>` sheet, the same position as
  today's late `<style data-mp-card>` append.

### M5 readiness check (use this, not a selector)

A `<style>` selector would never match in real browsers. Wait on the registry, which covers the
adopted-sheet, `<style>`-fallback and SSR-copy paths alike:

```ts
await page.waitForFunction(
  () => !!(globalThis as any)[Symbol.for('mp.lightStyles')]?.entries?.has('card'),
);
```

Optional stronger form (proves the anchored sheet is the one live):

```ts
() => document.adoptedStyleSheets.some((s) =>
  [...s.cssRules].some((r) => (r as CSSStyleRule).selectorText?.startsWith('mp-card ')))
```

The `card/src/mp-card.element.spec.ts:44,46` assertions on `style[data-mp-card]` will break under
M1. Translate them to `getLightStyleEntries().filter((e) => e.key === 'card').length === 1`.

## 2. `adoptLightStyles(root)` and nesting

`adoptLightStyles` applies every current entry **and** adds a listener, so entries registered
later (a card connecting after the host) are mirrored too. Disposer removes the listener.

- Only caller: `file-manager/src/components/mp-file-manager.ts:466`
  (`adoptLightStyles(this.renderRoot)`). The `datatable`/`treeview` mention in the file's header
  comment is stale (both are light tier now).
- **No shadow WC renders `mp-card`.** Searched `libs/**` (excluding `card/`) for `mp-card`,
  `<bs-card`, `BsCard`, `card-header`, `card-body`: hits are only barrels, CEM, conformance
  passthrough specs and snippets. No shadow template in dock, tile-manager, file-manager,
  timeline or scheduler contains one.
- Shadow WCs with consumer render callbacks: `mp-file-manager` (adopts already) and `mp-select`
  (`optionRenderer` returns a string, not DOM). Neither can host a consumer `mp-card`.
- Demo usage inside composite WCs: the timeline demos (ng `*bsTimelineContent`, React and Vue)
  put a card in `mp-timeline-item`'s `content` **slot**. Slotted nodes stay in the light DOM, so
  the document-level sheet reaches them. The scheduler demo's cards are siblings, not children.
- **No nesting-bug witness exists.** M5's "card inside a shadow host" assertion has no subject.
  The timeline slot case is the only composite placement, and it exercises the ordinary document
  cascade.

## 3. Conformance-spec data source (M3)

- `light-styles-scoping.spec.ts` **globs files**: it walks `LIB_ROOT` for `*.light.styles.ts`,
  regex-extracts the backtick body, and derives `scope` from the basename (`mp-` stripped). It
  would never see `card-global.styles.ts`.
- `light-styles-nesting.spec.ts` uses the **runtime registry**, `getLightStyleEntries()` (exported
  from `@mintplayer/web-components/light-dom`), after importing element entries.
- The anchor check (`isScopeAnchored`) parses with `postcss` + `postcss-selector-parser`, splits
  each selector into compounds and combinators, and passes when some compound includes
  `[data-mps=<scope>]` **or equals/startsWith `mp-<scope>`**, provided **every** combinator from
  that compound to the subject is `' '` or `'>'`.

### Proposal

1. Make the registry the source of truth. In the scoping spec, import the element entries
   (`datatable`, `treeview`, `tree-select`, `query-builder`, `card`), then build the sheet list
   from `getLightStyleEntries()` (`scope = entry.key`, `css = entry.cssText`). This avoids the
   fragile backtick regex. Keep the file walk only as a completeness assertion: every
   `*.light.styles.ts` scope must appear among the registry keys, so a forgotten import fails
   instead of going silently uncovered.
2. Card needs **no new anchor logic**. Key `'card'` gives `tag = 'mp-card'`, and the existing
   tag branch already accepts `mp-card .card-header`. Two tightenings are needed:
   - `compound.startsWith(tag)` also accepts `mp-cardx` / `mp-card-foo`. Use
     `new RegExp('^' + tag + '(?![\\w-])')`.
   - `.card-link + .card-link` must stay expressible. `mp-card .card-link + .card-link` fails
     today, because the check rejects any sibling combinator after the anchor. That rule is
     stricter than the safety argument requires. Only the combinator **immediately after** the
     anchor has to be `' '`/`'>'`: once one descent has happened, every later sibling shares a
     parent inside the anchor's subtree. Relax it to `[' ', '>'].includes(combinators[i])` and
     keep `i < combinators.length` (an anchor that *is* the subject, `mp-card { … }`, stays
     allowed). Add a comment and a unit case. The alternative is an `ALLOWED_GLOBAL_SELECTORS`
     entry, which is worse because it is an exemption for a safe selector.
3. Install timing: M1 plans the install in `connectedCallback`. With that, the registry holds
   `card` only after an `mp-card` connects, so the spec must append one first. Calling
   `installLightStyles('card', cardGlobalStyles)` at **module level, right before
   `customElements.define`** (the CLAUDE.md light-tier convention) makes import alone populate
   the registry, as it does for every other entry. Recommended.
4. Add `mp-card` to the nesting spec's coverage implicitly: once card is in the registry, the
   `mp-file-manager` assertion already iterates it.

Against master's card sheet, step 1 fails on `.card-body`, `.card-header`, … and every
`.text-bg-*` (no tag, no scope), which is the regression the spec should catch.

## 4. SSR

- `mp-card` has **no `ssr/` dir** and no `codegen-*-chrome` target. The aggregate
  `codegen-ssr-chrome` covers accordion, carousel, dropdown, navbar, shell and light-styles only.
- `injectMpLightStyles` is called only by `apps/ng-bootstrap-demo/server.ts`. Its table comes
  from `tools/lit-ssr-utils/gen-light-styles-chrome.mjs` `LIGHT_TIER_COMPONENTS`: datatable,
  treeview, tree-select and the four query-builder tags. Card is not in it.
- So today, SSR demos ship **no** card styles before hydration. With JS off, `mp-card` is never
  upgraded, so its `:host` chrome (border, radius, background) is also absent. The `isServerSide`
  property on `MpCardElement` is declared but unused by any SSR path.
- Recommendation: **do not add card to the SSR injector in #432.** It would style the regions but
  not the card's border and background (those are shadow `:host` rules with no DSD chrome), so the
  result is a half-styled card, and the issue is about JS-path leakage. If it is ever wanted, it
  is a one-row add, `['mp-card', 'card', 'card', 'cardGlobalStyles']`. That row also requires
  exporting `cardGlobalStyles` from `card/src/index.ts`; it is **not** exported today. The
  published `card/src/card-global.styles.d.ts` exists but the barrel does not re-export it. Key
  `'card'` must match the client `installLightStyles` key so hydration adopts the SSR copy.

## 5. Callers of the old injector

`ensureCardStylesInjected` / `cardGlobalStyles` / `data-mp-card` appear only in
`card/src/mp-card.element.ts`, `card/src/mp-card.element.spec.ts` (the assertion above),
`card-global.styles.scss` (comment), `install-light-styles.ts:6` (comment) and docs. **No ng,
React or Vue wrapper calls or imports it**, and no app does. The export can be dropped.

## 6. Stale comment

Yes. `install-light-styles.ts:6` reads "generalizing the pattern that `ensureCardStylesInjected`
pioneered". It goes stale once M1 removes the function. The header's lines 14-17 also name
"datatable, treeview" as `adoptLightStyles` callers, which is stale: the only caller is
file-manager.
