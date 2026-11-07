import { describe, expect, it } from 'vitest';
import { connectPopover, connectPopoverPanel, POPOVER_OF_ATTR, type PopoverState } from './popover.core';

const state = (patch: Partial<PopoverState> = {}): PopoverState => ({ phase: 'closed', kept: false, side: 'bottom', promote: false, triggerId: 'trig', ...patch });

describe('popover', () => {
  it('is a dialog trigger: expanded and controlling the panel only while it renders', () => {
    const closed = connectPopover({ position: 'bottom', title: 'T' }, state(), 'p');
    expect(closed.anchor).toEqual({
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-controls': null,
      [POPOVER_OF_ATTR]: 'p-popover',
      role: null,
      tabindex: null,
    });
    expect(closed.overlay).toBeNull();
    const open = connectPopover({ position: 'bottom', title: 'T' }, state({ phase: 'shown', kept: true }), 'p');
    expect(open.anchor).toMatchObject({ 'aria-expanded': 'true', 'aria-controls': 'p-popover' });
    expect(open.overlay).toEqual({ overlayId: 'p-popover', side: 'bottom', phase: 'shown', heading: 'T', triggerId: null });
    // Closed after an open: the panel is kept (#465), the trigger is collapsed again.
    const kept = connectPopover({ position: 'bottom', title: 'T' }, state({ kept: true }), 'p');
    expect(kept.anchor).toMatchObject({ 'aria-expanded': 'false', 'aria-controls': null });
    expect(kept.overlay).toMatchObject({ phase: 'closed' });
  });

  it('makes a trigger that is not natively focusable a focusable button', () => {
    expect(connectPopover({ position: 'bottom', title: null }, state({ promote: true }), 'p').anchor).toMatchObject({ role: 'button', tabindex: 0 });
  });

  it('is named by its title, else by its trigger', () => {
    const titled = connectPopoverPanel({ overlayId: 'p-popover', side: 'top', phase: 'shown', heading: 'T', triggerId: null });
    expect(titled.root).toEqual({ 'data-mp-phase': 'shown', hidden: false, class: 'popover bs-popover-top fade show', role: 'dialog', tabindex: -1, id: 'p-popover', 'aria-labelledby': 'p-popover-title' });
    expect(titled.header).toEqual({ class: 'popover-header', id: 'p-popover-title' });
    const untitled = connectPopoverPanel({ overlayId: 'p-popover', side: 'top', phase: 'entering', heading: null, triggerId: 'trig' });
    expect(untitled.root['aria-labelledby']).toBe('trig');
    expect(untitled.header).toBeNull();
  });
});
