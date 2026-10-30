# S1: an output emitted from `attach` reaches the consumer

Question: the seeded `pageLoad` (#450) is emitted from the datatable core's `attach`, the first client
hook. Is the consumer already listening by then, in every front?

| Front | How `emit` is delivered | Result |
|---|---|---|
| Angular | `output()` subscribed when the parent template is created, before `afterNextRender` attaches | **Measured**: `datatable/src/datatable-ssr-pageload.spec.ts` (`renderApplication`, then `provideClientHydration` from the serialized HTML) receives exactly one `seeded: true` event and makes no client fetch. With the attach-time emit removed, the same spec fails with `expected [] to deeply equal [ … ]`. |
| React | `react-bootstrap/machine/src/core.ts:70-80`: `emit` reads `latest.current.emit`, i.e. the props of the latest render, at call time | Nothing to subscribe to, so nothing to miss. |
| Vue | `vue-bootstrap/machine/src/core.ts:98-105`: `options.emit` is the component's own emit, and `attachTo` runs from mount; listeners are vnode props by then | Delivered. |
| Lit | `web-components/machine/src/core-controller.ts:89`: a bubbling `pageload` `CustomEvent` from `firstUpdated` | The controller passes no seed (`core.state(inputs)`), so the seeded emit never happens in Lit. Fetched pages emit after an `await`. |

Decision: emit the seeded page from `attach` (and from `inputsChanged` for an adopted seed). No
deferral to a microtask is needed.
