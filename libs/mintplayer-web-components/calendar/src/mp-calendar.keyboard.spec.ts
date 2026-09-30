import { afterEach, describe, expect, it } from 'vitest';
import './mp-calendar.element';
import type { MpCalendarElement } from './mp-calendar.element';

async function flush(el: MpCalendarElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(setup?: (el: MpCalendarElement) => void): Promise<MpCalendarElement> {
  const el = document.createElement('mp-calendar') as MpCalendarElement;
  el.currentMonth = new Date(2026, 4, 1);
  el.selectedDate = new Date(2026, 4, 15);
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const cell = (el: MpCalendarElement, y: number, m: number, d: number) =>
  el.shadowRoot!.querySelector<HTMLElement>(`td[id$="-cell-${y}-${m}-${d}"]`)!;
const focused = (el: MpCalendarElement) => el.shadowRoot!.activeElement?.id ?? '';

function key(target: HTMLElement, k: string, ctrlKey = false): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ctrlKey });
  target.dispatchEvent(ev);
  return ev;
}

describe('mp-calendar keyboard, remaining paths', () => {
  let el: MpCalendarElement;
  afterEach(() => el.remove());

  it('PageUp goes back one month; Ctrl+PageUp one year', async () => {
    el = await mount();
    key(cell(el, 2026, 4, 15), 'PageUp');
    await flush(el);
    expect(focused(el)).toMatch(/-cell-2026-3-15$/);
    expect(el.currentMonth?.getMonth()).toBe(3);

    key(cell(el, 2026, 3, 15), 'PageUp', true);
    await flush(el);
    expect(focused(el)).toMatch(/-cell-2025-3-15$/);
  });

  it('inverts ArrowLeft and ArrowRight under direction: rtl', async () => {
    el = await mount();
    el.style.direction = 'rtl';
    key(cell(el, 2026, 4, 15), 'ArrowLeft');
    await flush(el);
    expect(focused(el)).toMatch(/-cell-2026-4-16$/);
    key(cell(el, 2026, 4, 16), 'ArrowRight');
    await flush(el);
    expect(focused(el)).toMatch(/-cell-2026-4-15$/);
  });

  it('Enter and Space select the focused day', async () => {
    el = await mount();
    const picked: Date[] = [];
    el.addEventListener('selected-date-change', (e) => picked.push((e as CustomEvent<Date>).detail));
    expect(key(cell(el, 2026, 4, 20), 'Enter').defaultPrevented).toBe(true);
    key(cell(el, 2026, 4, 21), ' ');
    expect(picked).toEqual([new Date(2026, 4, 20), new Date(2026, 4, 21)]);
  });

  it('leaves other keys to the browser', async () => {
    el = await mount();
    expect(key(cell(el, 2026, 4, 15), 'Tab').defaultPrevented).toBe(false);
  });
});
