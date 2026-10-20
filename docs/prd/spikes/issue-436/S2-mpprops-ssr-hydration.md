# S2 — `[mpProps]` under Angular SSR and hydration

**Decides:** D9 (Angular applies a core's attribute bags through a diffing `[mpProps]` directive) and D15 (the server-rendered input hands over to the client without re-creation).
**Verdict: PASS** (2026-10-20).

## Server half (unit)

`libs/mintplayer-ng-bootstrap/machine/src/props.directive.ssr.spec.ts` renders a component
through `@angular/platform-server`'s `renderApplication` (first spec in the repo to do so; it
destroys the browser-testing platform first, vitest isolates the file). The emitted HTML:

```html
<input id="s2" role="combobox" aria-autocomplete="list" aria-expanded="false" name="q" value="kru">
<ul role="listbox" aria-busy="true" hidden="">
```

A `null` key (`aria-activedescendant`) is absent. Angular 22 requires the `BootstrapContext`
third argument to `bootstrapApplication` on the server (NG0401 otherwise).

## Hydration half (browser)

Throwaway route `/overlays/spike-s2` in the Angular SSR demo (deleted afterwards): a
`Machine`-driven input with a `computed()` bag, `provideClientHydration(withEventReplay())`,
production dev server on port 4210, Chromium via Playwright.

| Check | Result |
|---|---|
| Raw server HTML (`curl`) carries the bag | `role aria-autocomplete aria-haspopup aria-controls aria-expanded="false" name="q" value="kru" autocomplete="off"`; list `role="listbox" hidden=""` |
| After hydration: attributes identical, `[ngh]` markers left | identical; 0 left |
| Angular console errors (NG05xx) | none |
| Input node identity across hydration | the `#s2-input` first observed by a pre-hydration `MutationObserver` **is** `document.getElementById('s2-input')` after hydration; 0 removals, 0 re-additions |
| Focus + keystroke typed before hydration finished | value `ikru`, `document.activeElement` still the input |
| Toggle open through the machine | `aria-expanded="true"`, `aria-activedescendant="s2-opt-1"` added, `hidden` removed from the list |
| Toggle closed | `aria-activedescendant` **removed** (not left stale), `hidden` back |

## Consequences

- D9 and D15 stand. No fallback to per-attribute template bindings is needed.
- `Renderer2.setAttribute`/`removeAttribute` from an `effect()` is enough; no `afterNextRender`
  guard, no `isPlatformServer` branch in the directive.
- The directive refuses `href`, `src`, `srcdoc`, `xlink:href`, `style`, `action`, `formaction`,
  `data` and any `on*` name (unit-tested).
