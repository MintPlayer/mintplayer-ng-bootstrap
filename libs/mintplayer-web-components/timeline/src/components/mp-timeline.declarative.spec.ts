import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TimelineItemClickDetail } from '@mintplayer/web-components/timeline-core';
import type { MpTimeline } from './mp-timeline';

/**
 * `<mp-timeline>` in **declarative mode**, as it runs in a browser.
 *
 * Lit's `isServer` is TRUE under vitest (the node export condition), and it
 * gates the two client-only paths that keep slotted children in step with the
 * container: the MutationObserver (a child added, removed, disabled or re-keyed
 * at runtime) and the `updated()` re-enhancement (a container property changed
 * after mount). Resolving `isServer` to false is exactly the browser build's
 * value, so this file runs those paths instead of leaving them to e2e.
 *
 * A declarative child lives in the consumer's light DOM, so everything below
 * is asserted on the consumer's own elements.
 */
vi.mock('lit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lit')>()),
  isServer: false,
}));

await import('./mp-timeline');

async function flush(el: MpTimeline): Promise<void> {
  await el.updateComplete;
  // MutationObserver records and the roving-focus move land after a task.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await el.updateComplete;
}

async function mount(attrs: string, children: string): Promise<MpTimeline> {
  document.body.innerHTML = `<mp-timeline ${attrs}>${children}</mp-timeline>`;
  const el = document.querySelector('mp-timeline') as MpTimeline;
  await flush(el);
  return el;
}

const TWO = `
  <mp-timeline-item item-id="a" title="Alpha"></mp-timeline-item>
  <mp-timeline-item item-id="b" title="Beta"></mp-timeline-item>`;

const children = (el: MpTimeline) => Array.from(el.querySelectorAll<HTMLElement>('mp-timeline-item'));
const attr = (el: MpTimeline, name: string) => children(el).map((c) => c.getAttribute(name));

function addItem(el: MpTimeline, id: string): HTMLElement {
  const item = document.createElement('mp-timeline-item');
  item.setAttribute('item-id', id);
  item.setAttribute('title', id);
  el.appendChild(item);
  return item;
}

function key(target: HTMLElement, k: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-timeline declarative — runtime child changes are picked up', () => {
  it('lays out a child appended after mount, moving "last" onto it', async () => {
    const el = await mount('selectable="single"', TWO);
    expect(attr(el, 'last')).toEqual([null, '']);

    addItem(el, 'c');
    await flush(el);
    expect(attr(el, 'role')).toEqual(['option', 'option', 'option']);
    expect(attr(el, 'last')).toEqual([null, null, '']);
    expect(attr(el, 'side')).toEqual(['start', 'start', 'start']);
  });

  it('moves the tab stop off a child disabled at runtime', async () => {
    const el = await mount('selectable="single"', TWO);
    expect(attr(el, 'tabindex')).toEqual(['0', '-1']);

    children(el)[0].setAttribute('disabled', '');
    await flush(el);
    expect(attr(el, 'tabindex')).toEqual(['-1', '0']);
  });

  it('re-derives selection when a child is re-keyed', async () => {
    const el = await mount('selectable="single"', TWO);
    el.selectedIds = ['z'];
    await flush(el);
    expect(attr(el, 'aria-selected')).toEqual(['false', 'false']);

    children(el)[1].setAttribute('item-id', 'z');
    await flush(el);
    expect(attr(el, 'aria-selected')).toEqual(['false', 'true']);
  });

  it('stops watching the children once disconnected, and resumes on reconnect', async () => {
    const el = await mount('selectable="single"', TWO);
    el.remove();
    // An attribute change fires no slotchange, so only the observer could see it.
    children(el)[0].setAttribute('disabled', '');
    await flush(el);
    expect(attr(el, 'tabindex')).toEqual(['0', '-1']);

    document.body.appendChild(el);
    await flush(el);
    children(el)[1].setAttribute('item-id', 'q');
    await flush(el);
    expect(attr(el, 'tabindex')).toEqual(['-1', '0']);
  });
});

describe('mp-timeline declarative — container changes re-project onto children', () => {
  it('upgrades listitems to options when selection is switched on after mount', async () => {
    const el = await mount('', TWO);
    expect(attr(el, 'role')).toEqual(['listitem', 'listitem']);

    el.selectable = 'multiple';
    await flush(el);
    expect(attr(el, 'role')).toEqual(['option', 'option']);
    expect(attr(el, 'aria-selected')).toEqual(['false', 'false']);
  });

  it('re-sides and re-orients the children after mount', async () => {
    const el = await mount('', TWO);
    el.align = 'alternate';
    el.orientation = 'horizontal';
    el.reverse = true;
    await flush(el);
    expect(attr(el, 'orientation')).toEqual(['horizontal', 'horizontal']);
    expect(attr(el, 'last')).toEqual(['', null]);
    expect(new Set(attr(el, 'side'))).toEqual(new Set(['start', 'end']));
  });

  it('seeds the selection from authored selected attributes only once', async () => {
    const el = await mount(
      'selectable="multiple"',
      `<mp-timeline-item item-id="a" selected></mp-timeline-item>
       <mp-timeline-item item-id="b"></mp-timeline-item>`,
    );
    expect(el.selectedIds).toEqual(['a']);

    // A later child authored as selected is not a selection write.
    const late = addItem(el, 'c');
    late.setAttribute('selected', '');
    await flush(el);
    expect(el.selectedIds).toEqual(['a']);
  });
});

describe('mp-timeline declarative — activatable children are buttons with a tab stop', () => {
  it('makes slotted children buttons with exactly one tab stop', async () => {
    const el = await mount('activatable', TWO);
    expect(attr(el, 'role')).toEqual(['button', 'button']);
    expect(attr(el, 'tabindex')).toEqual(['0', '-1']);
    expect(children(el).some((c) => c.hasAttribute('aria-selected'))).toBe(false);
  });

  it('reports Enter on a slotted child as an item-click built from its attributes', async () => {
    const el = await mount('activatable', TWO);
    const seen: TimelineItemClickDetail[] = [];
    el.addEventListener('item-click', (e) => seen.push((e as CustomEvent<TimelineItemClickDetail>).detail));
    key(children(el)[1], 'Enter');
    expect(seen.map((d) => [d.item.id, d.item.title, d.index])).toEqual([['b', 'Beta', 1]]);
  });

  it('roves between slotted children with the arrows', async () => {
    const el = await mount('activatable', TWO);
    key(children(el)[0], 'ArrowDown');
    await flush(el);
    expect(attr(el, 'tabindex')).toEqual(['-1', '0']);
    expect(document.activeElement).toBe(children(el)[1]);
  });

  it('drops the tab stops when activatable is switched off', async () => {
    const el = await mount('activatable', TWO);
    el.activatable = false;
    await flush(el);
    expect(attr(el, 'role')).toEqual(['listitem', 'listitem']);
    expect(children(el).some((c) => c.hasAttribute('tabindex'))).toBe(false);
  });
});

describe('mp-timeline declarative — a click moves the tab stop with the selection', () => {
  it('parks tabindex="0" on the clicked option', async () => {
    const el = await mount('selectable="single"', TWO);
    children(el)[1].click();
    await flush(el);
    expect(attr(el, 'aria-selected')).toEqual(['false', 'true']);
    expect(attr(el, 'tabindex')).toEqual(['-1', '0']);
  });
});
