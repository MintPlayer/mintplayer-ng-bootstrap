import { describe, expect, it } from 'vitest';

import { generateEventId, generateGroupId, generateId, generateResourceId } from './id';

/**
 * Ids for records the scheduler creates itself — a drag-created event, a
 * resource added from the timeline's row menu.
 *
 * They are prefixed on purpose. An id is what a consumer keys their own store
 * by and what comes back in every subsequent event, so `evt-` vs `res-` is the
 * difference between a wrong lookup failing loudly and a wrong lookup finding
 * the wrong record. The timestamp component keeps them roughly sortable by
 * creation; the random component is what actually makes them unique, because
 * several records can be created inside one millisecond.
 */

describe('generateId', () => {
  it('prefixes with evt by default', () => {
    expect(generateId()).toMatch(/^evt-/);
  });

  it('takes a caller prefix', () => {
    expect(generateId('task')).toMatch(/^task-/);
  });

  it('has three dash-separated parts', () => {
    expect(generateId('x').split('-')).toHaveLength(3);
  });

  // Base36 keeps it short and URL-safe, which matters because these end up in
  // element ids and `data-` attributes.
  it('uses only URL-safe characters', () => {
    expect(generateId('x')).toMatch(/^x-[0-9a-z]+-[0-9a-z]+$/);
  });

  /*
   * The timestamp alone is not enough. A drag that creates several events, or a
   * paste of a multi-day range, happens well inside one millisecond — so a
   * timestamp-only id would collide and the second record would overwrite the
   * first in the consumer's store.
   */
  it('is unique across a burst within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateId()));
    expect(ids.size).toBe(500);
  });

  it('never runs the parts together', () => {
    expect(generateId('a')).not.toMatch(/--/);
    expect(generateId('a').endsWith('-')).toBe(false);
  });
});

describe('the typed generators', () => {
  it.each([
    [generateEventId, 'evt'],
    [generateResourceId, 'res'],
    [generateGroupId, 'grp'],
  ] as const)('prefixes with %#', (generate, prefix) => {
    expect(generate()).toMatch(new RegExp(`^${prefix}-`));
  });

  // The prefixes have to be distinct, or a resource id can be mistaken for an
  // event id by anything that routes on it.
  it('keeps the three kinds apart', () => {
    const prefixes = [generateEventId(), generateResourceId(), generateGroupId()].map(
      (id) => id.split('-')[0],
    );
    expect(new Set(prefixes).size).toBe(3);
  });

  it('produces unique ids per kind', () => {
    for (const generate of [generateEventId, generateResourceId, generateGroupId]) {
      const ids = new Set(Array.from({ length: 100 }, generate));
      expect(ids.size).toBe(100);
    }
  });
});
