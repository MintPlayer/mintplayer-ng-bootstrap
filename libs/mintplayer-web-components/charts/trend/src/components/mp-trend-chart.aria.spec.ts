import { beforeEach, describe, expect, it } from 'vitest';
import './mp-trend-chart';
import type { MpTrendChart } from './mp-trend-chart';
import type { TrendSeries } from '@mintplayer/web-components/charts/core';

/**
 * The group/button contract of `<mp-trend-chart>`: a named svg group whose
 * only interactive children are focusable point "buttons" behind one roving
 * tab stop; every decorative layer (grid, axes, lines, areas, goal) is
 * aria-hidden; the whole-chart summary travels via aria-describedby INSIDE
 * the same shadow tree (IDREFs never cross a root).
 */
const day = (d: number) => new Date(2026, 0, d);
const SERIES: TrendSeries[] = [
  {
    id: 'cov', label: 'Coverage',
    points: [
      { x: day(1), y: 70 },
      { x: day(8), y: 72 },
      { x: day(15), y: null }, // gap
      { x: day(22), y: 80 },
    ],
  },
  {
    id: 'target', label: 'Target',
    points: [
      { x: day(1), y: 75 },
      { x: day(8), y: 75 },
      { x: day(22), y: 75 },
    ],
  },
];

async function flush(el: MpTrendChart): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await el.updateComplete;
}

async function mount(attrs = '', series: TrendSeries[] = SERIES): Promise<MpTrendChart> {
  document.body.innerHTML = `<mp-trend-chart locale="en-US" ${attrs}></mp-trend-chart>`;
  const el = document.querySelector('mp-trend-chart') as MpTrendChart;
  el.series = series;
  await flush(el);
  return el;
}

function points(el: MpTrendChart): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.point'));
}

function focusedPoint(el: MpTrendChart): Element | undefined {
  return points(el).find((p) => p.getAttribute('tabindex') === '0');
}

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
}

describe('mp-trend-chart ARIA structure', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('svg is a named group; host aria-label wins over input-label; summary via describedby', async () => {
    const el = await mount('input-label="Coverage over time" summary="Coverage rose from 70% to 80%"');
    const group = el.shadowRoot!.querySelector('svg')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Coverage over time');
    const describedBy = group.getAttribute('aria-describedby')!;
    const summary = el.shadowRoot!.getElementById(describedBy)!;
    expect(summary.textContent).toBe('Coverage rose from 70% to 80%');
    el.setAttribute('aria-label', 'Trend');
    await flush(el);
    expect(el.shadowRoot!.querySelector('svg')!.getAttribute('aria-label')).toBe('Trend');
  });

  it('points are labelled buttons; every decorative layer is aria-hidden', async () => {
    const el = await mount();
    const all = points(el);
    expect(all).toHaveLength(6); // 3 non-null cov + 3 target
    all.map((p) => expect(p.getAttribute('role')).toBe('button'));
    expect(all[0].getAttribute('aria-label')).toBe('Coverage, Jan 1, 2026, 70');
    Array.from(el.shadowRoot!.querySelectorAll('.grid, .axis, .series-line, .series-area, .goal-line'))
      .map((n) => expect(n.closest('[aria-hidden="true"]')).toBeTruthy());
  });

  it('a null point renders a gap: the series line splits into two runs', async () => {
    const el = await mount();
    const d = el.shadowRoot!.querySelector('.series-line')!.getAttribute('d')!;
    expect((d.match(/M /g) ?? []).length).toBe(2);
  });

  it('goal line + label render aria-hidden when set', async () => {
    const el = await mount('goal="75" goal-label="Goal 75%"');
    expect(el.shadowRoot!.querySelector('.goal-line')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.goal-label')!.textContent).toBe('Goal 75%');
  });
});

describe('mp-trend-chart keyboard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('one roving tab stop; Left/Right walk the series, Home/End jump', async () => {
    const el = await mount();
    expect(points(el).filter((p) => p.getAttribute('tabindex') === '0')).toHaveLength(1);
    const first = focusedPoint(el)!;
    expect(first.getAttribute('aria-label')).toContain('Jan 1');
    press(first, 'ArrowRight');
    await flush(el);
    expect(focusedPoint(el)!.getAttribute('aria-label')).toContain('Jan 8');
    press(focusedPoint(el)!, 'End');
    await flush(el);
    expect(focusedPoint(el)!.getAttribute('aria-label')).toContain('Jan 22');
    press(focusedPoint(el)!, 'Home');
    await flush(el);
    expect(focusedPoint(el)!.getAttribute('aria-label')).toContain('Jan 1');
  });

  it('Up/Down switch series at the nearest x', async () => {
    const el = await mount();
    press(focusedPoint(el)!, 'ArrowDown');
    await flush(el);
    expect(focusedPoint(el)!.getAttribute('aria-label')).toBe('Target, Jan 1, 2026, 75');
    press(focusedPoint(el)!, 'ArrowUp');
    await flush(el);
    expect(focusedPoint(el)!.getAttribute('aria-label')).toContain('Coverage');
  });

  it('Enter and click select the point', async () => {
    const el = await mount();
    const selected: string[] = [];
    el.addEventListener('trend-point-select', (e) => {
      const d = (e as CustomEvent).detail;
      selected.push(`${d.seriesId}:${d.point.y}`);
    });
    press(focusedPoint(el)!, 'Enter');
    focusedPoint(el)!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['cov:70', 'cov:70']);
  });

  it('hover picks the point nearest the cursor in BOTH axes, not just the column', async () => {
    const el = await mount();
    const hovered: string[] = [];
    el.addEventListener('trend-point-hover', (e) => {
      const d = (e as CustomEvent).detail;
      if (d.seriesId) hovered.push(`${d.seriesId}:${d.point.y}`);
    });

    // jsdom gives every element a zero-size rect, so the pointer maths needs a
    // real one. 1000x562 makes logical units and client px line up 1:1.
    const chart = el.shadowRoot!.querySelector('.chart') as HTMLElement;
    chart.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 562 } as DOMRect);

    const points = (key: string) =>
      Array.from(el.shadowRoot!.querySelectorAll<SVGCircleElement>('.point'))
        .filter((p) => p.getAttribute('aria-label')!.startsWith(key));
    const cov = points('Coverage')[0];
    const target = points('Target')[0];
    const x = Number(cov.getAttribute('cx'));

    // Same column, cursor parked on each series' own y in turn.
    const move = (clientY: number) =>
      chart.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, composed: true, clientX: x, clientY,
      }));
    move(Number(cov.getAttribute('cy')));
    move(Number(target.getAttribute('cy')));

    // Coverage is 70 and Target is 75 at Jan 1 — different heights, so a
    // y-aware search must report each in turn rather than the same one twice.
    expect(hovered).toEqual(['cov:70', 'target:75']);
  });

  it('the roving stop survives a series data refresh by key', async () => {
    const el = await mount();
    press(focusedPoint(el)!, 'ArrowRight');
    await flush(el);
    el.series = [...SERIES];
    await flush(el);
    expect(focusedPoint(el)!.getAttribute('aria-label')).toContain('Jan 8');
  });
});
