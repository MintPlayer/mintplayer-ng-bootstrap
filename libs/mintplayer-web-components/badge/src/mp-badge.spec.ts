import { afterEach, describe, expect, it } from 'vitest';
import { MpBadge } from './generated';

void MpBadge; // force the side-effect registration

async function mount<T extends HTMLElement & { updateComplete: Promise<boolean> }>(markup: string, tag: string): Promise<T> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const el = host.querySelector(tag) as T;
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-badge', () => {
  it('is the .badge itself, keeps its content and appends the unit visually hidden', async () => {
    const el = await mount<MpBadge>('<mp-badge color="warning" unit="unread messages">5</mp-badge>', 'mp-badge');
    expect(el.classList.contains('badge')).toBe(true);
    expect(el.classList.contains('text-bg-warning')).toBe(true);
    expect(el.textContent?.replace(/\s+/g, ' ').trim()).toBe('5 unread messages');
    expect(el.querySelector('.visually-hidden')?.textContent).toBe(' unread messages');
  });

  it('swaps its colour classes and leaves the tree when decorative', async () => {
    const el = await mount<MpBadge>('<mp-badge color="white">x</mp-badge>', 'mp-badge');
    el.color = 'transparent';
    el.decorative = true;
    await el.updateComplete;
    expect(el.classList.contains('bg-white')).toBe(false);
    expect(el.classList.contains('text-reset')).toBe(true);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});
