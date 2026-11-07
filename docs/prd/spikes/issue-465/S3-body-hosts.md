# S3 — Body hosts that outlive a close

Read 2026-11-07.

| Front | Primitive | Lifetime today |
|---|---|---|
| React | `BodyPortal` (`react machine/src/body-portal.tsx`) | host created in `useEffect` on mount, removed on unmount |
| Vue | `MpBodyTeleport` (`vue machine/src/body-teleport.ts`) | host created `onMounted`, removed `onBeforeUnmount` |
| Lit | `bodyTeleport` (`wc machine/src/body-teleport-directive.ts`) | host created on first update; `render(nothing)` + removed on `disconnected` |
| Angular (component overlays) | `mpBodyTeleport` (`ng machine/src/body-teleport.directive.ts`) | view + host created once, destroyed with the directive |
| Angular (directive overlays: tooltip, popover, `[bsDropdown]`) | `useOverlayComponent` (`ng machine/src/overlay-directive.ts`) | panel + content created when `inputs()` turns non-null, **destroyed when it turns null** |
| Lit (directive overlays) | `core-directive.ts` `overlay(props, content)` | rendered while non-null; `render(nothing)` + host removed on null |

Every primitive lives exactly as long as **the condition that declares it**: `view.rendered` for the
component overlays and `props.overlay !== null` for the directive cores (tooltip:
`tooltip.core.ts:75` `overlay: rendered ? {…} : null`). None of them needs a structural change.

**Decides.**
1. The keep-alive is a core change: `view.rendered` and `props.overlay` follow the presence **latch**
   (opened once), not the phase. The fronts follow unchanged. `props.overlay` carries `phase`, so the
   panel can hide itself.
2. One gap: `createBodyHost` copies `data-bs-theme` / `dir` / `lang` only at creation. A host that
   outlives a close must re-copy them on each open: `createBodyHost` remembers its `from` element
   (`WeakMap<host, Element>`), and a new `refreshBodyHost(host)` is called by `OverlayPresence` when it
   opens (it already resolves the host, `presence.ts:73`).
3. Destroying the owner still removes the host (unchanged paths), so O7 holds by construction.
