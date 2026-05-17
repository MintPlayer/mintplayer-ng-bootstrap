import { applyHeaderNavStyle, applyTextBgClass } from './card-classes';

import type { CardHeaderNavStyle } from '../types/card-header-nav-style';

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
    // when an Angular *ngIf flips). Re-apply only when a direct-child nav/ul
    // is added or removed — `subtree: true` would force a full querySelector
    // walk on every nested mutation (text-node churn included).
    this.mutationObserver = new MutationObserver((records) => {
      const navAffected = records.some((r) => {
        const touched = [
          ...Array.from(r.addedNodes),
          ...Array.from(r.removedNodes),
        ];
        return touched.some(
          (n) => n instanceof Element && (n.tagName === 'NAV' || n.tagName === 'UL'),
        );
      });
      if (navAffected) this.applyNavStyle();
    });
    this.mutationObserver.observe(this, { childList: true, subtree: false });
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
    applyTextBgClass(this, this.getAttribute('color'));
  }

  private applyNavStyle(): void {
    const raw = this.getAttribute('nav-style');
    const style: CardHeaderNavStyle | null =
      raw === 'tabs' || raw === 'pills' ? raw : null;
    applyHeaderNavStyle(this, style);
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
