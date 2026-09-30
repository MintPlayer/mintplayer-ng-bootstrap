import { describe, expect, it } from 'vitest';
import { rescalePanelSizes } from './rescale-panel-sizes';

describe('rescalePanelSizes', () => {
  it('scales every panel by the same factor so the ratios survive a container resize', () => {
    expect(rescalePanelSizes([100, 300], 800)).toEqual([200, 600]);
  });

  it('shrinks as well as grows', () => {
    expect(rescalePanelSizes([200, 200, 400], 400)).toEqual([100, 100, 200]);
  });

  it('the rescaled sizes sum to the available space', () => {
    const sizes = rescalePanelSizes([123, 456, 789], 1000)!;
    expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 10);
  });

  it('ignores a change below 1 px, so subpixel feedback from its own writes cannot loop', () => {
    expect(rescalePanelSizes([400, 400], 800.6)).toBeNull();
    expect(rescalePanelSizes([400, 400], 799.4)).toBeNull();
  });

  it('acts on a change of exactly 1 px', () => {
    expect(rescalePanelSizes([400, 400], 801)).toEqual([400.5, 400.5]);
  });

  it('returns null when there are no stored sizes', () => {
    expect(rescalePanelSizes([], 800)).toBeNull();
  });

  it('returns null when the stored sizes sum to zero — there is no ratio to preserve', () => {
    expect(rescalePanelSizes([0, 0], 800)).toBeNull();
  });

  it('returns null for a non-finite available space instead of writing NaN sizes', () => {
    expect(rescalePanelSizes([400, 400], Number.NaN)).toBeNull();
    expect(rescalePanelSizes([400, 400], Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('treats negative available space as zero', () => {
    expect(rescalePanelSizes([400, 400], -50)).toEqual([0, 0]);
  });

  it('does not mutate the stored array', () => {
    const stored = [100, 300];
    rescalePanelSizes(stored, 800);
    expect(stored).toEqual([100, 300]);
  });
});
