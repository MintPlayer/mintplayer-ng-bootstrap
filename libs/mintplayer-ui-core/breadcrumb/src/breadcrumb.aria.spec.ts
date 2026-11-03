import { describe, expect, it } from 'vitest';
import { connectBreadcrumb, connectBreadcrumbItem } from './breadcrumb.core';

describe('breadcrumb', () => {
  it('names its nav landmark, and a consumer aria-label wins', () => {
    expect(connectBreadcrumb({ label: 'Kruimelpad' }).nav['aria-label']).toBe('Kruimelpad');
    expect(connectBreadcrumb({ label: 'Breadcrumb' }, 'Location').nav['aria-label']).toBe('Location');
    expect(connectBreadcrumb({ label: 'Breadcrumb' }).list['class']).toBe('breadcrumb');
  });

  it('marks only the active item as the current page', () => {
    expect(connectBreadcrumbItem({ active: false })).toEqual({ class: 'breadcrumb-item', role: 'listitem', 'aria-current': null });
    expect(connectBreadcrumbItem({ active: true })).toEqual({ class: 'breadcrumb-item active', role: 'listitem', 'aria-current': 'page' });
  });
});
