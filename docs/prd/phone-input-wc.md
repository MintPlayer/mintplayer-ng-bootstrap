# PRD — `mp-input-group` + `mp-phone-input` web components + cross-framework wrappers

Status: **Planned** (2026-08-03) — investigation complete (five parallel agents: repo patterns,
reference repo, flag/data research, asset-bundling prototype in an isolated worktree, i18n/demo
conventions). Spikes not yet run; no branch or PR exists yet.
Plan: [phone-input-wc-plan.md](./phone-input-wc-plan.md)
Reference: the user-linked repo `priyashpatil/phone-input-by-country` (cloned at
`C:\Repos\phone-input-by-country`) was analysed and turned out to be a ~4.5 KB UX sketch — no
country dataset, emoji flags (broken on Windows), no a11y. We borrow its two good ideas (§5.9)
and nothing else.

## 1. Problem

The catalog has no phone-number input. A phone number is a compound value — country + dial code +
national digits — and entering one well needs a country picker (with flags, localized names,
dial codes), a dial-code prefix that cannot be corrupted by editing, and real per-country
validation. Nothing in the workspace does any of this today: the only `type="tel"` in the repo is
a bare unvalidated input in the stepper demo
(`apps/ng-bootstrap-demo/src/app/pages/additional-samples/stepper/stepper.component.html:145`),
and there is no country/dial-code data, no flag rendering, and no phone formatting anywhere.

Two structural gaps block the clean version of this component:

1. **There is no input-group web component.** `bs-input-group` is a 9-line Angular-only shell —
   no inputs, no logic, template `<div class="input-group"><ng-content></ng-content></div>`
   (`libs/mintplayer-ng-bootstrap/input-group/src/input-group/input-group.component.ts`). React
   and Vue have no equivalent at all.
2. **Bootstrap's input-group styling is already broken for shadow-DOM children.** The corner
   pairing and flex rules are direct-child selectors —
   `.input-group > .form-control, > .form-select { flex: 1 1 auto; … }` and
   `.input-group:not(.has-validation) > :not(:last-child)… { border-end-radius: 0 }`
   (`node_modules/bootstrap/scss/forms/_input-group.scss`) — and `.form-select` lives *inside*
   `mp-select`'s shadow root where those selectors can never match. The scheduler demo already
   exhibits this: four `<bs-select>` in one `<bs-input-group>`
   (`apps/ng-bootstrap-demo/src/app/pages/enterprise/scheduler/scheduler.component.html:44`) get
   neither `flex: 1 1 auto` nor collapsed inner corners. This PRD fixes that pre-existing defect
   as a side effect of the group contract (§5.2).

## 2. Goals

1. `mp-input-group` — a generic, framework-agnostic input-group WC that visually joins slotted
   controls (native inputs, buttons, spans, **and** `mp-*` shadow-DOM form controls) exactly the
   way Bootstrap's `.input-group` joins light-DOM ones.
2. `mp-phone-input` — a form-associated phone-number WC composed, per the locked architecture,
   of `mp-input-group` + `mp-select` (country, with SVG flag + ISO code) + a static non-editable
   dial code + `<input type="tel">`.
3. Vector flags for all dial-code countries (~244), lazily loaded, ~43 KB gzip in total,
   published as a reusable `@mintplayer/web-components/flags` sub-entrypoint.
4. Localized country names for free via `Intl.DisplayNames` — zero translation files.
5. Full per-country validation and as-you-type formatting via **lazy-loaded**
   `libphonenumber-js` — never in the eager bundle.
6. Wrappers: `bs-input-group` (migrated from the Angular shell), `bs-phone-input`
   (ControlValueAccessor), `BsInputGroup`/`BsPhoneInput` (React), `BsInputGroup.vue`/
   `BsPhoneInput.vue` (Vue), plus demo pages, aria/conformance/axe coverage in all three apps.
7. WCAG 2.2 AA per the repo's a11y rules: the flag is decorative, the accessible names are
   localized strings, the error channel is `error-text` → `aria-errormessage` on the role-bearing
   control.

## 3. Non-goals

- **No no-JS interactive tier and no DSD SSR chrome.** No form control in the repo ships one
  (the `codegen-*-chrome` targets cover only shell/navbar/dropdown/carousel/accordion); a phone
  input without JS is a plain `<input type="tel">`, which is what consumers should render
  server-side if they need that.
- **No number storage/formatting opinions beyond E.164 out.** No MSISDN normalization services,
  no server-side validation, no SMS verification flows.
- **No extension (`x123`) support** in v1 — libphonenumber-js can parse them; the UI does not
  expose them.
- **No free-standing `mp-flag` element.** The flags sub-entry ships data (SVG strings + a loader),
  not a component; `mp-phone-input` renders them itself.
- **No changes to the legacy `[bsDropdown]` combobox line** — the country picker is `mp-select`.

## 4. Locked decisions (confirmed with the user, 2026-08-03)

| # | Decision | Consequence |
|---|---|---|
| 1 | **Composition, not a single shadow root**: `mp-phone-input` uses `mp-input-group` with a slotted `mp-select` + `<input>`, per the user's original sketch. The investigated alternative (one shadow root owning everything, like `mp-datetime-picker`) was explicitly declined. | The cross-boundary styling contract (§5.2) becomes the #1 risk and gets spike S1. |
| 2 | The generic InputGroup → WC migration ships **in this release** (one request = one release). | `bs-input-group`'s 9-line shell is replaced; 4 demo usages migrate; React/Vue gain the component. |
| 3 | **Full `libphonenumber-js` validation, lazy-loaded** — the metadata chunk is fetched via dynamic `import()` on demand, never eagerly. | `libphonenumber-js` becomes a dependency of `@mintplayer/web-components`; §5.5 defines the load points and the pre-load behaviour. |
| 4 | Flags are **vector** (SVG), never emoji. | Windows renders no flag emoji (Segoe UI Emoji omits them by policy); emoji is not even a fallback tier. |
| 5 | Spikes are unbounded — include as many as the risks warrant. | Six spikes, §9. |

## 5. Core architecture

### 5.1 Element inventory

```
<mp-phone-input>                        ← FACE host; owns value, validation, i18n
  #shadow-root
    <mp-input-group>                    ← generic group, reused as-is
      <mp-select> … </mp-select>        ← country picker (flag + ISO + dial code)
      <span class="dial-code">+32</span>← static, non-editable
      <input type="tel" inputmode="tel">← national digits only
    </mp-input-group>
    (error feedback node)
```

New sub-entrypoints (auto-discovered by `discoverEntries()` in
`libs/mintplayer-web-components/vite.config.mts` — a dir with both `index.ts` and `src/index.ts`
is an entrypoint, and `generateSubpathExports` writes the `exports` map into the built
package.json; **zero config changes needed**, verified by prototype):

- `libs/mintplayer-web-components/input-group/` — the element.
- `libs/mintplayer-web-components/phone-input/` — the element.
- `libs/mintplayer-web-components/phone-core/` — DOM-free logic + data, following the
  `scheduler-core`/`timeline-core`/`swiper-core` convention: country table, dial-code lookup,
  E.164 assembly/parsing, the lazy libphonenumber facade. Pure `.spec.ts`-testable, shared by
  nothing framework-specific.
- `libs/mintplayer-web-components/flags/` — SVG flag strings + lazy loader (§5.4).

### 5.2 `mp-input-group` — the group contract (D1, D2)

**D1 — shadow host, not a light-DOM host.** The shadow root renders
`<div class="group" part="group"><slot></slot></div>` with the slot's children as flex items
(`.group { display: flex; align-items: stretch; width: 100% }`, `slot { display: contents }`).
The rejected alternative — a light-DOM host with a once-injected document stylesheet, the
`mp-card` pattern (`card/src/mp-card.element.ts:62`, `ensureCardStylesInjected()`) — fails in
this component's primary use: `mp-input-group` sits **inside `mp-phone-input`'s shadow root**,
where a document-level stylesheet cannot reach. A shadow host behaves identically at the
document level and nested, so it wins on the "same thing everywhere" test.

**D2 — two channels, one per child kind** (amended after spike S1 — the naive version of channel 1
was refuted; see §9.1 for the measurements):

1. **Light-DOM children** (native `<input>`, `<button>`, `<span>`, addon text) are styled with
   `::slotted()` rules re-declaring Bootstrap's input-group contract. Two corrections that S1
   forced, both non-obvious:

   - **The positional declarations must be `!important`.** A *normal* declaration inside
     `::slotted()` loses to any rule in the tree the child actually lives in — including the
     page's own `.form-control { border-radius: var(--bs-border-radius) }`. Measured: the
     selector matched (the `-1px` margin landed, the custom properties resolved) while every
     corner stayed at 6px. Importance inverts the tree-order rule — important declarations from
     the *inner* tree win — which is the only mechanism that squares a child the page already
     styled. `width` needs it too: Bootstrap's `width: 100%` otherwise beats `width: 1%` and
     forces each control onto its own flex line.
   - **Physical properties under `:dir()` guards, not logical ones.** A logical property on a
     slotted child resolves against *that child's* direction, and the UA stylesheet forces
     `input[type=tel|url|email]` to `ltr` even inside an `rtl` context (measured:
     `direction: ltr` on the tel input while its sibling `<select>` reported `rtl`). So
     `border-start-start-radius` squared the wrong corner and `margin-inline-start` put the
     overlap on the wrong side — for the tel input specifically, i.e. exactly this component.
     Keying physical properties off the *group's* own direction is immune, and the two blocks are
     mutually exclusive so nothing has to be restored:

   ```scss
   :host(:dir(ltr)) ::slotted(:not(:first-child)) { margin-left: -1px !important; border-top-left-radius: 0 !important; border-bottom-left-radius: 0 !important; }
   :host(:dir(ltr)) ::slotted(:not(:last-child))  { border-top-right-radius: 0 !important; border-bottom-right-radius: 0 !important; }
   :host(:dir(rtl)) ::slotted(:not(:first-child)) { margin-right: -1px !important; border-top-right-radius: 0 !important; border-bottom-right-radius: 0 !important; }
   :host(:dir(rtl)) ::slotted(:not(:last-child))  { border-top-left-radius: 0 !important; border-bottom-left-radius: 0 !important; }
   ::slotted(input), ::slotted(select) { flex: 1 1 auto !important; width: 1% !important; min-width: 0 !important; }
   ```

   What does *not* need re-declaring: because slotted elements stay in their own tree, the page's
   `.form-control` typography, colours and borders still reach them (measured). Only the
   positional geometry — the part Bootstrap keys on `.input-group >`, which cannot match through a
   slot even when the shadow container really does carry `class="input-group"` (measured) — is
   re-declared.

   > Consequence for the API, also measured (§9.1 c9): since important-inner beats
   > important-outer, the group is **authoritative** — a consumer cannot keep a rounded middle
   > child by force. Document it: to opt out, reorder the children or don't use the group.
2. **Shadow-DOM children** (`mp-select`, later any `mp-*` control) are reached through **custom
   properties, the only channel that inherits across the boundary**. `mp-input-group` *sets*
   them positionally on the slotted element; the control *consumes* them with Bootstrap-default
   fallbacks:
   ```scss
   /* input-group side */
   ::slotted(:not(:first-child)) { --mp-group-radius-start: 0; }
   ::slotted(:not(:last-child))  { --mp-group-radius-end: 0; }
   ::slotted(mp-select) { flex: 1 1 auto; }

   /* mp-select side (form-select.styles.scss) */
   .form-select {
     border-start-start-radius: var(--mp-group-radius-start, var(--bs-border-radius));
     border-end-start-radius:   var(--mp-group-radius-start, var(--bs-border-radius));
     border-start-end-radius:   var(--mp-group-radius-end,   var(--bs-border-radius));
     border-end-end-radius:     var(--mp-group-radius-end,   var(--bs-border-radius));
   }
   ```
   The names are deliberately **`--mp-group-*`, not `--mp-select-*`** — this is a generic
   "participate in a group" contract any future `mp-*` form control implements, not a select
   feature. The `--mp-<component>-<prop>` custom-property convention is established
   (`--mp-card-border-radius`, `--mp-datatable-border-color`, `--mp-pagination-active-bg`).

> **Correction to an earlier draft of this PRD:** it warned, from the shadow-migration notes, that
> a `:host` declaration of the same custom property would defeat the group's value, so `mp-select`
> must never declare `--mp-group-*` on `:host`. **Measured: the opposite.** The group sets the
> property *on the host element* from the outer tree, and an outer-tree declaration beats the
> inner tree's `:host` rule — the corner squared correctly even with a deliberately conflicting
> `:host` declaration, in all three engines. The contract is therefore robust against a control
> that gets this wrong. (The original note still holds for its actual case: a `:host` declaration
> defeating a value *inherited from a document ancestor*, which is a weaker source than any
> declaration on the element itself.)

Channel 2 needed no amendment — it worked exactly as designed on first measurement, including one
shadow level deeper, and logical properties are safe there because the control's role-bearing node
is a `<select>`, which inherits `direction` normally.

Spike S1 proved both channels in Chromium + Firefox + WebKit (§9.1). Fixing the scheduler demo's
broken group (§1.2) is the acceptance demo for D2.

Also in scope for `mp-input-group`: `size` (`sm`/`md`/`lg`) mapped to Bootstrap's
`input-group-sm`/`-lg` paddings (declared in-shadow — the classes are unused in the workspace
today but belong to the component's contract), and `:focus-within` z-index lift so a focused
control's ring isn't clipped by the `-1px` margin overlap.

### 5.3 `mp-select` — flag-capable options (D3)

Native `<option>` renders text only, so "the flag inside the select" needs one of:

**D3 — progressive enhancement via customizable select (`appearance: base-select`),** the
Chromium-shipped customizable-`<select>` mechanism that allows arbitrary markup in options and a
`<selectedcontent>` mirror in the closed state. Where supported, options render
`flag SVG + localized name (+dial code)`; where not (Firefox, per current support), options fall
back to plain text — `BE +32 België` — and the **closed** state still shows the flag everywhere,
because `mp-phone-input` overlays the selected flag + ISO code over the select's collapsed face
(the proven intl-tel-input pattern: the native select stays fully functional and accessible; the
overlay is `aria-hidden` and `pointer-events: none`). No custom listbox is built — `mp-select`
keeps its native `<select>` semantics, roving/typeahead and screen-reader behaviour for free.

Spike S2 verifies: base-select inside a shadow root, in the repo's Playwright browsers, and that
the text-only fallback degrades without layout jumps.

Changes to `mp-select` proper stay minimal and are all additive:
- consume `--mp-group-*` (§5.2);
- accept rich option content in `.options` mode (an optional `html`-producing render callback per
  option, following the repo's render-callback convention — slots can't be per-option);
- fix the barrel gap found in review: `select/src/index.ts` exports `MpSelectSize`,
  `MpSelectOption`, `SelectChangeEventDetail` but not `MpSelectOptgroup`/`MpSelectItem`, so
  consumers can't type a grouped list today.

### 5.4 Flags — vendored `country-flag-icons`, lazy loader map (D4)

**Set: `country-flag-icons` 3×2 (MIT).** Measured against the alternatives, it is the only
maintained set whose SVGs contain **zero `id=` attributes, zero `url(#…)` references, zero
`<style>` tags** — decisive, because ~250 flags inlined into one shadow root is exactly where
internal SVG IDs collide (`circle-flags` declares `<mask id="a">` in *all 265 files* and renders
correctly today only because the masks are byte-identical). The full 244 dial-code countries cost
**161 KB raw / 43 KB gzip**; Belgium is 183 bytes. `flag-icons` (lipis) was rejected at 515 KB
gzip (crest-heavy outliers: `rs.svg` 177 KB, `sh-ac.svg` 140 KB); sprite+`<use>` was rejected
because `<use href="#id">` cannot cross a shadow boundary; emoji was rejected per D4.

**Delivery: committed source SVGs + a codegen'd lazy loader map**, the mechanism measured
end-to-end by the asset-bundling prototype (built through the real
`nx build mintplayer-web-components`, consumed from a simulated npm install via the workspace's
own esbuild, executed in plain Node, and under vitest/jsdom — all green):

```
flags/
  index.ts, src/index.ts                  → auto-registered sub-entrypoint
  src/assets/<iso2>.svg × ~244            → COMMITTED (vendored inputs, like .scss sources)
  src/flag-loaders.generated.ts           → GENERATED, gitignored (the existing
                                            libs/mintplayer-web-components/**/*.generated.ts rule
                                            already covers it — zero .gitignore changes)
```

```ts
// generated:
export const flagLoaders: Record<CountryCode, () => Promise<string>> = {
  be: () => import('./assets/be.svg?raw').then((m) => m.default),
  // … × 244 — STATIC string literals only, see the guard rail below
};
// hand-written in src/index.ts:
export function loadFlag(code: string): Promise<string | undefined>; // cached, lowercases, unknown → undefined
```

Measured behaviour: each `?raw` dynamic import becomes its own **~0.8 KB lazy chunk** (dynamic
imports force chunk boundaries even with `preserveModules: false`); the SVG string is inlined
into the chunk so **the `.svg` files are build-time-only — nothing to copy, nothing published but
`.mjs`**; the Angular consumer's esbuild re-splits the 244 chunks from node_modules into its own
lazy chunks; the eager cost to a consumer is only the loader map (~8 KB min / ~2 KB gzip); plain
Node resolves the imports (SSR-safe, no `document`/`fetch`/`import.meta.url`); vitest needs zero
config. The `.d.ts` emits cleanly (`tsconfig.lib.json` already has `vite/client` types).

The vendoring is refreshed by `tools/scripts/refresh-flags.mjs` copying from the
`country-flag-icons` **devDependency** (with its MIT notice preserved in `flags/README.md` /
`LICENSE` snippet) — upstream updates are a script run + a reviewable diff of committed SVGs,
and consumers carry no extra runtime dependency.

Rejected with measurements: `new URL(…, import.meta.url)` (Vite lib mode inlines to a data URI
and never emits the file; esbuild doesn't rewrite the pattern at all → runtime 404s for Angular
consumers); one eager sprite module (223 KB raw / 54 KB gzip for fabricated flags, all paid
up-front); `exports`-map `./assets/*` passthrough (pushes a copy step onto every consumer —
anti-"pull complexity downwards"; the Shoelace `setBasePath` idiom it resembles is documented in
Shoelace's own tracker as hostile to wrapping libraries, which is exactly what our wrappers are).

> **Guard rail (release-blocking, measured):** dynamic imports in lib source must be **static
> string literals**. A `` import(/* @vite-ignore */ `./flags/${code}`) `` survives verbatim into
> the published `.mjs` and hard-fails every esbuild consumer's build
> (`ERROR: Could not resolve import("./flags/**/*")`). The generated map exists precisely to
> keep every import static. Add this to CLAUDE.md's WC gotchas when the feature lands.

**In `mp-phone-input`:** render a fixed-size placeholder box first (no layout shift), resolve
`loadFlag(country)` and swap it in; when the dropdown first opens, warm the visible set. Flags
render via `unsafeHTML` into an `aria-hidden` span, matching the `CHEVRON_SVG` precedent
(`treeview/src/components/mp-treeview.ts:48`).

### 5.5 `phone-core` — data + lazy validation (D5, D6)

**Country table: `intl-tel-input/data`** (official typed `./data` export subpath, MIT, published
2026-07; **17.7 KB raw / 4.4 KB gzip**) as a regular dependency, imported eagerly by
`phone-core`. Its `rawCountryData` tuples are `[iso2, dialCode, priority, areaCodes,
nationalPrefix]` — the `areaCodes`/`priority` fields are what disambiguate the +1 NANP block
(US vs CA vs ~20 Caribbean territories), which every hand-rolled list gets wrong on day one.
Rejected: hand-maintained JSON (same bytes, we own dial-code churn forever),
`country-telephone-data` (more bytes, bundles English-only names that `Intl.DisplayNames` makes
dead weight), `libphonenumber-js` metadata as the *selection* source (82–154 KB solves a problem
selection doesn't have — but see D6, it *is* the validation source).

**Country names: `Intl.DisplayNames`** — zero bytes, localized by the component's `locale`
attribute (default: browser locale, the scheduler's convention — no `'en-US'` default; that bug
class is documented in `docs/prd/scheduler-compact-timeline-localization.md`). Verified against
the awkward codes (`XK` Kosovo, `AC` Ascension, `BQ` Caribbean Netherlands, `IO` BIOT…) on full
ICU; Node has shipped full ICU by default since v13, so SSR needs no `full-icu` package. This is
also intl-tel-input's own mechanism (verified in their source), which is why their per-locale
files are ~0.6 KB of UI strings only.

**D6 — validation: `libphonenumber-js`, lazy.** `phone-core` exposes an async facade:

```ts
// phone-core/src/validation.ts — the ONLY module that names libphonenumber-js
let mod: Promise<typeof import('libphonenumber-js/min')> | undefined;
export function loadPhoneValidator() {
  return (mod ??= import('libphonenumber-js/min'));
}
```

The dynamic import is a **static string literal** (guard rail, §5.4), so the metadata becomes one
lazy chunk (~82 KB min-metadata) that Rollup emits under `chunks/` and downstream bundlers
re-split — a consumer pays for it only when a phone input actually loads it. Load points:
`mp-phone-input` triggers `loadPhoneValidator()` on first focus/input (and immediately when it
mounts with a non-empty initial value, so an SSR'd form validates without interaction). Until the
chunk resolves, the component performs structural checks only (digits/`inputmode`, `required` →
`valueMissing`); once resolved, `AsYouType` formats keystrokes and `validatePhoneNumberLength` /
`isValidPhoneNumber` drive `setFormValidity` + `error-text` display. Validity is pushed from
`updated()` (never only from event handlers), the `mp-select` precedent
(`select/src/components/mp-select.ts`).

The `/min` metadata set is the default; the PRD notes but does not build a knob for `/mobile` or
`/max`. The alternative shape — a consumer-supplied loader callback property instead of an
internal import — was considered and rejected: it pushes complexity upward for zero gain, since
the internal import is already lazy and tree-shaken away from consumers who never render a phone
input. (If a consumer needs a different metadata set later, a loader property can be added
non-breakingly.)

**Also in `phone-core` (pure, unit-tested):** dial-code lookup with priority/area-code NANP
resolution; "typed/pasted `+32…` into the national input" detection → country switch + prefix
strip (the reference repo lacks this; intl-tel-input has it and users expect it); E.164
assembly/parsing; the country list ordering (localized-name collation via `Intl.Collator`).

### 5.6 `mp-phone-input` — value model and behaviour (D7, D9)

**D7 — the FACE value is E.164** (`+32470123456`), `null` when the national input is empty.
Selecting a country with an empty input submits nothing (the reference repo's worst bug is a
hidden dial-code field that desyncs from the UI and posts `+91` with no number — that bug class
is defined out of existence by deriving the form value from one source of truth on demand).
`formValue()`/`formReset()`/`formRestore()`/`formValidityAnchor()` follow
`FormAssociatedMixin` (`a11y/src/form-associated.ts`) exactly as `mp-select` does; the validity
anchor is the tel `<input>`.

> **Nested-FACE note:** `mp-select` inside `mp-phone-input`'s shadow root is itself
> form-associated, but form association is tree-scoped — a FACE element inside a shadow root
> never finds the outer light-DOM form, so the inner select cannot double-submit. Spike S5
> asserts this and the two-focusable-controls focus model.

Surface:

- Attributes: `country` (ISO 3166-1 alpha-2, lowercase), `value` (E.164), `default-country`,
  `locale`, `preferred-countries` / `only-countries` (comma-separated ISO lists; preferred pin to
  the top under an `<optgroup>`-style separator), `disabled`, `required`, `invalid`, `name`,
  `input-label`, `country-label`, `error-text`, `placeholder`.
- Events: `value-change` with
  `detail: { value: string | null; country: string; dialCode: string; nationalNumber: string; valid: boolean | undefined }`
  (`valid` is `undefined` until the validator chunk has resolved — honest, not optimistic), and
  `country-change`.
- **D9 (borrowed from the reference repo):** the dial code is **static adjacent text, never part
  of the editable value** — it cannot be deleted or duplicated; and focus moves to the tel input
  after a country is chosen.
- Display: closed select face shows flag + uppercase ISO code (the user's requested shape);
  dropdown options show flag (where D3 supports it) + localized name + `+NN`.

### 5.7 i18n (D8)

Follows the house two-axis model exactly (no central i18n mechanism exists; the convention is
per-component):

- **Locale axis:** the `locale` attribute drives `Intl.DisplayNames` (country names),
  `Intl.Collator` (list order) — deliberately no default, browser locale wins, per the
  scheduler's locale rule.
- **Strings axis:** the handful of chrome strings (`input-label` default `'Phone number'`,
  `country-label` default `'Country'`, `error-text` from the consumer, placeholder) ride the
  Tier-2 `*-label` attribute pattern with English defaults — attributes, not a property
  catalogue, so plain-HTML/SSR consumers can localize them. Validation messages beyond the
  consumer's `error-text` reuse libphonenumber's structural verdicts mapped to a small
  `PhoneInputMessages`-style overridable set **only if review shows we need generated text**;
  v1 aims for `error-text`-only, keeping the WC out of the message-composition business.

`aria-label` on the host wins over `input-label` (naming conformance contract,
`_conformance/naming.spec.ts`).

### 5.8 Wrappers

- **Angular** — `bs-input-group`: replace the shell's template with
  `<mp-input-group bsForwardAria><ng-content></ng-content></mp-input-group>` +
  `CUSTOM_ELEMENTS_SCHEMA` + side-effect import; the component keeps its selector so the 4 demo
  usages keep working (they migrate anyway to verify). `bs-phone-input`: CVA via
  `hostDirectives` (`BsSelectValueAccessor` precedent —
  `libs/mintplayer-ng-bootstrap/select/src/component/select.component.ts`), plus
  `BsControlValidityDirective` for `invalid`/`required`/`error-text` mirroring; scalars pushed in
  one `effect()`; `void MpPhoneInputElement` if the class is imported for typing.
- **React** — `@lit/react` `createComponent` for both, uniformly (`BsSelect` precedent); events
  `onValueChange`/`onCountryChange`.
- **Vue** — `<script setup>` SFCs, `defineModel<string | null>()` on the phone input,
  `defineOptions({ inheritAttrs: false })` + `v-bind="$attrs"` on the inner element, object props
  through the element ref in `onMounted`/`watch`, and the `BsSelect.vue` guard that ignores the
  composed native `change` (no `detail`).

CVA value: the E.164 string (matching the WC). `writeValue` also derives + sets `country`.

### 5.9 What we borrow from the reference repo

Only: the visual composition (picker + static dial code + number reading as one bordered
control); dial code outside the editable value (D9); focus-the-input-after-selection (D9); the
*instinct* of per-country constraints (implemented via libphonenumber metadata, not hand-typed
`data-cpi-min-length`). Everything else was measured and rejected — see the investigation notes
in this PRD's status block.

## 6. ARIA contract (hard requirement)

- The tel `<input>` is the role-bearing value control: named by `input-label` (host `aria-label`
  wins), `inputmode="tel"`, `autocomplete="tel-national"` passthrough.
- `mp-select` keeps its native select semantics; its accessible name is `country-label`
  (localized by the consumer like every `*-label`).
- Each option's accessible name is `localized country name + dial code` — never the flag; flags
  are `aria-hidden="true"` decorative, and the flag is never the only indication of the selected
  country (the ISO code text sits beside it).
- The dial-code span is referenced from the tel input via `aria-describedby` (it is context, not
  a name).
- `error-text` renders through `errorFeedback()` (`a11y/src/error-text.ts`), referenced by
  `aria-errormessage` + `aria-describedby` from the tel input, **only while `invalid`**.
- `HostAriaController` handles host `aria-labelledby`/`aria-describedby` as cross-root element
  references (never copied inward as IDREFs); `updated()` re-runs `syncReferences()` because the
  inner nodes are recreated on re-render (the `mp-select` lesson).
- Focus: two tab stops (select, input) — a compound field, like `mp-datetime-picker`. Focus ring
  declared in the component's own SCSS (`:focus-visible`; note the shared
  `_styles/focus-ring.styles.scss` helper is dead code nothing imports — hand-roll like every
  other component, or adopt it deliberately, but don't assume it's wired).
- `mp-input-group` itself is presentational — `role="group"` only when the consumer names it
  (`aria-label`), else no role.

## 7. #1 risk — read before implementing

**The locked composition (D-lock 1) builds the component on cross-shadow-boundary styling.** The
repo has been burned by this class twice (the navbar item-styling problem; the pickers ended up
hand-drawing their input-group in-shadow). The mitigation is the two-channel contract of §5.2
plus spike S1 as a **gate**: if S1 fails in either engine — e.g. `::slotted()` positional
matching or custom-property inheritance into `mp-select`'s generated stylesheet behaves
differently than specified — the fallback (pre-agreed here so the branch doesn't stall) is that
`mp-phone-input` renders the group chrome itself in its own shadow root (the declined
alternative) while `mp-input-group` still ships for light-DOM consumers. That fallback changes
no public API of either element.

| Risk | Mitigation |
|---|---|
| ~~S1 contract fails in an engine~~ | **RETIRED** — S1 passed 36/36 in three engines (§9.1); the fallback below is not needed |
| `appearance: base-select` unusable in shadow root / Playwright browsers | D3 already defines the text-only fallback as the *baseline*; rich options are enhancement only (S2) |
| libphonenumber chunk 404s in a consumer bundler | S3 repeats the asset-prototype's consumer matrix (esbuild/Vite/Node) with the real `libphonenumber-js/min` import before any UI work |
| `Intl.DisplayNames` server/client locale mismatch → hydration noise | S4: same-locale handshake in all three SSR demos; component renders names client-side only if S4 finds mismatches |
| Vendored flags drift from upstream | `refresh-flags.mjs` + diffable committed SVGs; not time-critical (flags change ~never) |
| `intl-tel-input` data shape changes on update | It's a typed export; pin the minor, cover the tuple shape with a `phone-core` spec |

## 8. Public API

### `<mp-input-group>`

| Surface | Name | Notes |
|---|---|---|
| attr | `size` | `sm \| md \| lg`, Bootstrap group sizing |
| attr | `aria-label` | names the group (`role="group"` applied only when named) |
| slot | (default) | any mix of native controls, addon text, `mp-*` controls |
| css | `--mp-group-radius-start/-end` | SET by the group on slotted `mp-*` children (the contract, §5.2) |
| part | `group` | the flex container |

### `<mp-phone-input>`

| Surface | Name | Notes |
|---|---|---|
| attr/prop | `value` | E.164 string or null; the FACE/CVA value |
| attr/prop | `country` | ISO alpha-2, lowercase |
| attr | `default-country` | initial country when `value` is empty |
| attr | `locale` | drives `Intl.DisplayNames`/`Intl.Collator`; no default (browser locale) |
| attr | `preferred-countries`, `only-countries` | comma-separated ISO lists |
| attr | `name`, `disabled`, `required`, `invalid`, `placeholder` | standard form surface |
| attr | `input-label`, `country-label`, `error-text` | localized strings, Tier-2 pattern |
| events | `value-change` | `{ value, country, dialCode, nationalNumber, valid }`; `valid` undefined until validator loaded |
| events | `country-change` | `{ country, dialCode }` |
| methods | `focus()` | delegates to the tel input |

### `@mintplayer/web-components/flags`

| Surface | Name | Notes |
|---|---|---|
| fn | `loadFlag(code)` | `Promise<string \| undefined>`, cached, case-insensitive |
| const | `flagLoaders` | generated static map, one lazy chunk per flag |
| type | `CountryCode` | union derived from the vendored set |

### `@mintplayer/web-components/phone-core`

| Surface | Name | Notes |
|---|---|---|
| const/fn | `countries`, `countryForDialString()`, `toE164()`, `splitE164()` | pure, eager, 4.4 KB gzip data |
| fn | `loadPhoneValidator()` | the lazy libphonenumber facade (D6) |

### Wrappers

`bs-input-group` (unchanged selector, now WC-backed), `bs-phone-input` (CVA, `[errorMessages]`
via `BsControlValidityDirective`), `BsInputGroup`/`BsPhoneInput` (React), `BsInputGroup.vue`/
`BsPhoneInput.vue` (Vue `v-model`). Consumer `aria-*`/`role`/`id`/`tabindex` land on the `mp-*`
element in all three (conformance-registry enforced).

## 9. Spikes (gate — throwaway, Chromium + Firefox, verdicts recorded here)

| # | Question | Pass criterion | Verdict |
|---|---|---|---|
| S1 | Does the §5.2 two-channel group contract work? `::slotted(:not(:first-child))` positional matching + `--mp-group-*` inheritance into a *generated* `unsafeCSS` stylesheet, incl. the `-1px` border overlap + `:focus-within` lift | Corner pairing + flex visually correct for `input+span+mp-select` in both engines, nested inside another shadow root | **PASS, with two amendments to D2** — 36/36 in Chromium + Firefox + WebKit (§9.1) |
| S2 | `appearance: base-select` with SVG-bearing options inside a shadow root; graceful text-only fallback | Rich options in Chromium; identical layout metrics in the Firefox fallback | |
| S3 | `import('libphonenumber-js/min')` from the published lib: chunking in our Vite build, esbuild + Vite consumers re-splitting from node_modules, plain-Node resolution | One lazy chunk; all three consumers resolve; Node imports without `document` | |
| S4 | `Intl.DisplayNames` SSR/hydration parity in the three demo SSR pipelines | No hydration mismatch on country names with an explicit locale; documented behaviour with browser-locale default | |
| S5 | FACE-in-FACE isolation + two-tab-stop focus model | Inner `mp-select` contributes nothing to the outer form's `FormData`; `formDisabledCallback` fans out to both controls; Tab order select → input | |
| S6 | Flag pipeline dress rehearsal: vendor 3 real flags, codegen the loader map, build, consume | Mirrors the asset prototype's verdicts on the real repo files (expected to pass — the prototype already did this with fabricated SVGs) | |

### 9.1 S1 — the group contract: **PASS**, after two refutations

Harness: `docs/prd/_spike-phone-input-s1/` (throwaway; deleted once these verdicts are recorded).
Fidelity: the probe control adopts the **real** compiled `_styles/form-select.styles.scss` (sass,
same invocation as `codegen-wc`) through Lit's `static styles` → `adoptedStyleSheets`, i.e. the
production path. 36 assertions × Chromium 1228 / Firefox 1522 / WebKit 2287, all green. Radii below
are computed physical corners in px at `--bs-border-radius: 0.375rem` (= 6px); identical in all
three engines unless noted.

| Case | Measurement | Verdict |
|---|---|---|
| c1b — light children, **normal** `::slotted()` radius | selector matched (`margin-left: -1px` landed) but every corner stayed `6,6,6,6` | **REFUTES** the naive channel 1 |
| c1 — same, radius marked `!important` | `input {6,0,0,6}` · `addon {0,0,0,0}` · `button {0,6,6,0}`; margins `0/-1/-1px`; `flex-grow` 1/0/0 | PASS |
| c2 — `input` + `mp-select` (select last) | host resolves `--mp-group-radius-start: 0`, `-end` unset; inner `.form-select` `{0,6,6,0}`; host box == inner box | PASS — channel 2 as designed |
| c3 — `mp-select` + `input` (select first) | inner `.form-select` `{6,0,0,6}` | PASS |
| c4 — `mp-select` + dial code + tel input | one row, 38px equal heights, each item overlapping the previous by exactly 1px | PASS |
| c5 — c4 **one shadow level deeper** | identical to c4. Note the outer host declares its own `.form-control` (page CSS cannot reach in), so the same outer-tree contest occurs — `!important` is required even for our own composition | PASS |
| c6 — RTL | `direction: ltr` on the tel input while its sibling `<select>` reported `rtl` → the UA forces `input[type=tel]` LTR; visual order reversed, overlaps on the right, corners mirrored | **REFUTES** logical properties; physical + `:dir()` passes |
| c7 — control declares `--mp-group-*` on `:host` | corner still squared (`{0,6,6,0}`) — outer-tree declaration beats the inner `:host` rule | PASS (inverts an earlier assumption) |
| c8 — `group[size=sm]` sizing a shadow child | `--mp-group-font-size: 0.875rem` → inner `.form-select` `font-size: 14px` | PASS |
| c9 — page rule with `!important` on a middle child | all corners `0` — important-inner beats important-outer | PASS; group is authoritative (§5.2) |
| focus lift | light child `z-index: 5` via `::slotted(:focus)`; **shadow** child `z-index: 5` via `::slotted(:focus-within)` (focus inside the slotted host's own shadow root) | PASS |
| page CSS reach | slotted input keeps the page's `border-color: rgb(222,226,230)` + `padding-left: 12px`; a page rule keyed `.input-group > .form-control` never applied (`outline-style: none`) even though the shadow container carries `class="input-group"` | PASS — confirms what must and must not be re-declared |

Consequences already folded into §5.2: channel 1 is `!important` + physical properties under
`:dir()` guards; channel 2 is unchanged; the `:host` warning is corrected; the group is documented
as authoritative. **The §7 fallback is not needed** — the composition architecture stands.
## 10. Testing

- `phone-core`: pure vitest — NANP disambiguation table, dial-string detection, E.164 round-trip,
  lazy-facade caching.
- `mp-input-group.spec.ts` + `mp-phone-input.spec.ts` + `*.aria.spec.ts` per the
  `mp-select.aria.spec.ts` template (name from attribute/property/host-wins; the five
  `error-text` state transitions). jsdom caveats apply (`sharedInternals` degrades to null; lit
  `isServer` is true under vitest — don't gate behaviour on it).
- Registries (all mandatory): `_conformance/naming.spec.ts` `CASES` (+ `ERROR_TEXT_CASES`),
  Angular `aria-passthrough.spec.ts` `WRAPPERS` + count bump (20 → 22), React
  `attribute-passthrough` runtime CASES + count + `.types.tsx` probes, Vue automatic
  (invariant sweep) but add it to the floor check if needed.
- Demo pages in all three apps (`/basic/forms/phone-input` + input-group page refresh), demo
  snippets in the house demo-then-snippet order, keymap documented on the page.
- e2e: functional spec per app (country switch updates dial code + flag; paste `+44…` switches
  country; validation message appears/clears; lazy chunk actually loads on first focus — assert
  via a network/request count) + **axe registry entries** in all six files
  (`a11y/axe.spec.ts` + `axe-nojs.spec.ts` × 3 apps).
- The scheduler demo's input-group visual defect (§1.2): before/after screenshot noted in the PR,
  no new visual-regression CI (per `scheduler-compact-timeline-localization.md` §22, that stays
  local-only).

## 11. Versioning & dependencies

Breaking changes: none expected (`bs-input-group`'s selector and content model are preserved;
everything else is new). Minor bumps on all four: web-components 2.8.0 → 2.9.0,
ng-bootstrap 22.12.0 → 22.13.0, react-bootstrap 19.13.0 → 19.14.0, vue-bootstrap 3.14.0 → 3.15.0.

New dependencies of `@mintplayer/web-components`: `libphonenumber-js` (lazy-chunked, D6),
`intl-tel-input` (data subpath only, 4.4 KB gzip in-bundle). New devDependency: `country-flag-icons`
(vendoring source only — never shipped).

## 12. References

- Plan: [phone-input-wc-plan.md](./phone-input-wc-plan.md)
- Precedents: `mp-select` + `bs-select` (FACE + CVA), `mp-otp-input` (hidden-input value carrier),
  `mp-datetime-picker` (compound field, hand-drawn group — the declined alternative and the S1
  fallback), `mp-treeview`/`mp-file-manager` (inline SVG + resolver), `scheduler-core` (core
  sub-entry + locale rules), `mp-card` (injected-sheet pattern, rejected here).
- Investigation reports (this session, 2026-08-03): reference-repo autopsy, flag/data research
  (measured sizes), asset-bundling worktree prototype (measured dist output), repo patterns,
  i18n conventions, demo/PRD conventions.
- External: `country-flag-icons` (MIT), `intl-tel-input` `./data` (MIT), `libphonenumber-js`
  (MIT), MDN `Intl.DisplayNames`, customizable select (`appearance: base-select`).
