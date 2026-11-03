import { describe, expect, it } from 'vitest';
import { connectToast, connectToaster, connectToastHeader, TOAST_DISMISS_ATTR } from './toast.core';

describe('toast', () => {
  it("follows Bootstrap's phases: hidden, .show.showing while it fades, .show once in", () => {
    expect(connectToast('hidden')['class']).toBe('toast fade');
    expect(connectToast('entering')['class']).toBe('toast fade show showing');
    expect(connectToast('shown')['class']).toBe('toast fade show');
    expect(connectToast('leaving')['class']).toBe('toast fade show showing');
  });

  it('carries no live-region role: its text is announced through the page region', () => {
    expect(connectToast('shown')['role']).toBeUndefined();
    expect(connectToast('shown')['aria-live']).toBeUndefined();
  });

  it('names the close button, hidden until hydrated', () => {
    const before = connectToastHeader({ dismissible: true, closeLabel: 'Sluiten' }, false);
    expect(before.close).toMatchObject({ class: 'btn-close', type: 'button', 'aria-label': 'Sluiten', [TOAST_DISMISS_ATTR]: '', hidden: '' });
    expect(connectToastHeader({ dismissible: true, closeLabel: 'Close' }, true).close?.['hidden']).toBeNull();
    expect(connectToastHeader({ dismissible: false, closeLabel: 'Close' }, true).close).toBeNull();
  });

  it('places the toaster with utilities, falling back to bottom-end', () => {
    expect(connectToaster({ queue: null, placement: 'top-center' }, []).root['class']).toBe('toast-container position-fixed p-3 top-0 start-50 translate-middle-x');
    expect(connectToaster({ queue: null, placement: 'nowhere' as never }, []).root['class']).toBe('toast-container position-fixed p-3 bottom-0 end-0');
  });
});
