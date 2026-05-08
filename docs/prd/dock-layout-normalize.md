# PRD: Dock layout normalization — flatten nested same-direction splits, sanitize intake

**Status:** Draft — branch `issues/#317`
**Author:** Pieterjan
**Date:** 2026-05-08
**Library:** `@mintplayer/ng-bootstrap/dock`
**Tracks:** [#317](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/317)

---

## 1. Problem

The dock manager (`libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts`) prunes empty stacks and length-{0,1} splits via `cleanupEmptyStackInTree` (line 3411-3437) and `cleanupSplitIfNecessary` (line 3439-3466), but four structural gaps leave **redundant** zones in the layout tree that the user never asked for. They are not strictly empty — they render as superfluous splitter handles — and they accumulate over a session.

### Concrete repro

At https://bootstrap.mintplayer.com/advanced/dock from the initial demo state:

1. Drag **panel-4** (the only pane in its stack on the right side) onto the **right** zone of **panel-3**.
2. Inspect the layout JSON.

Expected: a flat root horizontal split. Actual: a horizontal split nested inside the root horizontal split — `H_root[ stack(p1,p2), H_inner[stack(p3), stack(p4)] ]`.

### Visual illustration of the same-direction merge

Starting layout — outer horizontal split where the left slot is itself a vertical split:

```
+---+---+-------+
| A | B |       |
+---+---+   D   |
|   C   |       |
+-------+-------+
```

Tree: `H[ V[H[A, B], C], D ]`.

Pull out panel C. The inner vertical split now has only one child (`H[A, B]`), so `cleanupSplitIfNecessary` collapses it. The surviving child is hoisted into the grandparent — but because the grandparent and the surviving child are both horizontal splits, today they are NOT merged. Result:

```
+-----------+-----+
| +---+---+ |     |
| | A | B | |  D  |
| +---+---+ |     |
+-----------+-----+
```

Tree: `H[ H[A, B], D ]` — a redundant horizontal wrapper around `[A, B]` that contributes nothing but a stray splitter handle.

After this PRD, the same-direction merge runs and the inner `H[A, B]` is flattened into the outer split:

```
+---+---+---+
| A | B |   |
|   |   | D |
|   |   |   |
+---+---+---+
```

Tree: `H[ A, B, D ]`. Sizes are combined multiplicatively so A's, B's, and D's on-screen widths are preserved.

### The four gaps

| ID | Gap | Site |
|---|---|---|
| **A** | When `cleanupSplitIfNecessary` collapses a split to its single child via `replaceNodeInTree`, it never checks whether the surviving child is a same-direction split that should merge into the grandparent. | `mint-dock-manager.element.ts:3443-3444` |
| **B** | `handleFloatingStackDrop` grafts an entire (possibly multi-stack) `source.root` into the docked tree via `dockNodeBeside`. If `source.root.direction` matches the target's parent direction, the result is nested same-direction splits. | `mint-dock-manager.element.ts:2916, 2924` |
| **C** | `dockNodeBeside`'s wrap branch always builds a fresh wrapping split without considering whether the wrap is adjacent to a same-direction grandparent. | `mint-dock-manager.element.ts:3489-3496` |
| **D** | The `layout` attribute / property setter accepts whatever the host provides without sanitization. A consumer restoring a snapshot saved by an older buggy version inherits its garbage forever — empty stacks, 0/1-child splits, and nested same-direction splits all persist through render. | `mint-dock-manager.element.ts` (parseLayout / property accessor) |

### Investigation

Two parallel audit agents traced every code path. Truly empty zones (`panes:[]`, 0-child splits) are pruned correctly through every drop flow — order-of-ops in `handleDrop` (skipCleanup=true → mutate → `cleanupLocation`) is sound, all callers reassign cleanup return values, and `cleanupLocation` correctly drops empty floating windows (line 3761). The remaining issues are structural noise (redundant splits, untrusted intake), not orphan empties.

---

## 2. Goals

1. **Single source of truth.** Replace the targeted `cleanupEmptyStackInTree` / `cleanupSplitIfNecessary` helpers with one recursive `normalize(root)` pass that runs at every public mutation chokepoint.
2. **Eliminate the four gaps** in one PR — gaps A–D ship together (per the unified-scope rule: one user request = one release).
3. **Preserve user-set split ratios.** Merging a same-direction child split must produce the same on-screen pixel layout the user already had.
4. **Silently sanitize on intake.** A malformed `layout` setter input renders normalized; no warnings, no throws.
5. **Diagnostic in dev mode.** When a layout mutation produces a tree where a registered pane has no projection slot in shadow DOM after render, throw — this is a layout-logic bug we want to catch loudly during development, never in production.
6. **Lock the fix with tests.** Unit tests on `normalize()` covering all four gaps + Playwright e2e covering the six audit-identified repro sequences plus state-restoration via the layout setter.

### Non-goals

- Reorganizing the layout-tree data model (`DockLayoutNode` / `DockSplitNode` / `DockStackNode`) — the shape stays.
- Changing the public dock API surface (events, attributes, properties).
- Visual redesign or new drop zones.
- Fixing concerns outside layout-tree integrity (e.g., drag-and-drop UX, keyboard nav).

---

## 3. Decisions made during grilling

| Decision | Choice | Rationale |
|---|---|---|
| Where the normalize pass runs | **Single chokepoint** — replace targeted helpers | Two implementations of the same logic drift; structurally eliminates the gap class. The targeted helpers don't add real value once a normalize pass exists. |
| Intake policy on the layout setter | **Silently sanitize** | Matches the breaking-changes-OK / clean-API memory. A host that round-trips JSON sees normalized output, which is the desired behaviour. |
| Size redistribution when merging same-direction splits | **Multiplicative** — inner sizes scale by parent slot weight | Preserves visual pixels exactly. A 70/30 split outside × 30/70 inside becomes [0.7, 0.3·0.3, 0.3·0.7] = [0.7, 0.09, 0.21]. Renormalize to sum=1 to absorb float noise. |
| Empty floating root behaviour | **Auto-remove from `floatingLayouts`** | Matches existing `removePaneFromFloating` (line 3833): the invariant "every floating window has at least one pane" stays. |
| `activePane` consistency | **Repaired by normalize** | If a stack's `activePane` no longer corresponds to a pane in `panes[]`, normalize sets it to `panes[0]` (or deletes it if empty before drop). Mirrors `removePaneFromStack` (line 2950-2956). |
| Test scope | **Unit tests on `normalize()` + full Playwright repro suite** | Six e2e sequences from the audit + four direct gap unit tests + state-restoration tests covering the layout setter. |
| Dev-mode diagnostic | **Throw when a registered pane has no projection slot** | Late-binding signal that the layout tree got into a state the renderer can't display. Never in production builds. |

---

## 4. Algorithm

`normalize(root: DockLayoutNode | null): DockLayoutNode | null` is bottom-up and idempotent:

1. **Stack:** if `panes.length === 0`, return `null` (caller removes from parent). Otherwise repair `activePane` if stale and return the stack unchanged.
2. **Split:**
   1. Recursively normalize each child; replace nulls by removing them from `children` (and the corresponding entry from `sizes`).
   2. **Same-direction merge:** for each child that is itself a split with the same `direction`, replace `children[i]` with the inner children and redistribute sizes multiplicatively. The slot weight `sizes[i]` is multiplied across the inner `sizes`, then the new `sizes` array is renormalized so the sum stays 1 (within float tolerance).
   3. After merging, if `children.length === 0`, return `null`.
   4. If `children.length === 1`, return `children[0]` (the wrapping split has nothing to do).
   5. Otherwise return the split (with renormalized sizes).

Idempotency: a single pass is enough because step 2.1 normalizes children before the parent inspects them. Re-running on the result is a no-op.

### Floating layouts

After normalizing the docked root, iterate `floatingLayouts` in reverse and:

1. Replace each `floating.root` with `normalize(floating.root)`.
2. If the result is `null`, splice the floating window out of the array.

Reverse iteration keeps indices stable while splicing.

### Chokepoint integration

Public mutation entry points after the change:

- `handleDrop` (line 2760)
- `handleFloatingStackDrop` (line 2861)
- `removePaneFromStack` (line 2948) — remove its inline `cleanupEmptyStackInTree` call
- `cleanupLocation` (line 3751) — collapse into a single `normalizeAll()` call
- The `layout` attribute/property setter (parseLayout)
- Floating undock / detach paths

A single private method `normalizeAll(): void` updates `this.rootLayout` and prunes `this.floatingLayouts`, then schedules a render. Each entry point calls `normalizeAll()` once at the end of its mutation, then dispatches `dock-layout-changed`. The bespoke `cleanupEmptyStackInTree` and `cleanupSplitIfNecessary` are deleted.

### Dev-mode projection-slot guard

After `renderLayout`, in development builds only, walk the registered panes and verify each has a corresponding `<slot>` in the shadow DOM. If any pane is missing its slot, throw with a descriptive error including the pane name and current layout JSON. Production builds skip the check entirely (compile-time stripped via `process.env.NODE_ENV !== 'production'` or equivalent — investigate which guard is conventional in this codebase during implementation).

---

## 5. Test plan

### Unit tests — `mint-dock-manager.element.spec.ts`

Each test crafts an input layout tree, calls `normalize()` directly, and asserts the output structure.

- **Gap A** — Length-1 split flattens, surviving child is same-direction split → merged into grandparent with multiplicative size redistribution.
- **Gap B** — `H_root[stack, H[stack, stack]]` (simulating handleFloatingStackDrop graft) → flattens to `H_root[stack, stack, stack]`.
- **Gap C** — Wrap creates `V[V[stack, stack], stack]` adjacent in a vertical grandparent → flattens.
- **Gap D** — Setter receives `H[empty-stack, V[]]` → returns null root after sanitization.
- **Idempotency** — `normalize(normalize(x)) === normalize(x)` (structural equality) for every gap input.
- **Size preservation** — Manually crafted 70/30 × 30/70 input → output sizes [0.7, 0.09, 0.21]; sum equals 1 within `Number.EPSILON × children.length` tolerance.
- **`activePane` repair** — Stack with `activePane: 'gone'` and `panes: ['a']` → output has `activePane: 'a'`.
- **Floating window auto-remove** — `floatingLayouts: [{ root: stack(empty) }]` after normalize → empty array.

### Playwright e2e — full repro suite

Each test drives `https://bootstrap.mintplayer.com/advanced/dock` (or the demo served from the dev build) and asserts the resulting `dock-layout-changed` payload contains zero same-direction nested splits, zero empty stacks, zero length-{0,1} splits.

| # | Sequence | Targets gap |
|---|---|---|
| 1 | Drag panel-4 → right of panel-3 | A |
| 2 | Drag panel-floating tab → right inside the floating window, then title-bar of the floating onto right of panel-1/panel-2 stack | B + C |
| 3 | Drag panel-3 → right of panel-1 | A |
| 4 | Drag panel-2 tab out (auto-float), then drag the new floating's title onto left of panel-3 | C |
| 5 | Drag panel-floating onto centre of panel-3 (merge), then drag panel-floating tab back out (auto-float), then drag onto right of panel-3 | B + index-shift |
| 6 | Build multi-stack floating (step 1), then drop title bar onto bottom of panel-3 | B |
| 7 | State restoration — programmatically set `layout` to a JSON containing `H[empty-stack, V[H[stack(p1)]]]` and assert the rendered tree is `stack(p1)` |  D |
| 8 | State restoration — set `layout` to a tree with same-direction nested splits and assert it normalizes |  D |

### Acceptance gates

- All unit tests pass.
- All Playwright e2e tests pass headed and headless.
- The audit's repro at the top of this PRD produces a flat layout JSON.
- Setting `layout` with a malformed snapshot produces a normalized rendered tree (no console warnings, no throws).
- In a development build, deliberately corrupting a layout mutation (e.g., an injected test that bypasses normalize) triggers the projection-slot guard.

---

## 6. Implementation outline

| Step | File | Description |
|---|---|---|
| 1 | `mint-dock-manager.element.ts` | Add `private normalize(node: DockLayoutNode \| null): DockLayoutNode \| null` and `private normalizeAll(): void`. |
| 2 | `mint-dock-manager.element.ts` | Replace each call site of `cleanupEmptyStackInTree` / `cleanupSplitIfNecessary` with `normalizeAll()`; delete the two helpers and `replaceNodeInTree` if it has no remaining callers. |
| 3 | `mint-dock-manager.element.ts` | Hook `normalizeAll()` into the layout setter. |
| 4 | `mint-dock-manager.element.ts` | Add the dev-mode projection-slot guard inside (or right after) `renderLayout`. |
| 5 | `mint-dock-manager.element.spec.ts` | Add unit tests. |
| 6 | `e2e/` (or wherever Playwright lives — confirm during implementation) | Add 8 Playwright e2e tests. May require scaffolding a test page that exposes `setLayout` to the test runner. |
| 7 | `apps/ng-bootstrap-demo/src/app/pages/advanced/dock/dock.component.ts` | If needed for state-restoration e2e, expose a hook for tests to set the layout JSON. |

---

## 7. Open questions

None — every decision was resolved during grilling.

---

## 8. Related

- Issue [#317](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/317)
- PR #316 — Dock long-press touch drag (recent dock work)
- PRD `docs/prd/dock-splitter-tabcontrol-lit-composition.md` — the dock's Lit/WC composition architecture this PRD builds on
- PRD `docs/prd/dock-touch-long-press-drag.md`
- PRD `docs/prd/dock-tab-drag-android-touch.md`
