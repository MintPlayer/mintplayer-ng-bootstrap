import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Announcer } from './announcer';

describe('Announcer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('says a message, then clears it after clearAfterMs', () => {
    const announcer = new Announcer({ clearAfterMs: 100 });
    announcer.announce('3 results');
    expect(announcer.snapshot.text).toBe('3 results');
    vi.advanceTimersByTime(100);
    expect(announcer.snapshot.text).toBe('');
  });

  it('blanks before repeating the same message so a diffing screen reader speaks it again', () => {
    const announcer = new Announcer();
    const seen: string[] = [];
    announcer.subscribe(({ text }) => seen.push(text));
    announcer.announce('Saved');
    announcer.announce('Saved');
    vi.advanceTimersByTime(0);
    expect(seen).toEqual(['Saved', '', 'Saved']);
  });

  it('ignores an empty message', () => {
    const announcer = new Announcer();
    announcer.announce('');
    expect(announcer.snapshot.text).toBe('');
  });

  it('maps politeness to the role, and omitRole drops it', () => {
    expect(new Announcer().attrs).toEqual({ role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    expect(new Announcer({ politeness: 'assertive' }).attrs['role']).toBe('alert');
    expect(new Announcer({ omitRole: true }).attrs['role']).toBeNull();
  });

  it('stops its timers on destroy', () => {
    const announcer = new Announcer({ clearAfterMs: 100 });
    announcer.announce('x');
    announcer.destroy();
    vi.advanceTimersByTime(100);
    expect(announcer.snapshot.text).toBe('x');
  });
});
