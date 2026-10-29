import { describe, expect, it } from 'vitest';
import { ancestorIds, indexTree, treeKeyAction, visibleOrder, type TreeNode } from './tree';

const tree: TreeNode[] = [
  { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }, { id: 'a2', label: 'A2', children: [{ id: 'a2x', label: 'A2x' }] }] },
  { id: 'b', label: 'B', lazy: true },
];
const index = indexTree(tree);

describe('tree', () => {
  it('indexes every depth with parents', () => {
    expect([...index.byId.keys()]).toEqual(['a', 'a1', 'a2', 'a2x', 'b']);
    expect(index.parentById.get('a2x')?.id).toBe('a2');
    expect(index.parentById.get('a')).toBeNull();
    expect(ancestorIds(index, 'a2x')).toEqual(['a', 'a2']);
  });

  it('shows children only under expanded nodes', () => {
    expect(visibleOrder(tree, new Set()).map((n) => n.id)).toEqual(['a', 'b']);
    expect(visibleOrder(tree, new Set(['a'])).map((n) => n.id)).toEqual(['a', 'a1', 'a2', 'b']);
    expect(visibleOrder(tree, new Set(['a2'])).map((n) => n.id)).toEqual(['a', 'b']);
  });

  describe('treeKeyAction', () => {
    const expanded = new Set(['a']);
    const visible = visibleOrder(tree, expanded);
    const ctx = (id: string, extra = {}) => ({ node: index.byId.get(id) as TreeNode, expanded, visible, index, ...extra });

    it('moves through the visible order and clamps at the ends', () => {
      expect(treeKeyAction('ArrowDown', ctx('a'))).toEqual({ type: 'focus', id: 'a1' });
      expect(treeKeyAction('ArrowDown', ctx('b'))).toEqual({ type: 'focus', id: 'b' });
      expect(treeKeyAction('ArrowUp', ctx('a'))).toEqual({ type: 'focus', id: 'a' });
      expect(treeKeyAction('End', ctx('a'))).toEqual({ type: 'focus', id: 'b' });
      expect(treeKeyAction('Home', ctx('b'))).toEqual({ type: 'focus', id: 'a' });
    });

    it('expands, enters, collapses and climbs per APG', () => {
      expect(treeKeyAction('ArrowRight', ctx('b'))).toEqual({ type: 'expand', id: 'b' });
      expect(treeKeyAction('ArrowRight', ctx('a'))).toEqual({ type: 'focus', id: 'a1' });
      expect(treeKeyAction('ArrowLeft', ctx('a'))).toEqual({ type: 'collapse', id: 'a' });
      expect(treeKeyAction('ArrowLeft', ctx('a1'))).toEqual({ type: 'focus', id: 'a' });
      expect(treeKeyAction('ArrowRight', ctx('a', { rtl: true }))).toEqual({ type: 'collapse', id: 'a' });
    });

    it('maps Enter, Space and ignores foreign keys', () => {
      expect(treeKeyAction('Enter', ctx('a1'))).toEqual({ type: 'activate', id: 'a1', toggle: false });
      expect(treeKeyAction(' ', ctx('a1', { multiple: true }))).toEqual({ type: 'select', id: 'a1', additive: true });
      expect(treeKeyAction('x', ctx('a1'))).toBeNull();
    });
  });
});
