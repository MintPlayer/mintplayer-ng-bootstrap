import { DEFAULT_MESSAGES, formatMessage, resolveMessages } from './messages';

describe('scheduler messages', () => {
  it('interpolates known tokens and leaves unknown ones visible', () => {
    expect(formatMessage('{count} more on {day}', { count: 3 })).toBe('3 more on {day}');
    expect(formatMessage('as is')).toBe('as is');
  });

  it('merges overrides onto the defaults', () => {
    expect(resolveMessages()).toBe(DEFAULT_MESSAGES);
    const merged = resolveMessages({ moreEvents: '+{count}' });
    expect(merged.moreEvents).toBe('+{count}');
    expect(merged.dayPopoverLabel).toBe(DEFAULT_MESSAGES.dayPopoverLabel);
  });
});
