import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-trend-chart';
import type { MpTrendChart } from './mp-trend-chart';
import type { TrendSeries } from '@mintplayer/web-components/charts/core';

/**
 * What the configuration attributes and properties DO to the rendered chart:
 * area/stacked/domain/goal/locale/summary, plus the keyboard and pointer
 * edges the ARIA spec leaves out. No layout box is faked: jsdom's zero rect
 * is exercised as the "not laid out yet" case it really is.
 */
const day = (d: number) => new Date(2026, 0, d);
const SERIES: TrendSeries[] = [
  { id: 'a', label: 'Alpha', points: [{ x: day(1), y: 70 }, { x: day(8), y: 72 }, { x: day(22), y: 80 }] },
  { id: 'b', label: 'Beta', points: [{ x: day(1), y: 75 }, { x: day(8), y: 75 }, { x: day(22), y: 75 }] },
];

async function flush(el: MpTrendChart): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function mount(attrs = '', series: TrendSeries[] = SERIES, wrapper = ''): Promise<MpTrendChart> {
  const tag = `<mp-trend-chart ${attrs}></mp-trend-chart>`;
  document.body.innerHTML = wrapper ? `<div ${wrapper}>${tag}</div>` : tag;
  const el = document.querySelector('mp-trend-chart') as MpTrendChart;
  el.series = series;
  await flush(el);
  return el;
}

const $$ = (el: MpTrendChart, sel: string) => Array.from(el.shadowRoot!.querySelectorAll(sel));
const yLabels = (el: MpTrendChart) => $$(el, '.y-label').map((t) => t.textContent);
const labels = (el: MpTrendChart) => $$(el, '.point').map((p) => p.getAttribute('aria-label'));
const focused = (el: MpTrendChart) => $$(el, '.point').find((p) => p.getAttribute('tabindex') === '0')!;

function press(target: Element, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('mp-trend-chart configuration', () => {
  it('fills an area under each series by default; area="false" draws lines only', async () => {
    const el = await mount('locale="en-US"');
    expect(el.area).toBe(true);
    expect($$(el, '.series-area')).toHaveLength(2);
    el.setAttribute('area', 'false');
    await flush(el);
    expect(el.area).toBe(false);
    expect($$(el, '.series-area')).toHaveLength(0);
    expect($$(el, '.series-line')).toHaveLength(2);
    el.setAttribute('area', '');
    await flush(el);
    expect($$(el, '.series-area')).toHaveLength(2);
  });

  it('stacked plots the running sum per x, so the domain grows to hold it', async () => {
    const flat = await mount('locale="en-US"');
    const flatMax = Math.max(...yLabels(flat).map(Number));
    expect(flatMax).toBeLessThan(100);

    const el = await mount('locale="en-US" stacked');
    expect(el.stacked).toBe(true);
    expect(Math.max(...yLabels(el).map(Number))).toBeGreaterThanOrEqual(155);
    // A stacked chart always includes zero.
    expect(yLabels(el)).toContain('0');
    // Point names still speak the raw value, never the stacked sum.
    expect(labels(el)).toContain('Beta, Jan 1, 2026, 75');

    el.setAttribute('stacked', 'false');
    await flush(el);
    expect(el.stacked).toBe(false);
  });

  it('y-min / y-max pin the value domain; removing them returns to the auto domain', async () => {
    const el = await mount('locale="en-US" y-min="0" y-max="200"');
    expect(el.yMin).toBe(0);
    expect(el.yMax).toBe(200);
    expect(yLabels(el)[0]).toBe('0');
    expect(yLabels(el).at(-1)).toBe('200');

    el.removeAttribute('y-min');
    el.removeAttribute('y-max');
    await flush(el);
    expect(el.yMin).toBeUndefined();
    expect(el.yMax).toBeUndefined();
    expect(yLabels(el)).not.toContain('200');
  });

  it('a goal extends the domain to stay visible; the label is optional', async () => {
    const el = await mount('locale="en-US" goal="150"');
    expect(el.goal).toBe(150);
    expect($$(el, '.goal-line')).toHaveLength(1);
    expect($$(el, '.goal-label')).toHaveLength(0);
    expect(Math.max(...yLabels(el).map(Number))).toBeGreaterThanOrEqual(150);

    el.goalLabel = 'Target';
    await flush(el);
    expect($$(el, '.goal-label')[0].textContent).toBe('Target');

    el.removeAttribute('goal');
    await flush(el);
    expect(el.goal).toBeUndefined();
    expect($$(el, '.goal-line')).toHaveLength(0);
  });

  it('the locale attribute formats values and dates; numeric x values are spoken as numbers', async () => {
    const series: TrendSeries[] = [{ id: 'n', label: 'Load', points: [{ x: 3, y: 1234.5 }, { x: 4, y: 2 }] }];
    const el = await mount('locale="de-DE"', series);
    expect(el.locale).toBe('de-DE');
    expect(labels(el)[0]).toBe('Load, 3, 1.234,5');
  });

  it('without a locale it falls back to the nearest [lang] ancestor', async () => {
    const series: TrendSeries[] = [{ id: 'n', label: 'Load', points: [{ x: 3, y: 1234.5 }] }];
    const el = await mount('', series, 'lang="de-DE"');
    expect(el.locale).toBeUndefined();
    expect(labels(el)[0]).toBe('Load, 3, 1.234,5');
  });

  it('summaryFormatter wins over the summary attribute, and an empty summary drops the describedby', async () => {
    const el = await mount('locale="en-US" summary="static"');
    expect(el.summary).toBe('static');
    el.summaryFormatter = (s) => `${s.length} series`;
    await flush(el);
    expect(el.shadowRoot!.getElementById('trend-summary')!.textContent).toBe('2 series');

    el.summaryFormatter = undefined;
    el.summary = '';
    await flush(el);
    expect(el.shadowRoot!.getElementById('trend-summary')).toBeNull();
    expect(el.shadowRoot!.querySelector('svg')!.hasAttribute('aria-describedby')).toBe(false);
  });

  it('input-label names the group when no aria-label is set, from attribute or property', async () => {
    const el = await mount('locale="en-US" input-label="Weekly"');
    expect(el.inputLabel).toBe('Weekly');
    expect(el.shadowRoot!.querySelector('svg')!.getAttribute('aria-label')).toBe('Weekly');
    el.inputLabel = null;
    await flush(el);
    expect(el.shadowRoot!.querySelector('svg')!.hasAttribute('aria-label')).toBe(false);
  });

  it('a non-array series renders an empty chart with no focus stop', async () => {
    const el = await mount('locale="en-US"');
    el.series = null as unknown as TrendSeries[];
    await flush(el);
    expect(el.series).toEqual([]);
    expect($$(el, '.point')).toHaveLength(0);
  });

  it('a series colour overrides the palette', async () => {
    const el = await mount('locale="en-US"', [{ ...SERIES[0], color: 'rebeccapurple' }]);
    expect($$(el, '.series-line')[0].getAttribute('stroke')).toBe('rebeccapurple');
  });
});

describe('mp-trend-chart keyboard edges', () => {
  it('ArrowLeft walks back, and stops at the first point', async () => {
    const el = await mount('locale="en-US"');
    press(focused(el), 'End');
    await flush(el);
    press(focused(el), 'ArrowLeft');
    await flush(el);
    expect(focused(el).getAttribute('aria-label')).toContain('Jan 8');
    press(focused(el), 'Home');
    await flush(el);
    const ev = press(focused(el), 'ArrowLeft');
    await flush(el);
    expect(ev.defaultPrevented).toBe(true);
    expect(focused(el).getAttribute('aria-label')).toContain('Jan 1');
  });

  it('ArrowUp on the first series wraps to the last series', async () => {
    const el = await mount('locale="en-US"');
    press(focused(el), 'ArrowUp');
    await flush(el);
    expect(focused(el).getAttribute('aria-label')).toBe('Beta, Jan 1, 2026, 75');
  });

  it('Space selects; unmapped keys and keys outside a point pass through', async () => {
    const el = await mount('locale="en-US"');
    const selected = vi.fn();
    el.addEventListener('trend-point-select', selected);
    press(focused(el), ' ');
    expect(selected).toHaveBeenCalledTimes(1);
    expect(press(focused(el), 'x').defaultPrevented).toBe(false);
    expect(press(el.shadowRoot!.querySelector('svg')!, 'ArrowRight').defaultPrevented).toBe(false);
  });

  it('a click that lands on no point selects nothing', async () => {
    const el = await mount('locale="en-US"');
    const selected = vi.fn();
    el.addEventListener('trend-point-select', selected);
    el.shadowRoot!.querySelector('svg')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).not.toHaveBeenCalled();
  });
});

describe('mp-trend-chart pointer edges', () => {
  it('a chart with no layout box yet reports no hover', async () => {
    const el = await mount('locale="en-US"');
    const hover = vi.fn();
    el.addEventListener('trend-point-hover', hover);
    const chart = el.shadowRoot!.querySelector('.chart')!;
    chart.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }));
    chart.dispatchEvent(new PointerEvent('pointerleave'));
    expect(hover).not.toHaveBeenCalled();
    expect(el.shadowRoot!.querySelector('.chart-tooltip')!.hasAttribute('data-visible')).toBe(false);
  });

  it('an empty chart ignores pointer movement', async () => {
    const el = await mount('locale="en-US"', []);
    const hover = vi.fn();
    el.addEventListener('trend-point-hover', hover);
    el.shadowRoot!.querySelector('.chart')!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(hover).not.toHaveBeenCalled();
  });
});
