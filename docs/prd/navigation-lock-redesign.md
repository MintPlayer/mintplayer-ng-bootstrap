# PRD: NavigationLock redesign — single-directive, router-event-driven

**Status:** Draft, awaiting review.
**Author:** Pieterjan
**Date:** 2026-05-06
**Library:** `@mintplayer/ng-bootstrap/navigation-lock`
**Tracks:** [#169](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/169)
**Reference:** [Shlomi Assaf — Blocking Page Navigation in Angular with Scale](https://medium.com/@shlomiassaf/blocking-page-navigation-in-angular-with-scale-6758aee4b821)

---

## 1. Problem

Locking a page against accidental navigation today requires the consumer to touch four places for a single feature:

1. Add `canDeactivate: [BsNavigationLockGuard]` to the page's route definition.
2. Implement `BsHasNavigationLock` on the page component.
3. Add `readonly navigationLock = viewChild.required<BsNavigationLockDirective>('navigationLock')` to the class.
4. Place `<ng-container bsNavigationLock [canExit]="..." #navigationLock="bsNavigationLock">` somewhere in the template.

Two concrete failures result from this design:

### 1.1 Unreliable in master-detail layouts

Today's guard is wired to a *route*, and the guard implementation reads `component.navigationLock()` from the *component instance Angular hands to the guard* — which for a master-detail layout is the parent route's component. When a child-route ↔ child-route navigation happens under the same parent, Angular's `CanDeactivate<T>` *does* fire on the parent (because the parent's component instance is the candidate-for-deactivation host containing the child outlet), and the guard incorrectly probes a lock the parent didn't intend to own. Effect: a confirmation prompt appears (or navigation is blocked) for every child↔child navigation under a parent that happens to carry the guard.

The root cause is that "I want to lock *this form*" is being modelled as "lock *this route*". A form lives inside a component; a component can be mounted under any route, and child routes nested under it are not part of the form. Tying the lock's lifetime to a route entry is the wrong granularity.

### 1.2 Per-route boilerplate, scattered across files

A single locked form requires the four touchpoints listed above plus an import in the route file (`BsNavigationLockGuard`) and an import in the component (`BsHasNavigationLock`, `BsNavigationLockDirective`). Five files for one declarative intent ("this form is dirty — confirm before leaving"). The guard, the interface, and the `viewChild` are pure plumbing that exists only to bridge "directive in template" → "guard called by router".

### 1.3 Duplicated responsibility, drifting behaviour

The directive listens to `window:beforeunload` to handle tab-close. The guard listens (via the router) to in-app navigations. Each path has its own copy of "ask the lock if it's OK to leave," but they don't share a confirmation hook — `beforeunload` shows the browser's built-in prompt, and the in-app path returns a `Promise<boolean>` to the router with no UI of its own (the consumer's `canExit` callback is expected to show one). For a typical page that wants the *same* confirm UX in both situations, the consumer has to coordinate this themselves.

## 2. Background — what the code does today

Three files in `libs/mintplayer-ng-bootstrap/navigation-lock/src/`:

- **`directive/navigation-lock.directive.ts`** — `BsNavigationLockDirective`. Inputs: `canExit` (boolean | function | Observable | undefined), `exitMessage`. Hosts `window:beforeunload` and `window:unload` listeners. Exposes `requestCanExit()` returning `Promise<boolean>`. Does not interact with the router.
- **`guard/navigation-lock.guard.ts`** — `BsNavigationLockGuard` with a `canDeactivate(component, ...)` method. Reads `component.navigationLock()` (the `viewChild` signal) and delegates to `requestCanExit()`. If the component does not implement `BsHasNavigationLock`, the guard logs a warning and *blocks* navigation (returns `false`).
- **`interface/has-navigation-lock.ts`** — `BsHasNavigationLock` shape: `navigationLock: Signal<BsNavigationLockDirective>`.

Demo wiring: `apps/ng-bootstrap-demo/src/app/pages/advanced/navigation-lock/navigation-lock.component.ts` plus `advanced.routes.ts:20` (`canDeactivate: [BsNavigationLockGuard]`).

Total external surface: one directive, one guard, one interface, one provider-of-the-guard concept. **Total touchpoints per locked page: 4–5 files.**

## 3. Goals / non-goals

**Goals**

- One directive, dropped into the page's template, is sufficient. No route guard. No component interface. No `viewChild`.
- The lock's lifetime tracks the directive instance — created when the directive is rendered, destroyed when it's torn down. Master-detail child↔child navigation does not trigger a parent-level lock.
- A single confirmation hook covers both router navigations and `beforeunload` (within the constraints `beforeunload` imposes — see §5.4).
- Multiple simultaneous locks are supported (e.g., two dirty forms on the same page) — all are consulted on navigation; any one can block.
- A programmatic API exists for non-router exits (e.g., a custom logout button that wants to honour active locks).
- Consumer migration is one of: delete the guard from routes, delete the interface implementation, delete the `viewChild`, leave the directive. Net code change is strictly negative.

**Non-goals**

- Backwards-compatibility shims for `BsNavigationLockGuard` and `BsHasNavigationLock`. Per the workspace BC rule, these go away in this release with a clean migration note.
- A built-in modal/confirmation component. Consumers continue to provide their own `canExit` logic; we add an injection point for app-level confirmation, not a default UI (see §5.5).
- Native mobile back-button hardening beyond what `popstate` + `Router` already give us. (Browsers limit what JS can do here; we do what the framework gives us, no more.)
- Auxiliary-route support beyond what falls out of the implementation for free. If two outlets each carry a directive, both are consulted; that's it.

## 4. Proposed architecture

**Two pieces, one of them root-injectable, both internal-glue-free for the consumer.**

### 4.1 `BsNavigationLockService` (root-provided)

Subscribes once to `Router.events`. On every `NavigationStart`, walks the registry of currently-mounted directive instances, calls each `requestCanExit()` in registration order, and if any resolves to `false` the service cancels the navigation.

Cancellation pattern: capture the in-flight `Navigation` via `router.getCurrentNavigation()` at `NavigationStart`, await all `requestCanExit()` calls, and on any `false` issue `router.navigateByUrl(currentUrlBeforeNavigation, { replaceUrl: true, skipLocationChange: false })` to restore both the URL bar (which the browser may have already updated for `popstate`-driven navigations) and the router state. This is the same restore-URL pattern Angular's own `RouterPreloader` and several community guards use; it's stable across Angular 17–20.

Also owns the single `window:beforeunload` listener for the whole app, removing the per-directive `host` binding.

Public surface:
- `requestExit(reason?: string): Promise<boolean>` — programmatic check; consults every registered lock and returns `true` only if all allow exit. Useful for "logout" buttons, "switch workspace" actions, etc., that exit the SPA-but-not-the-route.
- `register(lock)` / `unregister(lock)` — internal; called by the directive's `ngOnInit` / `DestroyRef`.

### 4.2 `BsNavigationLockDirective`

Becomes a thin lifecycle wrapper. Inputs are unchanged:
- `canExit: boolean | (() => boolean | Promise<boolean> | Observable<boolean>) | Observable<boolean> | undefined`
- `exitMessage: string | undefined`

Method signature changes from today's `requestCanExit(): Promise<boolean>` to:

```ts
requestCanExit(): boolean | Promise<boolean> | Observable<boolean>
```

The directive returns whichever shape the bound `canExit` input naturally produces, without forcing a Promise wrap:

- `canExit === undefined` → returns `true` (sync `boolean`).
- `canExit` is a `boolean` → returns it directly (sync `boolean`).
- `canExit` is a function → invokes it and returns whatever the function returns (`boolean`, `Promise<boolean>`, or `Observable<boolean>`).
- `canExit` is an `Observable<boolean>` → returns it directly (the consumer remains responsible for completion semantics; the service `take(1)`s before reading).

This preserves information the old API discarded. The `beforeunload` path (§5.4) can now look at the return value and take a synchronous fast path when it's a `boolean`, instead of always preventDefault-ing because the result is wrapped in a Promise the browser won't await.

`host` bindings for `beforeunload`/`unload` are removed — the service owns those.

The selector `[bsNavigationLock]` and `exportAs: 'bsNavigationLock'` are kept so existing template usage continues to compile. Consumers no longer need the template ref unless they want to call `requestCanExit()` programmatically themselves (rare).

### 4.3 What disappears

- `BsNavigationLockGuard` — deleted. No route registration needed anywhere.
- `BsHasNavigationLock` — deleted. The interface only existed to type the bridge between guard and component; with no guard, no bridge.
- `canDeactivate: [BsNavigationLockGuard]` on routes — gone.
- `viewChild.required<BsNavigationLockDirective>('navigationLock')` on components — gone (unless the component genuinely wants the ref for its own logic, e.g., to read `exitMessage()`).

## 5. Why this fixes both reported failures

### 5.1 Master-detail false positive — gone

The lock is a *directive instance*, not a *route guard*. A directive's lifecycle is its host component's lifecycle. If the directive is in child A's template:

- Child A mounted → directive registers with the service.
- User clicks link → `NavigationStart` fires → service asks every active lock (just child A's) → user confirms → router proceeds → child A destroyed → directive auto-deregisters.
- Subsequent child B → child C navigation under the same parent: at `NavigationStart` time, the registry is empty (child A is gone, parent has no lock of its own, neither child B nor C registered one). Service has nothing to ask, navigation proceeds.

The parent route can carry its own lock if it wants to (directive in the parent template) — but that's then an explicit choice that triggers on *every* navigation while the parent is mounted, including child↔child. The consumer chooses the granularity by choosing where the directive lives.

### 5.2 Boilerplate — collapsed to one line

Before:
```ts
// route file
{ path: 'edit', loadComponent: () => ..., canDeactivate: [BsNavigationLockGuard] },

// component .ts
import { BsHasNavigationLock, BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';
export class EditComponent implements BsHasNavigationLock {
  readonly navigationLock = viewChild.required<BsNavigationLockDirective>('navigationLock');
  // ...
}

// component .html
<ng-container bsNavigationLock [canExit]="canExit" #navigationLock="bsNavigationLock"></ng-container>
```

After:
```ts
// route file — unchanged, no guard

// component .ts
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';
// no interface, no viewChild

// component .html
<form bsNavigationLock [canExit]="formIsClean()">...</form>
```

Five touchpoints → two (the import and the directive in the template). The directive can attach to a real element (the form) instead of an `ng-container`, which is also more legible.

### 5.3 Single confirmation hook

`requestCanExit()` is the only call-site for "is it OK to leave." The service uses it for both `Router.events` and `beforeunload`. For `Router.events` the service normalises whatever the directive returns to a Promise (via `Promise.resolve(...)` for booleans and Promises, `firstValueFrom(o.pipe(take(1)))` for Observables) and awaits the result before deciding to cancel.

For `beforeunload` the service exploits the new union return type — see §5.4.

### 5.4 `beforeunload` semantics

The service's `beforeunload` handler walks the registry and calls `requestCanExit()` on each. With the union return type:

- If the result is a sync `boolean === true`, the lock allows exit; move to the next lock.
- If the result is a sync `boolean === false`, the lock blocks; call `event.preventDefault()` and stop walking.
- If the result is a `Promise` or `Observable`, the browser will not wait for it. The service plays it safe: call `event.preventDefault()` to show the browser's built-in confirm. (Same fail-safe as today, but now only triggered when the lock genuinely is async, not whenever the directive happens to wrap a sync bool in a Promise.)

We document this clearly: **for `beforeunload` to behave intuitively, prefer a sync `canExit` (boolean or sync function).** Async confirms are fine for in-app navigation but degrade to "browser prompts on close" for tab-close.

### 5.5 Optional confirmation hook

`provideNavigationLock({ confirm?: (message: string) => boolean | Promise<boolean> })` is added to `app.config.ts` as an optional provider. Default: `window.confirm`. Apps that want every lock to use a `bs-modal`-based confirm wire it once at app config. The directive's per-instance `canExit` callback is still authoritative; this provider only kicks in when a lock has `canExit` undefined and `exitMessage` set, in which case the service uses the configured confirm with the message. This keeps simple cases simple ("just show the message") while preserving full control for complex cases.

## 6. API surface, before & after

**Before** (exported from `@mintplayer/ng-bootstrap/navigation-lock`):
- `BsNavigationLockDirective` (directive)
- `BsNavigationLockGuard` (class, used as `canDeactivate` token)
- `BsHasNavigationLock` (interface)

**After**:
- `BsNavigationLockDirective` (directive — same selector, same inputs, same `exportAs`, `host` bindings removed)
- `BsNavigationLockService` (root-provided service — public API: `requestExit(reason?: string): Promise<boolean>`)
- `provideNavigationLock(opts?)` (provider function for optional configuration)

**Removed**:
- `BsNavigationLockGuard`
- `BsHasNavigationLock`

## 7. Migration

There are exactly two consumers in this workspace today: the navigation-lock entrypoint itself, and the demo app. Both update in this PR:

1. Drop `canDeactivate: [BsNavigationLockGuard]` from any route definition.
2. Drop the `implements BsHasNavigationLock` and the `viewChild.required<...>('navigationLock')` from the component.
3. Drop the `#navigationLock="bsNavigationLock"` template ref unless the consumer is using it for its own purposes.
4. Move the `[bsNavigationLock]` directive onto a meaningful element (the `<form>`) when one exists, instead of an empty `ng-container`.

CHANGELOG entry calls these out as a breaking change for external consumers, with the same four-step recipe.

## 8. Test plan

**Unit — service**
- `register` then `NavigationStart` with a lock returning `true` → router navigation proceeds, registry untouched.
- `register` then `NavigationStart` with a lock returning `false` → service issues the URL-restore navigation; `Router.events` shows `NavigationCancel` for the original navigation.
- Same with the lock returning a `Promise<true|false>` and an `Observable<true|false>` — service awaits and decides correctly.
- Two locks, one returning `true` and one `false` → blocked (the `false` wins). Mix sync and async returns to verify the service normalises correctly.
- `register` → component destroy → registry empty → next `NavigationStart` proceeds without consultation.
- `requestExit('logout')` with all locks `true` → resolves `true`; with any `false` → resolves `false`. Mix shapes.
- `beforeunload` with all locks returning sync-`true` → does not call `preventDefault`. With any sync-`false` → calls `preventDefault`. With any `Promise`/`Observable` return → calls `preventDefault` (safe default; the browser cannot await).

**Unit — directive**
- Constructed → registers with the service exactly once.
- Destroyed → unregisters from the service exactly once.
- `requestCanExit()` returns the right *shape* per input: `undefined` → `true` (boolean), `boolean` input → `boolean`, function returning bool → `boolean`, function returning `Promise` → `Promise`, function returning `Observable` → `Observable`, `Observable` input → `Observable`. Each shape resolves to the right value when consumed.

**Integration — demo app**
- `apps/ng-bootstrap-demo/src/app/pages/advanced/navigation-lock` continues to behave the same end-user-side: flip the toggle, try to navigate away, see the confirm. (The component code shrinks; the user-facing behaviour does not.)
- A new demo route exercises master-detail to prove the false-positive is gone: `advanced/navigation-lock-master-detail` with a parent route that has *no* lock and two child routes A/B where child A has a `[bsNavigationLock]` and child B does not. Click around: A→B prompts (correct), B→A doesn't, B→other-page doesn't. (The same demo can also illustrate the opposite: put the directive on the parent and watch it prompt on every child↔child.)

**Manual — browser**
- Tab-close on a dirty form: browser shows native prompt (sync-boolean path).
- In-app nav on a dirty form with custom confirm: consumer's modal shows; cancelling stays on page; URL bar matches.
- `popstate` (browser back button) on a dirty form: same as in-app nav — service sees `NavigationStart` with `navigationTrigger: 'popstate'`, runs the prompt, restores the URL on cancel.

## 9. Risks / things to watch

- **URL-restore on `popstate` cancel.** When the user clicks Back and the lock blocks, the browser has already advanced its history pointer. `router.navigateByUrl(currentUrl, { replaceUrl: true })` puts the router state back, but the browser history stack now has a stray entry. This matches Angular's documented behaviour for any blocked `popstate` navigation; it is not a regression vs. today's guard. Worth noting in case future Angular Router changes give us a cleaner cancel API.
- **Order of `requestCanExit` calls.** Multiple locks → registration order. If a consumer has two locks and the first prompts the user but the second auto-resolves `false`, the user is prompted before they need to be. Mitigation: short-circuit the registry walk on the first `false`. Document the order so consumers can place their cheapest check first.
- **SSR.** The service registers `window:beforeunload` only when `isPlatformBrowser` is true. The directive's register/unregister calls are no-ops on the server (registry exists, `Router.events` interception still works for in-SPA navigation, just no `beforeunload`).
- **Module federation / lazy-loaded routes.** Each lazy bundle that uses `BsNavigationLockDirective` re-imports it; the service is `providedIn: 'root'` so it's a singleton across the app shell — fine for the standard case. Federated remotes with their own router instances are out of scope (they are out of scope for the entire workspace today).

## 10. Open questions

1. **Built-in confirmation modal?** §5.5 makes `confirm` configurable via a provider but ships with `window.confirm` as the default. Should we instead ship a `bs-modal`-based default and let consumers opt out? Pro: looks consistent with the rest of the lib. Con: pulls `@mintplayer/ng-bootstrap/modal` into the navigation-lock entrypoint, which is currently free of that dependency. **Recommendation:** keep `window.confirm` as the default, document the modal recipe in the demo. Revisit if user feedback requests it.
2. **Do we need `requestExit(reason)` at all in v1?** The programmatic API is cheap to add and proves the architecture, but no in-tree consumer needs it yet. **Recommendation:** include it. The implementation cost is roughly zero given the registry is already there; leaving it out and adding it later is more churn than just shipping it.
3. **Keep `unload` listener?** Today's directive binds `(window:unload)` but the handler is empty. Drop it as part of this refactor.

## 11. Decision

**Yes, redesign.** The current architecture mis-models the lock's lifetime (route-scoped instead of directive-scoped), which produces both reported failures as direct symptoms. Moving the lock's lifetime to the directive instance, and centralising the `Router.events` + `beforeunload` interception in a root service, eliminates both the false-positive (because route geometry no longer determines lock activity) and the boilerplate (because the bridge classes that exist only to connect route → component → directive disappear). The reference architecture from Shlomi Assaf's article is the same shape; this PRD's specifics are tuned to the workspace's signal-input directive pattern and to the BC posture documented in workspace memory.

Estimated change footprint:
- `libs/mintplayer-ng-bootstrap/navigation-lock/src/`: delete `guard/`, delete `interface/`, modify `directive/`, add `service/navigation-lock.service.ts`, add `providers.ts`. Net file delta: roughly even, with the service and directive each ~80–120 lines.
- `apps/ng-bootstrap-demo/src/app/pages/advanced/`: simplify `navigation-lock.component.{ts,html}`, simplify `advanced.routes.ts`, optionally add `navigation-lock-master-detail/` demo (see §8).
- CHANGELOG entry with the four-step migration recipe.

One PR, one release, one breaking change documented.

## 12. References

- [#169](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/169) — original ticket.
- [Shlomi Assaf — Blocking Page Navigation in Angular with Scale](https://medium.com/@shlomiassaf/blocking-page-navigation-in-angular-with-scale-6758aee4b821) — reference architecture.
- Angular Router — [`Router.events`](https://angular.dev/api/router/Router#events), [`NavigationStart`](https://angular.dev/api/router/NavigationStart), [`navigationTrigger`](https://angular.dev/api/router/NavigationStart#navigationTrigger).
- MDN — [`beforeunload`](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) — async limitations on tab-close prompts.
