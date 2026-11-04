import { describe, expect, it } from 'vitest';
import { connectButtonGroup } from './button-group.core';

describe('button group', () => {
  it('is a group named by its label', () => {
    expect(connectButtonGroup({ label: 'Text alignment', vertical: false, size: null })).toEqual({
      class: 'btn-group',
      role: 'group',
      'aria-label': 'Text alignment',
    });
  });

  it('writes no empty name', () => {
    expect(connectButtonGroup({ label: null, vertical: false, size: null })['aria-label']).toBeNull();
  });

  it('stacks and sizes with Bootstrap classes', () => {
    expect(connectButtonGroup({ label: null, vertical: true, size: 'sm' })['class']).toBe('btn-group-vertical btn-group-sm');
    expect(connectButtonGroup({ label: null, vertical: false, size: 'lg' })['class']).toBe('btn-group btn-group-lg');
  });
});
