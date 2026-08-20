import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import './mp-file-manager';
import type { MpFileManager } from './mp-file-manager';
import type { FileSystemNode } from '../types/file-system-node';

/**
 * The declarative surface — attributes — plus the lazy-tree bridge and the two
 * cell formatters.
 *
 * Attributes matter here beyond convenience: they are how the component is
 * configured from server-rendered markup and from an Angular template binding
 * `[attr.view-mode]`, neither of which can set a property. The enum attributes
 * validate their input rather than trusting it, because an attribute is a
 * string a human typed and `view-mode="lst"` should leave the component
 * working rather than blank.
 */

const TREE: FileSystemNode[] = [
  { id: 'docs', parentId: null, name: 'Documents', type: 'folder' },
  { id: 'readme', parentId: null, name: 'readme.txt', type: 'file', size: 512 },
];

let fm: MpFileManager;

beforeEach(() => {
  fm = document.createElement('mp-file-manager') as MpFileManager;
  document.body.appendChild(fm);
});

afterEach(() => {
  fm.remove();
  vi.restoreAllMocks();
});

const settle = () => fm.updateComplete;
const cards = () => [...fm.shadowRoot!.querySelectorAll<HTMLElement>('.icon-card')];

describe('configuration through attributes', () => {
  it('reads the current folder from an attribute', async () => {
    fm.nodes = TREE;
    fm.setAttribute('current-folder-id', 'docs');
    await settle();

    expect(fm.currentFolderId).toBe('docs');
  });

  it('reads the root folder from an attribute', async () => {
    fm.setAttribute('root-folder-id', 'docs');
    await settle();

    expect(fm.rootFolderId).toBe('docs');
  });

  it('clears the current folder when the attribute is removed', async () => {
    fm.nodes = TREE;
    fm.setAttribute('current-folder-id', 'docs');
    await settle();

    fm.removeAttribute('current-folder-id');
    await settle();

    expect(fm.currentFolderId).toBeNull();
  });

  // A boolean attribute is read by PRESENCE, so `allow-upload=""` and
  // `allow-upload="false"` both mean on — the HTML convention, and the reason
  // a consumer must remove it rather than set it to a falsy string.
  it('reads upload permission by attribute presence', async () => {
    fm.setAttribute('allow-upload', '');
    await settle();
    expect(fm.allowUpload).toBe(true);

    fm.removeAttribute('allow-upload');
    await settle();
    expect(fm.allowUpload).toBe(false);
  });

  it.each(['list', 'icons'] as const)('reads view-mode=%s', async (mode) => {
    fm.setAttribute('view-mode', mode);
    await settle();
    expect(fm.viewMode).toBe(mode);
  });

  /*
   * An enum attribute is a string a human typed. Adopting an unrecognised one
   * would leave the component rendering neither view — blank, with nothing in
   * the console — so it keeps what it had.
   */
  it('ignores a view-mode it does not recognise', async () => {
    fm.viewMode = 'icons';
    await settle();

    fm.setAttribute('view-mode', 'lst');
    await settle();

    expect(fm.viewMode).toBe('icons');
  });

  it.each(['none', 'single', 'multiple'] as const)('reads selection-mode=%s', async (mode) => {
    fm.setAttribute('selection-mode', mode);
    await settle();
    expect(fm.selectionMode).toBe(mode);
  });

  it('ignores a selection-mode it does not recognise', async () => {
    fm.selectionMode = 'multiple';
    await settle();

    fm.setAttribute('selection-mode', 'many');
    await settle();

    expect(fm.selectionMode).toBe('multiple');
  });

  // Turning selection off has to drop what was already selected, or the
  // toolbar stays enabled for a selection the user can no longer see or change.
  it('drops the selection when selection is switched off', async () => {
    fm.viewMode = 'icons';
    fm.nodes = TREE;
    fm.selectionMode = 'single';
    await settle();
    cards()[0].click();
    await settle();

    fm.setAttribute('selection-mode', 'none');
    await settle();

    expect(cards().filter((c) => c.dataset['selected'] === 'true')).toHaveLength(0);
  });

  it('reads the search placeholder from an attribute', async () => {
    fm.setAttribute('search-placeholder', 'Find a file');
    await settle();

    expect(fm.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!.placeholder).toBe(
      'Find a file',
    );
  });

  it('falls back to a default placeholder when the attribute is removed', async () => {
    fm.setAttribute('search-placeholder', 'Find a file');
    await settle();

    fm.removeAttribute('search-placeholder');
    await settle();

    expect(
      fm.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!.placeholder.length,
    ).toBeGreaterThan(0);
  });

  it('reads configuration present in the initial markup', async () => {
    const host = document.createElement('div');
    host.innerHTML =
      '<mp-file-manager view-mode="list" selection-mode="multiple" allow-upload></mp-file-manager>';
    document.body.appendChild(host);
    const declarative = host.querySelector('mp-file-manager') as MpFileManager;
    await declarative.updateComplete;

    expect(declarative.viewMode).toBe('list');
    expect(declarative.selectionMode).toBe('multiple');
    expect(declarative.allowUpload).toBe(true);

    host.remove();
  });
});

describe('the lazy tree bridge', () => {
  /*
   * With a `loadChildren` callback the folder tree is loaded on demand, and
   * this bridge is what joins the consumer's loader to the treeview's own lazy
   * machinery: it appends the new nodes to the local list so BOTH the tree and
   * the file listing re-render, then hands the folders back for the treeview's
   * bookkeeping.
   */
  const loadTreeChildren = (parentId: string) =>
    (fm as unknown as { loadTreeChildren(id: string): Promise<unknown[]> }).loadTreeChildren(
      parentId,
    );

  it('adds what the consumer loaded to the node list', async () => {
    fm.nodes = [TREE[0]];
    fm.loadChildren = async () => [
      { id: 'sub', parentId: 'docs', name: 'Sub', type: 'folder' },
      { id: 'file', parentId: 'docs', name: 'f.txt', type: 'file' },
    ];
    await settle();

    await loadTreeChildren('docs');

    expect(fm.nodes.map((n) => n.id).sort()).toEqual(['docs', 'file', 'sub']);
  });

  it('returns only the folders, which is all a tree can show', async () => {
    fm.nodes = [TREE[0]];
    fm.loadChildren = async () => [
      { id: 'sub', parentId: 'docs', name: 'Sub', type: 'folder' },
      { id: 'file', parentId: 'docs', name: 'f.txt', type: 'file' },
    ];
    await settle();

    const loaded = (await loadTreeChildren('docs')) as { id: string }[];

    expect(loaded.map((n) => n.id)).toEqual(['sub']);
  });

  it('announces what it loaded', async () => {
    const events: CustomEvent[] = [];
    fm.addEventListener('mp-children-loaded', (e) => events.push(e as CustomEvent));
    fm.nodes = [TREE[0]];
    fm.loadChildren = async () => [{ id: 'sub', parentId: 'docs', name: 'Sub', type: 'folder' }];
    await settle();

    await loadTreeChildren('docs');

    expect(events).toHaveLength(1);
    expect(events[0].detail.parentId).toBe('docs');
  });

  // Expanding a folder twice must not double its children. The dedupe is by
  // id, because a consumer's loader has no way to know what is already there.
  it('does not add a node it already has', async () => {
    fm.nodes = [TREE[0]];
    fm.loadChildren = async () => [{ id: 'sub', parentId: 'docs', name: 'Sub', type: 'folder' }];
    await settle();

    await loadTreeChildren('docs');
    await loadTreeChildren('docs');

    expect(fm.nodes.filter((n) => n.id === 'sub')).toHaveLength(1);
  });

  it('loads nothing when no loader is wired', async () => {
    fm.nodes = [TREE[0]];
    await settle();

    expect(await loadTreeChildren('docs')).toEqual([]);
  });

  it('reports an empty folder as empty rather than failing', async () => {
    fm.nodes = [TREE[0]];
    fm.loadChildren = async () => [];
    await settle();

    expect(await loadTreeChildren('docs')).toEqual([]);
  });
});

describe('the size and date cells', () => {
  const format = (row: Partial<FileSystemNode>) => ({
    size: (fm as unknown as { formatSize(r: unknown): string }).formatSize(row),
    date: (fm as unknown as { formatDate(r: unknown): string }).formatDate(row),
  });

  // A folder has no meaningful size — summing its contents would be a lie when
  // the tree is loaded lazily and most of it is not there yet.
  it('shows no size for a folder', () => {
    expect(format({ type: 'folder', size: 1024 }).size).toBe('—');
  });

  it('shows no size for a file whose size is unknown', () => {
    expect(format({ type: 'file' }).size).toBe('—');
    expect(format({ type: 'file', size: undefined }).size).toBe('—');
  });

  it('shows plain bytes below a kilobyte', () => {
    expect(format({ type: 'file', size: 0 }).size).toBe('0 B');
    expect(format({ type: 'file', size: 999 }).size).toBe('999 B');
  });

  it('steps up a unit at each threshold', () => {
    expect(format({ type: 'file', size: 1024 }).size).toBe('1.0 kB');
    expect(format({ type: 'file', size: 1024 * 1024 }).size).toBe('1.0 MB');
    expect(format({ type: 'file', size: 1024 * 1024 * 1024 }).size).toBe('1.00 GB');
  });

  it('stays in the smaller unit just below each threshold', () => {
    expect(format({ type: 'file', size: 1023 }).size).toContain('B');
    expect(format({ type: 'file', size: 1024 * 1024 - 1 }).size).toContain('kB');
    expect(format({ type: 'file', size: 1024 * 1024 * 1024 - 1 }).size).toContain('MB');
  });

  it('shows no date when there is none', () => {
    expect(format({ type: 'file' }).date).toBe('—');
  });

  it('formats a date for the locale', () => {
    const iso = '2026-05-01T10:00:00.000Z';
    expect(format({ type: 'file', modifiedAt: iso }).date).toBe(
      new Date(iso).toLocaleDateString(),
    );
  });

  // An unparseable timestamp yields "Invalid Date" from `toLocaleDateString`
  // rather than throwing, so the cell shows that rather than the raw string —
  // recorded because the `catch` suggests otherwise and can never fire.
  it('does not throw on a timestamp it cannot parse', () => {
    expect(() => format({ type: 'file', modifiedAt: 'not a date' })).not.toThrow();
  });
});

describe('selecting a range', () => {
  const THREE: FileSystemNode[] = [
    { id: 'a', parentId: null, name: 'a.txt', type: 'file' },
    { id: 'b', parentId: null, name: 'b.txt', type: 'file' },
    { id: 'c', parentId: null, name: 'c.txt', type: 'file' },
  ];

  beforeEach(async () => {
    fm.viewMode = 'icons';
    fm.selectionMode = 'multiple';
    fm.nodes = THREE;
    await settle();
  });

  const selected = () =>
    cards()
      .filter((c) => c.dataset['selected'] === 'true')
      .map((c) => c.dataset['nodeId']);

  it('extends from the last click to the shift-clicked card', async () => {
    cards()[0].click();
    await settle();

    cards()[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await settle();

    expect(selected()).toEqual(['a', 'b', 'c']);
  });

  it('extends backwards just the same', async () => {
    cards()[2].click();
    await settle();

    cards()[0].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await settle();

    expect(selected()).toEqual(['a', 'b', 'c']);
  });

  it('replaces the range when a new anchor is clicked', async () => {
    cards()[0].click();
    await settle();
    cards()[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await settle();

    cards()[1].click();
    await settle();

    expect(selected()).toEqual(['b']);
  });

  // Range selection is a multi-select gesture; in single mode it can only ever
  // mean "select this one".
  it('selects only the clicked card in single mode', async () => {
    fm.selectionMode = 'single';
    await settle();
    cards()[0].click();
    await settle();

    cards()[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await settle();

    expect(selected()).toEqual(['c']);
  });
});
