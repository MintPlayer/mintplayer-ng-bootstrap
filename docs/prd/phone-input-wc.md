# PRD — `mp-input-group` + `mp-phone-input` web components + cross-framework wrappers

Status: **Spike gate passed; implementation not started** (2026-08-04) on `feat/phone-input-wc`,
branched from `master` at `62642ddd`, draft **PR [#399](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/399)**.
Design investigation was five parallel agents (repo patterns, reference repo, flag/data research, an
asset-bundling prototype in an isolated worktree, i18n/demo conventions); the gate was **S1–S9, all
PASS** across Chromium 148 / Firefox 150 / WebKit 26.4 — verdicts and evidence in §9.1–§9.4. **S9 passed too, after a
correction**: per-*calling-code* metadata slices ship (§5.5 D6a-alt), cutting first use from 56.8 KB
gzip to ~16.6 KB while keeping full `/max` precision.

The gate paid for itself: it amended or reversed the design in six places — the metadata set (D6a),
the country table's role (D5a), the formatter (D6b/F1), E.164 assembly (D6c), the `::slotted()`
mechanism (§5.2 D2), and the RTL property choice (§5.3) — and two of those would have shipped as
user-visible defects rather than being caught in review: Firefox losing its dropdown caret entirely
(§9.4), and a `<fieldset disabled>` leaving both inner controls keyboard-operable (§9.3, D12). The
locked composition architecture came through unchanged and the §7 fallback is retired.
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
  server-side if they need that. Consequently the demo page is registered in `axe.spec.ts` only,
  **not** in `axe-nojs.spec.ts` — verified convention: that registry lists only the five routes
  with a real no-JS tier, and `tree-select` (the closest JS-only precedent) appears in none of
  the three apps' no-JS lists.
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

Cross-entrypoint composition needs no new mechanism: the established idiom is a package specifier
plus a bare side-effect import for registration, exactly as `mp-datatable` composes two other WCs
(`datatable/src/components/mp-datatable.ts:24-28`: `import '@mintplayer/web-components/pagination';`
+ `import type { PageChangeEventDetail } …`, and the same for `checkbox`) and `mp-tree-select`
composes `mp-treeview` (`tree-select/src/components/mp-tree-select.ts:5,11`). So `mp-phone-input`
imports `@mintplayer/web-components/select` and `…/input-group` the same way — the tsconfig
wildcard resolves it in dev and the generated `exports` map resolves it in the published package.

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

**D2a — the cascade order between the three trees, measured end to end.** S1 established that a
*normal* `::slotted()` declaration loses to the tree the child lives in; S2's RTL pass measured the
third case, and the practical ordering for one slotted control is:

> `::slotted()` normal (from the group) **<** `:host` normal (from the control) **<** outer-tree
> normal (from the page or the composing element) **<** `::slotted()` `!important` (from the group)

Two actionable consequences. **The pinned width of the country picker is expressible precisely
because of this**: `:host { flex: 0 0 auto; width: 7.5rem }` declared inside `mp-select` beats the
group's `::slotted(*) { flex: 1 1 auto }` (measured), so a control can size itself without the group
conspiring. And conversely, **anything the group must win it has to mark `!important`** — which is
exactly what §5.2's geometry rules already do.

**D1a — `mp-input-group` must NOT set `delegatesFocus` (S5).** Measured both ways: `focus()`
result, `document.activeElement` and the full tab order are byte-identical in all three engines, so
it buys nothing while imposing focus behaviour on every other consumer of the generic group.

Also in scope for `mp-input-group`: `size` (`sm`/`md`/`lg`) mapped to Bootstrap's
`input-group-sm`/`-lg` paddings (declared in-shadow — the classes are unused in the workspace
today but belong to the component's contract), and `:focus-within` z-index lift so a focused
control's ring isn't clipped by the `-1px` margin overlap.

### 5.3 `mp-select` — flag-capable options (D3)

Native `<option>` renders text only, so "the flag inside the select" needs one of:

**D3 — progressive enhancement via customizable select (`appearance: base-select`),** which allows
arbitrary markup in options and a `<selectedcontent>` mirror in the closed state. Where supported,
options render `flag SVG + localized name + dial code`; where not, options fall back to plain text
and `mp-phone-input` overlays the selected flag + ISO code on the collapsed face (the intl-tel-input
pattern: the native select stays fully functional and accessible; the overlay is `aria-hidden` and
`pointer-events: none`). No custom listbox is built — `mp-select` keeps its native `<select>`
semantics, so typeahead and screen-reader behaviour come free.

**S2 confirms D3 and amends it in four ways (§9.4; Chromium 148, Firefox 150, WebKit 26.4):**

1. **It is 2 engines of 3, and the fallback is Firefox-only.** WebKit 26.4 supports
   `appearance: base-select`, `::picker(select)` **and** `<selectedcontent>` — the first draft's
   "Firefox and WebKit" was already out of date. Therefore **feature-detect, never a browser list**
   (`CSS.supports('appearance','base-select')` / `@supports`), so the gate flips itself when Firefox
   ships. Verified working at shadow depth 0, 1 **and 2** — the nesting this component needs.
2. **The overlay must be gated OFF where base-select works**, or Chromium and WebKit draw a second
   flag beside the `<selectedcontent>` one. Measured: overlay `display` = `none`/`flex`/`none`.
3. **Every Bootstrap-reconciliation rule must be `@supports`-gated, and this is a release blocker,
   not tidiness.** Ungated, the recipe *deletes Firefox's dropdown arrow*: pixel-measured, the right
   44 px of the closed face fell to 1 ink run of 2 px — the border alone — because the rules that
   suppress Bootstrap's `background-image` caret (correct when the UA supplies `::picker-icon`) also
   run in the engine that has no `::picker-icon`. Two more conflicts with pixel evidence: ungated in
   a supporting engine gives **two carets** (3 runs / 21 px vs 2 / 14), and `display: flex` without
   `white-space: nowrap` **wraps the localized name and grows the control 38 px → 62 px**, which a
   native `<select>` never does.
4. **The CSS must live inside `mp-select`'s own shadow root** — which follows from S1 and is now
   load-bearing rather than incidental. A `::slotted(mp-select) { appearance: base-select }` pushed
   from `mp-phone-input` would lose to `.form-select` in the inner tree, and no outer `!important`
   reaches the inner `<select>` at all. `mp-phone-input` legitimately owns only the overlay, in its
   own shadow root, needing just `:host { position: relative }`.

Two specificity/completeness requirements, both measured: Chrome's own documented snippet
`select, ::picker(select) { appearance: base-select }` **loses the cascade** to Bootstrap's
`.form-select { appearance: none }` (a class beats a type selector), so it must be
`select.form-select`; and applying it to the select *alone* flips the closed face while leaving the
picker native (`optionsLaidOut: 0`). Both parts are required. Also **always author
`<button><selectedcontent></selectedcontent></button>`** — WebKit's UA-generated button mirrors
nothing, Chromium's does.

**Two API consequences that are not CSS:**

- **The picker needs an explicit width from `mp-input-group`.** A native `<select>` sizes to its
  *widest* option; a base-select button sizes to the *selected* content — measured 320 px native vs
  152 px (Chromium) / 157 px (WebKit) rich, i.e. a **width jump, not a height jump**. With a pinned
  width the jump is exactly **0 px** and the text baseline is stable (first ink at x = 13–14 px in
  every engine and mode). So pin it.
- **The fallback option text must read `Name +dial (ISO)`, not `BE +32 België`.** Native typeahead
  prefix-matches the option's text, so ISO-first makes typing a country name unreachable — measured
  in all three engines: `germ` reaches Germany with name-first and never with ISO-first. This does
  not affect the user-requested closed-face shape (flag + ISO code), which stays.

**RTL: the overlay keeps logical properties — this is the one place S1's conclusion must NOT be
copied.** The group's corner radii had to become physical under `:dir()` guards because a logical
property on the slotted `input[type=tel]` resolves against that input's UA-forced `ltr`. The overlay
is different, and measured so: the entire chain it belongs to inherits `rtl` correctly
(phone host → group → `mp-select` host → the inner `<select>`, verified two boundaries deep in all
three engines), and the overlay sits over the *select*, never touching the tel input. So
`inset-inline-start` and `padding-inline-start` are correct as written — measured at a stable **+1 px
from the select's inline-start edge in both directions, in all three engines**.

Using physical `padding-left` instead is a **measured defect, and not a cosmetic one**: the reserved
gutter lands on the wrong side *and* combines with Bootstrap's own `padding-right` to exceed the
pinned flex basis, so the border-box floor inflates the control from 120 px to 134 px and it
**overflows into the tel input by 14 px** in all three engines. Two related confirmations:
`margin-inline-start: auto` puts `::picker-icon` on the trailing edge in both directions and both
base-select engines (pixel-measured), and nothing else in the recipe needs a `:dir()` variant —
though `padding-right: 0.75rem` in the reconciliation is symmetric only *by accident* (Bootstrap's
left padding happens to match), so it should be written `padding-inline: 0.75rem` to make the safety
intentional.

> **Pre-existing, and worth fixing while we are in that stylesheet:** Bootstrap's `.form-select` is
> authored physically and does not flip in the default (non-RTL) build, so in RTL the caret gutter
> and the caret itself both stay on the physical right — which is the *leading* edge. It is
> collision-free, so nothing is broken today and it equally affects `bs-select` standalone, but it
> reads wrong. Since M3 already edits `form-select.styles.scss` for the group contract, normalize it
> there (`padding-inline`, logical `background-position`). Under base-select it disappears anyway.

Everything else came back clean: keyboard open/arrows/Escape and exactly **one** `change` event on
commit; typeahead reaching Germany *through* the inline SVG; the overlay's pierced hit path landing
`pointerdown` **and** `mousedown` on the `<select>` with the focus ring intact in all three engines;
and Chromium CDP reporting `role=combobox` + `role=option` with correct `nameFrom=contents` names,
so rich options need no extra `aria-label`s.

**Perf: no virtualization and no lazy flag rendering needed.** 244 options with real-shaped flag
SVGs build in **20 ms** (Chromium; 13 ms Firefox, 18 ms WebKit) versus 8 ms for text-only, and open
costs one extra 16.7 ms frame. Well inside budget.

Changes to `mp-select` proper stay minimal and are all additive:
- consume `--mp-group-*` (§5.2);
- accept rich option content in `.options` mode (an optional `html`-producing render callback per
  option, following the repo's render-callback convention — slots can't be per-option);
- carry the `@supports`-gated base-select recipe in its own stylesheet (D3, amendment 4);
- fix the barrel gap found in review: `select/src/index.ts` exports `MpSelectSize`,
  `MpSelectOption`, `SelectChangeEventDetail` but not `MpSelectOptgroup`/`MpSelectItem`, so
  consumers can't type a grouped list today.

> **Latent bug to check while in there (found by S2):** with rich option content the accessibility
> name is space-separated (`"Ascension Island +1"`) but `option.textContent` is **not**
> (`"Ascension+1"`), and `mp-select`'s `collectSlotItems` derives its label from
> `opt.textContent?.trim()`. So a slotted rich option would feed a run-together label into
> `.options` mode. Verify when the render callback lands.

### 5.4 Flags — vendored `country-flag-icons`, lazy loader map (D4)

**Set: `country-flag-icons` 3×2 (MIT).** Measured against the alternatives, it is the only
maintained set whose SVGs contain **zero `id=` attributes, zero `url(#…)` references, zero
`<style>` tags** — decisive, because ~250 flags inlined into one shadow root is exactly where
internal SVG IDs collide (`circle-flags` declares `<mask id="a">` in *all 265 files* and renders
correctly today only because the masks are byte-identical). The 244 dial-code countries cost
**161,718 B raw**. Corrected by S6: the **43 KB gzip figure is the concatenated corpus** — as 244
separately-compressed lazy chunks the total is **87.8 KB gzip**, and the number that actually
matters is per-flag: **median 313 B, min 163 B, max 1,657 B gzip**. Belgium is 183 raw bytes; the
largest is `io` at 5,363 raw (not `rs`, which is 903 B in this set — the 177 KB `rs.svg` belongs to
the rejected lipis set). `flag-icons` (lipis) was rejected at 515 KB
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
`.mjs`** (verified on the real build: 0 `.svg` in `dist`); the Angular consumer's esbuild re-splits
the chunks from node_modules into its own lazy chunks; the eager cost to a consumer is only the
loader map — **15.0 KB min / 3.3 KB gzip** for 244 entries (S6 correction; the first draft guessed
~8 KB / ~2 KB); plain Node resolves the imports (SSR-safe, no `document`/`fetch`/`import.meta.url`);
vitest needs zero config. The `.d.ts` emits cleanly (`tsconfig.lib.json` already has `vite/client`
types).

The vendored artwork ships **inside** those chunks, which is a licensing obligation:
`nxCopyAssetsPlugin(['*.md'])` is **not recursive**, so `flags/README.md` — the MIT notice — was
silently not published. Fixed by adding `'*/README.md'` to the glob (S6; verified present in
`dist/libs/mintplayer-web-components/flags/README.md`).

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

> **Guard rail (release-blocking, measured — and it has two failure modes, not one):** dynamic
> imports in lib source must be **static string literals**. A
> `` import(/* @vite-ignore */ `./flags/${code}`) `` survives verbatim into the published `.mjs`
> and then, depending on where the computed prefix points:
> 1. **Hard build failure** if the directory does not exist in the published layout —
>    `ERROR: Could not resolve import("./assets/**/*.svg?raw")`. Loud, therefore harmless.
> 2. **Silent bundle multiplication** if it *does* exist — S6 measured
>    `` import(`../chunks/${code}.mjs`) `` making esbuild glob **the entire chunks directory** into
>    the consumer's bundle (47 chunks: every component plus libphonenumber), or hard-fail on a
>    surprising `Could not resolve "lit"`. This one ships.
>
> The generated map exists precisely to keep every import static. Both modes belong in CLAUDE.md's
> WC gotchas when the feature lands.

**In `mp-phone-input`:** render a fixed-size placeholder box first (no layout shift), resolve
`loadFlag(country)` and swap it in; when the dropdown first opens, warm the visible set. Flags
render via `unsafeHTML` into an `aria-hidden` span, matching the `CHEVRON_SVG` precedent
(`treeview/src/components/mp-treeview.ts:48`).

### 5.5 `phone-core` — data + lazy validation (D5a, D5b, D6, D6a–D6c)

**D5b — both runtime packages are `external`, not bundled (S3).** Bundling `libphonenumber-js` and
`intl-tel-input` into our chunks was measured and rejected: the emitted `.d.ts` still names them, so
a TypeScript consumer without them installed gets `TS2307` regardless — bundling bought nothing
while adding 231 KB to our tarball. They are declared in the WC package's `dependencies` (not
`peerDependencies` — consumers never import them, so there is no version to align) and marked
`external` in `vite.config.mts`. Verified on the real build: `phone-core/index.mjs` is **351 B**
(down from 17,764 B bundled) and the bare `libphonenumber-js/max` specifier survives into the
published output, so the consumer's own bundler emits the lazy chunk and an app that already uses
libphonenumber ships one copy instead of two.

**Country table: `intl-tel-input/data`** (official typed `./data` export subpath, MIT, published
2026-07; **5.5 KB minified / 1.8 KB gzip once bundled** — the 17.7 KB / 4.4 KB in the first draft
was the unminified dist file, corrected by S8) as a regular dependency, imported eagerly by
`phone-core`. Its `rawCountryData` tuples are `[iso2, dialCode, priority, areaCodes,
nationalPrefix]` — the `areaCodes`/`priority` fields are what disambiguate the +1 NANP block
(US vs CA vs ~20 Caribbean territories), which every hand-rolled list gets wrong on day one.
Rejected: hand-maintained JSON (same bytes, we own dial-code churn forever),
`country-telephone-data` (more bytes, bundles English-only names that `Intl.DisplayNames` makes
dead weight).

**D5a — the table stays even though libphonenumber ships country data (settled by S8.1).** The
obvious simplification — drop the table, let the lazily-loaded validator name the country — does
not work: `parsePhoneNumber().country` returns `null` for any number that is not yet *valid*, so
it cannot name a country while the user is still typing or has fat-fingered a digit
(`+19995551234` → `null`; `+441481123456` → `null` while the table still says `gg`). Measured on
the hard cases: table **19/19**, libphonenumber **17/19**. Over a 244-country sweep they agree on
235, the table alone is right once (`im`), libphonenumber alone is never right, and 8 are
irreducible. So the division of labour is:

| Concern | Owner |
|---|---|
| Picker list, dial codes, mid-typing country resolution | the eager table (1.8 KB gzip) |
| Validity, number type, as-you-type formatting, authoritative country once the number parses | the lazy validator |

Two correctness rules that fell out of S8.1 and belong in `phone-core`:

- **Area-code tie-break:** a country *with* `areaCodes` that did not match must never beat a plain
  dial-code match of the same length — otherwise `ca` (priority 1) is reported for every unlisted
  `+1` area code.
- **Detection is irreducibly lossy** for 8 territories that share numbering ranges (`ax cx cc bl
  mf sj va eh`); no mechanism can separate them. Therefore **a detected country must never
  overwrite an explicit user selection.**

**Country names: `Intl.DisplayNames`** — zero bytes, localized by the component's `locale`
attribute (default: browser locale, the scheduler's convention — no `'en-US'` default; that bug
class is documented in `docs/prd/scheduler-compact-timeline-localization.md`). Verified against
the awkward codes (`XK` Kosovo, `AC` Ascension, `BQ` Caribbean Netherlands, `IO` BIOT…) on full
ICU; Node has shipped full ICU by default since v13, so SSR needs no `full-icu` package. This is
also intl-tel-input's own mechanism (verified in their source), which is why their per-locale
files are ~0.6 KB of UI strings only.

**D6 — validation: `libphonenumber-js`, lazy.** `phone-core` exposes an async facade:

```ts
// phone-core/src/validation.ts — the ONLY module that names libphonenumber-js.
// Returns a PhoneRules facade so callers cannot reinvent the two traps it hides
// (D6b's international-route formatting, D6c's parse-based toE164).
export function loadPhoneRules(country: string): Promise<PhoneRules | undefined>;
// internally: import('libphonenumber-js/core') once, plus that country's
// calling-code metadata slice — both static literals, both lazy.
```

Both dynamic imports are **static string literals** (guard rail, §5.4), so `core` and each metadata
slice become their own lazy chunks that Rollup emits under `chunks/` and downstream bundlers re-split
— a consumer pays for them only when a phone input actually loads them. Load points:
`mp-phone-input` triggers `loadPhoneRules(country)` on first focus/input (and immediately when it
mounts with a non-empty initial value, so an SSR'd form validates without interaction). Until the
chunks resolve, the component performs structural checks only (digits/`inputmode`, `required` →
`valueMissing`); once resolved, `PhoneRules.format` formats keystrokes and `lengthProblem` / `isValid` drive
`setFormValidity` + `error-text` display. Validity is pushed from
`updated()` (never only from event handlers), the `mp-select` precedent
(`select/src/components/mp-select.ts`).

> ### D6a-alt — per-**calling-code** metadata: **ADOPTED** (S9). This is what ships.
>
> **Slice by calling code, not by country.** That one word is the whole finding. The first cut sliced
> per country and failed: `gb` reported a valid UK number invalid, and the diagnosis showed it was
> systematic rather than a one-off — a per-country slice was measured **rejecting 586 of 640**
> numbers belonging to a *sibling* of the selected country. Two facts about how Google stores a
> shared calling code explain it: a block's formats live only in its "main" country (NANP formats in
> `US`, +7's in `RU`, +39's in `IT`), and a number typed under one member is validated against **all**
> members. A user on a US form typing a Toronto number is mainstream, not an edge case. Slicing per
> calling code keeps each block whole and both facts hold: **206 slices** for 244 selectable
> countries.
>
> **Verified exhaustively, not by sample.** `metadata-parity.spec.ts` sweeps **every** selectable
> country against full `/max` — taking each number from libphonenumber's own example table rather than
> a curated list, so the check is self-maintaining — and compares `format`, `isValid`, `isValid(±1
> digit)`, `type`, `toE164` and `lengthProblem`. **Zero divergences across all 244.** On top of that:
> per-keystroke format parity on a 30-country spread (an inherited-formats regression shows up
> mid-typing, not on the finished number), sibling-number acceptance, and a dial-code pin.
>
> **Measured cost** (real build; `/core` and `/max` bundled+minified by esbuild):
>
> | | gzip | when |
> |---|---|---|
> | `phone-core` entry — country table, picker list, `Intl` helpers | **1.67 KB** | page load |
> | `libphonenumber-js/core` | **16.1 KB** | first interaction, once |
> | the loader map | **3.1 KB** | first interaction, once |
> | one calling-code slice | **404 B** (+32 BE) · median **341 B** · max **3.02 KB** (+1 NANP) | per country used |
> | **lazy total, first interaction** | **≈19.6 KB** (BE) — **22.3 KB** worst case (NANP) | |
> | *the single-`/max` chunk it replaces* | *56.8 KB* | *first interaction* |
>
> The eager entry is the same either way (a picker cannot render without the country
> table), so the comparison that matters is the lazy column: **19.6 KB vs 56.8 KB**.
>
> **Saves 37 KB / 65% on first use** while keeping **full `/max` precision** — `getType()` included,
> which is what makes "home or mobile" answerable — and each country switch adds only its own slice
> (median 341 B). Break-even is **110 calling codes** in one session, i.e. unreachable. Per-country
> slicing was also *bigger* in total, not smaller (245 chunks / 96 KB vs 206 / 86 KB), so the
> correctness fix cost nothing in size. The published tarball grows 187 KB raw.
>
> *(An earlier version of this table said 16.6–19.2 KB. It omitted the lazy loader-map chunk.)*
>
> **The spec is the upgrade guard, and that is not decoration.** Neither fact about Google's storage is
> guaranteed by the metadata format version, so a libphonenumber bump could silently stop a country
> formatting or validating. The parity sweep turns that into a CI failure instead of a support ticket.
>
> **The one silently-failing coupling is now closed, in both directions.** The facade used to read the
> calling code positionally out of the metadata (`metadata.countries[iso2][0]`) — and worse, the parity
> spec could not catch a wrong value, because it fed *our* dial code into the oracle, so the error
> cancelled on both sides. Fixed twice over: the runtime takes the dial code from `phoneCountries`
> (the same table the picker selects from, so a mismatch is impossible by construction), leaving
> **zero positional metadata access at runtime**; and the oracle now uses `/max`'s own
> `countryCallingCode`, with the dial code asserted for **all 244** countries. Verified by mutation:
> injecting a wrong dial code for one country fails 4 assertions across both specs.
>
> Two codegen-side positional accesses remain (`country_calling_codes[cc][0]` for the main country,
> `countries[iso2][0]` for grouping) — both **loud**: the parity sweep fails if either moves.
>
> **Honest gaps, not closed** (behavioural evidence is strong but indirect, so they are M2 items rather
> than claims): no dedicated A→B test that reformats the *same digit string* after a country switch —
> though 17 countries loaded sequentially in one process and 7,296 sequential cross-country assertions
> all matched `/max`, which cross-talk would have broken; and no source audit of `/core` for
> module-level metadata caches, though `new Metadata(json)` is constructed per call in
> `source/metadata.js`.
>
> **Licensing:** the slices redistribute Google's metadata (Apache-2.0, from `PhoneNumberMetadata.xml`),
> so `phone-core/README.md` carries the Apache notice. The `libphonenumber-js` code that reads them
> stays an ordinary MIT dependency and is not redistributed.
>
> <details><summary>Superseded: the deferral this section carried for ~30 minutes</summary>
>
> ### D6a-alt — per-country metadata: prototyped, 243/244 correct, DEFERRED (S9)
>
> The user pointed out that by the time a number is typed **the country is already chosen**, so only
> that country's rules are ever needed — and resolving a `+XX` prefix is the eager table's job
> (D5a/D11), not libphonenumber's. There is therefore no moment at which all 244 countries'
> validation rules are needed at once. S9 built it: `tools/scripts/build-phone-metadata.mjs` slices
> `libphonenumber-js`'s own `metadata.max.json` into one gitignored module per country, loaded through
> a static map exactly like the flags, and fed to `libphonenumber-js/core` (which takes metadata as an
> argument) behind a `PhoneRules` facade.
>
> **It very nearly worked, and the numbers were compelling:** `core` ≈ 16 KB gzip once per page plus
> **≈0.3–0.4 KB gzip per country** (slices measured 1.0 KB raw for BE, 1.5 KB US, 3.1 KB GB) against
> the **57 KB gzip** `/max` baseline — so break-even sits past a hundred country switches, and
> full-precision rules become affordable, dissolving the `/min`-vs-`/max` trade-off entirely.
>
> **Why it is deferred anyway:** the 244-country parity sweep against full `/max` came back
> **39/40 test cases green with `gb` failing — the slice reports a valid UK number as invalid**
> (`isValid` false where `/max` says true). A validator that silently rejects a legitimate number in a
> major market is a worse defect than 40 KB of download, and the cause was not diagnosed. That is the
> whole argument; nothing else about the approach was found wanting.
>
> **For whoever picks this up** (start by reproducing `gb`, then re-run the sweep):
> - Every slice carries exactly **one** country's entry, which is the likely cause: for shared calling
>   codes Google stores the data in one "donor" country only. S9 already hit and handled this for
>   *formatting* — NANP formats live only in `US`, +7's only in `RU`, +39's only in `IT`, so a slice
>   carrying `CA`/`KZ`/`VA` alone formats nothing — and `gb` looks like the same problem reaching
>   validation, GB being the donor for +44's dependent territories (IM, JE, GG).
> - Keep the **dial-code pin** S9 added (`be` → 32, `ca` → 1). The facade reads the calling code out of
>   the metadata **positionally** (`metadata.countries[iso2][0]`), which would otherwise fail silently
>   on a libphonenumber layout change; that spec is what makes it fail loudly instead.
> - The slices redistribute Google's metadata (Apache-2.0, from `PhoneNumberMetadata.xml`), so the
>   Apache notice must ship with them — S9 drafted `phone-core/README.md` for exactly this. The
>   `libphonenumber-js` code that reads them stays an ordinary MIT dependency and is not
>   redistributed.
>
> </details>
>
> (A cheaper-looking alternative — deriving a simple per-country *mask* table — was rejected without a
> spike: S8 already measured what naive per-country rules get wrong, from Italy's significant leading
> zero to Russia's `8`-prefixed toll-free numbers to type-dependent lengths.)

**D6a — `/max` is the precision bar, and now the test oracle rather than the shipped loader
(S8.4, then superseded by D6a-alt above).** The first draft chose `/min` on size alone. Measured over all 244 countries' example numbers, that choice is a user-visible
defect:

| set | bundled+min | **gzip** | falsely accepts 1 digit SHORT | rejects a valid number | `getType()` |
|---|---|---|---|---|---|
| `/min` | 159 KB | **36 KB** | **22 (9.0%)** | 0 | mostly unavailable |
| `/mobile` | 175 KB | 41 KB | 7 (2.9%) | **rejects landlines entirely** | works |
| `/max` | 233 KB | **57 KB** | 7 (2.9%) | 0 | works |

Three decisive facts: (1) `validatePhoneNumberLength` does **not** rescue `/min` — of the 22
one-digit-short numbers it wrongly accepts, that function catches **0**, because those lengths are
legal for the country, just not for that number *type*; (2) `/min` and `/max` format **identically**
— as-you-type output is byte-identical for 244/244 countries, so `/max` buys precision only;
(3) `/mobile` is disqualified outright (Milan, London and Munich landlines all reported invalid).
Paying for `/max`-grade precision to stop green-lighting numbers that are a digit short is the right
trade — and D6a-alt then made it nearly free, by shipping `/max`-quality rules for one calling code
instead of the whole world. `/max` remains the **oracle** the parity spec measures against. (The
"~82 KB" in the first draft was the raw JSON byte count, not what a consumer downloads.)

The alternative shape — a consumer-supplied loader callback property instead of an internal import
— was considered and rejected: it pushes complexity upward for zero gain, since the internal
import is already lazy and tree-shaken away from consumers who never render a phone input. (If a
consumer needs a leaner set later, a loader property can be added non-breakingly.)

**D6b — formatting must go through the international form (F1, discovered by S7).** Because D9
keeps the dial code out of the editable value, the input holds the national significant number
*without* its trunk prefix — and in that mode `new AsYouType(country).input(nationalDigits)`
**formats nothing at all** for the countries this component will actually be used with, because
libphonenumber's national patterns are written against the number *with* its national prefix:

| country | national digits | `AsYouType(country)` | via international, calling code stripped |
|---|---|---|---|
| BE | 470123456 | `470123456` — unformatted | `470 12 34 56` |
| NL | 612345678 | `612345678` — unformatted | `6 12345678` |
| DE | 15112345678 | `15112345678` — unformatted | `1511 2345678` |
| FR | 612345678 | `612345678` — unformatted | `6 12 34 56 78` |
| GB | 7911123456 | `7911123456` — unformatted | `7911 123456` |
| US | 2125551234 | `(212) 555-1234` | `212 555 1234` |

Identical across `/min`, `/mobile` and `/max`, so it is not a metadata-set artefact. The formatter
must therefore be `AsYouType().input('+' + dialCode + nationalDigits)` with the calling code cut
back off — which also yields Italy's significant leading zero for free.

**D6c — `toE164` delegates to the parser; never strip `nationalPrefix` by string comparison.**
Russia's `nationalPrefix` is `8` *and* its toll-free significant numbers begin with `8`, so the
naive rule turns `8001234567` into `+7001234567` instead of `+78001234567`. A string cannot tell a
trunk prefix from a significant digit — only metadata can. `parsePhoneNumberFromString(digits,
COUNTRY)` scored 20/21 on the tricky table and round-tripped 244/244 on the full sweep. (Italy
passes the naive test only by luck: `intl-tel-input`'s `it` tuple carries no `nationalPrefix` at
all, so the table itself encodes "nothing to strip".)

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

**Nested-FACE and focus behaviour — measured (S5, 111/111 in three engines; §9.3).** The inner
`mp-select` cannot double-submit: form association is tree-scoped, so its `internals.form` is
`null` while the host's is the real form, and the outer `FormData` never contains the inner control.
A light-DOM control case confirms tree-scoping is the cause. Five obligations follow, four of them
new:

- **D12 — `disabled` must be pushed down as an ATTRIBUTE, from two callbacks.** This is the one that
  would otherwise ship as a genuine a11y defect. Because the inner controls have no form owner,
  a `<fieldset disabled>` around the host disables *the host only*: measured on a naive composite,
  `hostEffectiveDisabled: true` while `nativeSelectDisabled: false`, `telDisabled: false`, and
  **both inner controls stayed in the tab order**. So `mp-phone-input` must propagate disabled to
  both children, driven from **both** `formDisabledCallback` and
  `attributeChangedCallback('disabled')` — their relative order is engine-dependent (WebKit fires
  the callback *before* the attribute; Chromium and Firefox after) — and it must write the
  **attribute**, not the property, so `FormAssociatedMixin`'s `#formDisabled || hasAttribute` OR
  still holds. Verified: `phone.disabled = false` inside a disabled fieldset leaves everything
  disabled in all three engines.
- **D13 — a host-directed `<label for>` focuses the COUNTRY SELECT, not the tel input.**
  `delegatesFocus` targets the first focusable descendant, so `<label for="phone">Phone number
  </label>` activates the country picker in all three engines (WebKit stops on the `mp-select` host
  without even reaching the native `<select>`). Therefore host `<label for>` is **not** the naming
  path: the tel input is named by `input-label` and the select by `country-label`. The demos and
  wrapper specs must assert that, not a `<label for>`.
- **D14 — `autocomplete` is an attribute on this element, forwarded to the inner input.** Setting
  it on the host is inert: the host has no `autocomplete` IDL property and the UA does no plumbing
  into a shadow root. Root cause of a Firefox divergence pinned: the inner tel input's **form owner
  is `null`** in all three engines, and the autofill mantle is defined against the form owner, so
  Firefox sanitizes the IDL to `""` (Chromium/WebKit reflect `tel-national`). Default
  `tel-national`; real autofill is human-verifiable only (§9.3).
- **D15 — `formRestore` must genuinely parse E.164.** Not hypothetical: a real back-navigation
  fired `formStateRestoreCallback` with `+32470123456` on the host in all three engines. It must
  decompose into country + national number and drive both children.
- **D16 — never style validity on `:user-invalid`.** Firefox matches it **pristine**, before any
  interaction (pink background on first paint); Chromium and WebKit never match it at all — not
  after a refused submit, not after type-then-clear-then-blur. `:invalid` matches the host
  correctly everywhere, but the `invalid` attribute + `error-text` channel already specified in §6
  is the only safe hook.

Tab order needed no amendment and showed **zero** engine divergence: exactly two stops inside the
composite, select then tel input, forward and reverse. `reportValidity()` also behaves: it returns
`false`, focus lands on the in-shadow anchor, and submit is refused in all three engines.

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

**D10 — caret management while reformatting (normative; measured in S7).** As-you-type formatting
rewrites the input's value on every keystroke, and the naive `input.value = formatted` moves the
caret to the end. Measured identically in all three engines: value `470 12 34 56`, caret at 4,
type `9` → caret lands at 10 (end) instead of 5. M5 must implement exactly these seven rules; a
DOM-free reference implementation exists in the spike harness:

1. **Anchor the caret to a digit COUNT, never a string index.** On input: `n` = number of digits
   before the caret; reformat; place the caret immediately after the n-th digit of the new string.
   `n === 0` → index 0, *before* any leading separator, so Backspace there is a no-op instead of
   eating a `(`.
2. **Record the pre-edit caret in `beforeinput`** — the only moment `selectionStart` still reflects
   where the user was.
3. **A rejected non-digit RESTORES, it does not recompute.** `<input type="tel">` accepts letters;
   if the digit sequence is unchanged, restore both the previous value and the pre-edit caret.
   Without this, typing `a` at index 4 drifts the caret to 3 (measured).
4. **Backspace/Delete must always remove a DIGIT.** Intercept on `keydown`: if the selection is
   collapsed and the character in the direction of travel is not a digit, `preventDefault()`, walk
   past the separators to the nearest digit, delete *that*, reformat, re-place the caret by rule 1.
   Leave range deletions to the browser (a range always contains digits). *Why it is not optional:*
   otherwise the browser deletes the space, the reformat immediately puts it back, and the control
   is visibly **stuck** — one keypress, nothing happens.
5. **Never rewrite the value during composition.** Guard on `compositionstart`/`compositionend` +
   `event.isComposing`; reformat exactly once at `compositionend`.
6. **Dispatch a synthetic `input` event when a key was intercepted**, so the FACE value/validity
   path still runs.
7. **Reject a keystroke that would make the number too long.** Otherwise, past the last valid
   length, `AsYouType` matches no pattern and the display *de-formats* mid-typing
   (`470 12 34 56` → `4709123456`, measured). `validatePhoneNumberLength` is the guard rail.

No shadow-DOM or `type="tel"` surprises: `selectionStart`/`setSelectionRange` behave identically
inside a shadow root in all three engines.

**D17 — changing the country reformats what is already typed; it never clears it.** The digits the
user entered are the durable state; the formatting and the rules are per-country and therefore
disposable. So on country change: keep the digit string exactly as-is, load that country's rules
(one small chunk under S9, already-loaded metadata otherwise), reformat, and re-run validation.
Three consequences worth stating because each is a bug if missed:

- **Validity legitimately flips.** A number valid for BE can be invalid for NL. The `error-text`
  channel updates and the FACE validity follows; this is correct behaviour, not a glitch to
  suppress.
- **The digits survive even when the new formatting is shorter or longer.** Never truncate to the
  new country's max length on switch — that silently destroys user input. Let it read as invalid
  (D6a/S9 rules) and let the user fix it.
- **An in-flight rules chunk must not blank the field.** Keep displaying the current text while the
  chunk loads and reformat when it lands; formatting is cosmetic, so the async gap is harmless.
  Validity stays `undefined` until the rules resolve, exactly as §5.5 already specifies for the
  first load. The caret rule (D10) anchors on digit *count*, so a reformat arriving mid-edit does
  not move the user's caret.

**D11 — when `+XX` detection runs.** S8.2 measured a UX wrinkle: driving detection from the
*validator* leaves the country at `us` for every prefix of `+14165551234` and flips to `ca` only on
the final digit, because libphonenumber will not resolve until the number is valid. The fix is not
to detect less often but to use the right source per phase, which is exactly D5a's division of
labour: **the eager table drives detection while typing** (it resolves as soon as the dial code —
and then the area code — is unambiguous), and **the validator becomes authoritative on parse**
(paste, blur, or once the number is valid). Combined with D5a's "never overwrite an explicit user
selection", that keeps the flag stable. The precise keystroke at which the flag flips for shared
dial codes is a unit-test matter in M2, not a design unknown.

### 5.7 i18n (D8)

Follows the house two-axis model exactly (no central i18n mechanism exists; the convention is
per-component):

- **Locale axis:** the `locale` attribute drives `Intl.DisplayNames` (country names),
  `Intl.Collator` (list order) — deliberately no default, browser locale wins, per the
  scheduler's locale rule. **This rule is correct for the client and unimplementable on a
  server**, which has no browser; S4 measured what that costs and why the component is
  nevertheless safe (§9.2). Four facts to keep in view:
  1. Node resolves the runtime default from the **OS regional setting, not `LANG`** — measured
     `nl-BE` on a host with `LANG=en_US.UTF-8`, while all three browsers resolved `en-US`. That
     is **139 of 244 names different** ("Oostenrijk" vs "Austria"), not a rounding error.
  2. A server/client mismatch is **silent and permanent**: the server's strings survive
     hydration, zero console warnings in lit's dev *and* production builds, and a forced
     `requestUpdate()` provably repairs nothing (hydration records the client value without
     writing it, so an unchanged value diffs to nothing). Only a real value *change* repairs it.
  3. `mp-phone-input` is safe **only because it ships no DSD chrome and no wrapper renders the
     list** — verified: the demos splice DSD for exactly five components
     (`apps/react-bootstrap-demo/src/entry-server.tsx:18-31,55`), so a WC with no `ssr/` injector
     server-renders no shadow content at all and the names never exist in the SSR HTML. This makes
     §3's "no DSD chrome" non-goal **load-bearing, not incidental**, and it means the country list
     must be rendered by the WC, never by a wrapper template (`provideClientHydration` is active
     in the Angular demo).
  4. Even with an explicit locale, **Chromium disagrees with Node/Firefox/WebKit on 4 of 244
     codes in every locale** — FK, HK, MO, PS (e.g. "Hong Kong" vs "Hong Kong SAR China") — and
     it is a CLDR-data divergence, not a `style` option that can be tuned. Cosmetic for us; it
     would break a byte-exact SSR assertion.
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

## 7. #1 risk — **cleared by S1**, but read this before implementing

**The locked composition (D-lock 1) builds the component on cross-shadow-boundary styling**, a class
this repo has been burned by twice (the navbar item-styling problem; the pickers ended up hand-drawing
their input-group in-shadow). S1 was the gate for it and **passed 36/36 in three engines** (§9.1), so
the pre-agreed fallback — `mp-phone-input` drawing the group chrome itself, the declined
single-shadow-root alternative — is **retired and must not be implemented**.

What replaces the risk is a hard constraint, because S1 also showed the naive form of the contract
silently does nothing: the group's geometry only reaches a slotted child through **`!important`
physical declarations under `:dir()` guards** (§5.2 D2), the inner control is reachable only through
**inherited custom properties** (never a rule from the outer tree), and the base-select recipe must
live **inside `mp-select`** (§5.3 amendment 4). Deviating from any of the three reintroduces the
original problem in a form that *looks* like it works — the selector matches while the declaration
loses. D2a records the measured cascade order that explains why.

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
| fn | `loadPhoneRules(country)` | the lazy per-calling-code facade: `format`, `toE164`, `isValid`, `lengthProblem`, `type`, `dialCode`. Cached; unknown country → `undefined`, never rejects (D6, D6a-alt) |

### Wrappers

`bs-input-group` (unchanged selector, now WC-backed), `bs-phone-input` (CVA, `[errorMessages]`
via `BsControlValidityDirective`), `BsInputGroup`/`BsPhoneInput` (React), `BsInputGroup.vue`/
`BsPhoneInput.vue` (Vue `v-model`). Consumer `aria-*`/`role`/`id`/`tabindex` land on the `mp-*`
element in all three (conformance-registry enforced).

## 9. Spikes (gate — throwaway, Chromium + Firefox, verdicts recorded here)

| # | Question | Pass criterion | Verdict |
|---|---|---|---|
| S1 | Does the §5.2 two-channel group contract work? `::slotted(:not(:first-child))` positional matching + `--mp-group-*` inheritance into a *generated* `unsafeCSS` stylesheet, incl. the `-1px` border overlap + `:focus-within` lift | Corner pairing + flex visually correct for `input+span+mp-select` in both engines, nested inside another shadow root | **PASS, with two amendments to D2** — 36/36 in Chromium + Firefox + WebKit (§9.1) |
| S2 | `appearance: base-select` with SVG-bearing options inside a shadow root; graceful text-only fallback | Rich options in Chromium; identical layout metrics in the Firefox fallback | **PASS 10/10 × 3 engines, D3 amended four ways** — incl. one release blocker; RTL clean with logical properties, §9.4 |
| S3 | `import('libphonenumber-js/max')` from the published lib: chunking in our Vite build, esbuild + Vite consumers re-splitting from node_modules, plain-Node resolution | One lazy chunk; all three consumers resolve; Node imports without `document` | **PASS 6/6** — but bundling rejected in favour of `external` (D5b), §9.3 |
| S4 | `Intl.DisplayNames` SSR/hydration parity in the three demo SSR pipelines | No hydration mismatch on country names with an explicit locale; documented behaviour with browser-locale default | **PASS only because the names are never SSR'd** — criterion reworded, see §9.2 |
| S5 | FACE-in-FACE isolation + two-tab-stop focus model | Inner `mp-select` contributes nothing to the outer form's `FormData`; `formDisabledCallback` fans out to both controls; Tab order select → input | **PASS 111/111** in three engines — five new obligations D12–D16, §9.3 |
| S6 | Flag pipeline dress rehearsal: vendor 3 real flags, codegen the loader map, build, consume | Mirrors the asset prototype's verdicts on the real repo files (expected to pass — the prototype already did this with fabricated SVGs) | **PASS 8/8** — plus a licensing gap and a worse guard-rail mode found, §9.3 |
| S7 | `AsYouType` caret preservation while reformatting (added mid-gate) | Caret never jumps; Backspace over a separator still deletes a digit; works in a shadow root | **PASS** — bug reproduced and fixed; rule normative in D10 |
| S8 | Dial-string detection, NANP disambiguation, E.164 round-trip, metadata-set choice (added mid-gate) | Correct country for the hard cases; round-trip stable; evidence-based metadata set | **PASS, and it reversed two PRD choices** (D5a, D6a) |
| S9 | Per-country metadata chunks vs one 57 KB `/max` chunk — the country is always known before a number is typed (added mid-gate, user's observation) | Single-country metadata is functionally identical to full `/max` for formatting, validity, `getType()` and the E.164 round-trip; per-country chunk + `/core` beats 57 KB gzip; maintenance risk acceptable | **PASS, ADOPTED** — slice per *calling code*, not per country. Exhaustive parity vs `/max` across all 244 countries, 0 divergences; first use 16.6–19.2 KB gzip vs 56.8 KB. §5.5 D6a-alt |

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

### 9.2 S4 / S7 / S8 — locale parity, caret behaviour, phone logic

Harness: `docs/prd/_spike-phone-input-s478/` (throwaway; evidence under `results/`). 33 Playwright
assertions × Chromium 148 / Firefox 150 / WebKit 26.4, plus Node logic sweeps over all 244
countries. `libphonenumber-js` and `intl-tel-input` were installed in a scratchpad, so the repo's
dependency tree was untouched during the gate.

**S4 — `Intl.DisplayNames`.** All 244 codes resolve in all 6 locales on every engine with zero
fallbacks-to-code, including the awkward set (XK, AC, TA, DG, BQ, SX, EH, IO) — that part of the
research holds in browsers too. With an **explicit** locale, Firefox and WebKit are byte-identical
to Node; Chromium differs on 4 codes in every locale. With **no** locale, Node and the browsers
disagree on **139 of 244**. A hydration mismatch was measured as silent and permanent (0 console
warnings, `requestUpdate()` a no-op). Verdict: **PASS, but the pass criterion as first written was
the wrong test** — an explicit-locale DSD render in Chromium would have failed it. What actually
protects us is that the names are never server-rendered; §5.7 now records the four facts and the
three rules that keep it that way.

**S7 — caret.** The naive bug reproduces byte-identically in all three engines (caret off by 5),
and the seven-rule fix passes in all three, including inside a shadow root, on paste, select-all,
range delete, rejected non-digits and a guarded composition session. The rules are normative in
D10. It also surfaced **F1** (§5.5 D6b), a prerequisite finding that changes the formatter itself:
`AsYouType(country)` formats *nothing* for BE/NL/DE/FR/GB when fed a national number without its
trunk prefix — which is exactly what D9's design puts in the input.

**S8 — phone logic.** Reversed two PRD choices on evidence: keep the country table (D5a) and switch
to `/max` metadata (D6a). Also found the RU `8001234567` counter-example that kills string-based
national-prefix stripping (D6c), the area-code tie-break bug, and the 8 territories that no
detection mechanism can separate.

**Left to a human** (recorded so it is not mistaken for covered): a real IME composition session
and a mobile soft keyboard; whether the caret *feels* right (the assertions are index arithmetic);
whether the late country flip for shared dial codes is acceptable; whether the 4 Chromium name
differences matter editorially; and how a screen reader announces a value that reformats under the
caret. The last one is the most likely to need a design response — it goes on the M10 manual pass.

### 9.3 S3 / S5 / S6 — build pipeline and form semantics

**S5 — FACE nesting and focus.** Harness `docs/prd/_spike-phone-input-s5/`, importing the **real**
`FormAssociatedMixin`. **111/111** (37 assertions × three engines). The isolation question is
decisively answered — no duplicate-submission path in any engine — and five obligations came out of
it (D12–D16 in §5.6), of which **D12 is the one that would otherwise have shipped as a real a11y
defect**: inside `<fieldset disabled>` a naive composite left both inner controls keyboard-operable.
Two engine divergences worth remembering beyond this component: WebKit fires `formDisabledCallback`
*before* `attributeChangedCallback` (Chromium/Firefox after), and Firefox matches `:user-invalid` on
a **pristine** field. One non-obvious negative: `internals.willValidate` is `true` even on the
orphaned inner control, so **only `internals.form` is a usable "am I attached to a form" signal**.
Harness note: a combined three-engine run reports "2 errors were not a part of any test" and exits 1
from a WebKit worker taking the full 300 s teardown grace on Windows — not a failure; run
per-`--project`.

**S3 + S6 — the build pipeline.** All 6 S3 and all 8 S6 sub-steps PASS, on the real
`nx build mintplayer-web-components`, with the real vendored artwork, verified independently by me
after the fact: per-flag lazy chunks (one per flag, none merged), **0 `.svg` in `dist`**,
`exports["./flags"]` and `["./phone-core"]` auto-written, `flags/README.md` published, `tsc` clean,
vitest green with zero config, and all three consumer paths (esbuild `--splitting`, Vite, plain
Node) resolving. Tree-shaking confirmed: a consumer importing something else pays 0 bytes.
Three PRD numbers were wrong and are corrected in §5.4/§5.5 (gzip total, loader-map size,
metadata-set size); one design decision changed (D5b — `external`, not bundled); one licensing gap
was found and fixed; and the guard rail turned out to have a **silent** failure mode, not just the
loud one.

Two judgement calls recorded rather than silently taken: three upstream SVGs (`BV`, `LV`, `NC`)
carry dangling `class="st1"`/`"st4"` attributes with no stylesheet — inert, since each element
carries its own `fill` or inherits a `<g fill>` — and were copied **verbatim** for diffability
against upstream rather than cleaned; and `refresh-flags.mjs --only=…` deliberately does not prune,
so shrinking the vendored set means clearing `src/assets/` first.

**Scope gap, honestly noted:** S4's literal wording asked for the three demo SSR pipelines, which
needed the build workspace another agent held. Substitute: a from-scratch `@lit-labs/ssr` +
`ssr-client` harness using the same two packages and the same `lit-element-hydrate-support.js`
import as the demos, plus reading the demos' actual entry points. The conclusion rests on *which*
components `entry-server.tsx` splices DSD for — which I verified independently and a build run
would not change. One demo SSR build with a temporary `mp-phone-input` on a page would close it
literally; it is not on the critical path.
### 9.4 S2 — flags inside the country picker: **PASS**, D3 amended four ways

Harness: `docs/prd/_spike-phone-input-s2/` (real Bootstrap `.form-select` compiled from
`_styles/form-select.styles.scss`, custom elements + `adoptedStyleSheets`, 2-deep shadow nesting,
plus a hand-rolled PNG decoder for pixel evidence). 9 assertions × **Chromium 148.0.7778.96 /
Firefox 150.0.2 / WebKit 26.4**.

The headline is that the support matrix moved: **WebKit 26.4 supports base-select, `::picker(select)`
and `<selectedcontent)`**, so rich options work in 2 of 3 engines and the overlay is a Firefox-only
fallback. All four amendments are in §5.3; the release blocker is amendment 3 — an ungated recipe
silently deletes the dropdown arrow for every Firefox user, measured as the right 44 px of the closed
face collapsing to a single 2 px ink run (the border).

Measurement notes worth keeping, because each one would otherwise cost an afternoon: the closed-face
change is a **width** jump (320 → 152/157 px) that pinning removes entirely (0 px); Bootstrap
transitions `box-shadow` over 150 ms, so a screenshot two frames after focus reads as "no focus
ring" when the ring is fine; headless Firefox never opens the popup by keyboard (a measurement limit,
not a defect); headless WebKit paints no text at all for a *native* `<select>` (irrelevant, since
WebKit takes the rich path); the overlay's own width is engine-dependent (68.4 px Chromium/Firefox vs
70.2 px WebKit — ISO glyph advance), so reserve generous padding rather than a tight hard-coded
value; and the overlay aligns only while the select is the group's first child.

**RTL sub-case: closed, and it went the other way.** The overlay keeps logical properties and needs
no `:dir()` guard — the details and the measured 14 px overflow that the physical alternative causes
are in §5.3. Also settled there: the cascade ordering across all three trees (D2a), which is what
makes the pinned picker width expressible from inside `mp-select`.

Two corrections the spike made to its own reasoning, recorded so the wrong version does not survive:
the inner `<select>` **is** `border-box` in all three engines (the UA stylesheet gives form controls
`border-box`, so reboot's `*` rule not crossing the shadow boundary is a non-issue here, and
declaring `box-sizing` in the WC's SCSS would be a no-op); and a red-channel pixel probe for
`::picker-icon` was invalid because the synthetic flag palette contains `#F31830` — magenta is the
only safe probe colour against flag artwork.

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
