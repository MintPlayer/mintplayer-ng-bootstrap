import { LitElement } from 'lit';

/**
 * Shared base for the small navbar sub-element WCs (item, brand): they render
 * static chrome (a `<slot>`), so the only shared concern is the
 * Declarative-Shadow-DOM handoff — identical to mp-shell / the dropdown WCs.
 */
export abstract class MpNavbarElement extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const observed = (this.constructor as typeof LitElement & {
      observedAttributes: string[];
    }).observedAttributes;
    if (!observed.includes('defer-hydration')) {
      this.shadowRoot?.replaceChildren();
    }
    return super.createRenderRoot();
  }
}
