import { describe, expect, it } from 'vitest';
import { connectTable } from './table.core';

describe('table', () => {
  it('is a plain table: no role written, the native table semantics stand', () => {
    const view = connectTable({ responsive: false, striped: false, hover: false, bordered: false });
    expect(view.table).toEqual({ class: 'table' });
    expect(view.root).toEqual({ class: 'table-host' });
  });

  it('maps the variants onto Bootstrap classes', () => {
    const view = connectTable({ responsive: true, striped: true, hover: true, bordered: true });
    expect(view.root['class']).toBe('table-host table-responsive');
    expect(view.table['class']).toBe('table table-striped table-hover table-bordered mb-0');
  });
});
