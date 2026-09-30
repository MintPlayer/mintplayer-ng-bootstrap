import { describe, it, expect, afterEach } from 'vitest';
import { MpTabControl, type TabActivateEventDetail } from './mp-tab-control';
import { MpTabPage } from './mp-tab-page';

void MpTabControl;
void MpTabPage;

async function flush(el: HTMLElement & { updateComplete: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

interface TabSpec {
  id: string;
  disabled?: boolean;
  hidden?: string;
}

function makeTabs(tabs: TabSpec[], attrs: Record<string, string> = {}): MpTabControl {
  const el = document.createElement('mp-tab-control') as MpTabControl;
  Object.entries(attrs).map(([k, v]) => el.setAttribute(k, v));
  el.append(
    ...tabs.flatMap((t) => {
      const header = document.createElement('span');
      header.setAttribute('slot', `${t.id}-header`);
      header.textContent = t.id;
      const content = document.createElement('div');
      content.setAttribute('slot', `${t.id}-content`);
      if (t.disabled) content.setAttribute('data-disabled', '');
      if (t.hidden !== undefined) content.setAttribute('data-hidden', t.hidden);
      return [header, content];
    }),
  );
  document.body.appendChild(el);
  return el;
}

const buttons = (el: MpTabControl): HTMLButtonElement[] =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button[role="tab"]'));
const button = (el: MpTabControl, id: string): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`button[id="${id}-header-button"]`)!;
const panel = (el: MpTabControl): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>('.tab-content')!;

function recordActivations(el: MpTabControl): string[] {
  const seen: string[] = [];
  el.addEventListener('tab-activate', (e) =>
    seen.push((e as CustomEvent<TabActivateEventDetail>).detail.tabId),
  );
  return seen;
}

function key(target: HTMLElement, k: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
}

describe('mp-tab-control behaviour', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('selects the first enabled tab when no active-tab is given', async () => {
    const el = makeTabs([{ id: 'a', disabled: true }, { id: 'b' }, { id: 'c' }]);
    await flush(el);
    expect(button(el, 'b').getAttribute('aria-selected')).toBe('true');
    expect(panel(el).querySelector('slot')!.getAttribute('name')).toBe('b-content');
  });

  it('falls back to the first enabled tab when active-tab names a disabled tab', async () => {
    const el = makeTabs([{ id: 'a' }, { id: 'b', disabled: true }], { 'active-tab': 'b' });
    await flush(el);
    expect(button(el, 'a').getAttribute('aria-selected')).toBe('true');
    expect(button(el, 'b').disabled).toBe(true);
    expect(button(el, 'b').classList.contains('disabled')).toBe(true);
  });

  it('shows no panel when every tab is disabled', async () => {
    const el = makeTabs([{ id: 'a', disabled: true }]);
    await flush(el);
    expect(panel(el).hasAttribute('role')).toBe(false);
    expect(panel(el).querySelector('slot')!.getAttribute('name')).toBe('__none__');
  });

  it('treats data-disabled="false" as enabled', async () => {
    const el = makeTabs([{ id: 'a' }]);
    el.querySelector('[slot="a-content"]')!.setAttribute('data-disabled', 'false');
    await flush(el);
    expect(button(el, 'a').disabled).toBe(false);
  });

  it('excludes data-hidden tabs from the strip, but not data-hidden="false"', async () => {
    const el = makeTabs([{ id: 'a', hidden: '' }, { id: 'b', hidden: 'false' }, { id: 'c' }]);
    await flush(el);
    expect(buttons(el).map((b) => b.id)).toEqual(['b-header-button', 'c-header-button']);
  });

  it('ignores children without a *-content slot and keeps the first of duplicate slots', async () => {
    const el = makeTabs([{ id: 'a' }]);
    const stray = document.createElement('div');
    const dup = document.createElement('div');
    dup.setAttribute('slot', 'a-content');
    dup.setAttribute('data-disabled', '');
    el.append(stray, dup);
    await flush(el);
    expect(buttons(el).map((b) => b.id)).toEqual(['a-header-button']);
    expect(button(el, 'a').disabled).toBe(false);
  });

  it('picks up a tab added after connection through the mutation observer', async () => {
    const el = makeTabs([{ id: 'a' }]);
    await flush(el);
    const content = document.createElement('div');
    content.setAttribute('slot', 'b-content');
    el.appendChild(content);
    await new Promise((r) => setTimeout(r, 0));
    await flush(el);
    expect(buttons(el).map((b) => b.id)).toEqual(['a-header-button', 'b-header-button']);
  });

  it('stops observing children once disconnected', async () => {
    const el = makeTabs([{ id: 'a' }]);
    await flush(el);
    el.remove();
    const content = document.createElement('div');
    content.setAttribute('slot', 'b-content');
    el.appendChild(content);
    await new Promise((r) => setTimeout(r, 0));
    await flush(el);
    expect(buttons(el).map((b) => b.id)).toEqual(['a-header-button']);
  });

  it.each([
    [null, true, 'border'],
    [null, false, 'border-top'],
    ['false', true, null],
    ['top', true, 'border-top'],
    ['yes', true, 'border'],
  ])('border=%s (active=%s) renders the %s class', async (attr, active, cls) => {
    const el = makeTabs(
      [{ id: 'a' }],
      {
        ...(attr === null ? {} : { border: attr }),
        ...(active ? {} : { 'select-first-tab': 'false' }),
      },
    );
    await flush(el);
    const classes = Array.from(panel(el).classList);
    expect(classes.filter((c) => c.startsWith('border'))).toEqual(cls ? [cls] : []);
  });

  it('renders the strip after the content with tabs-position="bottom"', async () => {
    const el = makeTabs([{ id: 'a' }], { 'tabs-position': 'bottom' });
    await flush(el);
    const kids = Array.from(el.shadowRoot!.children).filter((n) => n.tagName !== 'STYLE');
    expect(kids.map((k) => k.className.split(' ')[0])).toEqual(['tab-content', 'tsc']);
    expect(el.shadowRoot!.querySelector('.tsc')!.classList.contains('bottom-tabs')).toBe(true);
  });

  it('select-first-tab="true" still auto-selects', async () => {
    const el = makeTabs([{ id: 'a' }], { 'select-first-tab': 'true' });
    await flush(el);
    expect(button(el, 'a').getAttribute('aria-selected')).toBe('true');
  });

  it('clicking a tab emits tab-activate and makes it active', async () => {
    const el = makeTabs([{ id: 'a' }, { id: 'b' }]);
    await flush(el);
    const seen = recordActivations(el);
    button(el, 'b').click();
    await flush(el);
    expect(seen).toEqual(['b']);
    expect(el.getAttribute('active-tab')).toBe('b');
    expect(button(el, 'b').tabIndex).toBe(0);
    expect(button(el, 'a').tabIndex).toBe(-1);
  });

  it('a disabled tab ignores activation keys and emits nothing', async () => {
    const el = makeTabs([{ id: 'a' }, { id: 'b', disabled: true }]);
    await flush(el);
    const seen = recordActivations(el);
    const ev = key(button(el, 'b'), 'Enter');
    expect(seen).toEqual([]);
    expect(ev.defaultPrevented).toBe(false);
  });

  it.each(['Enter', ' '])('%j activates the focused tab', async (k) => {
    const el = makeTabs([{ id: 'a' }, { id: 'b' }]);
    await flush(el);
    const seen = recordActivations(el);
    const ev = key(button(el, 'b'), k);
    expect(ev.defaultPrevented).toBe(true);
    expect(seen).toEqual(['b']);
  });

  it.each([
    ['ArrowRight', 'a', 'c'],
    ['ArrowLeft', 'a', 'd'],
    ['ArrowRight', 'd', 'a'],
    ['Home', 'd', 'a'],
    ['End', 'a', 'd'],
  ])('%s from %s moves focus and activation to %s, skipping disabled tabs', async (k, from, to) => {
    const el = makeTabs([{ id: 'a' }, { id: 'b', disabled: true }, { id: 'c' }, { id: 'd' }]);
    await flush(el);
    const seen = recordActivations(el);
    const ev = key(button(el, from), k);
    await flush(el);
    expect(ev.defaultPrevented).toBe(true);
    expect(seen).toEqual([to]);
    expect(el.getAttribute('active-tab')).toBe(to);
    expect(el.shadowRoot!.activeElement).toBe(button(el, to));
  });

  it.each([{ altKey: true }, { ctrlKey: true }, { metaKey: true }])(
    'modified arrow keys pass through to the browser (%o)',
    async (mods) => {
      const el = makeTabs([{ id: 'a' }, { id: 'b' }]);
      await flush(el);
      const seen = recordActivations(el);
      const ev = key(button(el, 'a'), 'ArrowRight', mods);
      expect(ev.defaultPrevented).toBe(false);
      expect(seen).toEqual([]);
    },
  );

  it('unhandled keys are left alone', async () => {
    const el = makeTabs([{ id: 'a' }]);
    await flush(el);
    expect(key(button(el, 'a'), 'x').defaultPrevented).toBe(false);
  });

  it('navigation keys on a tab that became disabled with no enabled peers do nothing', async () => {
    const el = makeTabs([{ id: 'a', disabled: true }]);
    await flush(el);
    const seen = recordActivations(el);
    expect(key(button(el, 'a'), 'Home').defaultPrevented).toBe(true);
    expect(key(button(el, 'a'), 'ArrowRight').defaultPrevented).toBe(true);
    expect(seen).toEqual([]);
  });
});

describe('mp-tab-page', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const page = (attrs: Record<string, string> = {}): MpTabPage => {
    const el = document.createElement('mp-tab-page') as MpTabPage;
    Object.entries(attrs).map(([k, v]) => el.setAttribute(k, v));
    document.body.appendChild(el);
    return el;
  };

  it('derives slot from tab-id on connect and on change', () => {
    const el = page({ 'tab-id': 't1' });
    expect(el.getAttribute('slot')).toBe('t1-content');
    el.setAttribute('tab-id', 't2');
    expect(el.getAttribute('slot')).toBe('t2-content');
  });

  it('removes the slot when tab-id is removed', () => {
    const el = page({ 'tab-id': 't1' });
    el.removeAttribute('tab-id');
    expect(el.hasAttribute('slot')).toBe(false);
  });

  it('mirrors disabled to data-disabled both ways', () => {
    const el = page({ 'tab-id': 't1', disabled: '' });
    expect(el.hasAttribute('data-disabled')).toBe(true);
    el.removeAttribute('disabled');
    expect(el.hasAttribute('data-disabled')).toBe(false);
    el.setAttribute('disabled', '');
    expect(el.hasAttribute('data-disabled')).toBe(true);
  });

  it('projects its children through a default slot', async () => {
    const el = page({ 'tab-id': 't1' });
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('slot:not([name])')).not.toBeNull();
  });

  it('shows up as a tab inside mp-tab-control, disabled when marked so', async () => {
    const tc = document.createElement('mp-tab-control') as MpTabControl;
    const p1 = document.createElement('mp-tab-page');
    p1.setAttribute('tab-id', 'one');
    const p2 = document.createElement('mp-tab-page');
    p2.setAttribute('tab-id', 'two');
    p2.setAttribute('disabled', '');
    tc.append(p1, p2);
    document.body.appendChild(tc);
    await new Promise((r) => setTimeout(r, 0));
    await flush(tc);
    expect(buttons(tc).map((b) => [b.id, b.disabled])).toEqual([
      ['one-header-button', false],
      ['two-header-button', true],
    ]);
  });
});
