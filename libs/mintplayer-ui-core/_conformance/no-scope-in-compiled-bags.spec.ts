/**
 * PRD #437 S15: a component with a D10 manifest gets its scope from the
 * compiler, which stamps `data-mps="<group scope>"` on every native element of
 * the group's templates and on the Angular/Lit host. Its core's bags must not
 * carry one too: a bag-carried scope is either redundant or, on markup a group
 * borrows from another core (the navbar's dropdown panels, the tree-select's
 * tree rows), a second scope that the group's one sheet does not style.
 *
 * Imperative DOM a core builds itself (`setAttribute('data-mps', …)`) is not a
 * bag and stays allowed.
 */
const manifests = import.meta.glob<string>('../**/src/*.component.ts', { query: '?raw', import: 'default', eager: true });
const sources = import.meta.glob<string>(['../**/src/**/*.ts', '!../**/*.spec.ts', '!../**/generated/**', '!../**/*.styles.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const entryOf = (path: string) => path.slice(0, path.indexOf('/src/') + 1);
const compiledEntries = new Set(Object.keys(manifests).map(entryOf));

/** Object keys and JSX-ish attributes that write the scope into a bag. */
const bagScope = (ts: string): string[] => [...ts.matchAll(/['"]data-mps['"]\s*:/g)].map((match) => match[0]);

describe('no data-mps in the bags of compiled components (S15)', () => {
  const files = Object.entries(sources).filter(([path]) => compiledEntries.has(entryOf(path)));

  it('finds the manifests and their sources', () => {
    expect(compiledEntries.size).toBeGreaterThan(20);
    expect(files.length).toBeGreaterThan(compiledEntries.size);
  });

  it.each(files)('%s writes no scope into a bag', (_path, ts) => {
    expect(bagScope(ts)).toEqual([]);
  });

  it('recognises a bag-carried scope (the check is not vacuous)', () => {
    expect(bagScope("root: { 'data-mps': SCOPE, class: 'x' }")).toHaveLength(1);
    expect(bagScope("host.setAttribute('data-mps', 'dock')")).toEqual([]);
  });
});
