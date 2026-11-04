import { describe, expect, it } from 'vitest';
import { connectTooltip, connectTooltipPanel, TOOLTIP_OF_ATTR, type TooltipState } from './tooltip.core';

const state = (patch: Partial<TooltipState> = {}): TooltipState => ({ phase: 'closed', side: 'top', describedBy: null, ...patch });

describe('tooltip', () => {
  it('describes its trigger only while it renders', () => {
    const closed = connectTooltip({ position: 'top' }, state(), 't');
    expect(closed.anchor).toMatchObject({ 'aria-describedby': null, [TOOLTIP_OF_ATTR]: 't-tooltip' });
    expect(closed.overlay).toBeNull();
    const shown = connectTooltip({ position: 'top' }, state({ phase: 'shown' }), 't');
    expect(shown.anchor['aria-describedby']).toBe('t-tooltip');
    expect(shown.overlay).toEqual({ overlayId: 't-tooltip', side: 'top', shown: true });
  });

  it("keeps the consumer's own aria-describedby tokens", () => {
    expect(connectTooltip({ position: 'top' }, state({ describedBy: 'hint' }), 't').anchor['aria-describedby']).toBe('hint');
    expect(connectTooltip({ position: 'top' }, state({ phase: 'shown', describedBy: 'hint t-tooltip' }), 't').anchor['aria-describedby']).toBe('hint t-tooltip');
  });

  it('is a role=tooltip with the id its trigger names, and the side it landed on', () => {
    expect(connectTooltipPanel({ overlayId: 't-tooltip', side: 'end', shown: false }).root).toEqual({
      class: 'tooltip bs-tooltip-end fade',
      role: 'tooltip',
      id: 't-tooltip',
    });
    expect(connectTooltipPanel({ overlayId: 't-tooltip', side: 'bogus' as never, shown: true }).root['class']).toBe('tooltip bs-tooltip-top fade show');
  });
});
