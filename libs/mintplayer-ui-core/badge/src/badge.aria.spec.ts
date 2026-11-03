import { describe, expect, it } from 'vitest';
import { badgeClasses, connectBadge } from './badge.core';

describe('badge', () => {
  // `.badge` paints white text, and `bg-*` sets only the background: warning
  // (1.63:1), info (1.96:1) and light (1.05:1) failed WCAG AA. `text-bg-*` pairs
  // each theme colour with the text colour Bootstrap's color-contrast() picks.
  it.each(['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'])('paints %s with its text-bg-* class', (color) => {
    expect(badgeClasses(color)).toBe(`badge text-bg-${color}`);
  });

  // Bootstrap has no text-bg-* for these three, and white text on them was invisible.
  it.each([
    ['body', 'badge bg-body text-body'],
    ['white', 'badge bg-white text-black'],
    ['transparent', 'badge bg-transparent text-reset'],
  ])('pairs %s with a contrasting text colour', (color, classes) => {
    expect(badgeClasses(color)).toBe(classes);
  });

  it('stays in the accessibility tree unless decorative, and leaves it entirely when it is', () => {
    expect(connectBadge({ color: 'primary', decorative: false })['aria-hidden']).toBeNull();
    expect(connectBadge({ color: 'primary', decorative: true })['aria-hidden']).toBe('true');
  });

  it('writes no role: a badge is text', () => {
    expect(connectBadge({ color: 'info', decorative: false })['role']).toBeUndefined();
  });
});
