import { describe, expect, it } from 'vitest';
import { connectSparkline, sparklineName } from './sparkline';

describe('sparklineName', () => {
  it('prefers the label, then the formatter, then the generated summary', () => {
    const points = [3, 1, null, 4];
    expect(sparklineName(points, { label: 'Trend', summaryFormatter: () => 'x' })).toBe('Trend');
    expect(sparklineName(points, { summaryFormatter: () => 'Custom' })).toBe('Custom');
    expect(sparklineName(points, { summaryFormatter: () => undefined })).toBe('3, 4, 1, 4');
  });

  it('formats the summary for the locale', () => {
    expect(sparklineName([1234.5, 2], { locale: 'de-DE' })).toBe('1.234,5, 2, 2, 1.234,5');
  });

  it('is empty without values', () => {
    expect(sparklineName([null, null], {})).toBe('');
  });
});

describe('connectSparkline', () => {
  it('carries no scope (the compiler stamps it) and names the role=img svg', () => {
    const view = connectSparkline([1, 2, 3], {});
    expect(view.root).toEqual({ class: 'sparkline' });
    expect(view.svg).toMatchObject({
      viewBox: '0 0 100 28',
      preserveAspectRatio: 'none',
      role: 'img',
      'aria-label': '1, 3, 1, 3',
    });
  });

  it('draws a null as a gap between separate runs', () => {
    const view = connectSparkline([1, 2, null, 3, 4], {});
    expect(view.line?.['d']?.match(/M/g)).toHaveLength(2);
  });

  it('fills only on request, and only runs of two or more points', () => {
    expect(connectSparkline([1, 2], {}).fill).toBeNull();
    const fill = connectSparkline([1, 2, null, 5], { area: true }).fill;
    expect(fill?.['d']?.match(/Z/g)).toHaveLength(1);
  });

  it('puts the dot on the last point unless switched off', () => {
    const dot = connectSparkline([0, 10], { yMin: 0, yMax: 10 }).dot;
    // Last x sits at W - PAD, the top of the domain at PAD.
    expect(dot).toMatchObject({ class: 'dot', cx: '97', cy: '3', r: '3' });
    expect(connectSparkline([0, 10], { showLastDot: false }).dot).toBeNull();
  });

  // #461: an unset Angular numeric input used to arrive as NaN and draw "M 3 NaN L 97 NaN".
  it('scales automatically when a bound is NaN', () => {
    const view = connectSparkline([1474276010.667, 1417019392], { yMin: NaN, yMax: NaN });
    expect(view.line?.['d'] ?? '').not.toContain('NaN');
    expect(view.dot?.['cy']).not.toBe('NaN');
    expect(view).toEqual(connectSparkline([1474276010.667, 1417019392], {}));
  });

  it('centres a flat series instead of dividing by zero', () => {
    const view = connectSparkline([5, 5], {});
    expect(view.line?.['d'] ?? '').not.toContain('NaN');
    expect(view.dot?.['cy']).toBe('14');
  });

  it('renders a bare, hidden svg without values', () => {
    const view = connectSparkline([null], { area: true });
    expect(view.svg['role']).toBeUndefined();
    expect(view.svg['aria-hidden']).toBe('true');
    expect(view.line).toBeNull();
    expect(view.fill).toBeNull();
    expect(view.dot).toBeNull();
  });
});
