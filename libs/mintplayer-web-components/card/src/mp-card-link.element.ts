/**
 * Card link — wraps slotted text content in an `<a class="card-link">`.
 *
 * The actual `<a>` is the styled element (Bootstrap targets `.card-link`).
 * Bootstrap's adjacency rule `.card-link + .card-link { margin-left: ... }`
 * does not match across wrapper boundaries; we compensate with a sibling
 * selector on `mp-card-link + mp-card-link > .card-link` in
 * `mp-card.element.scss`.
 *
 * Attributes:
 *  - `href` — forwarded to the inner `<a>`.
 */
export class MpCardLinkElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['href'];
  }

  private anchor: HTMLAnchorElement | null = null;

  connectedCallback(): void {
    if (this.anchor) return;
    const a = document.createElement('a');
    a.className = 'card-link';
    while (this.firstChild) {
      a.appendChild(this.firstChild);
    }
    this.appendChild(a);
    this.anchor = a;
    this.applyHref();
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (name === 'href') this.applyHref();
  }

  private applyHref(): void {
    if (!this.anchor) return;
    const href = this.getAttribute('href');
    if (href === null) this.anchor.removeAttribute('href');
    else this.anchor.setAttribute('href', href);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-link')) {
  customElements.define('mp-card-link', MpCardLinkElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-link': MpCardLinkElement;
  }
}
