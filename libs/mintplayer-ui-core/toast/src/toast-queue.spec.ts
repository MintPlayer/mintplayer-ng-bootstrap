import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastQueue, TOAST_REMOVE_MS } from './toast-queue';

describe('ToastQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('enters hidden, then turns visible so the toast animates in', () => {
    const queue = new ToastQueue<string>();
    const id = queue.push('a', { autohide: false });
    expect(queue.toasts).toEqual([{ id, data: 'a', visible: false }]);
    vi.advanceTimersByTime(20);
    expect(queue.toasts[0].visible).toBe(true);
  });

  it('close hides the toast, then drops it once it has faded', () => {
    const queue = new ToastQueue<string>();
    const id = queue.push('a', { autohide: false });
    vi.advanceTimersByTime(20);
    queue.close(id);
    expect(queue.toasts[0].visible).toBe(false);
    vi.advanceTimersByTime(TOAST_REMOVE_MS);
    expect(queue.toasts).toEqual([]);
  });

  it('autohides after the delay, and hold pauses it until release', () => {
    const queue = new ToastQueue<string>();
    queue.push('a', { autohide: 1000 });
    vi.advanceTimersByTime(20 + 500);
    queue.hold();
    vi.advanceTimersByTime(5000);
    expect(queue.toasts[0].visible).toBe(true);
    queue.release();
    vi.advanceTimersByTime(999);
    expect(queue.toasts[0].visible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(queue.toasts[0].visible).toBe(false);
  });

  it('destroy cancels every timer', () => {
    const queue = new ToastQueue<string>();
    queue.push('a');
    queue.destroy();
    vi.advanceTimersByTime(10000);
    expect(queue.toasts).toEqual([{ id: 'mp-toast-1', data: 'a', visible: false }]);
  });
});
