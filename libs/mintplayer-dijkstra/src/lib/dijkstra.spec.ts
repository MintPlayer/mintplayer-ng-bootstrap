/**
 * Behavioral pins for the dijkstra package: shortest-path selection,
 * relaxation (a cheaper route found later wins), the unreachable-destination
 * error, and the PriorityQueue ordering contract that the algorithm rests on.
 */
import { describe, expect, it } from 'vitest';

import { find_path, single_source_shortest_paths } from '../index';
import { extract_shortest_path_from_predecessor_list } from './functions/extract-shortest-path-from-predecessor-list';
import { PriorityQueue } from './priority-queue';

// The canonical example: two routes from a to d, the longer hop-count route
// being the cheaper one.
const graph = {
  a: { b: 1, c: 10 },
  b: { c: 2, d: 20 },
  c: { d: 3 },
  d: {},
};

describe('find_path', () => {
  it('finds the cheapest path, not the fewest hops', () => {
    // a->c->d costs 13, a->b->c->d costs 6.
    expect(find_path(graph, 'a', 'd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns the trivial path when start and destination coincide', () => {
    expect(find_path(graph, 'a', 'a')).toEqual(['a']);
  });

  it('follows a direct edge when it is the only route', () => {
    expect(find_path({ x: { y: 5 }, y: {} }, 'x', 'y')).toEqual(['x', 'y']);
  });

  it('throws a descriptive error when the destination is unreachable', () => {
    // d has no outgoing edges, so nothing is reachable from it.
    expect(() => find_path(graph, 'd', 'a')).toThrowError('Could not find a path from d to a.');
  });

  it('relaxes: a cheaper route discovered later replaces an earlier predecessor', () => {
    // a->z is visited first (direct edge, cost 10), then a->m->z (1+2=3)
    // must overwrite z's predecessor.
    const g = {
      a: { z: 10, m: 1 },
      m: { z: 2 },
      z: {},
    };
    expect(find_path(g, 'a', 'z')).toEqual(['a', 'm', 'z']);
  });

  it('treats missing adjacency entries as leaf nodes', () => {
    // c never appears as a key; the algorithm must not crash reaching it.
    expect(find_path({ a: { c: 1 } }, 'a', 'c')).toEqual(['a', 'c']);
  });
});

describe('single_source_shortest_paths', () => {
  it('maps every reached node to its predecessor on the cheapest route', () => {
    expect(single_source_shortest_paths(graph, 'a', 'd')).toEqual({
      b: 'a',
      c: 'b',
      d: 'c',
    });
  });
});

describe('extract_shortest_path_from_predecessor_list', () => {
  it('walks the chain from destination to source and reverses it', () => {
    expect(extract_shortest_path_from_predecessor_list({ d: 'c', c: 'b', b: 'a' }, 'd')).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('yields just the destination when it has no predecessor', () => {
    expect(extract_shortest_path_from_predecessor_list({}, 'a')).toEqual(['a']);
  });
});

describe('PriorityQueue', () => {
  it('pops the lowest-cost element first with the default sorter', () => {
    const q = PriorityQueue.make();
    q.push('expensive', 9);
    q.push('cheap', 1);
    q.push('middle', 5);

    expect(q.pop()).toEqual({ value: 'cheap', cost: 1 });
    expect(q.pop()).toEqual({ value: 'middle', cost: 5 });
    expect(q.pop()).toEqual({ value: 'expensive', cost: 9 });
  });

  it('honours a custom sorter', () => {
    const q = PriorityQueue.make({ sorter: (a, b) => b.cost - a.cost });
    q.push('cheap', 1);
    q.push('expensive', 9);

    expect(q.pop()).toEqual({ value: 'expensive', cost: 9 });
  });

  it('reports empty only when drained', () => {
    const q = PriorityQueue.make();
    expect(q.empty()).toBe(true);
    q.push('a', 1);
    expect(q.empty()).toBe(false);
    q.pop();
    expect(q.empty()).toBe(true);
  });

  it('pop on an empty queue returns undefined rather than throwing', () => {
    expect(PriorityQueue.make().pop()).toBeUndefined();
  });
});
