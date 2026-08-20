/**
 * The pagination package is a wire contract: two DTO classes whose defaults
 * ARE the behavior (a consumer constructing a bare request gets page 1 of 20),
 * plus type-only exports. These pins keep the defaults from drifting — a
 * changed default silently changes every consumer's first request.
 */
import { describe, expect, it } from 'vitest';

import { PaginationRequest, PaginationResponse, SortColumn } from '../index';

describe('PaginationRequest', () => {
  it('defaults to the first page of 20, unsorted', () => {
    const request = new PaginationRequest();

    expect(request.page).toBe(1);
    expect(request.perPage).toBe(20);
    expect(request.sortColumns).toEqual([]);
  });

  it('gives each instance its own sortColumns array', () => {
    const a = new PaginationRequest();
    const b = new PaginationRequest();
    a.sortColumns.push({ property: 'name', direction: 'ascending' });

    expect(b.sortColumns).toEqual([]);
  });

  it('carries typed sort columns', () => {
    const request = new PaginationRequest();
    const column: SortColumn = { property: 'createdAt', direction: 'descending' };
    request.sortColumns = [column];

    expect(request.sortColumns[0].direction).toBe('descending');
  });
});

describe('PaginationResponse', () => {
  it('defaults to an empty first page of 20 with zero totals', () => {
    const response = new PaginationResponse<string>();

    expect(response.page).toBe(1);
    expect(response.perPage).toBe(20);
    expect(response.data).toEqual([]);
    expect(response.totalRecords).toBe(0);
    expect(response.totalPages).toBe(0);
  });

  it('gives each instance its own data array', () => {
    const a = new PaginationResponse<number>();
    const b = new PaginationResponse<number>();
    a.data.push(1);

    expect(b.data).toEqual([]);
  });
});
