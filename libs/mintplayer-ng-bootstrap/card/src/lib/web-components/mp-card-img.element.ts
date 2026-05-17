import type { CardImagePosition } from '../types/card-image-position';

/**
 * Card image. Switches between three Bootstrap positions:
 *  - `position="top"`     → `<img class="card-img-top">`
 *  - `position="bottom"`  → `<img class="card-img-bottom">`
 *  - `position="overlay"` → `<img class="card-img">` + wraps slotted content
 *    in `<div class="card-img-overlay">` (caller's overlay markup lives in
 *    the slot).
 *
 * Position is read once on connection — changes after first render are not
 * supported (changing it would require unwinding the overlay wrap). `src`
 * and `alt` are reactive.
 */
export class MpCardImgElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['src', 'alt'];
  }

  private imgEl: HTMLImageElement | null = null;
  private overlayEl: HTMLDivElement | null = null;

  connectedCallback(): void {
    if (this.imgEl) return;
    const position = (this.getAttribute('position') as CardImagePosition | null) ?? 'top';

    const img = document.createElement('img');
    img.className =
      position === 'top'
        ? 'card-img-top'
        : position === 'bottom'
          ? 'card-img-bottom'
          : 'card-img';
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
      this.overlayEl = overlay;
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
