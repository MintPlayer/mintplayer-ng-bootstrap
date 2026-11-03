import { describe, expect, it } from 'vitest';
import { connectDropdown, connectDropdownItem, connectDropdownPanel, DROPDOWN_OF_ATTR, type DropdownInputs, type DropdownState } from './dropdown.core';

const inputs = (patch: Partial<DropdownInputs> = {}): DropdownInputs => ({ placement: 'bottom-start', sameWidth: false, hasPopup: 'menu', ...patch });
const state = (patch: Partial<DropdownState> = {}): DropdownState => ({ phase: 'closed', side: 'bottom', promote: false, triggerId: 'trig', ...patch });

describe('dropdown', () => {
  it('is a menu button: expanded and controlling the panel only while it renders', () => {
    const closed = connectDropdown(inputs(), state(), 'd');
    expect(closed.anchor).toEqual({
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': null,
      [DROPDOWN_OF_ATTR]: 'd-dropdown',
      role: null,
      tabindex: null,
    });
    expect(closed.overlay).toBeNull();
    const open = connectDropdown(inputs(), state({ phase: 'shown' }), 'd');
    expect(open.anchor).toMatchObject({ 'aria-expanded': 'true', 'aria-controls': 'd-dropdown' });
    expect(open.overlay).toEqual({ overlayId: 'd-dropdown', side: 'bottom', shown: true, hasPopup: 'menu', triggerId: 'trig' });
  });

  it('makes a trigger that is not natively focusable a focusable button', () => {
    expect(connectDropdown(inputs(), state({ promote: true }), 'd').anchor).toMatchObject({ role: 'button', tabindex: 0 });
  });

  it('leaves a menu panel roleless (the menu inside is the role) and makes a dialog panel a named dialog', () => {
    const menu = connectDropdownPanel({ overlayId: 'd-dropdown', side: 'bottom', shown: true, hasPopup: 'menu', triggerId: 'trig' });
    expect(menu).toEqual({ class: 'dropdown-panel show', id: 'd-dropdown', 'data-side': 'bottom', role: null, tabindex: -1, 'aria-labelledby': null });
    expect(connectDropdown(inputs({ hasPopup: 'dialog' }), state(), 'd').anchor['aria-haspopup']).toBe('dialog');
    const dialog = connectDropdownPanel({ overlayId: 'd-dropdown', side: 'top', shown: false, hasPopup: 'dialog', triggerId: 'trig' });
    expect(dialog).toMatchObject({ class: 'dropdown-panel', role: 'dialog', tabindex: -1, 'aria-labelledby': 'trig', 'data-side': 'top' });
  });

  it('marks an item active or disabled on the item itself', () => {
    expect(connectDropdownItem({ active: false, disabled: false, value: 1 })).toEqual({ class: 'dropdown-item' });
    expect(connectDropdownItem({ active: true, disabled: true, value: 1 })).toEqual({ class: 'dropdown-item active disabled' });
  });
});
