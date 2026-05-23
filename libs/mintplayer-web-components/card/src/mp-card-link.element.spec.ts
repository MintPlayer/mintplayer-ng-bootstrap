import { describe, it, expect, afterEach } from 'vitest';
import './mp-card-link.element';
import { MpCardLinkElement } from './mp-card-link.element';

describe('mp-card-link', () => {
  let el: MpCardLinkElement;
  afterEach(() => el?.remove());

  it('wraps slotted content in <a class="card-link"> with href forwarded', () => {
    el = document.createElement('mp-card-link') as MpCardLinkElement;
    el.setAttribute('href', '/x');
    el.textContent = 'Click';
    document.body.appendChild(el);
    const a = el.querySelector('a') as HTMLAnchorElement;
    expect(a).not.toBeNull();
    expect(a.classList.contains('card-link')).toBe(true);
    expect(a.getAttribute('href')).toBe('/x');
    expect(a.textContent).toBe('Click');
  });

  it('drops href attribute when [href] is removed', () => {
    el = document.createElement('mp-card-link') as MpCardLinkElement;
    el.setAttribute('href', '/x');
    document.body.appendChild(el);
    const a = el.querySelector('a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/x');
    el.removeAttribute('href');
    expect(a.hasAttribute('href')).toBe(false);
  });
});
