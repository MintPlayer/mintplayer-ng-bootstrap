# S5 — How a kept, closed overlay is hidden

Read 2026-11-07 against Bootstrap 5.3 (the compiled parts in `ui-core/styles/parts`).

| Overlay | What hides it without `.show` | Out of the a11y tree / tab order? |
|---|---|---|
| modal | `.modal { display: none }` unless shown | yes |
| offcanvas | `visibility: hidden` + transform | yes (visibility) |
| dropdown-menu, context menu | `.dropdown-menu { display: none }` unless `.show` | yes |
| popover, tooltip | **nothing**: `.fade:not(.show) { opacity: 0 }` only | **no**: an opacity-0 tooltip stays in the tree and its links stay tabbable |
| datatable filter panel | native `popover="auto"` (closed = `display: none`) | yes |

So relying on Bootstrap's own rules works for four overlays and fails for popover and tooltip. Note also
that the modal's backdrop is a sibling root and needs the same treatment.

**Decides.** Every overlay core writes `hidden` on **each** body-hosted root (the dialog and the backdrop
for modal and offcanvas) while `phase === 'closed'`. Reboot's `[hidden] { display: none !important }`
hides them everywhere, uniformly, whatever an inline `style` says. The overlay stack's `inert`
bookkeeping only runs while shown (`openOverlay` / `handle.close()`), so it is unaffected. O2 asserts it
with the accessibility snapshot in a real browser.
