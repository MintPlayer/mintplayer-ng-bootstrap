import { describe, expect, it } from 'vitest';
import { connectTooltip, connectTooltipPanel, TOOLTIP_OF_ATTR, type TooltipState } from './tooltip.core';

const state = (patch: Partial<TooltipState> = {}): TooltipState => ({ phase: 'closed', kept: false, side: 'top', describedBy: null, ...patch });

describe('tooltip', () => {
  it('describes its trigger only while it shows; its panel is kept after the first show (#465)', () => {
    const closed = connectTooltip({ position: 'top' }, state(), 't');
    expect(closed.anchor).toMatchObject({ 'aria-describedby': null, [TOOLTIP_OF_ATTR]: 't-tooltip' });
    expect(closed.overlay).toBeNull();
    const shown = connectTooltip({ position: 'top' }, state({ phase: 'shown', kept: true }), 't');
    expect(shown.anchor['aria-describedby']).toBe('t-tooltip');
    expect(shown.overlay).toEqual({ overlayId: 't-tooltip', side: 'top', phase: 'shown' });
    const kept = connectTooltip({ position: 'top' }, state({ kept: true }), 't');
    expect(kept.anchor['aria-describedby']).toBeNull();
    expect(kept.overlay).toEqual({ overlayId: 't-tooltip', side: 'top', phase: 'closed' });
  });

  it("keeps the consumer's own aria-describedby tokens", () => {
    expect(connectTooltip({ position: 'top' }, state({ describedBy: 'hint' }), 't').anchor['aria-describedby']).toBe('hint');
    expect(connectTooltip({ position: 'top' }, state({ phase: 'shown', describedBy: 'hint t-tooltip' }), 't').anchor['aria-describedby']).toBe('hint t-tooltip');
  });

  it('is a role=tooltip with the id its trigger names, and the side it landed on', () => {
    expect(connectTooltipPanel({ overlayId: 't-tooltip', side: 'end', phase: 'entering' }).root).toEqual({
      'data-mp-phase': 'entering',
      hidden: false,
      class: 'tooltip bs-tooltip-end fade',
      role: 'tooltip',
      id: 't-tooltip',
    });
    expect(connectTooltipPanel({ overlayId: 't-tooltip', side: 'bogus' as never, phase: 'shown' }).root['class']).toBe('tooltip bs-tooltip-top fade show');
    // Kept while closed: hidden from sight, focus and the accessibility tree.
    expect(connectTooltipPanel({ overlayId: 't-tooltip', side: 'top', phase: 'closed' }).root['hidden']).toBe(true);
  });
});
