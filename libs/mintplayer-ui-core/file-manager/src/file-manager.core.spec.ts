/**
 * The file manager core's attach, view handlers and methods, driven through
 * markup that mirrors file-manager.view.vue (the composed splitter, treeview
 * and datatable stand in as plain rows).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyBag, el, hostCore } from '../../_conformance/host-core';
import type { FileSystemNode, UploadEntry } from './file-manager';
import { fileManagerCore, type FileManagerInputs, type FileManagerTemplateView } from './file-manager.core';

const NODES: FileSystemNode[] = [
  { id: 'docs', parentId: null, name: 'Docs', type: 'folder' },
  { id: 'sub', parentId: 'docs', name: 'Sub', type: 'folder' },
  { id: 'a', parentId: null, name: 'a.txt', type: 'file', size: 10 },
  { id: 'b', parentId: null, name: 'b.txt', type: 'file', size: 20 },
  { id: 'c', parentId: null, name: 'c.txt', type: 'file', size: 30, allowOperations: { delete: false } },
  { id: 'inner', parentId: 'docs', name: 'inner.txt', type: 'file' },
];

const base = (o: Partial<FileManagerInputs> = {}): FileManagerInputs => ({
  nodes: NODES,
  rootFolderId: null,
  currentFolderId: null,
  allowUpload: true,
  allowOperations: true,
  viewMode: 'icons',
  selectionMode: 'multiple',
  selectedIds: [],
  searchPlaceholder: null,
  uploads: [],
  pending: {},
  ...o,
});

type Bag = Parameters<typeof applyBag>[1];
const b = (bag: unknown) => bag as Bag;

/** file-manager.view.vue, with plain rows standing in for the datatable. */
function markup({ view }: { view: FileManagerTemplateView }, host: HTMLElement): Node[] {
  applyBag(host, b(view.root));
  const content = view.list
    ? el(
        'table',
        null,
        el(
          'tbody',
          null,
          ...view.rows.map((r) =>
            el('tr', b({ 'data-row-key': r.id, tabindex: 0 }), el('td', null, el('span', b(r.cell), r.renameInput ? el('input', b(r.renameInput)) : el('span', b(view.rowName), r.name)))),
          ),
        ),
      )
    : el('div', b(view.grid), ...view.rows.map((r) => el('button', b(r.card), el('span', b(view.cardName), r.name))));
  return [
    el('div', b(view.live), view.announcement),
    el('div', b(view.alert), view.alertText),
    el(
      'div',
      b(view.toolbar),
      ...view.actions.map((a) => el('button', b(a.bag), a.label)),
      el('input', b(view.search)),
      el('div', b(view.viewToggle), el('button', b(view.listToggle)), el('button', b(view.iconsToggle))),
    ),
    el('nav', b(view.breadcrumb), ...view.crumbs.map((c) => el('span', b(view.crumbItem), el('button', b(c.bag), c.label)))),
    el('div', b(view.contentPane), el('div', b(view.contentBody), content), el('div', b(view.overlay), view.dropText)),
    view.menu ? el('ul', b(view.menu.list), ...view.menu.items.map((i) => el('li', b(i.li), i.button ? el('button', b(i.button), i.label) : null))) : null,
  ].filter((n): n is HTMLElement => !!n);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mount(o: Partial<FileManagerInputs> = {}) {
  const h = hostCore(fileManagerCore, base(o), { id: 'fm', markup });
  h.attach();
  const q = <T extends Element = HTMLElement>(selector: string) => h.host.querySelector<T>(selector)!;
  const card = (id: string) => [...h.host.querySelectorAll<HTMLElement>('.icon-card')].find((c) => c.dataset['nodeId'] === id)!;
  const command = (name: string) => [...h.host.querySelectorAll<HTMLButtonElement>('[data-fm-command]')].find((c) => c.dataset['fmCommand'] === name)!;
  const click = (target: Element, init: MouseEventInit = {}) => target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
  const key = (target: Element, k: string, init: KeyboardEventInit = {}) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
  const view = () => h.props().view;
  return { ...h, q, card, command, click, key, view };
}

const ops = (h: { events(name: 'operation'): unknown[] }) => h.events('operation');

describe('fileManagerCore icon view', () => {
  it('selects cards by click, ctrl and shift, and opens them on double click', () => {
    const h = mount();
    h.click(h.card('a'));
    expect(h.state().selectedIds).toEqual(['a']);
    h.click(h.card('c'), { ctrlKey: true });
    expect(h.state().selectedIds).toEqual(['a', 'c']);
    h.click(h.card('c'), { metaKey: true });
    h.click(h.card('docs'), { shiftKey: true });
    expect(h.state().selectedIds).toEqual(['a', 'docs']);
    expect(h.events('selectionChanged').at(-1)).toEqual({ selectedIds: ['a', 'docs'] });
    h.card('b').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(h.events('nodeOpen')).toEqual([{ node: NODES[3] }]);
    h.card('docs').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(h.state()).toMatchObject({ currentFolderId: 'docs', selectedIds: [] });
    expect(h.events('navigate')).toEqual([{ folderId: 'docs' }]);
    expect(h.events('selectedIdsChange').at(-1)).toEqual([]);
    h.q('nav').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  });

  it('selects one card in single mode and none in none', () => {
    const h = mount({ selectionMode: 'single' });
    h.click(h.card('a'), { ctrlKey: true });
    expect(h.state().selectedIds).toEqual(['a']);
    h.setInputs({ selectionMode: 'none' });
    expect(h.state().selectedIds).toEqual([]);
    h.click(h.card('b'));
    expect(h.state().selectedIds).toEqual([]);
  });

  it('walks the cards with the arrows, Home and End, and opens one with Enter', () => {
    const h = mount();
    h.card('a').focus();
    expect(h.state().iconFocusId).toBe('a');
    h.key(h.card('a'), 'ArrowRight');
    expect(document.activeElement).toBe(h.card('b'));
    h.key(h.card('b'), 'ArrowUp');
    h.key(h.card('a'), 'End');
    expect(h.state().iconFocusId).toBe('c');
    h.key(h.card('c'), 'Home');
    expect(h.state().iconFocusId).toBe('docs');
    h.key(h.card('docs'), 'x');
    h.key(h.card('docs'), 'ArrowDown', { altKey: true });
    expect(h.state().iconFocusId).toBe('docs');
    h.key(h.card('b'), 'Enter');
    expect(h.state().selectedIds).toEqual(['b']);
    expect(h.events('nodeOpen')).toHaveLength(1);
    h.key(h.q('nav button'), 'Enter');
    h.key(h.q('[data-fm-content]'), 'Enter');
    expect(h.events('nodeOpen')).toHaveLength(2);
  });

  it('switches views, navigates the breadcrumb and searches', async () => {
    const h = mount({ currentFolderId: 'sub' });
    h.click(h.q('[data-fm-view="list"]'));
    h.click(h.q('[data-fm-view="list"]'));
    expect(h.events('viewModeChange')).toEqual(['list']);
    h.render();
    const crumbs = [...h.host.querySelectorAll<HTMLElement>('[data-fm-navigate]')];
    expect(crumbs.map((c) => c.textContent)).toEqual(['Home', 'Docs', 'Sub']);
    h.click(crumbs[1]);
    expect(h.state().currentFolderId).toBe('docs');
    h.click(crumbs[0]);
    expect(h.state().currentFolderId).toBeNull();
    const search = h.q<HTMLInputElement>('[data-fm-search]');
    search.value = 'txt';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.state().searchQuery).toBe('txt');
    await wait(550);
    h.q('nav').dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.state().announcement).not.toBe('');
  });
});

describe('fileManagerCore commands', () => {
  it('creates a folder through the dialog resolver, or the browser prompt', async () => {
    const dialogResolver = vi.fn(async () => '  Music ');
    const h = mount({ dialogResolver });
    h.click(h.command('newFolder'));
    await settle();
    expect(ops(h)).toEqual([{ kind: 'new-folder', parentId: null, name: 'Music' }]);
    dialogResolver.mockResolvedValueOnce(null as never);
    h.key(h.q('[data-fm-content]'), 'N', { ctrlKey: true, shiftKey: true });
    await settle();
    expect(ops(h)).toHaveLength(1);
    h.setInputs({ dialogResolver: null });
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Films');
    h.click(h.command('newFolder'));
    await settle();
    expect(prompt).toHaveBeenCalled();
    expect(ops(h)).toHaveLength(2);
    h.setInputs({ allowOperations: { newFolder: false } as never });
    h.render();
    expect(h.command('newFolder')).toBeUndefined();
  });

  it('renames inline, committing on Enter or blur and cancelling on Escape', () => {
    const h = mount({ selectedIds: ['a'], viewMode: 'list' });
    h.key(h.q('tr[data-row-key="a"]'), 'F2');
    expect(h.state().renameTarget).toBe('a');
    h.render();
    const input = h.q<HTMLInputElement>('.rename-input');
    input.value = 'z.txt';
    h.click(input);
    h.key(input, 'Enter');
    expect(ops(h)).toEqual([{ kind: 'rename', nodeId: 'a', previousName: 'a.txt', newName: 'z.txt' }]);
    h.click(h.command('rename'));
    h.render();
    h.key(h.q('.rename-input'), 'Escape');
    expect(h.state().renameTarget).toBeNull();
    h.click(h.command('rename'));
    h.render();
    h.key(h.q('.rename-input'), 'a');
    h.q('.rename-input').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(ops(h)).toHaveLength(1);
    h.q('.rename-input').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });

  it('deletes the selection once confirmed, never a protected node', async () => {
    const dialogResolver = vi.fn(async () => true);
    const h = mount({ selectedIds: ['a', 'b'], dialogResolver });
    h.key(h.card('a'), 'Delete');
    await settle();
    expect(ops(h)).toEqual([{ kind: 'delete', nodeIds: ['a', 'b'] }]);
    expect(h.state().selectedIds).toEqual([]);
    h.key(h.card('a'), 'Delete');
    h.setInputs({ selectedIds: ['c'] });
    h.key(h.card('c'), 'Delete');
    await settle();
    expect(ops(h)).toHaveLength(1);
    h.setInputs({ dialogResolver: null, selectedIds: ['b'] });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    h.key(h.card('b'), 'Delete');
    await settle();
    expect(ops(h)).toHaveLength(1);
  });

  it('cuts, copies and pastes, asking about every clash', async () => {
    const conflictResolver = vi.fn(async () => ({ action: 'rename' as const, newName: 'a (2).txt' }));
    const h = mount({ selectedIds: ['inner'], currentFolderId: 'docs', conflictResolver });
    h.key(h.card('inner'), 'v', { ctrlKey: true });
    h.key(h.card('inner'), 'c', { ctrlKey: true });
    expect(h.state().clipboard).toEqual({ mode: 'copy', ids: ['inner'] });
    h.key(h.card('inner'), 'v', { ctrlKey: true });
    await settle();
    expect(ops(h)).toEqual([{ kind: 'paste', mode: 'copy', sourceIds: ['inner'], targetFolderId: 'docs', conflicts: {} }]);
    h.setInputs({ currentFolderId: null });
    h.setInputs({ selectedIds: ['inner'], nodes: [...NODES, { id: 'dup', parentId: null, name: 'inner.txt', type: 'file' }] });
    h.key(h.q('[data-fm-content]'), 'x', { metaKey: true });
    h.key(h.q('[data-fm-content]'), 'v', { ctrlKey: true });
    await settle();
    expect(conflictResolver).toHaveBeenCalledWith({ existingNode: expect.objectContaining({ id: 'dup' }), incomingName: 'inner.txt', mode: 'paste' });
    expect(ops(h).at(-1)).toMatchObject({ mode: 'cut', conflicts: { inner: { action: 'rename' } } });
    expect(h.state().clipboard).toBeNull();
  });

  it('runs no shortcut without its prerequisites, and none from an editable field', () => {
    const h = mount();
    h.key(h.q('[data-fm-content]'), 'F2');
    h.key(h.q('[data-fm-content]'), 'c', { ctrlKey: true });
    h.key(h.q('[data-fm-search]'), 'Delete');
    expect(h.state().clipboard).toBeNull();
    h.setInputs({ allowOperations: false });
    h.setInputs({ selectedIds: ['a'] });
    h.key(h.card('a'), 'c', { ctrlKey: true });
    h.card('a').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(h.state()).toMatchObject({ clipboard: null, contextMenu: null });
  });
});

describe('fileManagerCore context menu', () => {
  it('opens on a card, selecting it, focuses its first item and walks the items', () => {
    const h = mount();
    h.card('b').focus();
    h.card('b').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 6 }));
    expect(h.state()).toMatchObject({ selectedIds: ['b'], contextMenu: { x: 5, y: 6, targetId: 'b' } });
    h.render();
    const items = () => [...h.host.querySelectorAll<HTMLElement>('.context-menu .menu-item:not([disabled])')];
    h.key(items()[0], 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    h.key(items()[1], 'x');
    h.key(items()[1], 'Tab');
    expect(h.state().contextMenu).toBeNull();
    h.q('nav').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
  });

  it('runs a command from the menu and closes on Escape, an outside click or another menu', async () => {
    const dialogResolver = vi.fn(async () => true);
    const h = mount({ selectedIds: ['a'], dialogResolver });
    h.card('a').focus();
    h.key(h.card('a'), 'F10', { shiftKey: true });
    h.render();
    h.click(h.q('.context-menu [data-fm-command="copy"]'));
    expect(h.state()).toMatchObject({ contextMenu: null, clipboard: { mode: 'copy' } });
    h.key(h.card('a'), 'ContextMenu');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(h.state().contextMenu).toBeNull();
    h.key(h.card('a'), 'ContextMenu');
    h.render();
    h.click(h.q('.context-menu'));
    expect(h.state().contextMenu).not.toBeNull();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.state().contextMenu).toBeNull();
    h.key(h.card('a'), 'ContextMenu');
    h.render();
    h.click(h.q('.context-menu [data-fm-command="rename"]'));
    expect(h.state().renameTarget).toBe('a');
    h.key(h.card('a'), 'ContextMenu');
    document.body.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    expect(h.state().contextMenu).toBeNull();
    const disabled = h.command('paste');
    disabled.setAttribute('disabled', '');
    h.click(disabled);
  });
});

describe('fileManagerCore uploads', () => {
  const file = (name: string) => new File(['x'], name);
  const drag = (type: string, files: File[] = [], types = ['Files']) => {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', { value: { types, files, dropEffect: 'none' } });
    return ev;
  };

  it('shows the drop zone while files are dragged over the content, and uploads the dropped ones', async () => {
    const conflictResolver = vi.fn(async ({ incomingName }: { incomingName: string }) =>
      incomingName === 'a.txt' ? { action: 'skip' as const } : { action: 'replace' as const },
    );
    const h = mount({ conflictResolver });
    const pane = h.q('[data-fm-content]');
    pane.dispatchEvent(drag('dragenter'));
    pane.dispatchEvent(drag('dragenter'));
    expect(h.state().dropActive).toBe(true);
    const over = drag('dragover');
    pane.dispatchEvent(over);
    expect((over as unknown as { dataTransfer: { dropEffect: string } }).dataTransfer.dropEffect).toBe('copy');
    pane.dispatchEvent(drag('dragleave'));
    expect(h.state().dropActive).toBe(true);
    pane.dispatchEvent(drag('dragleave'));
    expect(h.state().dropActive).toBe(false);
    pane.dispatchEvent(drag('dragenter', [], ['text/plain']));
    pane.dispatchEvent(drag('dragover', [], ['text/plain']));
    h.q('nav').dispatchEvent(drag('dragleave'));
    pane.dispatchEvent(drag('drop', [file('a.txt'), file('b.txt'), file('new.txt')]));
    await settle();
    const [request] = h.events('uploadRequest');
    expect(request.files.map((f) => f.name)).toEqual(['b.txt', 'new.txt']);
    expect(request.conflictResolutions).toEqual([{ fileName: 'b.txt', action: 'replace', newName: undefined }]);
    expect(h.state().uploads).toHaveLength(2);
    pane.dispatchEvent(drag('drop', [file('a.txt')]));
    await settle();
    expect(h.events('uploadRequest')).toHaveLength(1);
    h.setInputs({ allowUpload: false });
    pane.dispatchEvent(drag('dragenter'));
    pane.dispatchEvent(drag('dragover'));
    pane.dispatchEvent(drag('dragleave'));
    pane.dispatchEvent(drag('drop', [file('x.txt')]));
  });

  it('picks files on a coarse pointer, where drops are ignored', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const h = mount();
    expect(h.state().touchMode).toBe(true);
    const pane = h.q('[data-fm-content]');
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { types: ['Files'], files: [file('x.txt')] } });
    pane.dispatchEvent(drop);
    h.click(h.command('upload'));
    const picker = document.body.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(picker, 'files', { value: [file('picked.txt')] });
    picker.dispatchEvent(new Event('change'));
    await settle();
    expect(h.events('uploadRequest').map((r) => r.files[0].name)).toEqual(['picked.txt']);
    expect(document.body.querySelector('input[type=file]')).toBeNull();
    h.click(h.command('upload'));
    document.body.querySelector('input[type=file]')!.dispatchEvent(new Event('cancel'));
    expect(document.body.querySelector('input[type=file]')).toBeNull();
    h.click(h.command('upload'));
    document.body.querySelector('input[type=file]')!.dispatchEvent(new Event('change'));
    h.setInputs({ allowUpload: false });
    h.key(h.q('[data-fm-content]'), 'Enter');
  });

  it('tracks upload progress, announcing outcomes only', () => {
    const entry: UploadEntry = { id: 'u1', file: file('a.png'), targetFolderId: null, progress: 0, status: 'pending' };
    const h = mount({ uploads: [entry, { ...entry, id: 'u2' }] });
    h.call('reportUploadProgress', 'u1', 50, 'uploading');
    h.call('reportUploadProgress', 'u1', 60);
    h.call('reportUploadProgress', 'u1', 100, 'done');
    h.call('reportUploadProgress', 'u2', 10, 'error', 'Too big');
    h.call('reportUploadProgress', 'nope', 10);
    expect(h.state().uploads.map((u) => [u.status, u.progress, u.error])).toEqual([['done', 100, undefined], ['error', 10, 'Too big']]);
    h.call('clearUpload', 'u1');
    h.call('clearUpload', 'nope');
    expect(h.events('uploadsChange').at(-1)!.map((u) => u.id)).toEqual(['u2']);
  });
});

describe('fileManagerCore touch hold', () => {
  const touch = (target: Element, type: string, count = 1) => {
    const ev = new Event(type, { bubbles: true });
    Object.defineProperty(ev, 'touches', { value: Array.from({ length: count }, () => ({ clientX: 3, clientY: 4 })) });
    target.dispatchEvent(ev);
  };

  it('opens the menu after a long press, never after a move or a pinch', async () => {
    const h = mount({ viewMode: 'list' });
    const row = h.q('tr[data-row-key="b"]');
    touch(row, 'touchstart');
    touch(row, 'touchmove');
    touch(row, 'touchstart', 2);
    touch(h.q('nav'), 'touchstart');
    await wait(650);
    expect(h.state().contextMenu).toBeNull();
    touch(row, 'touchstart');
    await wait(650);
    expect(h.state().contextMenu).toMatchObject({ targetId: 'b', x: 3, y: 4 });
    h.key(row, 'Enter');
    expect(h.events('nodeOpen')).toHaveLength(1);
  });
});

describe('fileManagerCore handlers, methods and inputs', () => {
  it('serves the composed children through the view', async () => {
    const loadChildren = vi.fn(async () => [NODES[1], { id: 'deep', parentId: 'docs', name: 'Deep', type: 'folder' as const }]);
    const h = mount({ loadChildren });
    const v = h.view();
    v.selection.set(['a']);
    expect(h.state().selectedIds).toEqual(['a']);
    v.sort.set([{ property: 'name', direction: 'descending' }]);
    expect(h.state().sortColumns).toHaveLength(1);
    v.treeExpanded.set(['docs']);
    expect(h.state().expandedTreeIds).toEqual(['docs']);
    const children = await v.treeLoad!('docs');
    expect(children.map((c) => c.id)).toEqual(['deep']);
    expect(h.events('childrenLoaded')).toHaveLength(1);
    v.onTreeSelect({ node: { id: 'deep' } } as never);
    expect(h.state().currentFolderId).toBe('deep');
    expect(h.state().expandedTreeIds).toEqual(['docs', 'deep']);
    v.onTreeSelect({ node: { id: 'a' } } as never);
    v.onTreeSelect({ node: { id: 'missing' } } as never);
    expect(h.state().currentFolderId).toBe('deep');
    v.onRowDblClick({ row: NODES[2] } as never);
    expect(h.events('nodeOpen')).toHaveLength(1);
    const ev = new MouseEvent('contextmenu', { clientX: 1, clientY: 2, cancelable: true });
    v.onRowContextMenu({ rowKey: 'a', originalEvent: ev } as never);
    expect(ev.defaultPrevented).toBe(true);
    expect(h.state().contextMenu).toMatchObject({ targetId: 'a' });
    h.setInputs({ loadChildren: null });
    expect(h.view().treeLoad).toBeNull();
    h.dispose();
    expect(await v.treeLoad!('docs')).toEqual([]);
  });

  it('marks and clears pending operations and reports errors', () => {
    const h = mount();
    h.call('markPending', 'a', 'rename');
    expect(h.state().pending).toEqual({ a: 'rename' });
    h.call('clearPending', 'b');
    h.call('clearPending', 'a');
    expect(h.events('pendingChange')).toEqual([{ a: 'rename' }, {}]);
    h.call('reportError', 'Nope', 'a');
    h.call('reportError', 'Nope');
    expect(h.events('errorReported')).toEqual([{ kind: 'operation', message: 'Nope', nodeId: 'a' }, { kind: 'operation', message: 'Nope' }]);
  });

  it('follows the consumer, dropping a selection whose nodes left', () => {
    const h = mount({ selectedIds: ['a', 'b'] });
    h.setInputs({ nodes: NODES.filter((n) => n.id !== 'b') });
    expect(h.state().selectedIds).toEqual(['a']);
    h.setInputs({ nodes: [...h.inputs().nodes] });
    h.setInputs({ currentFolderId: 'docs' });
    expect(h.state().currentFolderId).toBe('docs');
    h.setInputs({ selectedIds: ['inner'] });
    expect(h.state().selectedIds).toEqual(['inner']);
    h.setInputs({ viewMode: 'list', uploads: undefined as never, pending: undefined as never, currentFolderId: undefined as never, selectedIds: undefined as never });
    expect(h.state()).toMatchObject({ viewMode: 'list', uploads: [], pending: {}, currentFolderId: null, selectedIds: [] });
    expect(fileManagerCore.state!(base({ selectionMode: 'none', selectedIds: ['a'] }), undefined).selectedIds).toEqual([]);
    h.setInputs({ selectionMode: 'none', selectedIds: ['a'] });
    expect(h.state().selectedIds).toEqual([]);
  });
});
