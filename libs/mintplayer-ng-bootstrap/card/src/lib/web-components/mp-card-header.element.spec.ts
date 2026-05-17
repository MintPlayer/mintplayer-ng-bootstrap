import { describe, it, expect, afterEach } from 'vitest';
import './mp-card-header.element';
import { MpCardHeaderElement } from './mp-card-header.element';

function makeHeader(attrs: Record<string, string> = {}, slotted?: string): MpCardHeaderElement {
  const el = document.createElement('mp-card-header') as MpCardHeaderElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (slotted) el.innerHTML = slotted;
  document.body.appendChild(el);
  return el;
}

describe('mp-card-header', () => {
  let el: MpCardHeaderElement;
  afterEach(() => el?.remove());

  it('adds the `card-header` class on connect', () => {
    el = makeHeader();
    expect(el.classList.contains('card-header')).toBe(true);
  });

  it('applies `text-bg-dark` when color="dark"', () => {
    el = makeHeader({ color: 'dark' });
    expect(el.classList.contains('text-bg-dark')).toBe(true);
  });

  it('decorates a slotted nav with `card-header-tabs` when nav-style="tabs"', async () => {
    el = makeHeader({ 'nav-style': 'tabs' }, '<ul class="nav"><li>x</li></ul>');
    // MutationObserver runs on a microtask; flush.
    await Promise.resolve();
    const ul = el.querySelector('ul') as HTMLElement;
    expect(ul.classList.contains('card-header-tabs')).toBe(true);
  });

  it('decorates a slotted nav with `card-header-pills` when nav-style="pills"', async () => {
    el = makeHeader({ 'nav-style': 'pills' }, '<ul class="nav"><li>x</li></ul>');
    await Promise.resolve();
    const ul = el.querySelector('ul') as HTMLElement;
    expect(ul.classList.contains('card-header-pills')).toBe(true);
  });

  it('strips card-header-tabs/pills when nav-style is removed', async () => {
    el = makeHeader({ 'nav-style': 'tabs' }, '<ul class="nav"><li>x</li></ul>');
    await Promise.resolve();
    const ul = el.querySelector('ul') as HTMLElement;
    expect(ul.classList.contains('card-header-tabs')).toBe(true);
    el.removeAttribute('nav-style');
    await Promise.resolve();
    expect(ul.classList.contains('card-header-tabs')).toBe(false);
    expect(ul.classList.contains('card-header-pills')).toBe(false);
  });
});
