import { afterEach, describe, expect, it } from 'vitest';
import type { TrendHoverEventDetail, TrendPointEventDetail, TrendSeries } from '@mintplayer/ui-core/charts/trend';
import './index';
import type { MpTrendChart } from './index';

/**
 * `<mp-trend-chart>` is generated from @mintplayer/ui-core/charts/trend (#437)
 * and renders its SVG in the light DOM. These specs pin the parts a stylesheet
 * cannot carry: SVG namespace, names, the roving tab stop and the events.
 */

const SERIES: TrendSeries[] = [
  { id: 'a', label: 'Alpha', points: [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 30 }] },
  { id: 'b', label: 'Beta', points: [{ x: 1, y: 5 }, { x: 2, y: null }, { x: 3, y: 15 }] },
];

const mounted: HTMLElement[] = [];
afterEach(() => mounted.splice(0).forEach((el) => el.remove()));

async function mount(patch: Partial<MpTrendChart> = {}, attrs: Record<string, string> = {}): Promise<MpTrendChart> {
  const el = document.createElement('mp-trend-chart') as MpTrendChart;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  Object.assign(el, { series: SERIES, ...patch });
  document.body.appendChild(el);
  mounted.push(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

const points = (el: Element) => [...el.querySelectorAll<SVGCircleElement>('circle.point')];
const keydown = (target: Element, key: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('mp-trend-chart', () => {
  it('renders SVG-namespaced children in the light DOM', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    const svg = el.querySelector('svg')!;
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(points(el)[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(el.querySelectorAll('path.series-line')).toHaveLength(2);
  });

  it('drops null points: one circle per present value', async () => {
    const el = await mount();
    expect(points(el)).toHaveLength(5);
  });

  it('names the chart from aria-label and describes it with the summary', async () => {
    const el = await mount({ summary: 'Up and to the right' } as Partial<MpTrendChart>, { 'aria-label': 'Coverage' });
    const svg = el.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('group');
    expect(svg.getAttribute('aria-label')).toBe('Coverage');
    const summary = el.querySelector(`#${svg.getAttribute('aria-describedby')}`);
    expect(summary?.textContent).toBe('Up and to the right');
  });

  it('falls back to inputLabel for the name', async () => {
    const el = await mount({ inputLabel: 'Fallback' } as Partial<MpTrendChart>);
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Fallback');
  });

  it('makes the points a roving set of named buttons once live', async () => {
    const el = await mount({ locale: 'en-US' } as Partial<MpTrendChart>);
    const ps = points(el);
    expect(ps.every((p) => p.getAttribute('role') === 'button')).toBe(true);
    expect(ps.map((p) => p.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1']);
    expect(ps[0].getAttribute('aria-label')).toBe('Alpha, 1, 10');
  });

  it('moves the tab stop within and across series', async () => {
    const el = await mount();
    keydown(points(el)[0], 'ArrowRight');
    await el.updateComplete;
    expect(points(el)[1].getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(points(el)[1]);

    keydown(points(el)[1], 'End');
    await el.updateComplete;
    expect(points(el)[2].getAttribute('tabindex')).toBe('0');

    // Beta has no point at x=3's neighbour x=2; ArrowDown lands on the nearest x (3).
    keydown(points(el)[2], 'ArrowDown');
    await el.updateComplete;
    expect(points(el)[4].getAttribute('tabindex')).toBe('0');

    keydown(points(el)[4], 'Home');
    await el.updateComplete;
    expect(points(el)[3].getAttribute('tabindex')).toBe('0');
  });

  it('emits pointselect on Enter and click', async () => {
    const el = await mount();
    const seen: TrendPointEventDetail[] = [];
    el.addEventListener('pointselect', (e) => seen.push((e as CustomEvent<TrendPointEventDetail>).detail));
    keydown(points(el)[1], 'Enter');
    points(el)[3].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen.map((d) => [d.seriesId, d.point.y])).toEqual([['a', 20], ['b', 5]]);
  });

  it('emits a null pointhover when the pointer leaves after hovering', async () => {
    const el = await mount();
    const seen: TrendHoverEventDetail[] = [];
    el.addEventListener('pointhover', (e) => seen.push((e as CustomEvent<TrendHoverEventDetail>).detail));
    el.dispatchEvent(new PointerEvent('pointerleave'));
    expect(seen).toEqual([]);
  });

  it('marks the goal line and its label', async () => {
    const el = await mount({ goal: 25, goalLabel: 'Goal' } as Partial<MpTrendChart>);
    expect(el.querySelector('line.goal-line')).not.toBeNull();
    expect(el.querySelector('text.goal-label')?.textContent).toBe('Goal');
  });

  it('omits the area paths when area is false', async () => {
    const el = await mount({ area: false } as Partial<MpTrendChart>);
    expect(el.querySelectorAll('path.series-area')).toHaveLength(0);
  });
});
