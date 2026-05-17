import { clearPrefixedClasses, isCardColorName } from './card-classes';

/**
 * Card header. Slotted content stays in light DOM; this element only adds
 * Bootstrap classes to itself and (when `nav-style` is set) to a nested
 * `nav` or `ul` so `card-header-tabs` / `card-header-pills` styling applies.
 *
 * Attributes:
 *  - `color` — Bootstrap colour name, maps to `text-bg-<name>`.
 *  - `nav-style` — `'tabs'` or `'pills'`. Adds the matching `card-header-*`
 *    class to the first slotted `nav` / `ul`.
 */
export class MpCardHeaderElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['color', 'nav-style'];
  }

  private mutationObserver: MutationObserver | null = null;

  connectedCallback(): void {
    this.classList.add('card-header');
    this.applyColor();
    this.applyNavStyle();
    // Slotted navs may be created/swapped after the header is mounted (e.g.
    // when an Angular *ngIf flips). Re-apply nav-style on child changes so the
    // class lands on the new nav rather than only the one present at connect.
    this.mutationObserver = new MutationObserver(() => this.applyNavStyle());
    this.mutationObserver.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (name === 'color') this.applyColor();
    if (name === 'nav-style') this.applyNavStyle();
  }

  private applyColor(): void {
    clearPrefixedClasses(this, 'text-bg-');
    const color = this.getAttribute('color');
    if (isCardColorName(color)) {
      this.classList.add(`text-bg-${color}`);
    }
  }

  private applyNavStyle(): void {
    const target = this.querySelector('nav, ul');
    if (!target) return;
    target.classList.remove('card-header-tabs', 'card-header-pills');
    const style = this.getAttribute('nav-style');
    if (style === 'tabs') target.classList.add('card-header-tabs');
    else if (style === 'pills') target.classList.add('card-header-pills');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-header')) {
  customElements.define('mp-card-header', MpCardHeaderElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-header': MpCardHeaderElement;
  }
}
