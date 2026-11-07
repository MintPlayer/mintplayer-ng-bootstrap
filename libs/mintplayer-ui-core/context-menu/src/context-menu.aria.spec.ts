import { describe, expect, it } from 'vitest';
import { connectContextMenu, connectContextMenuPanel, CONTEXT_MENU_OF_ATTR } from './context-menu.core';

describe('context menu', () => {
  it('marks the element with its panel only, and renders the panel from the first open on', () => {
    const closed = connectContextMenu({ phase: 'closed', kept: false }, 'c');
    expect(closed.anchor).toEqual({ [CONTEXT_MENU_OF_ATTR]: 'c-context-menu' });
    expect(closed.overlay).toBeNull();
    expect(connectContextMenu({ phase: 'entering', kept: true }, 'c').overlay).toEqual({ overlayId: 'c-context-menu', phase: 'entering' });
    expect(connectContextMenu({ phase: 'shown', kept: true }, 'c').overlay).toEqual({ overlayId: 'c-context-menu', phase: 'shown' });
    expect(connectContextMenu({ phase: 'closed', kept: true }, 'c').overlay).toEqual({ overlayId: 'c-context-menu', phase: 'closed' });
  });

  it('renders a focusable, roleless panel (the menu inside carries the role), hidden while closed', () => {
    expect(connectContextMenuPanel({ overlayId: 'c-context-menu', phase: 'shown' })).toEqual({
      'data-mp-phase': 'shown',
      hidden: false,
      class: 'context-menu-panel show',
      id: 'c-context-menu',
      tabindex: -1,
    });
    expect(connectContextMenuPanel({ overlayId: 'c-context-menu', phase: 'closed' })['hidden']).toBe(true);
  });
});
