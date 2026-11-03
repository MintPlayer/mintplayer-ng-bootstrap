import { describe, expect, it } from 'vitest';
import { connectClose } from './close.core';

describe('close button', () => {
  it('is a real button named by its label, never a submit button', () => {
    const { button } = connectClose({ label: 'Close', disabled: false });
    expect(button).toMatchObject({ class: 'btn-close', type: 'button', 'aria-label': 'Close' });
    expect(button['disabled']).toBeNull();
  });

  it('takes a localised name', () => {
    expect(connectClose({ label: 'Sluiten', disabled: false }).button['aria-label']).toBe('Sluiten');
  });

  it('is natively disabled, so it leaves the tab order', () => {
    expect(connectClose({ label: 'Close', disabled: true }).button['disabled']).toBe('');
  });

  it('puts no role on the box around the button', () => {
    expect(connectClose({ label: 'Close', disabled: false }).root['role']).toBeUndefined();
  });
});
