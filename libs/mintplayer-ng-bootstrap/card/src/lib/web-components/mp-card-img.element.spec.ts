import { describe, it, expect, afterEach } from 'vitest';
import './mp-card-img.element';
import { MpCardImgElement } from './mp-card-img.element';

function makeImg(attrs: Record<string, string> = {}, slotted = ''): MpCardImgElement {
  const el = document.createElement('mp-card-img') as MpCardImgElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (slotted) el.innerHTML = slotted;
  document.body.appendChild(el);
  return el;
}

describe('mp-card-img', () => {
  let el: MpCardImgElement;
  afterEach(() => el?.remove());

  it('renders <img class="card-img-top"> by default and adds card-img-top to host', () => {
    el = makeImg({ src: 'a.jpg', alt: 'a' });
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('card-img-top')).toBe(true);
    expect(img.getAttribute('src')).toBe('a.jpg');
    expect(img.getAttribute('alt')).toBe('a');
    expect(el.classList.contains('card-img-top')).toBe(true);
    expect(el.querySelector('.card-img-overlay')).toBeNull();
  });

  it('renders <img class="card-img-bottom"> when position="bottom"', () => {
    el = makeImg({ position: 'bottom', src: 'b.jpg' });
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('card-img-bottom')).toBe(true);
    expect(el.classList.contains('card-img-bottom')).toBe(true);
  });

  it('renders <img class="card-img"> + wraps slotted content in .card-img-overlay when position="overlay"', () => {
    el = makeImg({ position: 'overlay', src: 'o.jpg' }, '<span class="x">on-image</span>');
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('card-img')).toBe(true);
    expect(img.classList.contains('card-img-top')).toBe(false);
    const overlay = el.querySelector('.card-img-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.querySelector('.x')?.textContent).toBe('on-image');
    expect(el.classList.contains('card-img')).toBe(true);
    // img is sibling of overlay (img paints behind), not inside overlay.
    expect(overlay.querySelector('img')).toBeNull();
  });

  it('updates src/alt reactively after connect', () => {
    el = makeImg({ src: 'a.jpg' });
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('a.jpg');
    el.setAttribute('src', 'b.jpg');
    el.setAttribute('alt', 'b');
    expect(img.getAttribute('src')).toBe('b.jpg');
    expect(img.getAttribute('alt')).toBe('b');
  });
});
