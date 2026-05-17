import type { CardImagePosition } from '../types/card-image-position';

/**
 * Card image. Switches between three Bootstrap positions:
 *  - `position="top"`     → host gets `card-img-top`, inner `<img>` too
 *  - `position="bottom"`  → host gets `card-img-bottom`, inner `<img>` too
 *  - `position="overlay"` → host gets `card-img`, inner `<img>` too, AND
 *    slotted children get wrapped in `<div class="card-img-overlay">`
 *
 * The class is duplicated on both host and inner img so that Bootstrap's
 * `.card-group > .card > .card-img-top` corner-rounding selector matches
 * (host is the direct child of `.card`) AND `.card-img-top { width: 100% }`
 * sizes the actual `<img>` element. Pair with `overflow: hidden` on the
 * host in `mp-card.element.scss` so the host's border-radius clips the img.
 *
 * Position is read once on connection — changes after first render are not
 * supported. `src` and `alt` are reactive.
 */
export class MpCardImgElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['src', 'alt'];
  }

  private imgEl: HTMLImageElement | null = null;

  connectedCallback(): void {
    if (this.imgEl) return;
    const position = (this.getAttribute('position') as CardImagePosition | null) ?? 'top';
    const cls =
      position === 'top'
        ? 'card-img-top'
        : position === 'bottom'
          ? 'card-img-bottom'
          : 'card-img';

    this.classList.add(cls);

    const img = document.createElement('img');
    img.className = cls;
    this.applyImgAttrs(img);
    this.imgEl = img;

    if (position === 'overlay') {
      // Capture pre-existing children, then place them inside the overlay
      // wrapper after the img. Order matters: img first (paints behind),
      // overlay div second (paints on top via absolute positioning from
      // Bootstrap's `.card-img-overlay`).
      const captured: Node[] = [];
      while (this.firstChild) captured.push(this.removeChild(this.firstChild));
      const overlay = document.createElement('div');
      overlay.className = 'card-img-overlay';
      for (const node of captured) overlay.appendChild(node);
      this.appendChild(img);
      this.appendChild(overlay);
    } else if (position === 'bottom') {
      // Append the img as the last child so callers can compose body content
      // before the image declaratively.
      this.appendChild(img);
    } else {
      // Top (or default): prepend so the image sits above any sibling content
      // the caller may have placed inside the wrapper.
      this.insertBefore(img, this.firstChild);
    }
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (!this.imgEl) return;
    if (name === 'src' || name === 'alt') this.applyImgAttrs(this.imgEl);
  }

  private applyImgAttrs(img: HTMLImageElement): void {
    const src = this.getAttribute('src');
    if (src === null) img.removeAttribute('src');
    else img.setAttribute('src', src);
    const alt = this.getAttribute('alt');
    if (alt === null) img.removeAttribute('alt');
    else img.setAttribute('alt', alt);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-img')) {
  customElements.define('mp-card-img', MpCardImgElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-img': MpCardImgElement;
  }
}
