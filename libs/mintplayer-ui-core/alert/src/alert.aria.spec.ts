import { describe, expect, it } from 'vitest';
import { alertClasses, connectAlert, rescueFocus, type AlertInputs } from './alert.core';

const inputs = (patch: Partial<AlertInputs> = {}): AlertInputs => ({
  color: 'primary',
  announce: false,
  dismissible: false,
  closeLabel: 'Close',
  visible: true,
  ...patch,
});

describe('alert', () => {
  it('paints the colour, and falls back to primary for an unknown one', () => {
    expect(alertClasses('warning', false)).toBe('alert alert-warning');
    expect(alertClasses('nope', true)).toBe('alert alert-primary alert-dismissible');
  });

  it('writes role="alert" only when announcing: a static banner must not interrupt', () => {
    expect(connectAlert(inputs(), true, true).root['role']).toBeNull();
    expect(connectAlert(inputs({ announce: true }), true, true).root['role']).toBe('alert');
  });

  it('hides a dismissed alert from both trees', () => {
    expect(connectAlert(inputs(), true, true).root['hidden']).toBeNull();
    expect(connectAlert(inputs(), false, true).root['hidden']).toBe('');
  });

  it('names the close button, and keeps it hidden until it can work', () => {
    expect(connectAlert(inputs(), true, true).dismiss).toBeNull();
    const ssr = connectAlert(inputs({ dismissible: true, closeLabel: 'Sluiten' }), true, false).dismiss!;
    expect(ssr['aria-label']).toBe('Sluiten');
    expect(ssr['type']).toBe('button');
    expect(ssr['hidden']).toBe('');
    expect(connectAlert(inputs({ dismissible: true }), true, true).dismiss!['hidden']).toBeNull();
  });

  it('re-homes focus after the alert when its focused close button disappears', () => {
    document.body.innerHTML = '<button id="before"></button><div id="a"><button id="x"></button></div><a id="after" href="#">next</a>';
    document.getElementById('x')!.focus();
    rescueFocus(document.getElementById('a')!);
    expect(document.activeElement?.id).toBe('after');
  });
});
