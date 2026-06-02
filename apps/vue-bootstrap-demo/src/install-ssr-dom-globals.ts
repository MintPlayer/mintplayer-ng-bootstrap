// Side-effect module: install the DOM globals the SSR render needs, BEFORE any
// web-component or framework module is imported. entry-server imports this
// first so the order is guaranteed.
//
// 1. The lit-ssr shim defines `window`/`document`/`HTMLElement`/`customElements`
//    etc. Lit references `Document.prototype` / `CSSStyleSheet` / `ShadowRoot`
//    when an element module loads, so importing any @mintplayer WC wrapper in
//    Node requires this shim or it throws.
// 2. The shim defines `document` but omits `History`. vue-router computes
//    `isBrowser = typeof document !== 'undefined'`, so it then takes its browser
//    branch and reads `history.state` during navigation — `history is not
//    defined` otherwise. We complete the shim with a minimal History object.
//    Combined with createMemoryHistory (the SSR router uses no real browser
//    navigation APIs), `history.state` is the only browser surface it touches.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';

const g = globalThis as typeof globalThis & { history?: unknown };
if (g.history === undefined) {
  g.history = {
    state: null,
    scrollRestoration: 'auto',
    length: 1,
    pushState() {},
    replaceState() {},
    go() {},
    back() {},
    forward() {},
  };
}
