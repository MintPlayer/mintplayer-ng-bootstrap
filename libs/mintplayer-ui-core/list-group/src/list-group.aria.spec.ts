import { describe, expect, it } from 'vitest';
import { connectListGroup, connectListGroupItem } from './list-group.core';

describe('list group', () => {
  it('is a list, flush on request', () => {
    expect(connectListGroup({ flush: false })).toEqual({ class: 'list-group', role: 'list' });
    expect(connectListGroup({ flush: true })['class']).toBe('list-group list-group-flush');
  });

  it('items are listitems that state current and disabled on the role, not only in a class', () => {
    expect(connectListGroupItem({ active: false, disabled: false, color: null })).toEqual({
      class: 'list-group-item',
      role: 'listitem',
      'aria-current': null,
      'aria-disabled': null,
    });
    const item = connectListGroupItem({ active: true, disabled: true, color: 'danger' });
    expect(item['class']).toBe('list-group-item list-group-item-danger active disabled');
    expect(item['aria-current']).toBe('true');
    expect(item['aria-disabled']).toBe('true');
  });
});
