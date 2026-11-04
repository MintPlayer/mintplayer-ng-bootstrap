import { describe, expect, it } from 'vitest';
import { connectNavbarToggler } from './navbar-toggler.core';

const inputs = { label: 'Toggle navigation', controls: 'menu' };

describe('navbar toggler', () => {
  it('is a named button whose aria-expanded follows open', () => {
    const closed = connectNavbarToggler(inputs, false, true).button;
    expect(closed).toMatchObject({ type: 'button', 'aria-label': 'Toggle navigation', 'aria-expanded': 'false', 'aria-controls': 'menu', disabled: null });
    expect(closed['class']).toBe('navbar-toggler');
    const open = connectNavbarToggler(inputs, true, true).button;
    expect(open['aria-expanded']).toBe('true');
    expect(open['class']).toBe('navbar-toggler open');
  });

  it('a consumer aria-label wins over label', () => {
    expect(connectNavbarToggler(inputs, false, true, 'Menu').button['aria-label']).toBe('Menu');
  });

  it('is disabled until hydrated (it cannot toggle without JS)', () => {
    expect(connectNavbarToggler(inputs, false, false).button['disabled']).toBe('');
  });

  it('writes no aria-controls without a region', () => {
    expect(connectNavbarToggler({ ...inputs, controls: null }, false, true).button['aria-controls']).toBeNull();
  });
});
