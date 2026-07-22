import { LitElement } from 'lit';

/**
 * Shared base for the dropdown WCs. All four render *static chrome* into their
 * shadow root, so the only common concern is the Declarative-Shadow-DOM
 * handoff — identical to `mp-shell.createRenderRoot()`:
 *
 *  - When `@lit-labs/ssr-client`'s hydrate-support has patched this element
 *    (app + WC share one `lit` instance — the React/Vue demos), `defer-hydration`
 *    is in `observedAttributes`; defer entirely to `super`, which reuses the DSD
 *    via `hydrate()`.
 *  - Otherwise (a host bundling a *different* `lit` instance — the Angular demo),
 *    clear the inert SSR chrome BEFORE `super` captures it, so the first
 *    `render()` repopulates the shadow exactly once instead of appending a
 *    duplicate. The chrome is static, so the result is visually identical and
 *    the DSD still did its only job: the no-JS render before upgrade.
 */
export abstract class MpDropdownElement extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const observed = (this.constructor as typeof LitElement & {
      observedAttributes: string[];
    }).observedAttributes;
    const hydrateSupportActive = observed.includes('defer-hydration');
    if (!hydrateSupportActive) {
      this.shadowRoot?.replaceChildren();
    }
    return super.createRenderRoot();
  }
}
