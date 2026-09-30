import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Condition, Group, SubQueryCondition } from './expression';
import type { EntitySchema } from './field-def';
import { cloneTree, emptyCondition, emptyGroup, emptySubquery, newId } from './default-tree';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const entity = (fields: EntitySchema['fields']): EntitySchema => ({ name: 'e', label: 'E', fields });

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('delegates to crypto.randomUUID when the platform has it', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'from-platform' });
    expect(newId()).toBe('from-platform');
  });

  it('builds an RFC 4122 v4 id from getRandomValues when randomUUID is missing', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(0xff));
    vi.stubGlobal('crypto', { getRandomValues });
    const id = newId();
    expect(getRandomValues).toHaveBeenCalledOnce();
    // All-ones input still gets the version nibble forced to 4 and the variant to 10xx.
    expect(id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(id).toMatch(UUID_V4);
  });

  it('falls back to Math.random when there is no crypto at all, still producing a v4 id', () => {
    vi.stubGlobal('crypto', undefined);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      expect(newId()).toBe('00000000-0000-4000-8000-000000000000');
      expect(random).toHaveBeenCalledTimes(16);
    } finally {
      random.mockRestore();
    }
  });

  it('returns distinct v4 ids on the real platform', () => {
    const a = newId();
    const b = newId();
    expect(a).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });
});

describe('empty nodes', () => {
  it('emptyGroup defaults to AND with no children', () => {
    expect(emptyGroup()).toMatchObject({ kind: 'group', logic: 'and', children: [] });
    expect(emptyGroup('or').logic).toBe('or');
  });

  it('emptyCondition skips relation fields and uses the first operator of the field type', () => {
    const c = emptyCondition(entity([
      { name: 'rel', label: 'R', type: 'relation', targetEntity: 'x' },
      { name: 'when', label: 'W', type: 'date' },
    ]));
    expect(c).toMatchObject({ kind: 'condition', field: 'when', operator: 'equals', value: null });
  });

  it('emptyCondition uses a relation field when that is all the entity has', () => {
    const c = emptyCondition(entity([{ name: 'rel', label: 'R', type: 'relation', targetEntity: 'x' }]));
    expect(c).toMatchObject({ field: 'rel', operator: 'in', value: [] });
  });

  it('emptyCondition on an entity with no fields is a blank equals condition', () => {
    expect(emptyCondition(entity([]))).toMatchObject({ field: '', operator: 'equals', value: null });
  });

  it('emptyCondition falls back to equals for a field type with no operators', () => {
    const c = emptyCondition(entity([{ name: 'x', label: 'X', type: 'mystery' as never }]));
    expect(c).toMatchObject({ field: 'x', operator: 'equals', value: null });
  });

  it('emptySubquery ignores relation fields without a target entity', () => {
    expect(emptySubquery(entity([{ name: 'rel', label: 'R', type: 'relation' }]))).toBeNull();
  });

  it('emptySubquery targets the first navigable relation with an IN over an empty AND body', () => {
    const sq = emptySubquery(entity([
      { name: 'dangling', label: 'D', type: 'relation' },
      { name: 'items', label: 'I', type: 'relation', targetEntity: 'items' },
    ]));
    expect(sq).toMatchObject({ kind: 'subquery', field: 'items', operator: 'in' });
    expect(sq?.subQuery).toMatchObject({ kind: 'group', logic: 'and', children: [] });
  });
});

describe('cloneTree', () => {
  const source = (): Group => {
    const tuple: Condition = { kind: 'condition', id: 'c1', field: 'n', operator: 'between', value: [1, 2] };
    const nested: Condition = {
      kind: 'condition', id: 'c2', field: 'd', operator: 'last-n-days', value: { n: 3, meta: { tags: ['a'] } },
    };
    const empty: Condition = { kind: 'condition', id: 'c3', field: 'x', operator: 'is-null', value: undefined };
    const sub: SubQueryCondition = {
      kind: 'subquery', id: 'sq', field: 'items', operator: 'in',
      subQuery: { kind: 'group', id: 'sg', logic: 'or', children: [tuple] },
    };
    return { kind: 'group', id: 'g', logic: 'and', children: [nested, empty, sub] };
  };

  it('produces an equal tree with the same ids', () => {
    expect(cloneTree(source())).toEqual(source());
  });

  it('shares no mutable structure with the original, down to nested values', () => {
    const original = source();
    const copy = cloneTree(original);
    const copyNested = copy.children[0] as Condition;
    const copySub = copy.children[2] as SubQueryCondition;

    (copyNested.value as { meta: { tags: string[] } }).meta.tags.push('b');
    ((copySub.subQuery.children[0] as Condition).value as number[])[0] = 99;
    copySub.subQuery.children.push(emptyGroup());
    copy.children.pop();

    expect(original).toEqual(source());
  });

  it('keeps primitive, null and undefined values as they are', () => {
    const c: Condition = { kind: 'condition', id: 'c', field: 'f', operator: 'equals', value: 'text' };
    expect(cloneTree(c).value).toBe('text');
    expect(cloneTree({ ...c, value: null }).value).toBeNull();
    expect(cloneTree({ ...c, value: undefined }).value).toBeUndefined();
  });
});
