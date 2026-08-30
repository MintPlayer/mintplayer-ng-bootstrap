# Plan — Styling consumer-authored content inside WC shadow roots

PRD: [shadow-adopted-content-styling.md](./shadow-adopted-content-styling.md)
Status: **M1-M3 implemented** on `feat/light-dom-emulated-encapsulation` (2026-08-30), unpushed.
M0 spikes passed; mp-datatable converted and verified in the browser. M4-M8 outstanding.

Strategy (PRD §4.6): convert the six components that adopt consumer DOM from shadow DOM to
**emulated encapsulation** — build-time attribute rescoping, Angular's `ViewEncapsulation.Emulated`
implemented for our web components — so consumer content stays in the document tree and the styling
problem stops existing. Branched fresh from `master`, porting `feat/wc-style-encapsulation`'s
`rescopeCss` transform and `installLightStyles` helper — the machinery, not its per-component
migration strategy (PRD §9.3).

Per repo policy this is **one PR**: all conversions, both guarantee layers, all three wrapper libs,
demos and docs. Commit per milestone; run the suites once, at the end (M8).

**M0 gated everything and has passed.** The design rested on lit rendering a dynamic template in
the light DOM alongside consumer-authored nodes; S1-S3 confirmed it, and M3 confirmed it again
against the real component. S4-S8 remain (S4 is now a permanent spec, see M2).

---

## M0 — Spikes (blocking; no production code)

Needs a real browser. `playwright_node` MCP was unavailable when this plan was written
(`CONNECT_TIMEOUT`); the repo's own Playwright e2e projects are the fallback. Spike pages go in
`docs/prd/_spike-*.html`, matching existing precedent (`_spike-scheduler-sticky-overlay.html`).

| # | Question | Pass condition |
|---|---|---|
| ~~**S1**~~ | ~~Can lit render a **dynamic** template into the light DOM without clobbering consumer nodes?~~ | **DONE 2026-08-30, PASSED** (Chromium). Keyed dynamic table + stable callback-supplied nodes survived forced re-render, sort/reorder, whole-page key replacement, template **shape** change (table ↔ empty state) and zero-rows recovery — node count, order and identity correct throughout, no duplication. Re-verify against the real component in M3 (virtual scroll, tree mode, `unsafeHTML` not modelled) |
| ~~**S2**~~ | ~~Template shape transition (`nothing` ↔ template)~~ | **DONE, PASSED** — folded into S1. Recorded finding: the CLAUDE.md value-transition trap applies to *pre-existing unmanaged light children*, not to nodes passed as binding values |
| ~~**S3**~~ | ~~Does document CSS style consumer content in the light DOM?~~ | **DONE, PASSED** — consumer span computed `rgb(25,135,84)` from global `.bg-success`; its `<td class="text-nowrap">` computed `white-space: nowrap`. Still verify the full utility set against the real component in M3 |
| **S4** | **Leakage out** (Goal 3) — the user's hard requirement | With a converted `mp-card`/`mp-datatable` on the page, decoy Angular components carrying `.badge`, `.card`, `.table`, `.form-control` compute **byte-identical** styles to a page without our component. Three engines |
| **S5** | **Leakage in** — how much page CSS now reaches component internals | Quantify against a Bootstrap-styled page; produce the list of internal elements whose computed styles change, for the migration note |
| **S6** | Accessibility tree after removing the boundary | Row/cell/tree structure unchanged or improved; IDREF associations (`aria-labelledby`, `aria-controls`) that previously could not cross the boundary now resolve |
| **S7** | SSR / hydration in the light DOM | Angular SSR output for a converted component parses correctly and hydrates without mismatch; scoped `<style>` emitted once |
| **S8** | Virtual-scroll performance vs. today | No regression in scroll frame time on the 10k-row windowed demo |

Deliverable: findings appended to the PRD, and a go/no-go on §4.6.

## M1 — Port the transform onto `master` — **DONE**

Per PRD §9.3 the branch is **fresh from `master`**; port across only the machinery, not the
strategy: `rescopeCss` + its spec, `installLightStyles`, `scopedHtml`/`stampScope`, the codegen
wiring in `build-web-components.mjs` and `project.json`, and the SSR emission path.

Explicitly **not** ported: the badge and card Tier-L migrations, and `adoptLightStyles` with its two
call sites. PRD §9.1 — once the datatable is light-DOM, `bs-badge` works untouched, so that
migration path is unnecessary.

CLAUDE.md gained the light-tier authoring rules (no prior section existed on `master`), written to
what S1-S3 actually established rather than to the other branch's stricter, leaf-only rule.

## M2 — The no-leak guarantee (PRD §5.2) — **DONE**

Build this **before** converting components, so every conversion lands against a live check.

- Build-level conformance test: parse every generated `*.light.styles.ts`, assert each selector
  carries its own scope attribute or tag, or sits in an explicit `/*! @mps-global */` escape. No
  silently-growing allowlist.
- Runtime decoy test (S4 promoted to a permanent spec): converted components adjacent to Angular
  components with colliding class names; computed styles asserted identical.
- Extend `rescopeCss`'s spec with the cases the conversions will actually hit — nested compounds,
  `@media`/`@container`/`@supports` bodies, `:is()`/`:where()`, attribute selectors, pseudo-element
  placement.

## M3 — Convert `mp-datatable` — **DONE**

The hardest one, and the one the bug was reported on. `<name>.light.scss` + generated rescoped
styles, `scopedHtml('datatable')` throughout, `createRenderRoot() { return this; }`,
`installLightStyles` before `define`. Remove the now-unnecessary `adoptLightStyles` call
(`mp-datatable.ts:645` on the branch).

Restate `@extend`-from-`:host` rules as `:host(...)` forms (the branch's recorded trap). Keep the
string form of `cellRenderer` working — the React and Vue demos rely on it
(`DatatablePage.tsx:56-59`, `DatatableView.vue:55-58`).

### M3 outcome (measured, Chromium, running demo)

| | inside the datatable | identical decoy on the page |
|---|---|---|
| `.datatable-shell` display | `flex` | `block` |
| `.datatable-scroll` overflow | `auto` | `visible` |
| `th` font-weight | `600` | `700` (UA default) |

Badge in a row: `rgb(25,135,84)` / `6px` / `4.2px 7.8px` / `inline-block` / `700` — previously
transparent, `0px`, `0px`, `inline`. Suites: web-components 3207/3211 (the 4 are pre-existing
scheduler flakes — 151/151 in isolation), mintplayer-ng-bootstrap 757/757.

Spec translations required by the conversion, recorded because M4 will hit them again:
`shadowRoot` → `renderRoot`; `shadowRoot.activeElement` → `document.activeElement`;
`document.activeElement === host` → `host.contains(document.activeElement)` (that equality was
asserting shadow focus retargeting, not focus location); a shared harness resolves
`shadowRoot ?? host` so it covers both tiers.

## M4 — Convert `mp-treeview`, `mp-tree-select`, `mp-query-condition`

Same pipeline. `mp-query-condition` is the clearest win: the direct
`mount.appendChild(handle.element)` (`mp-query-condition.element.ts:144`) hands a consumer's own
`<input class="form-control custom-date-editor">` into the shadow root today; in the light DOM both
classes simply work, and the shadow-root Bootstrap import at `mp-query-condition.element.scss:17`
can be dropped.

Also drop the ~20 `part=` attributes from the query-builder family (user decision, PRD §9): a
light-DOM component cannot be addressed by `::part()`, so they are dead weight. Consumers style it
with ordinary CSS instead.

`mp-select` / `mp-file-manager`: confirm no change needed (string-returning resolvers, own styles)
and record the finding rather than converting.

`mp-tree-select` forwards a `nodeRenderer` into `mp-treeview` (`:877`) — convert together so the
chain is consistent.

## M5 — Wrappers

- Angular: `datatable.component.ts:185-370`, `treeview.component.ts:132-155`,
  `tree-select.component.ts:195-256`, `query-builder.component.ts:182-200` — verify the
  `EmbeddedViewRef` path still holds and that host attributes/`aria-*` forwarding still lands on the
  right element now that there is no boundary.
- Vue: `BsTreeSelect.vue:60-131` is the only existing bridge; also expose the renderers on
  `BsDatatable.vue` / `BsTreeview.vue`, which currently do not, so the three frameworks reach parity.
- React: passthroughs need no functional change; update doc comments that tell consumers to
  hand-build DOM nodes (`BsTreeSelect.tsx:8-13`, `BsTreeview.tsx:14-16`).

## M6 — Demos

Fix the four latent breakages the audit found (PRD §1.1) in all three demo apps, and keep the
`<bs-badge>` in the artist rows as the visible canary.

## M7 — Docs

- CLAUDE.md: the rewritten admission rule (M1), plus the leak-*in* direction documented as a
  supported property with guidance.
- Migration note per framework — chiefly that page CSS now reaches component internals, and that
  `::part()` selectors targeting the converted components stop applying.
- `treeview-node-template.directive.ts:16` — replace the dead `<span class="badge bg-secondary">`
  guidance with `<bs-badge>`.
- Close #408 with a pointer to this PRD.

## M8 — Verification sweep (single pass, at the end)

```bash
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components
npx nx test mintplayer-ng-bootstrap
```

Plus:
- e2e: `<bs-badge>` in a datatable row has non-default computed `background-color` **and**
  `border-radius`, in all three demo apps; utility classes from PRD §1.1 apply.
- The M2 conformance + decoy tests green.
- axe gate on datatable / treeview / tree-select — removing a boundary reshapes the a11y tree (S6).
- Firefox smoke pass.

---

## Risks

| Risk | Handling |
|---|---|
| **S1 fails** — lit cannot host consumer nodes inside a dynamic light-DOM template | M0 is blocking and this is the likeliest failure. Fall back to PRD §9.3 (SharedStylesHost bridge + per-component utility subset). Confirm the fallback with the user **before** M0, not after |
| A rescoped selector leaks to another component | M2 lands before any conversion; transform throws at build time, decoy test fails at runtime |
| Page CSS now restyles component internals (leak in) | S5 quantifies it; documented in the migration note. Accepted — Angular's Emulated has the identical property |
| a11y tree changes shape when the boundary is removed | S6 measures; axe gate in M8 |
| Virtual-scroll regression | S8 measures before M3 |
| Converted components lose `::part()` addressability | Breaking, documented. Consumers gain ordinary CSS access in exchange |
