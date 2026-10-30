# Plan: baseline utilities and datatable seed metadata (#450)

PRD: [baseline-utilities-and-datatable-seed-450.md](./baseline-utilities-and-datatable-seed-450.md)
Branch: `fix/450-width-utilities-datatable-seed` → `master`, one PR. Test-first: every milestone
starts with a spec that fails for the reason in the issue, then the fix turns it green.

| Milestone | Scope |
|---|---|
| S1 | Spike: does an output emitted from `attach` reach the consumer in every front? |
| M1 | Red: `bootstrap-baseline-superset.spec.ts` (compile stock Bootstrap and the baseline, diff classes) |
| M2 | Green: `width.scss` merges into Bootstrap's entry; `white-space.scss` gets its own key |
| M3 | Red: core specs for `extra` in the seed and `pageLoad` on the fetched, seeded and adopted paths |
| M4 | Green: `DatatableFetchResponse.extra`, `DatatablePageLoadDetail`, `pageLoad` in the core + manifest |
| M5 | Red → green: Angular `renderApplication` + hydration spec (the issue's spec) |
| M6 | Docs: manifest doc for `pageLoad`, `extra` JSDoc; recompile fronts |
| M7 | One verification pass: ui-core + ng-bootstrap tests, compile-components check, lib builds |

## S1: output emitted from attach

`pageLoad` for a seeded page is emitted from the core's `attach`, the first client hook. That only
helps if the consumer is listening by then. Check each bridge:

- Angular: outputs are subscribed when the parent's template is created, before `afterNextRender`.
  Proven by M5's hydration spec.
- React: `emit` reads the latest `on<Name>` prop at call time, so there is no subscription to miss.
- Vue: `emit` goes through the component's own emit, and listeners are props on its vnode.
- Lit: a DOM event from `firstUpdated`. A listener added after the element connects misses it. No
  seed reaches Lit (PRD D6), so only fetched pages emit there, and those are async.

Record the result in `docs/prd/spikes/issue-450/S1-emit-at-attach.md`.

## Regression specs

- `libs/mintplayer-ui-core/_conformance/bootstrap-baseline-superset.spec.ts`: baseline ⊇ Bootstrap,
  `.w-100{width:100%!important}`, `.w-md-auto`, `.text-nowrap`, `.white-space-pre-wrap`.
- `libs/mintplayer-ui-core/datatable/src/datatable.spec.ts`, "#450 pageLoad": `extra` survives
  `prefetch`; `pageLoad` fires once with `seeded: true` on attach and `fetch` is not called; a fetched
  page fires `seeded: false` with its `extra`; an adopted seed fires `seeded: true` once.
- `libs/mintplayer-ng-bootstrap/datatable/src/datatable-ssr-pageload.spec.ts`: server
  `renderApplication` with a `fetch` that returns `extra`, then client hydration from the serialized
  transfer state: `pageLoad` once, `seeded: true`, `extra` intact, `fetch` not called.
