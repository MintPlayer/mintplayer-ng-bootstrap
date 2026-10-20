import { describe, expect, it } from 'vitest';
import { linearScale, niceDomain, niceTicks, timeTicks } from './scale';

describe('linearScale', () => {
  it('maps and extrapolates linearly, and survives a zero-width domain', () => {
    const scale = linearScale([0, 100], [0, 500]);
    expect(scale(0)).toBe(0);
    expect(scale(50)).toBe(250);
    expect(scale(120)).toBe(600);
    const inverted = linearScale([0, 10], [100, 0]);
    expect(inverted(2.5)).toBe(75);
    expect(linearScale([5, 5], [0, 100])(5)).toBe(50);
  });
});

describe('niceTicks (1-2-5)', () => {
  const table: [min: number, max: number, count: number, expected: number[]][] = [
    [0, 100, 5, [0, 20, 40, 60, 80, 100]],
    [0, 100, 10, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]],
    [0, 73, 5, [0, 20, 40, 60]],
    [60, 80, 5, [60, 65, 70, 75, 80]],
    [0, 1, 5, [0, 0.2, 0.4, 0.6, 0.8, 1]],
    [-40, 40, 4, [-40, -20, 0, 20, 40]],
    [12, 13, 5, [12, 12.2, 12.4, 12.6, 12.8, 13]],
  ];
  table.map(([min, max, count, expected]) =>
    it(`ticks(${min}, ${max}, ${count})`, () => {
      expect(niceTicks(min, max, count)).toEqual(expected);
    }));

  it('degenerates gracefully', () => {
    expect(niceTicks(5, 5)).toEqual([5]);
  });
});

describe('niceDomain', () => {
  it('snaps outward to the step', () => {
    expect(niceDomain(3, 97, 5)).toEqual([0, 100]);
    expect(niceDomain(61, 79, 5)).toEqual([60, 80]);
  });
});

describe('timeTicks', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

  it('a one-month range ticks on weeks (Mondays), labeled month+day', () => {
    const ticks = timeTicks(day(2026, 0, 5), day(2026, 1, 5), 6, 'en-US');
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    expect(ticks.length).toBeLessThanOrEqual(6);
    ticks.map((t) => expect(new Date(t.time).getDay()).toBe(1));
    expect(ticks[0].label).toMatch(/^Jan \d+$/);
  });

  it('a one-year range ticks on months', () => {
    const ticks = timeTicks(day(2025, 0, 1), day(2025, 11, 31), 6, 'en-US');
    ticks.map((t) => expect(new Date(t.time).getDate()).toBe(1));
    // 12 months / target 6 -> quarterly rung.
    expect(ticks.length).toBeLessThanOrEqual(6);
    expect(ticks[0].label).toMatch(/2025/);
  });

  it('a decade range ticks on years', () => {
    const ticks = timeTicks(day(2016, 5, 1), day(2026, 5, 1), 6, 'en-US');
    ticks.map((t) => {
      expect(new Date(t.time).getMonth()).toBe(0);
      expect(t.label).toMatch(/^\d{4}$/);
      return t;
    });
  });

  it('a two-day range ticks on hours', () => {
    const ticks = timeTicks(day(2026, 0, 1), day(2026, 0, 3), 6, 'en-US');
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks[0].label).toMatch(/\d/);
  });

  it('labels are locale-aware', () => {
    const en = timeTicks(day(2025, 4, 1), day(2025, 4, 31), 5, 'en-US');
    const nl = timeTicks(day(2025, 4, 1), day(2025, 4, 31), 5, 'nl-BE');
    expect(en[0].label).toContain('May');
    expect(nl[0].label).toContain('mei');
  });

  it('ticks stay inside [from, to] and are sorted', () => {
    const from = day(2025, 2, 14), to = day(2025, 8, 2);
    const ticks = timeTicks(from, to, 6);
    ticks.map((t) => {
      expect(t.time).toBeGreaterThanOrEqual(from);
      expect(t.time).toBeLessThanOrEqual(to);
      return t;
    });
    expect([...ticks].sort((a, b) => a.time - b.time)).toEqual(ticks);
    expect(timeTicks(to, from)).toEqual([]);
  });
});
