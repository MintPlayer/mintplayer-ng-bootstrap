# S2 — Entering from kept markup

Read 2026-11-07 (`ui-core/overlay/src/presence.ts`). To be measured in the browser by O3.

**What breaks.** `OverlayPresence.set(true)` calls `#go('entering')` (state write, the render is batched)
and then `whenRendered(doc, find, …)`. Today the root is absent while `closed`, so `whenRendered` waits for
the body mutation that the `entering` render causes. With kept markup the root **already exists in its
closed form**, so `whenRendered` calls back synchronously (`presence.ts:127-131`), before the `entering`
render:

1. `openOverlay(host, …)` runs on a still-hidden host (initial focus can't land);
2. `void el.offsetHeight` flushes the **closed** styles (`display: none`), not the entering ones;
3. `#go('shown')` then adds `.show` from `display: none`, so there is no transition (Bootstrap fade).

**Fix.** Every overlay core stamps its phase on the rendered root (`data-mp-phase="<phase>"`, written in
the core's root bag, so it lands in the same render as the markup). `whenRendered` takes a readiness
predicate: `find()` returns the root only when `data-mp-phase` is `entering` (or `shown` for the
`shownAlready` path), and its `MutationObserver` also watches `attributes` with
`attributeFilter: ['data-mp-phase']`. The leave path is unchanged: it reads the root that is there.

`data-mp-phase` is also the e2e hook for O3 (`entering` → `shown` observed on the second open).

**Decides:** presence change §6.3. It is generic, so modal, offcanvas, popover, tooltip, dropdown and
context menu need only the root-bag attribute.
