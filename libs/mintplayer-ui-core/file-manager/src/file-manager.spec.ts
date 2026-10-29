import { describe, expect, it } from 'vitest';
import {
  fileManagerCommands,
  folderEntries,
  folderTree,
  formatSize,
  mergeNodes,
  opEnabled,
  opEnabledOnAll,
  pathTo,
  type FileSystemNode,
} from './file-manager';

const TREE: FileSystemNode[] = [
  { id: 'docs', parentId: null, name: 'Documents', type: 'folder' },
  { id: 'pics', parentId: null, name: 'Pictures', type: 'folder' },
  { id: 'readme', parentId: null, name: 'readme.txt', type: 'file', size: 512 },
  { id: 'work', parentId: 'docs', name: 'Work', type: 'folder' },
  { id: 'notes', parentId: 'docs', name: 'notes.md', type: 'file', size: 2048 },
  { id: 'report', parentId: 'work', name: 'report.pdf', type: 'file', size: 5_242_880 },
];

const ids = (nodes: readonly { id: string }[]) => nodes.map((n) => n.id);

describe('folderEntries', () => {
  it('puts folders first, each group alphabetical, without a sort', () => {
    expect(ids(folderEntries(TREE, null, '', []))).toEqual(['docs', 'pics', 'readme']);
    expect(ids(folderEntries(TREE, 'docs', '', []))).toEqual(['work', 'notes']);
  });

  it('filters by a trimmed, case-insensitive substring', () => {
    expect(ids(folderEntries(TREE, null, '  PIC ', []))).toEqual(['pics']);
  });

  it('orders every entry by the sort column, numbers numerically', () => {
    expect(ids(folderEntries(TREE, null, '', [{ property: 'name', direction: 'descending' }]))).toEqual(['readme', 'pics', 'docs']);
    const sized = [...TREE, { id: 'big', parentId: null, name: 'a.bin', type: 'file' as const, size: 10_000 }];
    expect(ids(folderEntries(sized, null, '', [{ property: 'size', direction: 'ascending' }]).filter((n) => n.type === 'file'))).toEqual(['readme', 'big']);
  });
});

describe('folderTree', () => {
  it('nests folders only', () => {
    const tree = folderTree(TREE, null, false, []);
    expect(ids(tree)).toEqual(['docs', 'pics']);
    expect(ids(tree[0].children ?? [])).toEqual(['work']);
  });

  it('marks childless, unloaded folders lazy when a loader exists', () => {
    const tree = folderTree(TREE, null, true, ['pics']);
    expect(tree.map((n) => !!(n as { lazy?: boolean }).lazy)).toEqual([false, false]);
    expect((folderTree(TREE, null, true, [])[1] as { lazy?: boolean }).lazy).toBe(true);
  });
});

describe('pathTo', () => {
  it('walks outermost first, and survives a cycle', () => {
    expect(ids(pathTo(TREE, 'report'))).toEqual(['docs', 'work', 'report']);
    expect(pathTo(TREE, null)).toEqual([]);
    const cyclic: FileSystemNode[] = [
      { id: 'a', parentId: 'b', name: 'a', type: 'folder' },
      { id: 'b', parentId: 'a', name: 'b', type: 'folder' },
    ];
    expect(ids(pathTo(cyclic, 'a'))).toEqual(['b', 'a']);
  });
});

describe('permissions', () => {
  it('lets a node narrow but never widen the global flags', () => {
    expect(opEnabled(true, 'delete')).toBe(true);
    expect(opEnabled(false, 'delete')).toBe(false);
    expect(opEnabledOnAll({ delete: false }, 'delete', [{ ...TREE[0], allowOperations: { delete: true } }])).toBe(false);
    expect(opEnabled(true, 'delete', { ...TREE[0], allowOperations: { delete: false } })).toBe(false);
  });

  it('enables commands from the selection and the clipboard', () => {
    const none = fileManagerCommands(true, [], false);
    expect(none.offered.delete).toBe(true);
    expect(none.enabled).toMatchObject({ delete: false, rename: false, paste: false, newFolder: true });
    const two = fileManagerCommands(true, [TREE[1], TREE[2]], true);
    expect(two.enabled).toMatchObject({ delete: true, rename: false, paste: true });
  });
});

describe('helpers', () => {
  it('formats sizes and leaves folders blank', () => {
    expect([512, 2048, 5_242_880].map((size) => formatSize({ ...TREE[2], size }))).toEqual(['512 B', '2.0 kB', '5.0 MB']);
    expect(formatSize(TREE[0])).toBe('—');
  });

  it('merges loaded nodes without duplicates, keeping identity when nothing loaded', () => {
    expect(mergeNodes(TREE, [])).toBe(TREE);
    expect(mergeNodes(TREE, [TREE[0], { id: 'x', parentId: 'pics', name: 'x', type: 'file' }])).toHaveLength(TREE.length + 1);
  });
});
