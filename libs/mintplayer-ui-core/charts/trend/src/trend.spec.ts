import { describe, expect, it } from 'vitest';
import { connectTrendChart, layoutTrend, pointKey, TREND_H } from './trend';
import type { TrendSeries } from '@mintplayer/ui-core/charts/core';

const SERIES: TrendSeries[] = [
  { id: 'a', label: 'Alpha', points: [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 30 }] },
  { id: 'b', label: 'Beta', points: [{ x: 1, y: 5 }, { x: 2, y: null }, { x: 3, y: 15 }] },
];

const base = { series: SERIES, id: 'tc', live: true, focusedKey: null, hoveredKey: null, tooltip: null, locale: 'en-US' };

describe('layoutTrend', () => {
  it('drops gaps and keeps source indexes', () => {
    const { placed } = layoutTrend({ series: SERIES });
    expect(placed.map(pointKey)).toEqual(['0:a', '1:a', '2:a', '0:b', '2:b']);
  });

  it('stacks on the running sum per x', () => {
    const { placed } = layoutTrend({ series: SERIES, stacked: true });
    expect(placed.filter((p) => p.seriesId === 'b').map((p) => p.yPlot)).toEqual([15, 45]);
  });

  it('honours explicit y bounds', () => {
    const { yd } = layoutTrend({ series: SERIES, yMin: 0, yMax: 100 });
    expect(yd).toEqual([0, 100]);
  });

  it('plots higher values higher up', () => {
    const { placed } = layoutTrend({ series: SERIES });
    expect(placed[2].py).toBeLessThan(placed[0].py);
    expect(placed[0].py).toBeLessThanOrEqual(TREND_H);
  });
});

describe('connectTrendChart', () => {
  it('breaks the line at a gap', () => {
    const view = connectTrendChart(base);
    const d = String(view.series[1].line['d']);
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it('gives points roles and tab stops only once live', () => {
    const live = connectTrendChart(base).points.map((p) => [p.bag['role'], p.bag['tabindex']]);
    expect(live[0]).toEqual(['button', 0]);
    expect(live[1]).toEqual(['button', -1]);
    const ssr = connectTrendChart({ ...base, live: false }).points.map((p) => [p.bag['role'], p.bag['tabindex']]);
    expect(ssr.every(([role, tab]) => role === 'img' && tab === null)).toBe(true);
  });

  it('moves the tab stop to the focused key, and back to the first when it is gone', () => {
    expect(connectTrendChart({ ...base, focusedKey: '2:b' }).points.find((p) => p.bag['tabindex'] === 0)?.key).toBe('2:b');
    expect(connectTrendChart({ ...base, focusedKey: 'zz' }).points[0].bag['tabindex']).toBe(0);
  });

  it('describes the svg by the summary, a formatter winning', () => {
    const plain = connectTrendChart({ ...base, summary: 'plain' });
    expect(plain.svg['aria-describedby']).toBe('tc-summary');
    expect(plain.summary?.text).toBe('plain');
    expect(connectTrendChart({ ...base, summary: 'plain', summaryFormatter: () => 'formatted' }).summary?.text).toBe('formatted');
    expect(connectTrendChart(base).svg['aria-describedby']).toBeNull();
  });

  it('draws a crosshair and tooltip only while hovering', () => {
    expect(connectTrendChart(base).crosshair).toBeNull();
    const hovered = connectTrendChart({ ...base, hoveredKey: '1:a', tooltip: { text: 'hi', left: 5, top: 6 } });
    expect(hovered.crosshair).not.toBeNull();
    expect(hovered.tooltip.bag['data-visible']).toBe('');
    expect(hovered.tooltip.style).toEqual({ left: '5px', top: '6px' });
    expect(hovered.points[1].bag['data-hovered']).toBe('');
  });

  it('leaves the scope to the compiler: no bag carries data-mps (S15)', () => {
    const view = connectTrendChart({ ...base, goal: 25, goalLabel: 'Goal' });
    expect(view.root['data-mps']).toBeUndefined();
    expect(view.goal?.label?.['data-mps']).toBeUndefined();
    expect(view.points.every((p) => p.bag['data-mps'] === undefined)).toBe(true);
  });
});
