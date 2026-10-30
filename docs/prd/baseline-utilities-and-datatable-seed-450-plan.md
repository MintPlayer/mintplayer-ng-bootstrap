# Plan: baseline utilities and datatable seed metadata (#450)

PRD: [baseline-utilities-and-datatable-seed-450.md](./baseline-utilities-and-datatable-seed-450.md)
Branch: `fix/450-width-utilities-datatable-seed` → `master`, one PR: [#451](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/451).
Status (2026-10-30): **all milestones done**; PR open, waiting on CI.

Test-first: every milestone starts with a spec that fails for the reason in the issue, then the fix
turns it green.

| Milestone | Scope | Status |
|---|---|---|
| S1 | Spike: does an output emitted from `attach` reach the consumer in every front? | Done: [S1](./spikes/issue-450/S1-emit-at-attach.md) |
| M1 | Red: `bootstrap-baseline-superset.spec.ts` (compile stock Bootstrap and the baseline, diff classes) | Done: red on `.w-25..100`, `.text-wrap`, `.text-nowrap` |
| M2 | Green: `width.scss` merges into Bootstrap's entry; `white-space.scss` gets its own key (`mp-white-space`) | Done |
| M2b | Red → green: every patch on an `mp-*` key (`mp-cursor`, `mp-overflow-x` with only Bootstrap's missing values); spec fails on a literal non-`mp-` key | Done: red on `cursor`, `overflow-x` |
| M3 | Red: core specs for `extra` in the seed and `pageLoad` on the fetched, seeded and adopted paths | Done: 4 red |
| M4 | Green: `DatatableFetchResponse.extra`, `DatatablePageRequest`, `DatatablePageLoadDetail`, `pageLoad` in the core + manifest | Done |
| M5 | Angular `renderApplication` + hydration spec (the issue's spec) | Done: green, and red with the seeded emit removed |
| M6 | Docs: manifest doc for `pageLoad`, `extra` JSDoc; recompile fronts | Done |
| M7 | One verification pass | Done (below) |

## S1: output emitted from attach

`pageLoad` for a seeded page is emitted from the core's `attach`, the first client hook. That only
helps if the consumer is listening by then. Result per bridge (details in the spike file):

- Angular: outputs are subscribed when the parent's template is created, before `afterNextRender`.
  Measured by M5's hydration spec.
- React: `emit` reads the latest `on<Name>` prop at call time, so there is no subscription to miss.
- Vue: `emit` goes through the component's own emit, and `attachTo` runs from mount.
- Lit: a DOM event from `firstUpdated`. No seed reaches Lit (PRD D6), so only fetched pages emit
  there, and those emit after an `await`.

Decision: emit from `attach` / `inputsChanged` directly, no microtask deferral.

## Regression specs

- `libs/mintplayer-ui-core/_conformance/bootstrap-baseline-superset.spec.ts`:
  - baseline ⊇ stock Bootstrap (class-set diff of both compiled sheets);
  - `.w-100{width:100%!important}`, `.w-25`, `.w-md-auto`;
  - `.text-nowrap`, `.text-wrap`, `.white-space-pre-wrap`;
  - `.cursor-pointer`, `.overflow-x-clip`, `.overflow-x-auto` keep their prefixes;
  - no file in `styles/utilities/` assigns a literal entry to a non-`mp-` key (read with `fs`,
    because vitest serves `.scss?raw` empty).
- `libs/mintplayer-ui-core/datatable/src/datatable.spec.ts`, "datatableCore pageLoad (#450)":
  `extra` survives `prefetch`; `pageLoad` fires once with `seeded: true` on attach and `fetch` is not
  called; a fetched page fires `seeded: false` with its `extra` and no `signal`; an adopted seed fires
  `seeded: true` once.
- `libs/mintplayer-ng-bootstrap/datatable/src/datatable-ssr-pageload.spec.ts`, the same consumer
  (columns from the response) in all three ways an app can run it:
  - **SSR with `stateKey`:** server `renderApplication` with a `fetch` that returns `extra`, then
    real hydration (`provideClientHydration` on both sides; the server cell is the same DOM node
    afterwards): `pageload` once, `seeded: true`, `extra` intact, no browser `fetch`, cells + header.
  - **SSR without `stateKey`:** no server fetch, no rows in the server HTML; the browser fetches
    page 1 once and `pageload` reports it with `seeded: false`; cells + header.
  - **No SSR:** a plain browser bootstrap fetches page 1 once, `seeded: false`; cells + header.
  The first version of this spec had `provideClientHydration` on the client only, so the browser
  re-rendered destructively (NG0505) and the hydration path was never exercised.

## Verification (M7, local)

- `nx test mintplayer-ui-core`: 117 files, 2214 tests passed.
- ng-bootstrap `datatable/src` + `machine/src` specs: 8 files, 15 tests passed.
- `mintplayer-ui-core:compile-components-check`: passed.
- Type-checks: React (`tsc -p tsconfig.lib.json`), Vue (`nx run mintplayer-vue-bootstrap:typecheck`),
  web-components (`tsc -p tsconfig.lib.json`): passed.
- After M2b only the baseline spec was re-run (11 passed): the change touched the utility patches
  and that spec alone.
- Not run locally: the full ng-bootstrap suite, the lib builds and e2e. CI on #451 covers them.
