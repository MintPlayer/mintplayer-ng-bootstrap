import { describe, expect, it } from 'vitest';
import { connectRange } from './range.core';

const inputs = { value: 3, min: 0, max: 10, step: 1, disabled: false, label: 'Volume' };

describe('range', () => {
  it('is a native range input: its slider role and value need no ARIA', () => {
    const { input, value } = connectRange(inputs, 3);
    expect(input).toMatchObject({ type: 'range', class: 'form-range', min: '0', max: '10', step: '1', value: '3', 'aria-label': 'Volume', disabled: null });
    expect(input['role']).toBeUndefined();
    expect(input['aria-valuenow']).toBeUndefined();
    expect(value).toBe('3');
  });

  it('a consumer aria-label wins; no label writes none', () => {
    expect(connectRange(inputs, 3, 'Level').input['aria-label']).toBe('Level');
    expect(connectRange({ ...inputs, label: null }, 3).input['aria-label']).toBeNull();
  });

  it('disables the native input', () => {
    expect(connectRange({ ...inputs, disabled: true }, 3).input['disabled']).toBe('');
  });
});
