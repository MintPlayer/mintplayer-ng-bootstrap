# S1 — A kept slot with a live context, per front

Read 2026-11-07, branch `fix/465-filter-state-keep-alive` (Angular 22.0.8).

| Front | What renders the slot | New context object each render | Verdict |
|---|---|---|---|
| Angular | `ngTemplateOutlet` + `ngTemplateOutletContext` (generated html) | `NgTemplateOutlet._shouldRecreateView` is true only for `ngTemplateOutlet` / `ngTemplateOutletInjector` changes; the context is read through a forwarding `Proxy` (`@angular/common` `_common_module-chunk.mjs:2413-2452`) | View kept; bindings in it re-evaluate when the datatable's view refreshes (the embedded view is checked with its parent), so a consumer `[ctx]="ctx"` input changes in place |
| React | `renderSlot(slots.filter, {column, ctx})` = a plain call (`emit-react.mjs:46-48`) inside the `@for` keyed by `fc.key` | The returned element has the same type at the same position | Child component kept |
| Vue | scoped slot `<slot name="filter" :column :ctx>` | Slot props change | Child component kept |
| Lit | `renderSlot(slots.filter, …)` (`emit-lit.mjs:43`) → the `filterRenderer` result | A `TemplateResult` with the same strings is diffed in place; **a fresh DOM node returned per call replaces the previous one** | Kept for template results. Document: `filterRenderer` must return a template (or the same node), not build new DOM per call |

**Focus on reopen.** The popover `toggle` event is queued after `showPopover` completes (HTML spec), so
the panel is visible when `focusFilterPanel` runs in the next frame. The `.filter-panel-body` first-child
guard (`datatable.core.ts:1019`) still holds with a kept body (it is non-empty from the start). Pinned by
T10 (e2e, three engines).

**Decides:** no change in the generated fronts for D5/D6. The change is in the template condition and
the core. The Lit `filterRenderer` contract goes into the M9 docs.
