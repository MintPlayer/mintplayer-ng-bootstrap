# S1 — one core, four reactivity bridges

**Decides:** D2 (core contract: plain class, immutable snapshot, `subscribe`, batched notifications, no reactivity library inside).
**Verdict: PASS** (2026-10-20).

## What was measured

A `CounterMachine` extending the real `Machine<S>` from `@mintplayer/ui-core/store`
(`libs/mintplayer-ui-core/store/src/machine.ts`) mounted through each front's bridge, with a
render counter in the template:

| Front | Bridge | Spec | Result |
|---|---|---|---|
| Angular 22, zoneless, OnPush | `machineSignal()` — `signal` set from `subscribe`, released on `DestroyRef` | `libs/mintplayer-ng-bootstrap/machine/src/machine-signal.spec.ts` | 1 template execution per committed snapshot; batched two-key command = 1; unsubscribed after destroy |
| React 19.2 | `useSnapshot()` / `useMachine()` on `useSyncExternalStore` | `libs/mintplayer-react-bootstrap/_conformance/behaviour/useMachine.spec.tsx` | 1 render per snapshot; batched = 1; a `startTransition` commit never shows a mixed snapshot; machine destroyed on unmount |
| Vue 3.5 | `useSnapshot()` / `useMachine()` on `shallowRef` + `onScopeDispose` | `libs/mintplayer-vue-bootstrap/machine/src/useMachine.spec.ts` | 1 render per snapshot; batched = 1; two commands in one tick = 1 render; destroyed on unmount |
| Lit 3.3 | `MachineController` (ReactiveController → `requestUpdate`) | `libs/mintplayer-web-components/machine/src/machine-controller.spec.ts` | 1 render per snapshot; batched = 1; no listening while disconnected, catches up on reconnect; `dispose()` destroys |

Core specs: `store/src/machine.spec.ts` (6) and `async/src/superseding-request.spec.ts` (7) green.

Engines: vitest 4.1.10 on jsdom for all four. No browser run was needed: the question was
render scheduling, which each framework's scheduler decides, not layout.

## Notes

- `Machine.update` ignores a patch whose keys are all `Object.is`-equal, so a no-op command
  notifies nobody; the fronts therefore never re-render for nothing.
- `batch()` flushes in `finally`, so a throwing command still delivers the partial snapshot
  once rather than leaving the store dirty.
- React specs must live under `_conformance/` in that lib: it is the only tsconfig that
  includes spec files, and Vite 8 resolves `@mintplayer/*` paths only for tsconfig-included
  files. The spec was moved there.
- Vue's config has no vitest globals; specs import `describe`/`it`/`expect` explicitly.
