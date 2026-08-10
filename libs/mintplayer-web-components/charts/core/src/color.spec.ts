import { describe, expect, it } from 'vitest';
import { colorScale } from './color';

const hue = (hsl: string): number => Number(hsl.match(/hsl\((-?[\d.]+)/)![1]);

describe('colorScale', () => {
  // codecov's ramp: rgb(254,0,0) -> rgb(33,181,119), domain from the repo yml (60..80).
  const scale = colorScale(60, 80, 'rgb(254, 0, 0)', 'rgb(33, 181, 119)');

  it('clamps outside the domain', () => {
    expect(scale(0)).toBe(scale(60));
    expect(scale(100)).toBe(scale(80));
  });

  it('sweeps hue red -> yellowish -> green through the middle', () => {
    expect(hue(scale(60))).toBeCloseTo(0, 0);
    expect(hue(scale(80))).toBeCloseTo(155, 0);
    const mid = hue(scale(70));
    expect(mid).toBeGreaterThan(40); // yellow territory
    expect(mid).toBeLessThan(120);
  });

  it('accepts hex stops (#rgb and #rrggbb) equivalently', () => {
    const hex = colorScale(0, 100, '#fe0000', '#21b577');
    const short = colorScale(0, 100, '#f00', '#ff0000');
    expect(hex(0)).toBe(scale(60));
    expect(hue(short(0))).toBe(hue(short(100)));
  });

  it('rejects unsupported color syntax loudly', () => {
    expect(() => colorScale(0, 1, 'tomato', '#fff')).toThrow(/Unsupported color/);
  });

  it('a zero-width domain pins to the start stop', () => {
    const flat = colorScale(50, 50, '#fe0000', '#21b577');
    expect(flat(49)).toBe(flat(51));
    expect(hue(flat(50))).toBeCloseTo(0, 0);
  });
});
