# PRD — Typeahead as the pilot of the headless-core architecture: debounce, cancellable provider, item renderer, forms binding, across Angular, React, Vue and a web component (#436)

Issue: [#436](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/436)
Status: **Implemented** (2026-10-20) on `feat/typeahead-core-436`, draft PR #438; unit sweep green, the first CI run (39415902128) red on the SSR chrome generators, fixed in d0fd671d and 00b93211; targeted e2e, keyboard and no-JS checks pending. S1 and S2 PASS; S3–S5 folded into the permanent specs and e2e (see §16). Plan: [typeahead-wc-436-plan.md](./typeahead-wc-436-plan.md)
Catalog migration: [#437](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/437) — **out of scope for this PR**; this PR is its pilot and must produce the numbers #437 is sized with.
Everything in scope lands in **one PR**.

## 0. Summary

The issue asked for four additive capabilities on the Angular-only `bs-typeahead`: `[debounce]`, a cancellable `[provider]`, `[itemTemplate]` and a `ControlValueAccessor`, and attached a ready patch. During grilling the owner took two bigger decisions:

1. **Not Angular-only.** The typeahead ships across Angular, React, Vue and as a web component.
2. **Architecture reversal (2026-10-19).** Framework fronts stop consuming the web component. Every component becomes **(1) a headless, framework-neutral TypeScript core** holding all component behaviour and **(2) four fronts** — Angular component, React component, Vue SFC, Lit web component — that consume the core and render with their **own** template. Reason: Angular SSR runs on domino, which has no `customElements`; a wrapper around `<mp-*>` emits an empty element, and with JavaScript disabled 24 of the 30 web-component-backed Angular components render nothing. Light-tier elements can never be rendered by Lit SSR (it forces a shadow root, lit/lit#3080). The shell PRD's rule "no HTML may be duplicated across the components" is **explicitly reversed**: each front owns its template.

The typeahead is the pilot: small, a form field where no-JS matters, and in need of a light tier anyway. This PRD therefore also establishes the first pieces of the new foundation (`@mintplayer/ui-core`, the scope-styling registry moved there, the Angular `[mpProps]` directive, the shared superseding-request runner) in the shape #437 will copy.

## 1. Problem (verified against `master` @ `6077f2d6`)

- `libs/mintplayer-ng-bootstrap/typeahead/src/typeahead.component.ts:77-88`: a request per keystroke, no debounce, no request identity, no cancellation. Whichever `[suggestions]` write lands last wins; a slow answer to "kru" overwrites the answer to "kruish" unless the consumer adds `switchMap`.
- `typeahead.component.html:34-37`: rendering fixed to `{{ suggestion.text }}`; no item template. No `NG_VALUE_ACCESSOR`.
- React and Vue have no typeahead. The only `role="combobox"` in the WC lib is tree-select's.
- No e2e and no axe gate covers the typeahead in any framework.
- `mp-datatable`'s lazy `fetch` (#385) has no `AbortSignal`; a superseded page request runs to completion and is merely ignored (`mp-datatable.ts:2951-3002`). Tree-select search and datatable distincts do abort. Three hand-rolled copies of the same lifecycle.
- MintPlayer.Spark's `<spark-address-input>` works around all of it in its own service (`ReferenceDataApi.typeahead`: `debounceTime(200)` + `switchMap`, 2-character minimum, text-only rows).
- SSR: today's `bs-typeahead` is Angular-only and renders fully on the server. A web-component rewrite in the old shape would have **regressed** that to an empty element. The new shape keeps server HTML.

## 2. Goals

- G1. One `TypeaheadMachine` core is the single source of behaviour; the four fronts contain templates and bridging only.
- G2. A superseded request is aborted and its answer discarded, by construction, in every front, through one shared runner also used by tree-select and both datatable paths.
- G3. Debounce and minimum term length live in the core.
- G4. Consumer-rendered rows with the term available for highlighting, in each framework's own idiom (`*bsTypeaheadItem`, JSX render prop, scoped slot, `itemRenderer` callback), with a default row.
- G5. Forms binding per front: Angular CVA, React controlled `value`, Vue `v-model`, form-associated web component.
- G6. The WAI-ARIA combobox pattern with `aria-activedescendant`, produced by the core's prop bags so the four fronts cannot drift, asserted in one shared ARIA conformance suite run against all four.
- G7. **Angular SSR emits a real `<input name>`** that submits free text with JavaScript disabled, and hydrates without a custom-element handoff.
- G8. The pilot reports, in §15, the measured cost per front (LOC per template, specs, build time) for #437.
- G9. Spark deletes its `typeahead()` helper and text-only mapping after the release.

## 3. Non-goals

- Migrating any other component to the core architecture (#437). Tree-select and datatable are touched **only** to adopt the shared runner (G2); they stay web-component-backed.
- A generic combobox/select or a replacement for `mp-tree-select`; multi-select, chips, grouping, inline completion.
- No-JS **interactivity** for suggestions. With JS off the Angular front is a plain text input that submits.
- Server-side data for the suggestion list (the provider is a client contract).

## 4. Locked decisions (grilled 2026-10-19)

| # | Decision | Consequence |
|---|---|---|
| D1 | **Headless core + four fronts, each with its own template.** Core in `@mintplayer/ui-core/typeahead`. Fronts: `bs-typeahead` (Angular), `BsTypeahead` (React), `BsTypeahead.vue` (Vue), `mp-typeahead` (Lit). | The no-duplication rule is reversed. The Angular front is a full component again, not a `<mp-*>` one-liner. |
| D2 | **Core contract (Zag.js shape).** A plain class: immutable state snapshot, `subscribe(listener)`, command methods, and `connect()` returning attribute/property bags per node (`root`, `input`, `listbox`, `status`, `option(i)`). No reactivity library inside; each front bridges to its own (Angular `signal`, React `useSyncExternalStore`, Vue `shallowRef`, Lit `requestUpdate`). | Confirmed by S1. The bags are the only place ARIA is written. |
| D3 | **Provider is the only data path.** `provider: (term, request: { signal }) => Promise<T[]>`; static lists use `inMemoryTypeaheadProvider`. Angular additionally accepts `Observable<T[]>` and unsubscribes on abort (S5). | `[suggestions]` / `(provideSuggestions)` are removed. Request object chosen over a bare signal for consistency with `TreeSelectProvider` and extensibility. |
| D4 | **Shared runner.** `@mintplayer/ui-core/async` exports `SupersedingRequest` (abort previous, new `AbortController`, debounce, stale-drop, `AbortError` silent, other errors reported). Used by the typeahead core, `mp-tree-select` search, `mp-datatable` distincts **and** `mp-datatable` `fetch`, whose `DatatableFetchRequest` gains `signal` and whose Angular `[fetch]` orchestration passes it through. The datatable's 250 ms becomes the shared 200 ms. | Breaking for `fetch` implementors only if they relied on the request object's exact shape; documented. |
| D5 | **Value = the term string; `selectedItem` = the last pick.** Picking writes `itemText(item)` into the term and sets `selectedItem`; any later text change clears it. `select` event on pick. | Angular CVA value is the string; React `value`/`onValueChange`; Vue `v-model`; WC FACE value. `selectedItem` is read-only state in all four. |
| D6 | **Defaults `debounce-ms = 200`, `min-length = 1`.** A trimmed term shorter than `min-length` closes the list and aborts without calling the provider. | The in-memory demo sets 0 so the static example does not look sluggish. |
| D7 | **Keyboard model: `aria-activedescendant`, focus stays in the input.** The core owns the active index and emits the option id in the `input` bag. | Works in every front because every front renders options in the same tree as the input. Fallback if S3 shows an engine gap: roving real focus, core unchanged, bags change. |
| D8 | **Styling: `data-mps` scoping owned by the core.** The light-dom codegen, `installLightStyles` registry and its conformance specs move from the WC lib to `@mintplayer/ui-core/scoped-styles`. Each front stamps `data-mps="typeahead"` on its own nodes as a static attribute and installs the sheet through the registry in the browser. **Angular installs it on the server natively**: an injectable appends one `<style>` per sheet to `DOCUMENT.head` through `Renderer2`. Angular fronts use no `styleUrls`; consumers theme with ordinary CSS, never `::ng-deep`. | The WC lib re-exports from the core for its other consumers (no change for them). "Never re-import a global Bootstrap partial" becomes a catalog-wide hard rule (a rescoped `.btn[data-mps=…]` out-ranks the page's `.btn`). |
| D9 | **Angular applies prop bags through `[mpProps]`.** A directive that diffs previous/next bag, sets and removes attributes via `Renderer2`, refuses `href`, `src`, `style`, `srcdoc` and `on*` names, and runs during SSR. Consumers never see a bag. | Confirmed by S2. |
| D10 | **Retire the orphaned combobox plumbing.** Delete `input[bsCombobox]` (+ spec, export), `[bsDropdown]`'s `popupRole` (toggle's `aria-haspopup` becomes the constant `menu`), `[bsRovingFocus]`'s `mode="activedescendant"`, and `mp-dropdown-menu`'s `mode="listbox"` with `DropdownMode`. Verified: no use outside their own specs. | Four documented breaks across ng-bootstrap, web-components, react and vue. |
| D11 | **Entry paths and selectors unchanged.** `@mintplayer/ng-bootstrap/typeahead` → `bs-typeahead`; `@mintplayer/react-bootstrap/typeahead` → `BsTypeahead`; `@mintplayer/vue-bootstrap/typeahead` → `BsTypeahead`; `@mintplayer/web-components/typeahead` → `mp-typeahead`. New: `@mintplayer/ui-core/{typeahead,async,scoped-styles}`. | |
| D12 | **Fronts are transparent.** Angular host attributes forwarded to the input (role-bearing node) with the existing `bsForwardAria`; React props extend `HTMLAttributes` and spread onto the input; Vue `inheritAttrs:false` + `v-bind="$attrs"` on the input. | Rows in the three passthrough conformance registries (Angular count 26 → 27). |
| D13 | **Localized strings are inputs with English defaults**: `inputLabel`, `loadingLabel`, `noResultsLabel`, `errorText`, and the formatter `resultsLabel: (n) => string` for the live announcement. | Held in the core so all four fronts announce identically. |
| D14 | **Lit front stays light tier and form-associated.** `createRenderRoot(){return this}`, `scopedHtml('typeahead')`, `FormAssociatedMixin`. SSR for the Lit front is not a goal (React/Vue SSR demos keep rendering it client-side; S4 records what they emit). | |
| D15 | **Angular SSR surface.** The server renders the root, the input with `name`, `value`, label and ARIA from the bags, and the `errorFeedback` node; it does **not** render the listbox. With JS off the input submits free text. On hydration the core attaches to the same input (no re-creation, no flash — S4). | |

## 5. Design

### 5.1 `@mintplayer/ui-core` (new package, `libs/mintplayer-ui-core/`)

```
mintplayer-ui-core/
  async/            SupersedingRequest, TypeaheadRequest-style request type, inMemory helpers
  scoped-styles/    moved from web-components/light-dom: rescope codegen, installLightStyles registry,
                    stampScope, adoptLightStyles, SSR head-install contract, conformance specs
  typeahead/
    src/typeahead-machine.ts     TypeaheadMachine<T>
    src/connect.ts               connect(state, send) → prop bags
    src/types.ts                 TypeaheadProvider<T>, TypeaheadRequest, TypeaheadState<T>, events
    src/in-memory-provider.ts
    src/styles/typeahead.scss    → typeahead.scoped.styles.ts (generated, gitignored)
```

Versioned `1.0.0`; `@mintplayer/web-components` depends on it (re-exporting `light-dom` for its existing consumers); the three framework libs depend on it directly.

**`TypeaheadMachine<T>`**

- Options: `provider`, `debounceMs`, `minLength`, `itemText`, `itemKey`, `labels`, `disabled`, `ids` (root id supplied by the front so option ids are deterministic across SSR and client).
- State snapshot: `{ term, items, status: 'idle'|'loading'|'ready'|'error', open, activeIndex, selectedItem, announcement }`.
- Commands: `setTerm(term)` (from typing), `setValue(term)` (programmatic, no query), `pick(index)`, `moveActive(delta|'first'|'last')`, `open()`, `close()`, `submit()`, `blur()`, `setDisabled(bool)`, `destroy()`.
- Keyboard: `keydown(key, modifiers) → handled: boolean`, so every front forwards the event and calls `preventDefault` on `true`. ArrowDown/Up open or move (no wrap), Home/End, Enter picks the active option or submits when closed, Escape closes, Tab closes and is not handled.
- Request lifecycle (through `SupersedingRequest`): `setTerm` → `onChange` → trim/min-length gate (close + abort when short) → `status='loading'`, `open` → debounce → `provider(term, { signal })` → on resolve, if not aborted: items, `status='ready'`, announcement `resultsLabel(n)`; on `AbortError` nothing; on other error: items `[]`, `status='error'`, `onError`.
- Events: `onChange(term)`, `onSelect(item, term)`, `onSubmit(term)`, `onOpen`, `onClose`, `onSearch(term)`, `onError(error)`.
- `connect()` bags: `root` (`data-mps`), `input` (`role="combobox"`, `aria-autocomplete="list"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` or removed, `aria-label` / `aria-describedby` / `aria-errormessage`, `disabled`, `autocomplete="off"`, `value`), `listbox` (`id`, `role="listbox"`, `aria-busy`, `hidden` when closed), `status` (`role="presentation"`), `option(i)` (`id`, `role="option"`, `aria-selected`), plus event-handler intents each front wires to its own event syntax (`onInput`, `onKeydown`, `onBlur`, `onOptionMousedown(i)`, `onOptionClick(i)`).

**`SupersedingRequest`** (lifted from `mp-tree-select.ts:412-433,472-493`): `run(term, call: (signal) => Promise<R>)`, `cancel()`, `dispose()`; debounce built in; returns `null` on abort. Adopted by tree-select search, datatable distincts (its generation counter can go) and datatable `fetch` (its `_fetchGeneration` echo guard stays; the runner adds the signal).

### 5.2 Rendered tree (identical across the four fronts)

```html
<div class="mp-typeahead" data-mps="typeahead">
  <input class="form-control" data-mps="typeahead" …input bag…>   <!-- Angular: name= submits -->
  <ul class="dropdown-menu" data-mps="typeahead" …listbox bag…>
    <li class="ta-status" data-mps="typeahead" …status bag…>Loading…</li>   <!-- or no-results -->
    <li class="dropdown-item" data-mps="typeahead" …option(i) bag…>
      <!-- the front's row: *bsTypeaheadItem / renderItem(item, term) / #item slot / itemRenderer(item, term) -->
    </li>
  </ul>
  <span class="visually-hidden" role="status" aria-live="polite">…announcement…</span>
  <!-- errorFeedback node when errorText is set -->
</div>
```

The listbox is absolutely positioned under a `position: relative` root in all four fronts, the way Bootstrap's dropdowns are. The `OverlayController` was not lifted into ui-core: it depends on the lit-bound `a11y` entry (dismiss stack, focus trap), and moving both is recorded in #437 (see §16). Only the input and the row content differ per front. A conformance test (S3) renders the same state in all four and diffs the serialized DOM minus framework attributes.

### 5.3 Angular — `@mintplayer/ng-bootstrap/typeahead`

- `BsTypeaheadComponent` (`bs-typeahead`), zoneless-friendly: the machine is created in the constructor; `state = signal(machine.snapshot)` updated from `subscribe`; `api = computed(() => connect(state()))`.
- Template: the §5.2 tree, `[mpProps]="api().input"` etc., rows via `<ng-container *ngTemplateOutlet="itemTemplate() ?? defaultItem; context: { $implicit: item, term }">` — plain Angular, no EmbeddedViewRef bridging.
- Inputs: `provider` (`Promise | Observable`), `debounceMs`, `minLength`, `disabled`, `itemText`, `itemKey`, `name`, `inputLabel`, `loadingLabel`, `noResultsLabel`, `resultsLabel`, `errorText`; `value = model('')`. Outputs: `select`, `submitted`, `opened`, `closed`, `loadError`.
- `BsTypeaheadItemDirective` (`*bsTypeaheadItem="let item; term: term"`, context guard), read with `contentChild`.
- CVA: `writeValue` → `machine.setValue`; `onChange` from `onChange`; `onTouched` on blur and close; `setDisabledState` → `disabledByCva`, `effectiveDisabled = computed(...)`.
- SSR: the component renders the §5.2 tree minus the listbox when `isPlatformServer`; `ScopedStylesServerInstaller` (from `@mintplayer/ng-bootstrap/scoped-styles`, a thin Angular adapter of the core registry) appends the sheet to `document.head` once per request. Hydration: `withEventReplay()` replays the first keystroke into the same input.
- `libs/mintplayer-ng-bootstrap/dropdown`: delete the combobox directive and `popupRole` (D10); `a11y`: delete roving `mode`.

### 5.4 React — `@mintplayer/react-bootstrap/typeahead`

- `BsTypeahead` function component: `useMachine(TypeaheadMachine, options)` hook (`useSyncExternalStore` over `subscribe`), `connect()` bags spread onto JSX nodes, rows via `renderItem?: (item, term) => ReactNode` with a default. Controlled `value` + `onValueChange`; `useEffect` pushes `value` into `setValue` when it differs from the snapshot. Props extend `InputHTMLAttributes` and spread onto the input. Sheet installed through the core registry in an effect.
- Row in `_conformance/attribute-passthrough.spec.tsx`.

### 5.5 Vue — `@mintplayer/vue-bootstrap/typeahead`

- `BsTypeahead.vue`: `useMachine` composable (`shallowRef` snapshot), bags bound with `v-bind="api.input"`, rows via `#item="{ item, term }"` scoped slot with default content, `defineModel<string>()`, `inheritAttrs:false` + `v-bind="$attrs"` on the input. Sheet installed `onMounted`.
- Rows in `_conformance/attribute-passthrough.spec.ts` and a `behaviour/BsTypeahead.spec.ts`.

### 5.6 Web component — `@mintplayer/web-components/typeahead`

- `mp-typeahead`, Tier L, `FormAssociatedMixin`, `scopedHtml('typeahead')`, machine in a ReactiveController, bags spread with lit's `spread`-equivalent (a tiny `applyProps` directive, since lit has no spread), rows via `itemRenderer?: (item, term) => Node` with `stampScope` before the consumer node is appended (unchanged rule), events `value-change`, `select`, `submit`, `open`, `close`, `search`, `load-error`. Registries: scoping import, `LIGHT_TIER_TAGS`, consumer-dom-boundary, naming, properties-attributes, `LIGHT_TIER_COMPONENTS`.

### 5.7 Demos and e2e

- Angular `/overlays/typeahead` rewritten: a slow provider honouring `signal`, a `*bsTypeaheadItem` with `<mark>`, a `[(ngModel)]` form, the keymap table, and a "JavaScript disabled" note. React `TypeaheadPage.tsx`, Vue `TypeaheadView.vue`, routes + nav. E2e per app: debounce → options; ArrowDown/Enter writes the text and `selectedItem`; superseded answer never shows (route delay); Escape closes; axe page lists gain the route. Angular additionally: a `javaScriptEnabled:false` spec asserting the named input renders and submits, and the `axe-nojs` list gains the route.

## 6. Accessibility contract

Produced by `connect()`, so stated once:

- Input: `role="combobox"`, `aria-autocomplete="list"`, `aria-haspopup="listbox"`, `aria-expanded` from `open` (same snapshot as the visual change, never handler-only), `aria-controls` → listbox id (present even when closed; the listbox element exists hidden), `aria-activedescendant` → active option id or **removed**.
- Options: `role="option"`, deterministic ids `<rootId>-opt-<i>`, `aria-selected` only on the active one. Status rows `role="presentation"`. Listbox `aria-busy` while loading.
- Name: `inputLabel` / host `aria-label` / `aria-labelledby` forwarded to the input (D12); one row per front in the naming conformance.
- Live region: `resultsLabel(n)` once per settled request; the announcement string lives in the snapshot and self-clears after 1500 ms (core timer), so all four fronts announce once. `errorText` is the described-by channel, never announced.
- Focus never leaves the input; the active option's highlight is in the scoped sheet; `disabled` removes the input from the tab order natively and closes the list.
- Reduced motion: the loading bar is static under `prefers-reduced-motion: reduce`.
- Keyboard-only walk-through of all three demo pages before the PR (CLAUDE.md checklist).

## 7. Public API delta (breaking, documented in CHANGELOG `### Breaking`)

| Was | Now |
|---|---|
| `bs-typeahead [suggestions]` + `(provideSuggestions)` | `[provider]` (Promise or Observable) or `inMemoryTypeaheadProvider` |
| `[(searchterm)]` | `[(value)]`, `[(ngModel)]`, `formControlName`; `selectedItem` read-only |
| `(suggestionSelected)` | `(select)` |
| `[(isOpen)]` | `(opened)` / `(closed)` |
| `[isLoadingText]`, `[noSuggestionsText]`, `[resultsAnnouncementSingular/Plural]` | `[loadingLabel]`, `[noResultsLabel]`, `[resultsLabel]` |
| request per keystroke | `[debounceMs]` (200), `[minLength]` (1) |
| `{{ suggestion.text }}` only | `*bsTypeaheadItem="let item; term: term"`, default = `itemText(item)` |
| `input[bsCombobox]`, `[bsDropdown] popupRole`, `[bsRovingFocus] mode` | removed |
| `mp-dropdown-menu mode="listbox"`, `DropdownMode` (WC, React, Vue) | removed; menu only |
| `DatatableFetchRequest` (WC + Angular `[fetch]`) | gains `signal: AbortSignal` |
| `@mintplayer/web-components/light-dom` | re-export of `@mintplayer/ui-core/scoped-styles` (no consumer change) |
| — | new package `@mintplayer/ui-core`; React/Vue `BsTypeahead` |

## 8. The #1 risk

**The core-to-front bridge under Angular SSR and hydration (D2 + D9 + D15).** Nothing in the repo has yet rendered a full Angular template from an external store, applied attribute bags through `Renderer2` during server rendering, and then let `withEventReplay()` hand the same input to a client-side machine. If `[mpProps]` writes attributes the hydration walker does not expect, or the machine's first client snapshot differs from the server's (e.g. `aria-expanded` or option ids), Angular logs NG05xx and re-renders, which is the flash the whole architecture exists to avoid. S1, S2 and S4 gate it; the fallback is per-attribute template bindings (Q13 option B), which costs verbosity, not the architecture.

## 9. Spikes

Each spike records verdict and evidence (engines, versions) in `docs/prd/spikes/issue-436/S<n>-*.md` and a verdict row here. A failed spike stays as a rejection. Harness code stays out of the libs.

| # | Question | Method | Decides | Verdict |
|---|---|---|---|---|
| S1 | **Core bridge in four fronts.** One `TypeaheadMachine` driven by Angular `signal`, React `useSyncExternalStore`, Vue `shallowRef` and Lit `requestUpdate`: does each front re-render exactly once per snapshot, in the same task, with no tearing (React) and no `ExpressionChangedAfterItHasBeenChecked` / zoneless scheduling gap (Angular)? | A minimal counter-style machine mounted in the three demo apps + a scratch Lit element; vitest specs count renders per command. | D2 | pending |
| S2 | **`[mpProps]` under SSR + hydration.** Attributes set through `Renderer2` appear in the server HTML; the client re-applies without NG05xx under `withEventReplay()`; a key dropped from the bag is removed from the DOM; unsafe names are refused. | Angular SSR demo scratch route, `page.content()` with JS off, console capture with JS on. | D9, D15 | pending |
| S3 | **Four fronts, one DOM and one ARIA.** Render the same snapshots (idle, loading, 3 options with #2 active, error, disabled) in all four fronts; serialize, strip framework attributes (`_ngcontent`, `data-v-`), diff; assert `aria-activedescendant` resolves and Chromium/Firefox/WebKit expose the active option (Playwright a11y tree). | Shared conformance spec in `ui-core/typeahead` driven by each front's test harness; Playwright on the three demo pages. | D7, the §5.2 contract | pending |

Verdicts recorded so far: **S1 PASS** (2026-10-20, `spikes/issue-436/S1-core-bridge.md`): one render per committed snapshot in all four fronts, batched commands cost one, no React tearing, zoneless Angular fine → D2 stands. **S2 PASS** (2026-10-20, `spikes/issue-436/S2-mpprops-ssr-hydration.md`): bag attributes in SSR HTML, re-applied on hydration with no NG05xx, same input node before and after hydration, pre-hydration focus and keystroke survive, dropped keys removed → D9 and D15 stand.
| S4 | **Server input hands over without a flash.** With JS off: the Angular page shows a named, labelled input that submits free text. With JS on: the client machine attaches to the server-rendered input (same node identity across hydration, `document.activeElement` preserved if focused before hydration, replayed first keystroke reaches the provider). Also record what the React and Vue SSR demos emit for `mp-typeahead`. | `javaScriptEnabled:false` run + hydrated run with a `MutationObserver` on the input node; console NG05xx capture. | D15, D14 | pending |
| S5 | **Observable unsubscribe aborts the HTTP request.** Angular `HttpClient` (fetch backend) provider against a delayed route: typing a second term within the window fires `requestfailed` for the first. | Demo page + Playwright `page.route` delay. | D3 adapter detail | pending |

## 10. Testing

- **Core** (`@mintplayer/ui-core/typeahead`, vitest): provider once per settled term; debounce restart; min-length gate; abort on supersede and `destroy`; late answer ignored; `AbortError` silent, other errors → `status='error'` + `onError`; pick writes `itemText` and `selectedItem`, text change clears it; `setValue` never queries; keyboard table; `connect()` bag snapshots per state (golden). `SupersedingRequest` unit spec. Scoped-styles conformance specs moved with the registry.
- **Angular**: the issue's four cases translated (debounce restart with fake timers; superseded Promise and Observable providers, `unsubscribe` called; `*bsTypeaheadItem` renders with `term` and updates on a new term; CVA round trip incl. `[disabled]` + `setDisabledState`, `onTouched` on blur). `[mpProps]` spec (diff, removal, refused names). `aria-passthrough` row. SSR spec rendering the component with `renderApplication` and asserting the input markup. **Drive inputs from `signal()`.**
- **React / Vue**: passthrough rows; behaviour specs: controlled value, `onSelect`, `renderItem` / `#item` invoked with `(item, term)`, default row.
- **Web component**: FACE value/disabled, `itemRenderer` node never stamped (consumer-dom-boundary), registries.
- **Cross-front**: S3's conformance suite becomes a permanent spec.
- **Datatable / tree-select**: existing specs for stale search, AbortError and disconnect keep passing on the shared runner; a new datatable spec asserts `fetch` receives a `signal` that aborts on supersede.
- **E2e**: §5.7 flows, axe pages, Angular no-JS spec.
- **Sweep once, at the end** (plan M9).

## 11. Versioning

Bumped by hand in the PR; published by `publish-master.yml`. Breaking changes ship as minor bumps, documented under `### Breaking` with the §7 table.

| Package | Now | After |
|---|---|---|
| `@mintplayer/ui-core` | — | 1.0.0 (new; needs a publish entry in `publish-master.yml` and the topo order) |
| `@mintplayer/web-components` | 2.20.0 | 2.21.0 (depends on `ui-core ^1.0.0`) |
| `@mintplayer/ng-bootstrap` | 22.25.0 | 22.26.0 (peers `web-components ^2.21.0`, `ui-core ^1.0.0`) |
| `@mintplayer/react-bootstrap` | 19.24.0 | 19.25.0 |
| `@mintplayer/vue-bootstrap` | 3.25.0 | 3.26.0 |

## 12. Consumer follow-through: MintPlayer.Spark (after publish)

- `spark-address-input.component.{ts,html}`: `[provider]` with the existing `api.suggest` / `api.streets` observables, `[debounceMs]="200"`, `[minLength]="2"`, a `*bsTypeaheadItem` with label, secondary line, "ended" hint and a `<mark>` on the match; read `selectedItem` instead of reconciling text.
- `reference-data-api.service.ts`: delete `typeahead()` and `TypeaheadOptions`. Bump to `^22.26.0`.

## 13. Resolved questions (grilled 2026-10-19)

| Q | Question | Answer | Locked as |
|---|---|---|---|
| Q1 | Provider the only data path? | Yes; apply the principle to every type-to-search component; no back-compat | D3, D4 |
| Q2 | How far across the catalog? | Shared runner + close the datatable `fetch` gap (select2 no longer exists: deleted in #377) | D4 |
| Q3 | Form value? | Term string + read-only `selectedItem` | D5 |
| Q4 | Request shape? | `(term, { signal })` | D3 |
| Q5 | Defaults? | 200 ms / min-length 1 | D6 |
| Q6 | Retire `bsCombobox`? | Delete | D10 |
| Q7 | Strip orphaned listbox plumbing? | Delete all three (verified unused outside specs) | D10 |
| Q8 | React row renderer returns? | `ReactNode` (now plain JSX since React owns its template) | §5.4 |
| Q9 | No-JS surface? | Superseded by Q10: the Angular front renders real HTML | D15 |
| Q10 | Architecture? | Headless core + four fronts; typeahead is the pilot; #437 for the rest | D1 |
| Q11 | Core location/contract? | New `@mintplayer/ui-core`, Zag-shaped machine + `connect()` | D2, D11 |
| Q12 | Shared styling? | `data-mps` scoping moved into the core; Angular installs natively on the server; no `::ng-deep` | D8 |
| Q13 | Angular prop bags? | `[mpProps]` directive; consumers never touch ARIA | D9 |

## 14. Successors

#437 (catalog migration). Nothing else; everything in scope ships in one PR, Spark follows the publish.

## 15. Pilot numbers for #437

Non-blank, non-comment lines, measured on the branch (2026-10-20). For scale, the old Angular-only component
was 105 lines of TypeScript.

| Measure | Core | Angular | React | Vue | Lit |
|---|---|---|---|---|---|
| Component (template + logic) | 407 (machine, connect, types, in-memory provider) + 82 SCSS | 193 TS + 25 HTML | 159 | 140 | 259 |
| Shared bridge (one-time per lib) | 141 (`store` + `async`) | 51 | 27 | 15 | 59 |
| Specs | 299 | 317 (unit, ARIA, SSR) | 136 | 121 | 152 |
| SSR result, JS off | — | real named combobox input + sheet in `<head>` | not server-rendered here | not server-rendered here | emitted empty (light tier) |

**Reading for #437.** The per-front component is 140–260 lines once the core exists; the core plus its specs
is the larger, one-time share (about 700 lines for the typeahead). The bridges are paid once per library and
are now done. The cost that will grow with bigger components is the template written four times: the
typeahead's markup is small, while the datatable, scheduler and dock are 3,800–4,100-line elements whose
template is most of the code. Size #437 by template weight, not by this pilot's ratio.

## 16. As built (deviations from the plan)

- **`OverlayController` not lifted.** It depends on the lit-bound `a11y` entry (dismiss stack, focus trap);
  moving both is #437-sized. The listbox is absolutely positioned under a relative root, as Bootstrap's own
  dropdowns are. Consequence: the list does not flip upward near the viewport bottom.
- **Scoping conformance split.** The registry moved to `ui-core/scoped-styles`; the WC-source-scanning specs
  stay in the WC lib, and ui-core has its own single-writer and no-leak specs.
- **The Angular listbox is server-rendered, hidden** (D15 said "not rendered"), so server and client DOM are
  identical and hydration has nothing to reconcile.
- **Consumer `role` is never forwarded** in any front (the input is a combobox by contract). `bs-typeahead` has
  its own forwarding spec instead of a row in the Angular `aria-passthrough` registry (which assumes an
  `<mp-*>` target); React's guard gained an explicit `fixedRole`.
- **`[mpProps]` lives in `@mintplayer/ng-bootstrap/machine`** with `machineSignal` and `useScopedStyles`,
  not in a `scoped-styles` entry.
- **The `*bsTypeaheadItem` microsyntax is `let item; let term = term; of: items`.** `of:` is an optional type
  carrier so the template is typed; Angular cannot infer the item type from a component's generic.
- **Spikes S3–S5** became permanent tests rather than throwaway evidence: S3 (identical DOM/ARIA) is covered by
  the per-front ARIA specs plus one shared Playwright suite run against all three demo apps; S4 by the Angular
  SSR spec and the `javaScriptEnabled:false` e2e; S5 (Observable unsubscribe) by the Angular unit spec.
- **The datatable `fetch` abort uses one controller per page generation**, not the `SupersedingRequest`
  runner: window and child fetches run concurrently by design, and only invalidation should abort them.
