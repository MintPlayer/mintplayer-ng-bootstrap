import { describe, expect, it } from 'vitest';
import { colorScale, composite, contrastText, relativeLuminance } from './color';

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

describe('relativeLuminance', () => {
  it('anchors at black = 0 and white = 1 in every accepted syntax', () => {
    expect(relativeLuminance('#000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6);
    expect(relativeLuminance('rgb(255, 255, 255)')).toBeCloseTo(1, 6);
    expect(relativeLuminance('hsl(0, 0%, 100%)')).toBeCloseTo(1, 6);
  });

  it('matches the published sRGB value for pure red', () => {
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 4);
  });

  it('parses what colorScale emits', () => {
    const scale = colorScale(60, 80, '#fe0000', '#21b577');
    expect(relativeLuminance(scale(70))).toBeGreaterThan(0);
  });

  it('returns undefined for syntax it does not understand, never throws', () => {
    expect(relativeLuminance('tomato')).toBeUndefined();
    expect(relativeLuminance('var(--x)')).toBeUndefined();
  });
});

describe('composite', () => {
  it('source-over blends a translucent fill onto the backdrop', () => {
    expect(composite('#000000', '#ffffff', 0.6)).toBe('rgb(102, 102, 102)');
    expect(composite('rgb(100, 200, 50)', '#000', 1)).toBe('rgb(100, 200, 50)');
    expect(composite('#ff0000', '#0000ff', 0)).toBe('rgb(0, 0, 255)');
  });

  it('clamps alpha and survives hsl input', () => {
    expect(composite('hsl(0, 0%, 0%)', '#fff', 2)).toBe('rgb(0, 0, 0)');
  });

  it('returns undefined when either side is unparseable', () => {
    expect(composite('tomato', '#fff', 0.5)).toBeUndefined();
    expect(composite('#fff', 'canvas', 0.5)).toBeUndefined();
  });
});

describe('contrastText', () => {
  it('dark surfaces take light text, light surfaces take dark text', () => {
    expect(contrastText('#ffffff')).toBe('dark');
    expect(contrastText('#000000')).toBe('light');
    expect(contrastText('hsl(0, 100%, 20%)')).toBe('light'); // dark red arc
  });

  it('the motivating cases: a .6-opacity light-green leaf over white vs over dark', () => {
    const leafFill = 'hsl(155, 69%, 42%)'; // ~coverage green
    const overWhite = composite(leafFill, '#ffffff', 0.6);
    const overDark = composite(leafFill, '#212529', 0.6); // bootstrap dark body
    expect(contrastText(overWhite as string)).toBe('dark');
    expect(contrastText(overDark as string)).toBe('light');
  });

  it('flips at the WCAG break-even luminance (~0.179)', () => {
    expect(contrastText('rgb(128, 128, 128)')).toBe('dark'); // L ~= .216, just past break-even
    expect(contrastText('rgb(100, 100, 100)')).toBe('light'); // L ~= .127
  });

  it('returns undefined for unparseable surfaces', () => {
    expect(contrastText('inherit')).toBeUndefined();
  });
});
