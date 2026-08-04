# Plan — `mp-input-group` + `mp-phone-input` web components + wrappers

PRD: [phone-input-wc.md](./phone-input-wc.md)
Status: **Spike gate CLOSED (2026-08-04); implementation starting at M1.** On `feat/phone-input-wc`,
draft PR #399. Commit per milestone (commits are free); push only when the whole feature is finished
(pushes are billed and cancel in-flight runs).

| Milestone | State |
|---|---|
| S — spikes (gate) | **CLOSED. S1–S9 all ✅** (incl. S2's RTL sub-case). S9 adopted per-*calling-code* metadata slices — PRD §5.5 D6a-alt |
| M1 — flags sub-entry | ✅ **done** — 244 flags vendored, 244 lazy chunks verified in dist |
| M2 — phone-core sub-entry | 🟡 countries + metadata generator + `PhoneRules` facade built and parity-verified; **dial-code detection + its specs outstanding** |
| M3 — mp-input-group + the group contract in mp-select | ⬜ |
| M4 — mp-select rich options (base-select PE) | ⬜ |
| M5 — mp-phone-input | ⬜ |
| M6 — Angular wrappers (bs-input-group migration + bs-phone-input) | ⬜ |
| M7 — React + Vue wrappers | ⬜ |
| M8 — demo pages ×3 | ⬜ |
| M9 — conformance + a11y registries | ⬜ |
| M10 — batched verification sweep | ⬜ |

## Conventions (these still bite)

- **SCSS/codegen:** after editing any `.styles.scss`, run
  `npx nx run mintplayer-web-components:codegen-wc` or the change is invisible. Generated
  `*.styles.ts` / `*.generated.ts` are gitignored artifacts — never stage or hand-edit them.
  The new `flag-loaders.generated.ts` is covered by the existing
  `libs/mintplayer-web-components/**/*.generated.ts` ignore rule; the vendored
  `flags/src/assets/*.svg` are **committed sources** (like `.scss`), not artifacts.
- **Dynamic imports in lib source must be static string literals.** A `@vite-ignore`
  template-literal import survives into the published `.mjs` and then either hard-fails esbuild
  consumers **or — worse — silently globs a whole directory into their bundle** (S6 measured 47
  chunks pulled in). The generated loader maps exist to enforce this. Add **both** modes to
  CLAUDE.md's WC gotchas in M1.
- **Nx flakes on Windows:** `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`; vitest wants
  `--pool=threads`. A three-engine Playwright run can also report "2 errors were not a part of any
  test" and exit 1 purely from a WebKit worker taking the full teardown grace — not a failure.
- ~~**No `:host` declaration of `--mp-group-*` in mp-select**~~ — **corrected by S1**: an outer
  `::slotted()` declaration beats the inner `:host` rule, so the contract survives a control that
  declares the property. Consuming with `var()` fallbacks is still the right style, just not for
  the reason first written.
- **No backticks inside a Lit `css` template's CSS comments** — they terminate the JS template
  literal. Hit twice while building the S1 spike.
- **jsdom:** `sharedInternals()` degrades to null; lit `isServer` is TRUE under vitest — never
  gate light-DOM enhancement on it.
- **New sub-entrypoints need zero build config:** `<dir>/index.ts` + `<dir>/src/index.ts` is the
  whole registration (auto-discovered, exports auto-written into the built package.json).
- Batch the suites: verify by reading + type-check per milestone; one sweep at the end (M10).

## Ordering rationale

S gates everything (PRD §7: if S1 fails, M3/M5 change shape via the pre-agreed fallback — decide
before writing component code). M1/M2 are pure data/logic with no DOM and no dependency on the
spikes' outcome, so they can start alongside S if desired. M3 must precede M5 (the phone input
composes the group). M4 (rich options) is independent of M3 and only blocks the flag-in-dropdown
part of M5 — if S2 turns up surprises, M5 ships with the text-only fallback and M4 trails within
the same PR. Wrappers (M6/M7) follow their WCs; demos (M8) follow wrappers; registries (M9) touch
files created in M8; the sweep (M10) is last, once.

---

## S — Spikes (gate; throwaway; Chromium + Firefox; verdicts go into PRD §9)

Throwaway files under `docs/prd/_spike-phone-input-*`, deleted after verdicts are recorded.

- [x] S1 — group contract: `::slotted()` positional rules + `--mp-group-*` inheritance into a
      generated `unsafeCSS` stylesheet; `-1px` overlap + `:focus-within` lift; nested inside a
      second shadow root. **Gate: on failure, adopt the PRD §7 fallback before starting M3/M5.**
- [x] S2 — `appearance: base-select` with SVG options in a shadow root; Firefox text-only
      fallback layout parity. **PASS 10/10 × 3 engines**; D3 amended four ways, RTL clean with
      logical properties (PRD §9.4).
- [x] S9 — per-country metadata chunks vs one 57 KB `/max` chunk. **PASS, ADOPTED** — but only after
      the slice unit changed from *country* to *calling code*: per-country was rejecting 586 of 640
      sibling numbers (a US form typing a Toronto number). Exhaustive parity vs `/max` over all 244
      selectable countries, 0 divergences. First use 16.6–19.2 KB gzip vs 56.8 KB (PRD §5.5 D6a-alt).
- [x] S3 — `import('libphonenumber-js/min')` chunking from the published lib; esbuild + Vite +
      plain-Node consumption (repeat the asset-prototype matrix with the real package).
- [x] S4 — `Intl.DisplayNames` SSR/hydration parity in the three demo SSR pipelines.
- [x] S5 — FACE-in-FACE isolation (inner mp-select contributes nothing to the outer form) +
      two-tab-stop focus model + `formDisabledCallback` fan-out.
- [x] S6 — flag pipeline dress rehearsal with 3 real vendored SVGs end-to-end.
- [ ] Record all verdicts in PRD §9; delete spike files. **Commit.**

## M1 — `flags` sub-entrypoint [PRD §5.4, D4]

- [x] `tools/scripts/refresh-flags.mjs` — copy 3×2 SVGs for the 244 dial-code countries from the
      `country-flag-icons` devDependency into `libs/mintplayer-web-components/flags/src/assets/`,
      preserving the MIT notice (`flags/README.md`); idempotent, diffable.
- [x] Add `country-flag-icons` to root `package.json` devDependencies.
- [x] **Run the refresh script for all 244 countries** and commit the vendored SVGs — 244 vendored
      from `country-flag-icons` v1.6.20 (239 written over S6's 5 samples), derived from
      `intl-tel-input/data` so the flag set and the picker list cannot drift. `--only=` does NOT
      prune, so clear `src/assets/` first if the set ever shrinks.
- [x] `tools/scripts/build-flag-loaders.mjs` (or a third pattern inside
      `build-web-components.mjs`, wired into the `codegen-wc` target) — scan `flags/src/assets/*.svg`,
      emit `flags/src/flag-loaders.generated.ts`: `CountryCode` union from filenames + static
      `flagLoaders` map of `?raw` dynamic imports; reuse `writeIfChanged`.
- [x] `flags/index.ts` + `flags/src/index.ts` — `loadFlag(code)` (cached
      `Map<string, Promise<string>>`, lowercases, unknown → `undefined`), re-export types.
- [x] `flags/src/flags.spec.ts` — loader resolves a known flag string, caches, unknown code path.
- [x] CLAUDE.md WC gotchas: added **both** dynamic-import failure modes, plus the three-tree
      cascade order, the UA-forced-LTR tel input, and the backtick-in-css-comment trap.
- [x] Verified on a real build: **244 lone-SVG chunks**, 0 `.svg` files shipped, `exports["./flags"]`
      written, MIT notice published at `flags/README.md`. Loader map 17.9 kB (3.44 kB gzip). Per-flag
      gzip: `be` 196 B, `gb` 460 B, `io` 1223 B — median ~313 B, matching S6. **Commit.**

## M2 — `phone-core` sub-entrypoint [PRD §5.5, D5, D6]

- [x] Add `libphonenumber-js` + `intl-tel-input` to `@mintplayer/web-components`
      `package.json` dependencies (root package.json too) — **and `external` in `vite.config.mts`**
      per PRD D5b (bundling them makes a consumer without them hit TS2307 anyway).
- [x] `phone-core/src/countries.ts` — typed view over `intl-tel-input/data` tuples; localized
      name via `Intl.DisplayNames`; `Intl.Collator` ordering; `preferred/only` filtering.
- [ ] `phone-core/src/dial-code.ts` — `countryForDialString()` with priority + areaCodes NANP
      resolution; longest-prefix match. **Include the S8.1 tie-break:** a country *with*
      `areaCodes` that did not match must not beat an equal-length plain dial-code match, or `ca`
      is reported for every unlisted `+1` area code.
- [x] E.164 assembly and formatting live on the `PhoneRules` facade (`toE164`, `format`) rather than
      in separate modules — both delegate to the parser per D6c/D6b. Consequence for M5, unchanged:
      they are only available once the country's rules have loaded, so the component keeps
      digits+country internally and reports `valid: undefined` until then.
- [x] `phone-core/src/validation.ts` — `loadPhoneValidator()` lazy facade (the ONLY module that
      names libphonenumber-js; static import string, **`libphonenumber-js/max`** per PRD D6a).
- [x] Formatter goes through the international form and strips the calling code, on
      `PhoneRules.format` [PRD D6b/F1] — asserted in `validation.spec.ts` so nobody "simplifies" it
      back to `AsYouType(country)`, which formats **nothing** for BE/NL/DE/FR/GB.
- [ ] Specs: NANP disambiguation table (US/CA/Caribbean + the 19 hard cases), `+44` paste
      detection, `+7`/`+39`/`+590` shared dial codes, `+1` vs `+1242`, garbage `+999` → no switch,
      bare national digits → **no switch**, facade caching, and a tuple-shape guard against
      `intl-tel-input` updates.
- [ ] Adopt these concrete assertions — salvaged verbatim from the S9 prototype's spec, which
      measured them all green under `/max`, so they are known-achievable rather than aspirational:

      | Behaviour | Assertion |
      |---|---|
      | F1 formatter (the whole reason `format.ts` exists) | `be.format('470123456') === '470 12 34 56'`, `format('') === ''` |
      | Formats for shared calling codes | `ca.format('5062345678') === '506 234 5678'`, `kz.format('7710009998') === '771 000 9998'`, `va.format('3123456789') === '312 345 6789'` — these come from the US/RU/IT donor entries, so they catch a metadata regression |
      | Full-precision validity | `be.isValid('470123456')` true; `'47012345'` (one short) and `'4701234567'` (one long) both **false** — this is what `/min` got wrong |
      | Number type ("home or mobile") | `be` `470123456` → `MOBILE`, `23456789` → `FIXED_LINE`; `ru` `8001234567` → `TOLL_FREE`; `ax` `412345678` → `MOBILE` |
      | Length reason, for D10 rule 7 | `us` `'212555'` → `TOO_SHORT`, `'2125551234'` → undefined, `'21255512345'` → `TOO_LONG` |
      | E.164 via the parser, never string-stripping | `ru` `8001234567` → `+78001234567`, `89011234567` → `+79011234567`; `it` `0212345678` → `+390212345678` (leading zero survives); `be` `0470123456` → `+32470123456`; `''` → `null` |
      | Dial-code pin (guards positional metadata access) | `be` → `32`, `ca` → `1` |
      | Loader hygiene | case-insensitive + trimmed (`'  BE '` ≡ `'be'`), one cached promise per country, unknown/`''` → resolves `undefined` rather than rejecting |
- [ ] **Commit.**

## M3 — `mp-input-group` + group contract in `mp-select` [PRD §5.2, D1, D2; fixes §1.2]

- [ ] `input-group/src/components/mp-input-group.ts` — shadow host, `.group` flex container,
      default slot, `size` attr, `role="group"` only when `aria-label`d, `:focus-within` lift.
- [ ] `input-group/src/styles/input-group.styles.scss` — `::slotted()` positional corner/flex
      rules for light children; `--mp-group-*` setting rules for `mp-*` children (S1's proven
      form); `sm`/`lg` paddings; focus-visible handling.
- [ ] `mp-select`: consume `--mp-group-radius-start/-end` with `var(…, var(--bs-border-radius))`
      fallbacks in `_styles/form-select.styles.scss`.
- [ ] While in that stylesheet: **normalize Bootstrap's physical RTL authoring** — `padding-inline`
      + logical `background-position`, so the caret gutter stops sitting on the leading edge in RTL
      (pre-existing, also affects `bs-select` standalone; PRD §5.3).
- [ ] `mp-select` barrel fix: export `MpSelectOptgroup` + `MpSelectItem` from `select/src/index.ts`.
- [ ] `mp-input-group.spec.ts` + `mp-input-group.aria.spec.ts` (group named ⇒ role, unnamed ⇒
      none; slotted passthrough untouched).
- [ ] Verify against the scheduler demo's four-select group (§1.2) — corners + flex now correct.
- [ ] **Commit.**

## M4 — `mp-select` rich options [PRD §5.3, D3; S2 passed 9/9 × 3 engines]

- [ ] The `@supports (appearance: base-select)` recipe lives in **`mp-select`'s own stylesheet**
      (D3 amendment 4 — a rule pushed from `mp-phone-input` cannot reach the inner `<select>` at
      all). Use `select.form-select` specificity, **not** bare `select` (Bootstrap's class wins),
      and apply it to **both** the select and `::picker(select)` (the select alone leaves the picker
      native). Copy the measured recipe from PRD §5.3.
- [ ] **Gate every reconciliation rule behind the same `@supports` — release blocker.** Ungated,
      the caret-suppression rules delete Firefox's dropdown arrow entirely (pixel-measured). Also
      needs `white-space: nowrap` on the flex closed face, or the localized name wraps and the
      control grows 38 → 62 px.
- [ ] Author `<button><selectedcontent></selectedcontent></button>` explicitly — WebKit's
      UA-generated button mirrors nothing.
- [ ] Per-option render callback for `.options` mode (repo render-callback convention);
      feature-detect, text-only fallback otherwise. Fallback label order **`Name +dial (ISO)`** —
      ISO-first makes native country-name typeahead unreachable (measured in all 3 engines).
- [ ] Keep the native `<select>` semantics untouched in the fallback; no custom listbox.
- [ ] Check the S2 latent bug: rich options make the AX name space-separated but
      `option.textContent` run-together (`"Ascension+1"`), and `collectSlotItems` uses
      `opt.textContent?.trim()`.
- [ ] Export `MpSelectOptgroup` + `MpSelectItem` from `select/src/index.ts` (barrel gap).
- [ ] Spec: rich content renders where supported (guarded), fallback emits plain text labels,
      typeahead reaches a country by name, exactly one `change` on commit.
- [ ] **Commit.**

## M5 — `mp-phone-input` [PRD §5.6, §5.7, §6, D7, D8, D9]

- [ ] `phone-input/src/components/mp-phone-input.ts` — `FormAssociatedMixin(LitElement)`,
      `delegatesFocus`, composes `mp-input-group` + `mp-select` + dial-code span + tel input in
      shadow; registration guard at the bottom.
- [ ] Value model: E.164 `value` ⇄ (`country`, national digits); empty input ⇒ `null` form
      value; `formValue/formReset/formRestore/formValidityAnchor` per the `mp-select` shape.
- [ ] Country picker feed: `phone-core` countries → `mp-select` `.options` (+ rich render
      callback from M4); closed-face overlay (flag + ISO, `aria-hidden`, `pointer-events: none`)
      in **`mp-phone-input`'s own** shadow root with `:host { position: relative }`, **gated off**
      under `@supports (appearance: base-select)` or supporting engines draw two flags. Reserve
      generous padding for it (its width is engine-dependent: 68.4 px vs 70.2 px WebKit), and
      remember it only aligns while the select is the group's first child.
- [ ] **Pin the country picker's width** via `mp-input-group` [PRD §5.3]: native `<select>` sizes to
      its widest option, base-select to the selected content (320 → 152/157 px). Pinned, the jump
      is 0 px.
- [ ] Country change: keep the digits, reload rules, reformat, re-validate — never clear or
      truncate [PRD D17].
- [ ] Flags: placeholder box first, `loadFlag()` swap; warm visible set on first open.
- [ ] Validator: `loadPhoneValidator()` on first focus/input or non-empty initial value;
      structural checks until resolved; formatting via `phone-core/format` + `setFormValidity` from
      `updated()`; `valid: undefined` in `value-change` until loaded.
- [ ] **Caret management per PRD D10 — all seven rules** (digit-count anchor, `beforeinput` capture,
      restore-on-rejected-non-digit, Backspace/Delete always removes a digit, composition guard,
      synthetic `input` after an intercepted key, reject-when-too-long). A DOM-free reference
      implementation is in the S7 spike harness; port it with its own unit spec. Skipping rule 4
      leaves the control visibly **stuck** when Backspace lands on a separator.
- [ ] Paste/typed `+XX…` in the tel input → country switch + prefix strip, sourced from the
      **table** while typing and the validator on parse/blur [PRD D11]; never overwrite an explicit
      user selection [PRD D5a]; dial code static adjacent text (D9); focus input after country
      selection (D9).
- [ ] i18n: `locale` attr (no default), `input-label`/`country-label`/`error-text`/`placeholder`
      attrs; `preferred-countries`/`only-countries`.
- [ ] A11y per PRD §6: error channel via `errorFeedback()` + `aria-errormessage`; dial-code span
      `aria-describedby`; `HostAriaController` + `syncReferences()` in `updated()`; own
      `:focus-visible` ring in SCSS.
- [ ] `mp-phone-input.spec.ts` + `mp-phone-input.aria.spec.ts` (the `mp-select.aria.spec.ts`
      template: naming trio + five error-text transitions + describedby wiring).
- [ ] **Commit.**

## M6 — Angular wrappers [PRD §5.8]

- [ ] `bs-input-group`: replace the shell template with
      `<mp-input-group bsForwardAria><ng-content></ng-content></mp-input-group>`, add
      `CUSTOM_ELEMENTS_SCHEMA`, side-effect import, `size` input; delete the `::ng-deep`
      Bootstrap import SCSS.
- [ ] Migrate the 4 demo usages (input-group page, alert, scheduler ×2, toast) — behaviour
      identical, scheduler group visually fixed.
- [ ] `bs-phone-input`: CVA via `hostDirectives` (+ `BsControlValidityDirective` with
      `[errorMessages]`), scalar pushing in one `effect()`, `writeValue` derives `country`.
- [ ] Wrapper unit specs (ng-mocks smoke + CVA round-trip).
- [ ] **Commit.**

## M7 — React + Vue wrappers [PRD §5.8]

- [ ] React: `BsInputGroup` + `BsPhoneInput` via `createComponent`
      (`onValueChange`/`onCountryChange`).
- [ ] Vue: `BsInputGroup.vue` + `BsPhoneInput.vue` — `defineModel<string | null>()`,
      `inheritAttrs: false` + `v-bind="$attrs"`, object props via ref, composed-`change` guard.
- [ ] **Commit.**

## M8 — demo pages ×3 [demo-conventions report]

- [ ] Angular: `pages/basic/forms/phone-input/` (component/html/scss/spec), route in
      `forms.routes.ts`, nav item in `app.component.html` Forms dropdown; live-demo-then-snippet
      order, `ts-dedent` snippets; document the keymap; include locale + preferred-countries +
      validation demos. Refresh the existing input-group demo page with an `mp-*`-child example.
- [ ] React: `pages/forms/PhoneInputPage.tsx`, `lazyNamed` + `<Route path="/basic/forms/phone-input">`,
      `SECTIONS` entry in `AppShell.tsx`.
- [ ] Vue: `views/forms/PhoneInputView.vue`, router entry, `SECTIONS` entry in `App.vue`.
- [ ] **Commit.**

## M9 — conformance + a11y registries [repo rules; all mandatory]

- [ ] `libs/mintplayer-web-components/_conformance/naming.spec.ts` — import + `CASES` entries for
      `mp-phone-input` (target: tel input) and `mp-input-group` if it takes `input-label`
      (it doesn't — host `aria-label` only, so CASES entry for phone-input only) +
      `ERROR_TEXT_CASES` addition.
- [ ] `libs/mintplayer-ng-bootstrap/_conformance/aria-passthrough.spec.ts` — `WRAPPERS` entries
      for `bs-input-group` + `bs-phone-input`; bump the completeness count 20 → 22.
- [ ] React `_conformance/attribute-passthrough.spec.tsx` CASES + count, `.types.tsx` probes
      (bare/camelCase names only).
- [ ] Vue: automatic invariant sweep covers the SFCs; verify the floor check still passes.
- [ ] Axe registries: `{ path: '/basic/forms/phone-input' }` (+ an `interact` hook opening the
      select) in `a11y/axe.spec.ts` in **all three** e2e projects — and deliberately **NOT** in
      `axe-nojs.spec.ts`: that registry lists only the components with a real no-JS tier
      (`/`, accordion, carousel, navbar, shell). Verified: `tree-select`, the closest JS-only
      precedent, appears in no `axe-nojs` list. A phone input has no no-JS tier (PRD §3), so
      listing it would audit a control that legitimately renders nothing without JS.
- [ ] Functional e2e per app: country switch updates dial code + flag; paste `+44…` switches
      country; invalid → message → valid clears; validator chunk loads lazily (request-count
      assertion); tree-select-style backend gating not needed (no API).
- [ ] **Commit.**

## M10 — Batched verification sweep (only now; one pass)

```bash
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run mintplayer-web-components:codegen-wc
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-web-components
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-react-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-vue-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-web-components -- --pool=threads
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build ng-bootstrap-demo
```

- [ ] Manual keyboard pass on the Angular demo page (tab order, Escape, typeahead in the select,
      focus ring visible), Firefox smoke (flex-shrink trap), RTL smoke (`dir="rtl"` — the tel input
      is forced LTR by the UA, PRD §9.1 c6).
- [ ] The five human-only checks S7/S8 could not automate (PRD §9.2): a real IME composition
      session **and a mobile soft keyboard**; whether the caret *feels* right when typing,
      backspacing and pasting mid-number; whether the late country flip on shared dial codes is
      acceptable; the 4 Chromium country-name differences (editorial call); and **how a screen
      reader announces a value that reformats under the caret** — the most likely to need a design
      response, so do it early in the pass, not last.
- [ ] Inspect `dist/libs/mintplayer-web-components`: per-flag chunks present, libphonenumber in
      one lazy chunk, no eager flag/validator bytes in the phone-input entry.
- [ ] Version bumps: web-components 2.9.0, ng 22.13.0, react 19.14.0, vue 3.15.0.
- [ ] Update PRD §9 verdicts + "As built" section; note demo before/after of the scheduler group.
- [ ] Push **once**, then read the single CI run.

## Risks

| Risk | Mitigation |
|---|---|
| S1 gate fails | Pre-agreed fallback (PRD §7): phone-input draws its own group chrome; mp-input-group still ships for light-DOM use; no API change |
| base-select churn (spec still moving) | It's enhancement-only (D3); baseline is text options + closed-face overlay |
| libphonenumber chunk missing in a consumer | S3 before UI work; e2e request-count assertion keeps it honest |
| Hydration mismatch on country names | S4; worst case names render client-side post-hydration |
| `intl-tel-input` tuple shape drift | pinned minor + shape-guard spec (M2) |
| Angular 100 KB `anyComponentStyle` budget | flags never enter CSS; group styles are small; no risk if the rule "no flag data URIs in SCSS" holds |
