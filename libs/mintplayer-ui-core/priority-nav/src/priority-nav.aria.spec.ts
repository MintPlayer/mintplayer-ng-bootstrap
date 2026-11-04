import { describe, expect, it } from 'vitest';
import { connectPriorityNav, moreWidthCss, type PriorityNavInputs, type PriorityNavState } from './priority-nav.core';

const INPUTS: PriorityNavInputs = {
  items: [
    { key: 'home', label: 'Home', href: '/', priority: 1 },
    { key: 'docs', label: 'Docs', href: '/docs', priority: 2, hideBelow: 'md' },
    { key: 'blog', label: 'Blog', href: '/blog' },
  ],
  moreLabel: 'More',
  collapseAt: null,
  overflowFrom: 'end',
  hideEmptyMore: true,
  label: 'Navigation',
};

const STATE: PriorityNavState = { overflowing: [], open: false, moreWidth: null };

const view = (state: Partial<PriorityNavState> = {}, hydrated = true, inputs: Partial<PriorityNavInputs> = {}, label: string | null = null) =>
  connectPriorityNav({ ...INPUTS, ...inputs }, { ...STATE, ...state }, 'pn', hydrated, label);

describe('priority nav ARIA', () => {
  it('is a named navigation landmark; a consumer aria-label wins', () => {
    expect(view().root['aria-label']).toBe('Navigation');
    expect(view({}, true, {}, 'Site').root['aria-label']).toBe('Site');
  });

  it('makes More a disclosure button that controls the overflow, never a menu', () => {
    const closed = view({ overflowing: ['blog'] });
    expect(closed.more).toMatchObject({ type: 'button', 'aria-expanded': 'false', 'aria-controls': 'pn-overflow' });
    expect(closed.more?.['aria-haspopup']).toBeUndefined();
    expect(closed.overflow['id']).toBe('pn-overflow');
    expect(closed.overflow['role']).toBeUndefined();
    const open = view({ overflowing: ['blog'], open: true });
    expect(open.more?.['aria-expanded']).toBe('true');
    expect(open.overflow['class']).toContain('priority-nav-overflow-open');
  });

  it('hides an overflowing item inline and shows only overflowing items in the panel', () => {
    const rows = view({ overflowing: ['blog'] }).rows;
    const blog = rows.find((row) => row.key === 'blog');
    const home = rows.find((row) => row.key === 'home');
    expect(blog?.inline['class']).toContain('priority-nav-hidden');
    expect(blog?.overflow['class']).not.toContain('priority-nav-overflow-hidden');
    expect(home?.inline['class']).not.toContain('priority-nav-hidden');
    expect(home?.overflow['class']).toContain('priority-nav-overflow-hidden');
  });

  it('keeps the measure copies inert and out of the accessibility tree', () => {
    expect(view().measure).toMatchObject({ 'aria-hidden': 'true', inert: '' });
  });

  it('idles the More toggle while nothing overflows, unless asked to keep it', () => {
    expect(view().moreSlot?.['class']).toContain('priority-nav-more-slot-idle');
    expect(view({ overflowing: ['blog'] }).moreSlot?.['class']).not.toContain('idle');
    expect(view({}, true, { hideEmptyMore: false }).moreSlot?.['class']).not.toContain('idle');
  });

  it('renders a labelled checkbox disclosure without JS (tier 1), and no button', () => {
    const v = view({ overflowing: ['blog'], open: true }, false);
    expect(v.root['class']).toContain('noscript');
    expect(v.checkbox).toMatchObject({ type: 'checkbox', id: 'pn-more', 'aria-controls': 'pn-overflow' });
    expect(v.noscriptToggle).toMatchObject({ for: 'pn-more' });
    expect(v.more).toBeNull();
    expect(v.measure).toBeNull();
    // Before hydration nothing is measured: every item stays inline, the breakpoints decide.
    expect(v.rows.every((row) => !String(row.inline['class']).includes('priority-nav-hidden'))).toBe(true);
    expect(v.overflow['class']).not.toContain('open');
    expect(v.rows.find((row) => row.key === 'docs')?.overflow['class']).toContain('priority-nav-item-hide-below-md');
  });

  it('renders the default link from the label and href', () => {
    expect(view().rows[1]).toMatchObject({ link: { class: 'priority-nav-link' }, href: '/docs' });
  });

  it('keeps the host from shrinking below the More toggle', () => {
    expect(moreWidthCss('pn', 64)).toBe('[data-priority-nav="pn"]{--priority-nav-more-width:64px}');
    expect(view({ moreWidth: 64 }).css).toContain('64px');
    expect(view({ moreWidth: 64 }, true, { items: [] }).css).toBeNull();
  });
});
