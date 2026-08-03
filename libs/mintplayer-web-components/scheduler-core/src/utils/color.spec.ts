import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLORS,
  contrastRatioWith,
  getContrastColor,
  getReadableTextColor,
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
