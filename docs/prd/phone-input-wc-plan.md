# Plan — `mp-input-group` + `mp-phone-input` web components + wrappers

PRD: [phone-input-wc.md](./phone-input-wc.md)
Status: **Implemented (2026-08-05).** Spike gate S1–S9 closed, M1–M10 done, plus M9b for the two
defects the user found by running it. On `feat/phone-input-wc`, draft PR #399, pushed. Local sweep:
all 14 test projects green (1763 web-components, 543 ng-bootstrap, 97 demo, 50 api) and the a11y
gate green for the phone-input routes.

Outstanding, none of it blocking a review: `D-open-1` (suppress the rich picker on coarse pointers)
and its device pass **S10**; the human-only checks in M10; and one pre-existing defect this branch
did not cause — `/enterprise/query-builder` trips `aria-required-children` on `mp-datatable`
(`tr[role="row"]` with no cells) **locally but not in CI**, which wants its own issue.

| Milestone | State |
|---|---|
| S — spikes (gate) | **CLOSED. S1–S9 all ✅** (incl. S2's RTL sub-case). S9 adopted per-*calling-code* metadata slices — PRD §5.5 D6a-alt |
| M1 — flags sub-entry | ✅ **done** — 244 flags vendored, 244 lazy chunks verified in dist |
| M2 — phone-core sub-entry | ✅ **done** — countries/list/name, dial-code detection, `PhoneRules` facade, 62 specs green (incl. exhaustive `/max` parity) |
| M3 — mp-input-group + the group contract in mp-select | ✅ **done** (WC side; the scheduler-demo acceptance check moves to M6, where bs-input-group starts rendering it) |
| M4 — mp-select rich options (base-select PE) | ✅ **done** — doubly-gated (`@supports` + per-instance `rich`), 7 new specs |
| M5 — mp-phone-input | ✅ **done** — 27 specs (all seven D10 caret rules, D11/D5a/D12/D15/D17), entry 4.4 KB gzip with zero eager flag/metadata bytes |
| M6 — Angular wrappers (bs-input-group migration + bs-phone-input) | ✅ **done** — Bootstrap's input-group module now bundled in exactly ONE place |
| M7 — React + Vue wrappers | ✅ **done** — plus a pre-existing packaging gap found (see below) |
| M8 — demo pages ×3 | ✅ **done** — all three demos build; keymap documented |
| M9 — conformance + a11y registries | ✅ **done** — WC naming 72, ng 22, react 12+probes, vue automatic, axe ×3 |
| M9b — responsive + flag-loading defects [PRD §12] | ✅ **done** — flags 3.4s→0.27s, wrap fixed by capping the trigger (NOT nowrap), picker clamped, flag gate + RTL dial code fixed |
| M10 — batched verification sweep | ✅ **done** — 14/14 test projects, 4 lib builds, demo build, a11y gate; human-only checks below outstanding |
| CI round 1 | ✅ fixed — `mintplayer-react-bootstrap:test` threw on an unguarded `ResizeObserver` (jsdom has none); guarded per the mp-carousel/mp-datatable pattern |
| CI round 2 | ✅ fixed — axe `select-name` on the demo's locale `bs-select`, which my React and Vue pages labelled and the Angular one did not |

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
- [ ] S10 — device pass for D-open-1: is the OS picker actually better than base-select's popover on
      touch? (Android Chrome, iOS 26 **and** 27, Firefox Android.) Blocks only D-open-1, not M9b.
- [x] S11 — **PASS, 141 assertions × 3 engines** (PRD §12.4). Verdicts: Firefox-only defect (wrap
      below 468 px there vs 200 px in Chromium/WebKit); capping the fallback trigger alone fixes it;
      `flex-wrap: nowrap` is REJECTED as measurably worse; the picker cap works; `container-type` is
      safe and the repo note does not reproduce. Original brief: three-engine measurements at 320/360/390/430 px: where the wrap starts,
      whether `flex-wrap: nowrap` + a pinned basis holds at 320 px and what the tel input's usable
      width becomes, native-vs-base-select trigger width, `::picker()` overflow and whether a
      `max-width` cap + label wrapping works, and whether `container-type` still breaks a picker
      popup (repo memory says yes; the platform may have moved).
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
- [x] `phone-core/src/countries.ts` — typed view over `intl-tel-input/data` tuples, plus
      `countryName()` (`Intl.DisplayNames`, falls back to the ISO code so an option is never
      unnamed) and `phoneCountryList()` (collated by localized name via `Intl.Collator`, `preferred`
      pinned in the caller's order, `only` filtering). Both Intl objects memoized per locale, as
      the scheduler's date service does. *(Was checked off prematurely from an agent summary; the
      file only had the tuple mapping.)*
- [ ] **Close the two S9 gaps** (measured-adjacent, not yet asserted): a dedicated A→B test that
      reformats the *same digit string* across a country switch [PRD D17], and a source check of
      `libphonenumber-js/core` for module-level metadata caches (evidence says there are none —
      `new Metadata(json)` is per-call — but that is inference, not a test).
- [x] `phone-core/src/dial-code.ts` — `countryForDialString()`: longest identifying prefix
      (dial code + matched area code), then the **S8.1 area-miss penalty** (a country listing area
      codes that matched none must not beat one listing none at all, or `ca` wins every unlisted
      `+1`), then priority. Keeps the area code IN the national number. Returns `undefined` rather
      than guessing for bare national numbers, unassigned codes and too-short prefixes.
- [x] `phone-core/src/dial-code.spec.ts` — 11 cases, one per way the naive version breaks:
      no-fire on a bare national number, `00` prefix, NANP by area code, unlisted `+1` → `us`,
      area code retained, shared `+7`/`+39`, `+1242` → `bs`, `+999` → undefined, `+3` → undefined,
      `only` restriction.
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

- [x] `input-group/src/components/mp-input-group.ts` — shadow host, `.group` flex container,
      default slot, `size` attr, `role="group"` only when `aria-label`d, `:focus-within` lift.
- [x] `input-group/src/styles/input-group.styles.scss` — `::slotted()` positional corner/flex
      rules for light children; `--mp-group-*` setting rules for `mp-*` children (S1's proven
      form); `sm`/`lg` paddings; focus-visible handling.
- [x] `mp-select`: consume `--mp-group-radius-start/-end` with `var(…, var(--bs-border-radius))`
      fallbacks in `_styles/form-select.styles.scss`.
- [x] While in that stylesheet: **normalize Bootstrap's physical RTL authoring** — `padding-inline`
      + logical `background-position`, so the caret gutter stops sitting on the leading edge in RTL
      (pre-existing, also affects `bs-select` standalone; PRD §5.3).
- [x] `mp-select` barrel fix: export `MpSelectOptgroup` + `MpSelectItem` from `select/src/index.ts`.
- [x] `mp-input-group.spec.ts` + `mp-input-group.aria.spec.ts` (group named ⇒ role, unnamed ⇒
      none; slotted passthrough untouched).
- [ ] Verify against the scheduler demo's four-select group (§1.2) — **moved to M6**: it needs bs-input-group to render mp-input-group first.
- [ ] **Commit.**

## M4 — `mp-select` rich options [PRD §5.3, D3; S2 passed 9/9 × 3 engines]

- [x] The `@supports (appearance: base-select)` recipe lives in **`mp-select`'s own stylesheet**
      (D3 amendment 4 — a rule pushed from `mp-phone-input` cannot reach the inner `<select>` at
      all). Use `select.form-select` specificity, **not** bare `select` (Bootstrap's class wins),
      and apply it to **both** the select and `::picker(select)` (the select alone leaves the picker
      native). Copy the measured recipe from PRD §5.3.
- [x] **Gate every reconciliation rule behind the same `@supports` — release blocker.** Done, plus a
      second gate the plan missed: `:host([rich])` per-instance opt-in, because the recipe otherwise
      flips EVERY existing mp-select in a supporting engine into base-select rendering — a measured
      320→152px closed-face change for consumers who never asked for it. `rich` is reflected state
      (renderer set + `.options` mode + plain dropdown + engine support), not consumer input.
      Original item: Ungated,
      the caret-suppression rules delete Firefox's dropdown arrow entirely (pixel-measured). Also
      needs `white-space: nowrap` on the flex closed face, or the localized name wraps and the
      control grows 38 → 62 px.
- [x] Author `<button><selectedcontent></selectedcontent></button>` explicitly — WebKit's
      UA-generated button mirrors nothing.
- [x] Per-option render callback for `.options` mode (repo render-callback convention);
      feature-detect, text-only fallback otherwise. Fallback label order **`Name +dial (ISO)`** —
      ISO-first makes native country-name typeahead unreachable (measured in all 3 engines).
- [x] Keep the native `<select>` semantics untouched in the fallback; no custom listbox.
- [x] Resolved the S2 latent bug by construction: rich mode is `.options`-only; slotted mode stays
      text-only because its label is read from `textContent`, where inline fragments run together.
      Documented on `optionRenderer` and pinned by a spec. Original item:
      `option.textContent` run-together (`"Ascension+1"`), and `collectSlotItems` uses
      `opt.textContent?.trim()`.
- [x] Export `MpSelectOptgroup` + `MpSelectItem` (done in M3) + `MpSelectOptionRenderer`.
- [x] Spec: rich content renders where supported (guarded), fallback emits plain text labels,
      typeahead reaches a country by name, exactly one `change` on commit.
- [ ] **Commit.**

## M5 — `mp-phone-input` [PRD §5.6, §5.7, §6, D7, D8, D9]

- [x] `phone-input/src/components/mp-phone-input.ts` — `FormAssociatedMixin(LitElement)`,
      `delegatesFocus`, composes `mp-input-group` + `mp-select` + dial-code span + tel input in
      shadow; registration guard at the bottom.
- [x] Value model: E.164 `value` ⇄ (`country`, national digits); empty input ⇒ `null` form
      value; `formValue/formReset/formRestore/formValidityAnchor` per the `mp-select` shape.
- [x] Country picker feed: `phone-core` countries → `mp-select` `.options` (+ rich render
      callback from M4); closed-face overlay (flag + ISO, `aria-hidden`, `pointer-events: none`)
      in **`mp-phone-input`'s own** shadow root with `:host { position: relative }`, **gated off**
      under `@supports (appearance: base-select)` or supporting engines draw two flags. Reserve
      generous padding for it (its width is engine-dependent: 68.4 px vs 70.2 px WebKit), and
      remember it only aligns while the select is the group's first child.
- [x] **Pin the country picker's width** via `mp-input-group` [PRD §5.3]: native `<select>` sizes to
      its widest option, base-select to the selected content (320 → 152/157 px). Pinned, the jump
      is 0 px.
- [x] Country change: keep the digits, reload rules, reformat, re-validate — never clear or
      truncate [PRD D17].
- [x] Flags: placeholder box first, `loadFlag()` swap; warm the whole set on first interaction
      (one re-render for the set, not 244). **Deviation from S2's overlay, recorded:** the fallback
      flag lives in the dial-code ADDON (this element's own light-DOM child), not overlaid on the
      select — the overlay needed reserved in-shadow padding this element cannot set on mp-select,
      only aligned while the select was the group's first child, and had an engine-dependent width.
      Same `@supports` gating so rich engines don't show two flags.
- [x] Validator: `loadPhoneRules()` on first focus/input or non-empty initial value;
      structural checks until resolved; formatting via `phone-core/format` + `setFormValidity` from
      `updated()`; `valid: undefined` in `value-change` until loaded.
- [x] **Caret management per PRD D10 — all seven rules** (digit-count anchor, `beforeinput` capture,
      restore-on-rejected-non-digit, Backspace/Delete always removes a digit, composition guard,
      synthetic `input` after an intercepted key, reject-when-too-long). A DOM-free reference
      implementation is in the S7 spike harness; port it with its own unit spec. Skipping rule 4
      leaves the control visibly **stuck** when Backspace lands on a separator.
- [x] Paste/typed `+XX…` in the tel input → country switch + prefix strip, sourced from the
      **table** while typing and the validator on parse/blur [PRD D11]; never overwrite an explicit
      user selection [PRD D5a]; dial code static adjacent text (D9); focus input after country
      selection (D9).
- [x] i18n: `locale` attr (no default), `input-label`/`country-label`/`error-text`/`placeholder`
      attrs; `preferred-countries`/`allowed-countries` (NOT `only-countries` — Angular cannot bind an
      attribute starting with `on`).
- [x] A11y per PRD §6: error channel via `errorFeedback()` + `aria-errormessage`; dial-code span
      `aria-describedby`; `HostAriaController` + `syncReferences()` in `updated()`; own
      `:focus-visible` ring in SCSS.
- [x] `mp-phone-input.spec.ts` + `mp-phone-input.aria.spec.ts` (the `mp-select.aria.spec.ts`
      template: naming trio + five error-text transitions + describedby wiring).
- [ ] **Commit.**

## M6 — Angular wrappers [PRD §5.8]

- [x] `bs-input-group`: replace the shell template with
      `<mp-input-group bsForwardAria><ng-content></ng-content></mp-input-group>`, add
      `CUSTOM_ELEMENTS_SCHEMA`, side-effect import, `size` input; delete the `::ng-deep`
      Bootstrap import SCSS.
- [ ] Migrate the 4 demo usages (input-group page, alert, scheduler ×2, toast) — **M8**, with the
      demo pages; the selector and content model are unchanged so they keep working as-is.
- [x] `bs-phone-input`: CVA (NG_VALUE_ACCESSOR + forwardRef — the value is a plain E.164 string, so
      no object-mapping accessor is needed) + `BsControlValidityDirective` via `hostDirectives` (+ `BsControlValidityDirective` with
      `[errorMessages]`), scalar pushing in one `effect()`, `writeValue` derives `country`.
- [x] Wrapper unit specs: host-component round-trips (writeValue decomposes E.164, value-change
      updates the model, array inputs join to attributes, size written only for sm/lg).
- [ ] **Commit.**

## M7 — React + Vue wrappers [PRD §5.8]

- [x] React: `BsInputGroup` + `BsPhoneInput` via `createComponent`
      (`onValueChange`/`onCountryChange`).
- [x] Vue: `BsInputGroup.vue` + `BsPhoneInput.vue` — `defineModel<string | null>()`,
      `inheritAttrs: false` + `v-bind="$attrs"`, object props via ref, composed-`change` guard.
- [ ] **Commit.**

> **Found in M7, pre-existing and out of this PR's scope — worth its own issue.** The React and Vue
> libraries build every sub-entrypoint into `dist/<name>/index.mjs` but their published `exports` maps
> contain only `"."` and `"./package.json"`. So `@mintplayer/react-bootstrap/select` — and every other
> subpath, not just the two added here — is unreachable for an npm consumer, while the demos work
> because tsconfig path mappings bypass the exports map entirely. The WC library already solved this
> with a `generateSubpathExports` Vite plugin (`libs/mintplayer-web-components/vite.config.mts`) that
> writes the map at `closeBundle`; porting it to both wrapper libs is the fix. Not done here: it
> changes the published surface of ~40 unrelated components and deserves its own review.

## M8 — demo pages ×3 [demo-conventions report]

- [x] Angular: `pages/basic/forms/phone-input/` (component/html/scss/spec), route in
      `forms.routes.ts`, nav item in `app.component.html` Forms dropdown; live-demo-then-snippet
      order, `ts-dedent` snippets; document the keymap; include locale + preferred-countries +
      validation demos. Refresh the existing input-group demo page with an `mp-*`-child example.
- [x] React: `pages/forms/PhoneInputPage.tsx`, `lazyNamed` + `<Route path="/basic/forms/phone-input">`,
      `SECTIONS` entry in `AppShell.tsx`.
- [x] Vue: `views/forms/PhoneInputView.vue`, router entry, `SECTIONS` entry in `App.vue`.
- [ ] **Commit.**

## M9 — conformance + a11y registries [repo rules; all mandatory]

- [x] `libs/mintplayer-web-components/_conformance/naming.spec.ts` — import + `CASES` entries for
      `mp-phone-input` (target: tel input) and `mp-input-group` if it takes `input-label`
      (it doesn't — host `aria-label` only, so CASES entry for phone-input only) +
      `ERROR_TEXT_CASES` addition.
- [x] `libs/mintplayer-ng-bootstrap/_conformance/aria-passthrough.spec.ts` — `WRAPPERS` entries
      for `bs-input-group` + `bs-phone-input`; bump the completeness count 20 → 22.
- [x] React `_conformance/attribute-passthrough.spec.tsx` CASES + count (10 → 12), `.types.tsx` probes
      (bare/camelCase names only).
- [x] Vue: automatic invariant sweep covers the SFCs; floor check still passes (6 green).
- [x] Axe registries: `{ path: '/basic/forms/phone-input' }` (+ an `interact` hook opening the
      select) in `a11y/axe.spec.ts` in **all three** e2e projects — and deliberately **NOT** in
      `axe-nojs.spec.ts`: that registry lists only the components with a real no-JS tier
      (`/`, accordion, carousel, navbar, shell). Verified: `tree-select`, the closest JS-only
      precedent, appears in no `axe-nojs` list. A phone input has no no-JS tier (PRD §3), so
      listing it would audit a control that legitimately renders nothing without JS.
- [ ] Functional e2e per app: country switch updates dial code + flag; paste `+44…` switches
      country; invalid → message → valid clears; validator chunk loads lazily (request-count
      assertion); tree-select-style backend gating not needed (no API).
- [ ] **Commit.**

## M9b — Responsive layout + flag loading [PRD §12] — **before M10**

Two defects the user found by running it; the gate could not have caught either (mechanisms measured
in isolation, desktop viewport, five flags). Fix them before the sweep, not after.

- [x] **(a) Cap the fallback trigger** — `@supports not (appearance: base-select) { mp-select {
      width: 5.5rem !important } }` in `phone-input.styles.scss`, plus
      `@supports not (…) { select.form-select { text-overflow: ellipsis } }` in `select.styles.scss`
      (outside the rich block). **This alone fixes the reported defect**: measured Firefox single-row
      from 280 px up, zero page overflow, tel input 129.8 px at 320; Chromium/WebKit byte-identical
      because the gate never matches there. Executes what §5.3 decided and M5 skipped.
- [x] ~~`flex-wrap: nowrap`~~ — **REJECTED by measurement, do not add.** With the trigger unable to
      shrink it collapses Firefox's tel input to 26 px (zero content) and scrolls the *page*
      sideways by 131 px at 320 — worse than the bug. After (a) nothing wraps down to 280 px.
      (`min-width: 0` alone was also confirmed useless: line-breaking uses hypothetical main size.)
- [x] **(b) Clamp `::picker(select)`** in `select.styles.scss`, inside the existing
      `@supports` + `:host([rich])` block: `box-sizing: border-box` (or the border escapes the cap),
      `max-width: min(100vw - 2rem, 22rem)` (`-2rem` because whether `100vw` includes a classic
      scrollbar is unmeasurable headless), `min-width: anchor-size(self-inline)` (supported in all
      three engines; required or a 5.5 rem trigger yields a 5.5 rem picker). Ellipsis on
      **`.rich-label`** with `min-width: 0` — `option` is `display: flex`, so `text-overflow` on it
      is inert. Uncapped overflow measured: 18.4 px Chromium, 1.8 px WebKit at 320.
- [ ] **(d) Optional, recommended: the deliberate two-row stack below 22 rem** via
      `container-type: inline-size` on `:host` (measured safe — `::picker` box byte-identical under
      containment, and the repo's containing-block note does not reproduce). It is the only thing that
      makes Firefox's face readable: 216.8 px showing the full `Belgium +32 (BE)` instead of `Bel…`.
      Needs two prerequisites: **four** corner custom properties (the current two map to both start
      corners, and a stacked row needs top-round/bottom-square), and overrides that out-specify the
      base `(0,3,1)` rules — `::slotted(input:not(:first-child))` (0,3,2),
      `::slotted(.addon:not(:last-child))` (0,4,1). Naive `::slotted(input)` (0,0,2) loses **silently
      and half-applied**, `!important` notwithstanding.
- [x] **Fix the RTL dial code** [PRD §12.6]: `+32` renders as `32+` at any width, because the
      bidi-neutral `+` reorders in an RTL paragraph. `dir="ltr"` (or a bidi isolate) on `.dial-code`.
- [x] **Fix the flag gate** [PRD §12.2]: the addon flag is hidden by `@supports`, but the closed-face
      flag depends on `mp-select` reflecting `[rich]` — different conditions, so a suppressed `rich`
      means no flag anywhere. Key it off the real state (reflect it outward from `mp-select`, or
      mirror it as a custom property).
- [x] **Flag loading** [PRD §12.5] — adopted ONE bundled corpus chunk (not the hybrid): per-chunk
      compression doubles the corpus, 43 KB together vs 90 KB apart, so progressive rendering alone
      would have left the picker 3.3 s slow. Rendering stays one-shot by design. Original item:: adopt the measured winner (single bundled chunk / per-flag /
      hybrid) **and** fix the all-or-nothing warm-up — render the selected flag immediately and the
      rest progressively or in batches, never one `requestUpdate()` after `Promise.all` over 244.
      Amend PRD §5.4 D4 with the new numbers.
- [ ] Specs: a narrow-viewport e2e at 320 px asserting one row and no picker overflow (per app, in
      M8's e2e); a unit spec that the flag survives with `rich` suppressed.
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

- [x] All four library builds green; `nx test mintplayer-web-components` **1763/1763** (114 files);
      `nx test mintplayer-ng-bootstrap` **543/543** (161 files); `nx build ng-bootstrap-demo` green.
      The demo's "initial exceeded budget" warning is **not** from this work — verified that
      `main-*.js` (84.5 kB) contains no phone-input code and that the flag corpus and all 207
      metadata slices are lazy chunks.
- [ ] **HUMAN:** keyboard pass on the demo page (tab order, Escape, typeahead in the select, focus
      ring visible), Firefox smoke (flex-shrink trap), RTL smoke (`dir="rtl"` — the tel input is
      forced LTR by the UA, PRD §9.1 c6, and the dial code is now explicitly `dir="ltr"`, §12.6).
- [ ] The five human-only checks S7/S8 could not automate (PRD §9.2): a real IME composition
      session **and a mobile soft keyboard**; whether the caret *feels* right when typing,
      backspacing and pasting mid-number; whether the late country flip on shared dial codes is
      acceptable; the 4 Chromium country-name differences (editorial call); and **how a screen
      reader announces a value that reformats under the caret** — the most likely to need a design
      response, so do it early in the pass, not last.
- [x] Inspected `dist`: the flag corpus is ONE lazy chunk (44 KB gzip) per D4a, `/core` +
      per-calling-code slices are lazy, and the phone-input entry carries no eager flag or metadata
      bytes (196 B shared flag chunk).
- [x] Version bumps: web-components 2.9.0, ng 22.13.0, react 19.14.0, vue 3.15.0 — already at those
      values in the tree.
- [x] PRD §9 verdicts recorded per spike; §12 records the two reported defects and their fixes;
      §13 is the as-built summary.
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
