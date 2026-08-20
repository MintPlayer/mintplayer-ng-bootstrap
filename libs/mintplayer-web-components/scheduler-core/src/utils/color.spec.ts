import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLORS,
  DEFAULT_EVENT_COLOR,
  addAlpha,
  contrastRatioWith,
  darkenColor,
  getColorByIndex,
  getContrastColor,
  getReadableTextColor,
  lightenColor,
  resolveEventColor,
} from './color';

/**
 * `getReadableTextColor` exists because `getContrastColor` computes YIQ
 * perceived brightness, not the WCAG formula. These specs assert the RATIO
 * rather than the branch — a test that only checks "returns black on light" is
 * satisfied by both implementations and so proves nothing about either.
 */

describe('getReadableTextColor', () => {
  it('clears 4.5:1 against every shipped default colour', () => {
    for (const bg of DEFAULT_COLORS) {
      const fg = getReadableTextColor(bg);
      expect(fg, bg).not.toBeNull();
      expect(contrastRatioWith(bg, fg!), `${bg} on ${fg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('picks the higher-contrast foreground, not merely a plausible one', () => {
    // Mid-tones are where a brightness threshold and the WCAG ratio disagree.
    for (const bg of ['#767676', '#808080', '#0074d9', '#6f42c1', '#e83e8c']) {
      const chosen = getReadableTextColor(bg)!;
      const other = chosen === '#000000' ? '#ffffff' : '#000000';

      expect(
        contrastRatioWith(bg, chosen)!,
        `${bg}: chose ${chosen} over ${other}`,
      ).toBeGreaterThanOrEqual(contrastRatioWith(bg, other)!);
    }
  });

  it('returns the obvious answer at the extremes', () => {
    expect(getReadableTextColor('#ffffff')).toBe('#000000');
    expect(getReadableTextColor('#000000')).toBe('#ffffff');
  });

  it('accepts three-digit hex', () => {
    expect(getReadableTextColor('#fff')).toBe('#000000');
    expect(getReadableTextColor('#000')).toBe('#ffffff');
  });

  it('returns null — not black — for anything it cannot parse', () => {
    // The caller must be able to tell "unreadable colour" from "black is right",
    // so it can fall back to its own neutral surface instead of claiming a
    // colour the consumer never set.
    for (const bad of ['rebeccapurple', 'rgb(1,2,3)', 'var(--x)', '', '#12345', 'nonsense']) {
      expect(getReadableTextColor(bad), bad).toBeNull();
    }
  });

  it('differs from the YIQ helper somewhere — otherwise it would be redundant', () => {
    // Not a contract, but if these never disagreed there would be no reason for
    // two functions. Documents WHY the new one exists.
    const disagreements = DEFAULT_COLORS.concat(['#767676', '#808080', '#8a8a8a']).filter(
      (bg) => getReadableTextColor(bg) !== getContrastColor(bg),
    );
    expect(disagreements.length).toBeGreaterThan(0);
  });
});

describe('contrastRatioWith', () => {
  it('spans the full 1:1 – 21:1 range', () => {
    expect(contrastRatioWith('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatioWith('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatioWith('#3788d8', '#ffffff')).toBeCloseTo(
      contrastRatioWith('#ffffff', '#3788d8')!,
      10,
    );
  });

  it('returns null when either colour is unparseable', () => {
    expect(contrastRatioWith('#fff', 'red')).toBeNull();
    expect(contrastRatioWith('teal', '#fff')).toBeNull();
  });
});

/*
 * Everything below covers the rest of the module, which had no specs at all:
 * the palette, the YIQ helper the five views actually use for event labels, the
 * lighten/darken/alpha arithmetic, and colour resolution. The
 * `getReadableTextColor` cases above are the ones that matter for
 * accessibility and are left exactly as they were.
 */

describe('getColorByIndex', () => {
  it('returns the palette in order', () => {
    expect(getColorByIndex(0)).toBe(DEFAULT_COLORS[0]);
    expect(getColorByIndex(3)).toBe(DEFAULT_COLORS[3]);
  });

  // Cycling rather than running out: a scheduler has no bound on how many
  // resources it is handed, and `undefined` as a colour renders nothing at all.
  it('cycles once past the end of the palette', () => {
    expect(getColorByIndex(DEFAULT_COLORS.length)).toBe(DEFAULT_COLORS[0]);
    expect(getColorByIndex(DEFAULT_COLORS.length + 2)).toBe(DEFAULT_COLORS[2]);
  });

  it('never returns undefined for a large index', () => {
    expect(getColorByIndex(99_999)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('offers a palette of distinct colours', () => {
    expect(new Set(DEFAULT_COLORS).size).toBe(DEFAULT_COLORS.length);
  });
});

describe('getContrastColor — the YIQ helper the event labels use', () => {
  it('puts dark text on a light background', () => {
    expect(getContrastColor('#ffffff')).toBe('#000000');
    expect(getContrastColor('#ffc107')).toBe('#000000');
  });

  it('puts light text on a dark background', () => {
    expect(getContrastColor('#000000')).toBe('#ffffff');
    expect(getContrastColor('#3788d8')).toBe('#ffffff');
  });

  it('accepts a three-digit hex', () => {
    expect(getContrastColor('#fff')).toBe('#000000');
    expect(getContrastColor('#000')).toBe('#ffffff');
  });

  it('accepts a hex with no leading hash', () => {
    expect(getContrastColor('ffffff')).toBe('#000000');
  });

  // Green dominates the YIQ weighting, which is exactly where it parts company
  // with the WCAG luminance the specs above assert.
  it('weights green most heavily', () => {
    expect(getContrastColor('#00ff00')).toBe('#000000');
    expect(getContrastColor('#0000ff')).toBe('#ffffff');
  });
});

describe('lightenColor and darkenColor', () => {
  it('leaves a colour alone at zero percent', () => {
    expect(lightenColor('#3788d8', 0)).toBe('#3788d8');
    expect(darkenColor('#3788d8', 0)).toBe('#3788d8');
  });

  it('goes all the way to white and black at a hundred', () => {
    expect(lightenColor('#3788d8', 100)).toBe('#ffffff');
    expect(darkenColor('#3788d8', 100)).toBe('#000000');
  });

  it('moves partway in between', () => {
    expect(lightenColor('#000000', 50)).toBe('#808080');
    expect(darkenColor('#ffffff', 50)).toBe('#808080');
  });

  it('cannot push a channel past its limits', () => {
    expect(lightenColor('#ffffff', 100)).toBe('#ffffff');
    expect(darkenColor('#000000', 100)).toBe('#000000');
  });

  // Every channel is padded to two digits. Without it a value below 16 emits a
  // five-character hex and CSS drops the whole declaration.
  it('always emits a six-digit hex', () => {
    for (const percent of [1, 5, 17, 50, 99]) {
      expect(lightenColor('#010203', percent)).toMatch(/^#[0-9a-f]{6}$/);
      expect(darkenColor('#fefdfc', percent)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('accepts a three-digit hex and a missing hash', () => {
    expect(lightenColor('#000', 100)).toBe('#ffffff');
    expect(darkenColor('fff', 100)).toBe('#000000');
  });

  it('lightens monotonically', () => {
    const steps = [0, 25, 50, 75, 100].map((p) => lightenColor('#3788d8', p));
    expect(new Set(steps).size).toBe(steps.length);
  });
});

describe('addAlpha', () => {
  it('produces a CSS rgba string', () => {
    expect(addAlpha('#3788d8', 0.5)).toBe('rgba(55, 136, 216, 0.5)');
  });

  it('accepts a three-digit hex', () => {
    expect(addAlpha('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('accepts a fully transparent alpha', () => {
    expect(addAlpha('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
  });
});

describe('resolveEventColor', () => {
  const resources = new Map([
    ['r1', { color: '#111111', eventColor: '#222222' }],
    ['r2', { color: '#333333' }],
    ['r3', { eventColor: '#444444' }],
    ['r4', {}],
  ]);

  // Event over resource over default — the precedence every calendar library
  // agrees on, so a consumer's per-event override is never quietly ignored.
  it('prefers the colour on the event itself', () => {
    expect(resolveEventColor({ color: '#abcdef', resourceId: 'r1' }, resources)).toBe('#abcdef');
  });

  it('falls back to the resource event colour', () => {
    expect(resolveEventColor({ resourceId: 'r1' }, resources)).toBe('#222222');
  });

  // `eventColor` is the event fill and `color` the row-header tint, but a
  // consumer who sets only one still gets sensible behaviour.
  it('falls back to the resource header tint when there is no event colour', () => {
    expect(resolveEventColor({ resourceId: 'r2' }, resources)).toBe('#333333');
  });

  it('uses the event colour of a resource that has no tint', () => {
    expect(resolveEventColor({ resourceId: 'r3' }, resources)).toBe('#444444');
  });

  it('falls back to the default for a resource with neither', () => {
    expect(resolveEventColor({ resourceId: 'r4' }, resources)).toBe(DEFAULT_EVENT_COLOR);
  });

  it('falls back to the default for an event with no resource', () => {
    expect(resolveEventColor({}, resources)).toBe(DEFAULT_EVENT_COLOR);
  });

  it('falls back to the default for an unknown resource id', () => {
    expect(resolveEventColor({ resourceId: 'ghost' }, resources)).toBe(DEFAULT_EVENT_COLOR);
  });

  it('accepts a caller-supplied default', () => {
    expect(resolveEventColor({}, resources, '#999999')).toBe('#999999');
  });

  it('works with no resources at all', () => {
    expect(resolveEventColor({ resourceId: 'r1' }, new Map())).toBe(DEFAULT_EVENT_COLOR);
  });
});
