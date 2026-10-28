import { afterEach, describe, expect, it } from 'vitest';
import { MpMultiRange } from './generated';

void MpMultiRange; // force the side-effect registration

/**
 * The Lit multi-range front (#437): light DOM, rendered from the template
 * compiled out of `@mintplayer/ui-core/multi-range`. The core's spec covers the
 * bags and the math; this file pins the element: native range inputs that
 * report, hold their neighbours apart and follow a written value.
 */

async function settle(el: MpMultiRange): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function mount(markup: string): Promise<MpMultiRange> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const el = host.querySelector('mp-multi-range') as MpMultiRange;
  await settle(el);
  return el;
}

const thumbs = (el: MpMultiRange) => [...el.querySelectorAll<HTMLInputElement>('input.multi-range-thumb')];

function slide(input: HTMLInputElement, value: number): void {
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-multi-range', () => {
  it('renders one named range input per thumb in the light DOM, [min, max] by default', async () => {
    const el = await mount('<mp-multi-range name="price" min="0" max="50"></mp-multi-range>');
    expect(el.shadowRoot).toBeNull();
    expect(thumbs(el).map((t) => [t.type, t.name, t.value])).toEqual([
      ['range', 'price', '0'],
      ['range', 'price', '50'],
    ]);
    expect(el.getAttribute('role')).toBe('group');
    expect(el.querySelectorAll('.multi-range-fill')).toHaveLength(1);
  });

  it('reports valueinput while a thumb moves and valuechange on commit', async () => {
    const el = await mount('<mp-multi-range></mp-multi-range>');
    el.value = [20, 80];
    await settle(el);
    const seen: Array<[string, number[]]> = [];
    el.addEventListener('valueinput', (e) => seen.push(['input', (e as CustomEvent<number[]>).detail]));
    el.addEventListener('valuechange', (e) => seen.push(['change', (e as CustomEvent<number[]>).detail]));
    slide(thumbs(el)[1], 60);
    thumbs(el)[1].dispatchEvent(new Event('change', { bubbles: true }));
    await settle(el);
    expect(seen).toEqual([
      ['input', [20, 60]],
      ['change', [20, 60]],
    ]);
    expect(el.value).toEqual([20, 60]);
    expect(el.getValues()).toEqual([20, 60]);
  });

  it('stops a thumb at its neighbour, minDistance apart', async () => {
    const el = await mount('<mp-multi-range min-distance="5"></mp-multi-range>');
    el.value = [20, 80];
    await settle(el);
    slide(thumbs(el)[0], 95);
    await settle(el);
    expect(el.value).toEqual([75, 80]);
    expect(thumbs(el)[0].value).toBe('75');
  });

  it('follows a written value, sorted and clamped, without reporting it', async () => {
    const el = await mount('<mp-multi-range></mp-multi-range>');
    let reported = 0;
    el.addEventListener('valuechange', () => reported++);
    el.value = [90, 150, 10];
    await settle(el);
    expect(thumbs(el).map((t) => t.value)).toEqual(['10', '90', '100']);
    expect(reported).toBe(0);
  });

  it('disables every thumb', async () => {
    const el = await mount('<mp-multi-range disabled></mp-multi-range>');
    expect(thumbs(el).every((t) => t.disabled)).toBe(true);
  });

  it('reflects the vertical orientation onto the group and the thumbs', async () => {
    const el = await mount('<mp-multi-range orientation="vertical"></mp-multi-range>');
    expect(el.classList.contains('mp-multi-range-vertical')).toBe(true);
    expect(thumbs(el)[0].getAttribute('aria-orientation')).toBe('vertical');
  });
});
