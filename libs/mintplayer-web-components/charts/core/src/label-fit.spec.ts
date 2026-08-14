import { describe, expect, it } from 'vitest';
import { fitArcLabel, fitCellLabel } from './label-fit';

const TAU = 2 * Math.PI;

describe('fitArcLabel', () => {
  // The measured regression geometry (coverage.mintplayer.com, 2026-08-14):
  // 420px host, depth-11 tree at max-depth auto => 12 bands over a 210px
  // radius, ring thickness 210/12 = 17.5px. The shipped element rendered 197
  // labels into that geometry; radially NOTHING fits (17.5px holds ~1 char).
  const RING = 210 / 12;
  const FONT = 12;

  it('regression: a thin ring never fits a radial label', () => {
    // 1.72deg was the shipped effective threshold — the old code labelled this arc.
    const sweep = (2 / 360) * TAU;
    const fit = fitArcLabel('mp-query-builder.element.ts', sweep, 5 * RING, 6 * RING, FONT);
    expect(fit.visible).toBe(false);
  });

  it('a wide outer arc fits tangentially even though its ring is thin', () => {
    // A thin (20px) ring far out: the chord is 110px, so the name fits ACROSS
    // the arc even though nothing like it would fit along the 20px radius.
    const sweep = (60 / 360) * TAU;
    const fit = fitArcLabel('scheduler', sweep, 100, 120, FONT);
    expect(fit.visible).toBe(true);
    expect(fit.orientation).toBe('tangential');
    expect(fit.text).toBe('scheduler');
  });

  it('the same arc close to the centre only fits a few characters', () => {
    // Identical 60deg sweep at the speckling geometry (ring 2..3 of 12): the
    // chord collapses to ~44px, so an honest fit is 4 characters, truncated.
    const fit = fitArcLabel('scheduler', (60 / 360) * TAU, 2 * RING, 3 * RING, FONT);
    expect(fit.visible).toBe(true);
    expect(fit.text).toBe('sch…');
  });

  it('a thick ring with a narrow sweep fits radially', () => {
    // 100px-thick ring, 12deg sweep at rMid 150: arcLen ~31px > line height,
    // radial advance 92px (12 chars) vs tangential ~31px (3 chars, below floor).
    const fit = fitArcLabel('components', (12 / 360) * TAU, 100, 200, FONT);
    expect(fit.visible).toBe(true);
    expect(fit.orientation).toBe('radial');
  });

  it('truncates with an ellipsis when only part of the name fits', () => {
    const fit = fitArcLabel('mp-hierarchy-chart.ts', (40 / 360) * TAU, 100, 120, FONT);
    expect(fit.visible).toBe(true);
    expect(fit.text.endsWith('…')).toBe(true);
    expect(fit.text.length).toBeLessThan('mp-hierarchy-chart.ts'.length);
  });

  it('suppresses rather than truncating below the 4-char floor', () => {
    // 40deg at the inner speckling rings leaves room for 3 characters — under
    // the floor, so nothing is drawn rather than a meaningless "mp…".
    const fit = fitArcLabel('mp-hierarchy-chart.ts', (40 / 360) * TAU, 2 * RING, 3 * RING, FONT);
    expect(fit.visible).toBe(false);
    expect(fit.text).toBe('');
  });

  it('the tangential chord clamps a full-circle sweep (root ring)', () => {
    const full = fitArcLabel('root-ring-node', TAU, 40, 80, FONT);
    // advance limited by the diameter-ish chord, not arcLen ~= 377px
    expect(full.visible).toBe(true);
  });

  it('degenerate inputs are hidden, never NaN', () => {
    expect(fitArcLabel('x', 0, 10, 20, FONT).visible).toBe(false);
    expect(fitArcLabel('x', 1, 20, 20, FONT).visible).toBe(false);
    expect(fitArcLabel('', 1, 0, 100, FONT).visible).toBe(false);
    expect(fitArcLabel('x', 1, 10, 20, 0).visible).toBe(false);
  });

  it('constant-px font: the same geometry in a larger host fits more labels', () => {
    // Same tree rendered at 840px: ring doubles to 35px, the 12px font does not.
    const sweep = (12 / 360) * TAU;
    const small = fitArcLabel('overlay', sweep, 5 * RING, 6 * RING, FONT);
    const large = fitArcLabel('overlay', sweep, 10 * RING, 12 * RING, FONT);
    expect(small.visible).toBe(false);
    expect(large.visible).toBe(true);
  });
});

describe('fitCellLabel', () => {
  it('needs one comfortable line and ~3 chars of width', () => {
    expect(fitCellLabel(60, 20, 12)).toBe(true);
    expect(fitCellLabel(60, 14, 12)).toBe(false); // 2px-tall icicle cells got labels before
    expect(fitCellLabel(25, 20, 12)).toBe(false);
  });
});
