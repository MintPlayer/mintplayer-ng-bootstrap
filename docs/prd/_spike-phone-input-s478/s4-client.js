// S4.3 client entry — hydration support MUST be imported before the element so
// LitElement picks up the hydrate path instead of clobbering the SSR'd shadow
// root. Bundled by build.mjs into s4-client.bundle.js (prod) and
// s4-client.dev.bundle.js (lit's development build, which is where lit emits its
// hydration warnings).
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';

const errors = [];
const warns = [];
const origError = console.error;
const origWarn = console.warn;
console.error = (...a) => { errors.push(a.map(String).join(' ')); origError(...a); };
console.warn = (...a) => { warns.push(a.map(String).join(' ')); origWarn(...a); };
window.__consoleErrors = errors;
window.__consoleWarns = warns;

// Snapshot the SSR'd text BEFORE the element definition upgrades it, so the spec
// can tell what the server sent apart from what survived hydration.
const el = document.querySelector('s4-country-list');
window.__ssrText = el?.shadowRoot
  ? [...el.shadowRoot.querySelectorAll('li')].map((li) => `${li.dataset.code}=${li.textContent}`)
  : null;
window.__ssrResolved = el?.shadowRoot?.querySelector('#resolved')?.textContent ?? null;
window.__hadDsd = !!el?.shadowRoot;

await import('./s4-element.mjs');
await customElements.whenDefined('s4-country-list');
await el.updateComplete;

window.__hydrated = true;
