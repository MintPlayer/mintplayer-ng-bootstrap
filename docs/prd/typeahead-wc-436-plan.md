# Plan — Typeahead pilot of the headless-core architecture (#436)

PRD: [typeahead-wc-436.md](./typeahead-wc-436.md)
Status: **M1–M8 done** (2026-10-20); M9 in progress (unit sweep green; first CI run red on the SSR chrome generators, fixed; targeted e2e, keyboard and no-JS checks next). S1 PASS, S2 PASS; M1, M1b, M2, M3, M4 done (the Angular demo page was rewritten in M4 because the old API no longer compiles; M7 only adds e2e for it). Deviations in M4: host ARIA forwarding is typeahead-specific (`aria-*` copied, `id`/`tabindex` moved, `role` never forwarded since the input's role is `combobox`), so `bs-typeahead` is not in the `aria-passthrough` registry (which assumes an `<mp-*>` target) but has its own forwarding spec; the listbox IS server-rendered, hidden, so SSR and client DOM are identical (PRD D15 said "not rendered"). Branch `feat/typeahead-core-436`, draft PR #438.
Everything lands in **one PR**: the new `@mintplayer/ui-core` package, the scoped-styles move, the shared runner in tree-select and both datatable paths, the four typeahead fronts, the four deletions, demos, e2e, versions. The Spark adoption (PRD §12) follows the publish. The catalog migration is **#437** and is not touched here.

Spike artifacts go in `docs/prd/spikes/issue-436/`, one short `S<n>-*.md` per spike: what was measured, in which engines and versions, and the decision it settles. Throwaway harness code stays in the scratchpad or a `_spike-*` folder deleted before the PR.

| Milestone | Scope | PRD |
|---|---|---|
| S1–S5 | Spikes; each decides a D | §9 |
| M1 | `@mintplayer/ui-core` package: scaffolding, `async` (SupersedingRequest), `scoped-styles` moved from the WC lib with its conformance specs, `overlay` lifted | §5.1, D4, D8 |
| M2 | Typeahead core: machine, `connect()`, types, in-memory provider, SCSS, core specs | §5.1, §6, D2–D7, D13 |
| M3 | Shared runner adopted by tree-select search, datatable distincts and datatable `fetch` (+ Angular `[fetch]` passthrough) | D4 |
| M4 | Angular front: `[mpProps]`, scoped-styles server installer, `bs-typeahead`, `*bsTypeaheadItem`, CVA, Observable adapter, SSR branch; deletions in `dropdown` and `a11y` | §5.3, D9, D10, D12, D15 |
| M5 | React and Vue fronts + `useMachine` bridges + passthrough/behaviour specs; `mp-dropdown-menu` listbox removal in WC/React/Vue | §5.4, §5.5, D10 |
| M6 | Lit front `mp-typeahead` + registries | §5.6, D14 |
| M7 | Demos ×3, e2e ×3 (+ Angular no-JS spec), axe and axe-nojs lists, cross-front conformance spec from S3 | §5.7, §10 |
| M8 | CHANGELOG, versions, publish workflow entry for `ui-core`, CLAUDE.md, PRD §15 numbers | §7, §11, §15 |
| M9 | Verification sweep, once | §10 |
| M10 | Spark adoption (other repo, after publish) | §12 |

## Conventions

- Commit per milestone. Between milestones verify with `tsc --noEmit` and by reading; **no test runs before M9** (targeted vitest runs included), except what a spike needs for its evidence.
- After editing `typeahead.scss`, rerun the scoped-styles codegen (the `codegen-wc` target, or its ui-core equivalent once M1 moves it) or the change is invisible. Generated `*.styles.ts` is gitignored; never stage it.
- Every front stamps `data-mps="typeahead"` on every node it renders. Lit uses `scopedHtml`; the other three write the attribute literally in the template.
- Never re-import `buttons`, `utilities` or `reboot` in a scoped sheet; `forms` and `dropdown` are not global and must be imported (`libs/mintplayer-ng-bootstrap/_bootstrap.scss:49,80`).
- Record each front's template LOC, bridge LOC, spec LOC and elapsed time as you go; PRD §15 needs them for #437.
- Push once, when M9 is green locally. Read the single PR run.

## Ordering rationale

S1 and S2 can sink the bridge design (D2, D9) and change M2/M4's shape; they run first. S3 needs at least a stub of each front, so it runs after M2 with throwaway fronts, and its conformance spec becomes permanent in M7. S4 depends on M4 and runs as its last step. S5 is independent and cheap. M1 has no dependency on any spike and starts in parallel. M3 is independent of the typeahead and can be done any time after M1.

## S — Spikes

### S1: core bridge in four fronts `[D2]`
- A 60-line `CounterMachine` with the real contract (snapshot, `subscribe`, commands, `connect()`), mounted via `signal` (Angular, zoneless), `useSyncExternalStore` (React 19), `shallowRef` (Vue 3.5) and `requestUpdate` (Lit 3) in scratch routes of the three demo apps and a scratch element.
- Measure: renders per command (exactly one), same-task delivery, no React tearing under `startTransition`, no Angular `ExpressionChanged…` or missed update under zoneless, Lit coalescing.
- **Decides** D2. Fail → the core adopts a signals-like primitive of its own and the fronts adapt that instead.

### S2: `[mpProps]` under SSR and hydration `[D9, D15]`
- Directive applying a bag through `Renderer2` in a scratch Angular SSR route. JS off: the attributes are in the HTML. JS on with `withEventReplay()`: no NG05xx; a key dropped from the bag is removed from the DOM; `href`/`src`/`style`/`on*` refused.
- **Decides** D9. Fail → per-attribute template bindings (verbose, same ARIA source), D9 rewritten.

### S3: four fronts, one DOM and one ARIA `[D7, §5.2]`
- Render five snapshots (idle; loading; three options with #2 active; error; disabled) in each front, serialize, strip `_ngcontent-*`, `data-v-*` and lit comment markers, diff. Then on the three demo pages: ArrowDown ×2, assert `aria-activedescendant` resolves (`expectIdrefResolves`) and the Chromium/Firefox/WebKit accessibility trees expose the active option with focus still in the input.
- **Decides** D7 and freezes the §5.2 contract. The diff spec is kept as `ui-core/typeahead/_conformance/four-fronts.spec.ts` (M7).

### S4: server input hands over without a flash `[D15, D14]`
- Angular SSR demo, after M4. JS off: the input renders with `name`, label, ARIA; a `<form method="get">` round-trips the typed text. JS on: a `MutationObserver` installed before hydration proves the input node is never replaced; focus set before hydration survives; a keystroke typed before hydration reaches the provider via event replay; console has no NG05xx.
- Also record what the React and Vue SSR demos emit for `<mp-typeahead>` (expected: the empty light-tier element, client-rendered).
- **Decides** D15 (and documents D14's SSR status).

### S5: Observable unsubscribe aborts the HTTP request `[D3]`
- Demo provider over `HttpClient` against a `page.route` delayed endpoint; type `k` then `kr` inside the window; `requestfailed` fires for the first request; the list shows the second answer.
- **Decides** whether the Angular adapter must also forward `signal` beyond unsubscribing.

## M1: `@mintplayer/ui-core` package `[§5.1, D4, D8]`
**Files:** `libs/mintplayer-ui-core/{project.json,package.json,vite.config.mts,tsconfig*.json,README.md}`, `async/`, `scoped-styles/` (moved), `overlay/` (lifted), `tsconfig.base.json` path `@mintplayer/ui-core/*`, `libs/mintplayer-web-components/light-dom/` → re-export shim, `tools/scripts/build-web-components.mjs` (codegen scans ui-core too), `tools/lit-ssr-utils/gen-light-styles-chrome.mjs` (import path).
- [x] Scaffold the package like the WC lib (`discoverEntries`, `generateSubpathExports`, vitest + jsdom). Version `1.0.0`.
- [x] `store/`: `Machine<S>` base (immutable snapshot, `subscribe`, `update` with `Object.is` skip, nested `batch`, `destroy`), `Store<S>`, `SnapshotOf<M>`; unit spec. (Not in the original plan: S1 needed a real base class, and every core will extend it.)
- [x] `async/`: `SupersedingRequest` (debounce, abort previous, stale-drop, `AbortError` silent), `AbortableRequest { signal }` type, unit spec.
- [x] Bridges, one per front, written as part of S1 and kept as deliverables: `@mintplayer/ng-bootstrap/machine` (`machineSignal`, `MpPropsDirective`), `@mintplayer/react-bootstrap/machine` (`useSnapshot`, `useMachine`), `@mintplayer/vue-bootstrap/machine` (same), `@mintplayer/web-components/machine` (`MachineController`). The Angular `[mpProps]` directive lives here, not in `scoped-styles` as the PRD §5.3 first said: it is about prop bags, not styles.
- **M1b (done 2026-10-20, with two deviations):** the registry (`installLightStyles`, `adoptLightStyles`, `getLightStyleEntries`) and `stampScope` moved to `@mintplayer/ui-core/scoped-styles` with a lit-free source type and a new `writeScopedStyleTag(doc, key, css)` for server renderers; `@mintplayer/web-components/light-dom` re-exports them and keeps the lit-bound `scopedHtml`/`rewriteStatics`. Codegen gained a lit-free `*.scoped.scss` → `*.scoped.styles.ts` (plain string export) path and ui-core a `codegen` target that build/test of all five libs depend on. **Deviation 1:** the scoping/nesting/consumer-DOM conformance specs stay in the WC lib (they scan WC sources and import WC elements); ui-core has its own `document-style-writers` and `scoped-styles-scoping` guards. **Deviation 2:** the `OverlayController` is NOT lifted — it drags the whole lit-bound `a11y` entry (dismiss stack, focus trap) with it, a #437-sized move; the typeahead's listbox is absolutely positioned under a relative root instead (what Bootstrap's dropdowns do). Lifting overlay + a11y into ui-core is recorded in #437.
- [x] Move `light-dom` sources and `_conformance/{light-styles-scoping,light-styles-nesting,consumer-dom-boundary,document-style-writers,no-invalid-css-values}.spec.ts` to `scoped-styles/`; keep `@mintplayer/web-components/light-dom` as a re-export so no WC changes. Add the **server-install contract**: `scopedStyleSheets()` returns `[key, css][]` for the Angular installer.
- ~~Lift `OverlayController` into `ui-core/overlay` with a host-agnostic `attach(host: { requestUpdate?(): void }, options)` API.~~ Not done; moved to #437 (Deviation 2 above).
- [x] `tsc --noEmit`, commit.

## M2: typeahead core `[§5.1, §6, D2–D7, D13]`
**Files:** `libs/mintplayer-ui-core/typeahead/{index.ts,src/index.ts,src/typeahead-machine.ts,src/connect.ts,src/types.ts,src/in-memory-provider.ts,src/styles/typeahead.scss,src/*.spec.ts}`
- [x] `TypeaheadMachine<T>` per PRD §5.1: options, snapshot, commands, keyboard table, request lifecycle on `SupersedingRequest`, announcement with a 1500 ms self-clear, `destroy()`.
- [x] `connect()` bags: `root`, `input`, `listbox`, `status`, `option(i)`, plus the intent handlers.
- [x] `inMemoryTypeaheadProvider(items, { filter?, limit? })`, throws `AbortError` when aborted.
- [x] `typeahead.scss` (imports `forms` + `dropdown` partials; root `.mp-typeahead`; `.ta-status`, loading bar, active option highlight, `prefers-reduced-motion`), codegen'd to a scoped sheet.
- [x] Core specs per PRD §10 incl. golden bag snapshots per state.
- [x] `tsc --noEmit`, commit. Then run **S3 with throwaway fronts**.

## M3: shared runner in tree-select and datatable `[D4]`
**Files:** `libs/mintplayer-web-components/tree-select/src/components/mp-tree-select.ts`, `datatable/src/components/mp-datatable.ts`, `datatable/src/types/{tree.ts,filter.ts}`, `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts` (`[fetch]` orchestration), related specs.
- [x] tree-select `runRequest` + `onSearchInput` → `SupersedingRequest`; keyboard spec (stale, AbortError, disconnect) unchanged and green by reading.
- [x] datatable distincts → runner (drop the generation counter); `FILTER_SEARCH_DEBOUNCE_MS` 250 → shared 200.
- [x] datatable `fetch`: `DatatableFetchRequest.signal`, runner wraps `_fetch`, `_fetchGeneration` echo guard stays; Angular `[fetch]` passes `signal` through; new spec: a superseded page request's signal is aborted.
- [x] `tsc --noEmit`, commit.

## M4: Angular front + deletions `[§5.3, D9, D10, D12, D15]`
**Files:** `libs/mintplayer-ng-bootstrap/scoped-styles/` (new entry: `MpPropsDirective`, `ScopedStylesServerInstaller`, `provideScopedStyles()`), `typeahead/src/{typeahead.component.ts,.html,.spec.ts,.aria.spec.ts,.ssr.spec.ts,directives/typeahead-item.directive.ts,index.ts}`, `dropdown/src/{combobox/*,dropdown/dropdown.directive.ts,dropdown-toggle/*,index.ts}`, `a11y/src/roving-focus/*`, `_conformance/aria-passthrough.spec.ts`, `apps/ng-bootstrap-demo/src/app/app.config.ts` (`provideScopedStyles()`).
- [x] `[mpProps]` (S2 outcome): diff, remove, refuse unsafe names, Renderer2; spec.
- [x] `ScopedStylesServerInstaller`: on the server, append one `<style data-mps-sheet="<key>">` per registered sheet to `DOCUMENT.head` via `Renderer2`, once per request; in the browser, delegate to the core registry. Hydration-safe: the client registry recognises the server-installed node by the data attribute and does not duplicate it.
- [x] `BsTypeaheadComponent` per §5.3: machine + `signal` bridge, template with bags, `*ngTemplateOutlet` rows + `defaultItem`, inputs/outputs/model, CVA, Observable adapter, `isPlatformServer` branch (no listbox), `bsForwardAria` onto the input.
- [x] `BsTypeaheadItemDirective` with context guard.
- [x] Deletions: `combobox/` + export; `popupRole` (+ `BsDropdownPopupRole`), toggle `aria-haspopup` constant; roving `mode` input (+ `activeDescendantId` if unused after). Grep `bsCombobox|popupRole|activedescendant` in `libs/mintplayer-ng-bootstrap` to specs-only, then fix the specs (`dropdown.aria.spec.ts:25-27,115-152`, `dropdown-toggle.directive.spec.ts:25`).
- [x] Specs per PRD §10 (the issue's four cases translated; `.aria.spec.ts` through the bags; `.ssr.spec.ts` with `renderApplication`); passthrough row, count 26 → 27.
- [x] `tsc --noEmit`, commit. Then run **S4**.

## M5: React and Vue fronts; listbox-mode removal `[§5.4, §5.5, D10]`
**Files:** `libs/mintplayer-react-bootstrap/{core/src/useMachine.ts (new entry), typeahead/*, _conformance/attribute-passthrough.{spec.tsx,types.tsx}, _conformance/behaviour/prop-lowering.spec.tsx}`, `libs/mintplayer-vue-bootstrap/{core/src/useMachine.ts, typeahead/*, _conformance/*}`, `libs/mintplayer-web-components/dropdown-menu/src/{components/mp-dropdown-menu.ts,types/dropdown.ts,*.spec.ts}`, `dropdown-menu/ssr/*`, `tools/lit-ssr-utils/gen-dropdown-chrome.mjs` (drop the listbox variant), React/Vue dropdown-menu wrappers (`mode` prop).
- [x] `useMachine` hook / composable per S1 outcome.
- [x] `BsTypeahead.tsx`: bags spread, `renderItem` + default, controlled `value`, `onValueChange`/`onSelect`/`onSubmit`, attrs spread onto the input, sheet install effect.
- [x] `BsTypeahead.vue`: `v-bind` bags, `#item` slot + default, `defineModel`, `inheritAttrs:false`, sheet install `onMounted`.
- [x] Remove `mode="listbox"` from `mp-dropdown-menu` (menu only), `DropdownMode`, its spec cases, the listbox DSD chrome variant, React/Vue `mode` props and the prop-lowering spec line.
- [x] Passthrough rows + completeness checks; Vue behaviour spec.
- [x] `tsc --noEmit` / `vue-tsc`, commit.

## M6: Lit front `[§5.6, D14]`
**Files:** `libs/mintplayer-web-components/typeahead/{index.ts,src/index.ts,src/components/mp-typeahead.ts,src/components/*.spec.ts}`, `_conformance/{light-styles-scoping,light-styles-nesting,consumer-dom-boundary,naming,properties-attributes}.spec.ts`, `tools/lit-ssr-utils/gen-light-styles-chrome.mjs`.
- [x] `mp-typeahead`: Tier L, FACE, machine in a ReactiveController, `applyProps` directive for the bags, `itemRenderer` with `stampScope` before append, events, attributes ↔ properties table.
- [x] Specs: FACE, renderer never stamped, events; registries (`LIGHT_TIER_TAGS`, naming `{ tag: 'mp-typeahead', target: 'input' }`, consumer-dom-boundary case, `LIGHT_TIER_COMPONENTS`).
- [x] `tsc --noEmit`, commit.

## M7: demos, e2e, cross-front conformance `[§5.7, §10]`
**Files:** `apps/ng-bootstrap-demo/src/app/pages/overlay/typeahead/*`, `overlay.pages.spec.ts`; `apps/react-bootstrap-demo/src/app/pages/TypeaheadPage.tsx`, `app.tsx`, `shell/AppShell.tsx`; `apps/vue-bootstrap-demo/src/views/TypeaheadView.vue`, `router/index.ts`, `app/App.vue`; `apps/{ng,react,vue}-bootstrap-demo-e2e/**/typeahead*.spec.ts`; the three `a11y/axe.spec.ts` lists; `apps/ng-bootstrap-demo-e2e/a11y/axe-nojs.spec.ts`; `libs/mintplayer-ui-core/typeahead/_conformance/four-fronts.spec.ts`.
- [x] Pages on the new API (slow provider honouring `signal`, highlighted row template, forms binding, keymap table, demo before snippet, no-JS note on the Angular page).
- [x] E2e per app; Angular `typeahead-nojs.spec.ts`; axe and axe-nojs lists.
- [x] S3's diff spec made permanent.
- [x] `tsc --noEmit`, commit.

## M8: CHANGELOG, versions, workflow, docs, pilot numbers `[§7, §11, §15]`
- [x] `CHANGELOG.md` `[Unreleased]`: `### Breaking` (the §7 table incl. the dropdown-menu, dropdown, a11y and datatable `fetch` breaks), `### Added` (ui-core, React/Vue `BsTypeahead`, the four capabilities).
- [x] Versions per PRD §11; `publish-master.yml` publishes `dist/libs/mintplayer-ui-core` first in the topo order; `.github` build matrix includes the new project.
- [x] CLAUDE.md: a short "Headless core + fronts (pilot: typeahead, programme: #437)" section stating the reversed duplication rule, the `data-mps` catalog-wide rule, and pointing at `ui-core`; fix the stale `#renderNoJsItem` reference.
- [x] PRD §9 verdicts, §15 numbers, add §16 "As built" with deviations. Commit.

## M9: verification sweep (once, at the end)
- [x] Builds: `mintplayer-ui-core` → `mintplayer-web-components` → `mintplayer-ng-bootstrap` → `mintplayer-react-bootstrap` → `mintplayer-vue-bootstrap` (`--skip-remote-cache` locally).
- [x] Unit: the five lib test targets, logs redirected to the scratchpad with `EXIT:` echoed. Four spec bugs fixed (07d08e41).
- [x] SSR chrome generators, which import the **dist** (the first CI run was red on them): a Node resolve hook for the externalized `@mintplayer/ui-core` (d0fd671d), and `light-dom` re-exports named instead of `export *`, since Rolldown compiled the star re-export of an external module to a namespace lookup that threw at load for every dist consumer of `mp-datatable` / `mp-treeview` (00b93211).
- [ ] E2e: the typeahead specs, the three axe specs, the Angular axe-nojs and typeahead-nojs specs only (the full sweep runs in CI).
- [ ] Keyboard-only walk-through of the three demo pages; JS-disabled view of the Angular page.
- [ ] Push once; PR description carries the §7 table and the §15 numbers; read the single CI run.

## M10: Spark adoption (MintPlayer.Spark, after publish)
- [ ] Wait for `publish-master` to publish `@mintplayer/ng-bootstrap@22.26.0`.
- [ ] `spark-address-input.component.{ts,html}`, `reference-data-api.service.ts` per PRD §12; bump the dependency.

## Risks
- S1 or S2 failing late: both run before M2/M4 for that reason; their fallbacks keep the architecture and change only the bridge.
- The scoped-styles move touches every light-tier component's import path: keep the WC `light-dom` re-export byte-compatible and let the existing conformance specs prove it.
- Datatable `fetch` on the runner: the `_fetchGeneration` echo guard and the runner's stale-drop must not double-drop a legitimate reload; the new spec covers reload-after-supersede.
- `@lit/react` is no longer involved for the typeahead, but `useMachine` + `useSyncExternalStore` must memoise `connect()` or every keystroke re-renders every row; S1 measures it.
- New package in the publish workflow: a missing topo entry publishes `web-components` before its dependency exists on npm; the dry-run job must include `ui-core`.

## Explicitly rejected (do not resurrect casually)
- **The Angular-only patch in the issue body** (owner, 2026-10-19). Its four spec cases survive as the M4 test list.
- **Web component + three thin wrappers** (this PRD's first draft, 2026-10-19). Rejected by the owner because Angular SSR cannot render a custom element and the light tier cannot be Lit-SSR'd; superseded by the headless-core architecture.
- **Keeping `[suggestions]` + `(provideSuggestions)`.** Two paths with different staleness guarantees is the reported bug.
- **Native per-front SCSS compilation (Angular `styleUrls`).** Needs `::ng-deep` or `ViewEncapsulation.None` for any cross-boundary rule; replaced by the `data-mps` scope mechanism the repo already has.
- **Per-attribute ARIA bindings in the Angular template.** Makes Angular the one front where ARIA can drift from the core; kept only as S2's fallback.
- **Request-time Lit SSR in Angular.** Tried on `feat/wc-ssr-accordion-pilot` (2026-05), dropped; cannot cover light tier.
