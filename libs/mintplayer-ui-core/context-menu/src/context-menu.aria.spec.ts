import { describe, expect, it } from 'vitest';
import { connectContextMenu, connectContextMenuPanel, CONTEXT_MENU_OF_ATTR } from './context-menu.core';

describe('context menu', () => {
  it('marks the element with its panel only, and renders the panel while open', () => {
    const closed = connectContextMenu({ phase: 'closed' }, 'c');
    expect(closed.anchor).toEqual({ [CONTEXT_MENU_OF_ATTR]: 'c-context-menu' });
    expect(closed.overlay).toBeNull();
    expect(connectContextMenu({ phase: 'entering' }, 'c').overlay).toEqual({ overlayId: 'c-context-menu', shown: false });
    expect(connectContextMenu({ phase: 'shown' }, 'c').overlay).toEqual({ overlayId: 'c-context-menu', shown: true });
  });

  it('renders a focusable, roleless panel (the menu inside carries the role)', () => {
    expect(connectContextMenuPanel({ overlayId: 'c-context-menu', shown: true })).toEqual({ class: 'context-menu-panel show', id: 'c-context-menu', tabindex: -1 });
  });
});
