import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import './mp-file-manager';
import type { MpFileManager } from './mp-file-manager';
import type { FileSystemNode } from '../types/file-system-node';

/**
 * The non-keyboard input paths of `<mp-file-manager>`: the touch long-press
 * that stands in for a right-click, the upload picker that stands in for an OS
 * file drop, the drag-over feedback of that drop, and the events the embedded
 * tree and datatable report back.
 *
 * Nothing here reads geometry. The one hit-test the long-press does (which
 * node is under the finger when the event path names none) goes through the
 * private `elementAt` seam, which a test may answer — it stubs WHICH element is
 * under a point, never a rect value (P2-D4).
 */

const TREE: FileSystemNode[] = [
  { id: 'docs', parentId: null, name: 'Documents', type: 'folder' },
  { id: 'pics', parentId: null, name: 'Pictures', type: 'folder' },
  { id: 'readme', parentId: null, name: 'readme.txt', type: 'file', size: 512 },
  { id: 'work', parentId: 'docs', name: 'Work', type: 'folder' },
  { id: 'notes', parentId: 'docs', name: 'notes.md', type: 'file', size: 2048 },
  { id: 'deep', parentId: 'work', name: 'Deep', type: 'folder' },
];

let fm: MpFileManager;
let selections: string[][];

function mount(configure?: (el: MpFileManager) => void): void {
  fm = document.createElement('mp-file-manager') as MpFileManager;
  fm.viewMode = 'icons';
  fm.nodes = TREE.map((n) => ({ ...n }));
  configure?.(fm);
  selections = [];
  fm.addEventListener('mp-selection-change', (e) =>
    selections.push((e as CustomEvent<{ selectedIds: string[] }>).detail.selectedIds),
  );
  document.body.appendChild(fm);
}

afterEach(() => {
  fm?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const settle = () => fm.updateComplete;
async function settleAsync(): Promise<void> {
  await settle();
  await Promise.resolve();
  await Promise.resolve();
  await settle();
}

const internals = () =>
  fm as unknown as {
    _selection: Set<string>;
    _isTouchMode: boolean;
    elementAt(x: number, y: number): Element | null;
    openUploadPicker(): void;
    requestUpdate(): void;
  };
const cards = () => [...fm.shadowRoot!.querySelectorAll<HTMLElement>('.icon-card')];
const cardFor = (name: string) =>
  cards().find((c) => c.querySelector('.file-name')!.textContent!.trim() === name)!;
const menu = () => fm.shadowRoot!.querySelector<HTMLElement>('.context-menu');
const menuLabels = () =>
  [...fm.shadowRoot!.querySelectorAll<HTMLButtonElement>('.menu-item')].map((b) => b.textContent!.trim());
const datatable = () => fm.shadowRoot!.querySelector('mp-datatable')!;
const treeview = () =>
  fm.shadowRoot!.querySelector('mp-treeview') as HTMLElement & { expandedIds: string[] };
const toolbarButton = (label: string) =>
  fm.shadowRoot!.querySelector<HTMLButtonElement>(`.toolbar button[aria-label="${label}"]`);

/** A touch event whose event path starts at `target`. jsdom has no Touch constructor. */
function touch(type: string, target: EventTarget, touches = 1): TouchEvent {
  const ev = new Event(type, { bubbles: true, composed: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(ev, 'touches', {
    value: Array.from({ length: touches }, () => ({ clientX: 40, clientY: 60 })),
  });
  target.dispatchEvent(ev);
  return ev;
}

/** A drag event carrying a `DataTransfer`-shaped payload (jsdom has none). */
function drag(type: string, types: string[], files: File[] = []): DragEvent & { dataTransfer: { dropEffect: string } } {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(ev, 'dataTransfer', { value: { types, files, dropEffect: 'none' } });
  fm.shadowRoot!.querySelector('.content-pane')!.dispatchEvent(ev);
  return ev as DragEvent & { dataTransfer: { dropEffect: string } };
}

const file = (name: string) => new File(['x'], name, { type: 'text/plain' });

describe('long-press opens the context menu on touch', () => {
  beforeEach(async () => {
    mount();
    await settle();
    vi.useFakeTimers();
  });

  it('opens the menu on the pressed card once the finger has been held for 600 ms', async () => {
    touch('touchstart', cardFor('Documents'));
    vi.advanceTimersByTime(599);
    await settle();
    expect(menu()).toBeNull();

    vi.advanceTimersByTime(1);
    await settle();
    expect(menu()).not.toBeNull();
  });

  it('selects the pressed node so the menu acts on what the finger is on', async () => {
    touch('touchstart', cardFor('Documents'));
    vi.advanceTimersByTime(600);
    await settle();

    expect([...internals()._selection]).toEqual(['docs']);
    expect(selections.at(-1)).toEqual(['docs']);
  });

  it('keeps an existing multi-selection when the press lands on part of it', async () => {
    internals()._selection = new Set(['docs', 'pics']);
    touch('touchstart', cardFor('Pictures'));
    vi.advanceTimersByTime(600);
    await settle();

    expect([...internals()._selection]).toEqual(['docs', 'pics']);
    expect(selections).toEqual([]);
    expect(menu()).not.toBeNull();
  });

  it('is abandoned when the finger moves — that gesture is a scroll', async () => {
    touch('touchstart', cardFor('Documents'));
    vi.advanceTimersByTime(300);
    touch('touchmove', cardFor('Documents'));
    vi.advanceTimersByTime(600);
    await settle();

    expect(menu()).toBeNull();
  });

  it('is abandoned when the finger lifts early — that gesture is a tap', async () => {
    touch('touchstart', cardFor('Documents'));
    vi.advanceTimersByTime(300);
    touch('touchend', cardFor('Documents'));
    vi.advanceTimersByTime(600);
    await settle();

    expect(menu()).toBeNull();
  });

  it('is abandoned by a cancelled touch', async () => {
    touch('touchstart', cardFor('Documents'));
    touch('touchcancel', cardFor('Documents'));
    vi.advanceTimersByTime(600);
    await settle();

    expect(menu()).toBeNull();
  });

  it('ignores a multi-finger touch — that is a pinch, not a press', async () => {
    touch('touchstart', cardFor('Documents'), 2);
    vi.advanceTimersByTime(600);
    await settle();

    expect(menu()).toBeNull();
  });

  // A pinch starts as one finger: its touchstart armed the hold, and the second
  // finger's touchstart (touches.length 2) returned early without disarming it,
  // so the menu popped open in the middle of the pinch.
  it('is abandoned when a second finger joins — the press became a pinch', async () => {
    touch('touchstart', cardFor('Documents'));
    vi.advanceTimersByTime(200);
    touch('touchstart', cardFor('Documents'), 2);
    vi.advanceTimersByTime(600);
    await settle();

    expect(menu()).toBeNull();
    expect(selections).toEqual([]);
  });

  it('re-arms on a fresh press rather than firing the earlier one', async () => {
    touch('touchstart', cardFor('Documents'));
    vi.advanceTimersByTime(400);
    touch('touchstart', cardFor('Pictures'));
    vi.advanceTimersByTime(400);
    await settle();
    expect(menu()).toBeNull();

    vi.advanceTimersByTime(200);
    await settle();
    expect([...internals()._selection]).toEqual(['pics']);
    expect(menu()).not.toBeNull();
  });

  it('does not fire after the component has been removed', async () => {
    touch('touchstart', cardFor('Documents'));
    fm.remove();
    vi.advanceTimersByTime(600);

    expect(menu()).toBeNull();
    expect(selections).toEqual([]);
  });

  it('does nothing when the finger is on no node at all', async () => {
    vi.spyOn(internals(), 'elementAt').mockReturnValue(null);
    touch('touchstart', fm.shadowRoot!.querySelector('.toolbar')!);
    vi.advanceTimersByTime(600);
    await settle();

    expect(menu()).toBeNull();
  });

  it('treats a missing hit-test API as "no node under the finger"', async () => {
    touch('touchstart', fm.shadowRoot!.querySelector('.toolbar')!);
    vi.advanceTimersByTime(600);
    await settle();

    expect(menu()).toBeNull();
  });

  it('falls back to the hit-test when the event path names no node', async () => {
    const card = cardFor('Pictures');
    const hit = vi.spyOn(internals(), 'elementAt').mockReturnValue(card.querySelector('.file-name'));
    touch('touchstart', fm.shadowRoot!.querySelector('.toolbar')!);
    vi.advanceTimersByTime(600);
    await settle();

    expect(hit).toHaveBeenCalledWith(40, 60);
    expect([...internals()._selection]).toEqual(['pics']);
    expect(menu()).not.toBeNull();
  });

  it('opens the menu without selecting when selection is switched off', async () => {
    fm.selectionMode = 'none';
    await settle();
    touch('touchstart', cardFor('Documents'));
    vi.advanceTimersByTime(600);
    await settle();

    expect(internals()._selection.size).toBe(0);
    expect(menu()).not.toBeNull();
  });
});

describe('long-press in the list view', () => {
  // The list view is the default, and its rows are datatable rows keyed by
  // `data-row-key` — not `data-node-id`, which only icon cards and tree rows
  // carry. The long-press looked for the latter only, so on a phone the
  // context menu was unreachable in the default view.
  it('opens the menu on the pressed row', async () => {
    mount((el) => { el.viewMode = 'list'; });
    await settleAsync();
    const row = datatable().querySelector<HTMLElement>('tbody tr[data-row-key="readme"]');
    expect(row).not.toBeNull();

    vi.useFakeTimers();
    touch('touchstart', row!.querySelector('td') ?? row!);
    vi.advanceTimersByTime(600);
    await settle();

    expect([...internals()._selection]).toEqual(['readme']);
    expect(menu()).not.toBeNull();
  });
});

describe('touch mode', () => {
  it('ignores an OS file drop on a coarse-pointer device', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
    const requests: Event[] = [];
    mount((el) => { el.allowUpload = true; });
    fm.addEventListener('mp-upload-request', (e) => requests.push(e));
    await settle();

    drag('drop', ['Files'], [file('a.txt')]);
    await settleAsync();

    expect(requests).toEqual([]);
    expect(fm.uploads).toEqual([]);
  });

  it('treats a throwing matchMedia as a fine pointer', async () => {
    vi.stubGlobal('matchMedia', () => {
      throw new Error('unsupported query');
    });
    mount();
    await settle();

    expect(internals()._isTouchMode).toBe(false);
  });
});

describe('the upload picker', () => {
  let picked: HTMLInputElement | undefined;

  beforeEach(async () => {
    picked = undefined;
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      picked = this;
    });
    mount((el) => { el.allowUpload = true; });
    await settle();
  });

  const choose = (files: File[]) => {
    Object.defineProperty(picked!, 'files', { value: files, configurable: true });
    picked!.dispatchEvent(new Event('change'));
  };

  it('opens a multi-file picker from the Upload button', () => {
    toolbarButton('Upload')!.click();

    expect(picked).toBeDefined();
    expect(picked!.type).toBe('file');
    expect(picked!.multiple).toBe(true);
    expect(picked!.isConnected).toBe(true);
  });

  it('keeps the picker input out of sight', () => {
    toolbarButton('Upload')!.click();
    expect(picked!.hidden).toBe(true);
  });

  it('requests an upload of the chosen files into the current folder', async () => {
    const requests: CustomEvent[] = [];
    fm.addEventListener('mp-upload-request', (e) => requests.push(e as CustomEvent));
    fm.currentFolderId = 'docs';
    await settle();

    toolbarButton('Upload')!.click();
    choose([file('a.txt'), file('b.txt')]);
    await settleAsync();

    expect(requests).toHaveLength(1);
    expect(requests[0].detail.files.map((f: File) => f.name)).toEqual(['a.txt', 'b.txt']);
    expect(requests[0].detail.targetFolderId).toBe('docs');
  });

  it('removes the picker input once files are chosen', () => {
    toolbarButton('Upload')!.click();
    choose([file('a.txt')]);
    expect(picked!.isConnected).toBe(false);
  });

  it('requests nothing when the picker comes back empty', async () => {
    const requests: Event[] = [];
    fm.addEventListener('mp-upload-request', (e) => requests.push(e));
    toolbarButton('Upload')!.click();
    choose([]);
    await settleAsync();

    expect(requests).toEqual([]);
    expect(picked!.isConnected).toBe(false);
  });

  // Dismissing the OS dialog fires `cancel`, not `change`. Cleaning up only on
  // `change` left one hidden input in <body> per dismissed picker.
  it('removes the picker input when the dialog is dismissed', () => {
    toolbarButton('Upload')!.click();
    picked!.dispatchEvent(new Event('cancel'));
    expect(picked!.isConnected).toBe(false);
  });

  it('refuses to open while uploading is switched off', async () => {
    fm.allowUpload = false;
    await settle();
    internals().openUploadPicker();
    expect(picked).toBeUndefined();
  });
});

describe('the OS file drag-over feedback', () => {
  beforeEach(async () => {
    mount((el) => { el.allowUpload = true; });
    await settle();
  });

  it('marks the component as a drop target while files are dragged over it', () => {
    const ev = drag('dragenter', ['Files']);
    expect(ev.defaultPrevented).toBe(true);
    expect(fm.hasAttribute('drop-active')).toBe(true);
  });

  it('stays a drop target while the drag crosses child elements', () => {
    drag('dragenter', ['Files']);
    drag('dragenter', ['Files']);
    drag('dragleave', ['Files']);
    expect(fm.hasAttribute('drop-active')).toBe(true);

    drag('dragleave', ['Files']);
    expect(fm.hasAttribute('drop-active')).toBe(false);
  });

  it('never counts below zero on a stray dragleave', () => {
    drag('dragleave', ['Files']);
    drag('dragenter', ['Files']);
    expect(fm.hasAttribute('drop-active')).toBe(true);
  });

  it('accepts the drag over as a copy', () => {
    const ev = drag('dragover', ['Files']);
    expect(ev.defaultPrevented).toBe(true);
    expect(ev.dataTransfer.dropEffect).toBe('copy');
  });

  // A drag of text or an element from the page is not an upload; refusing to
  // preventDefault lets the browser keep its own behaviour for it.
  it('ignores a drag that carries no files', () => {
    const enter = drag('dragenter', ['text/plain']);
    const over = drag('dragover', ['text/plain']);
    expect(enter.defaultPrevented).toBe(false);
    expect(over.defaultPrevented).toBe(false);
    expect(fm.hasAttribute('drop-active')).toBe(false);
  });

  it('clears the drop target on drop', async () => {
    drag('dragenter', ['Files']);
    drag('drop', ['Files'], [file('a.txt')]);
    await settleAsync();
    expect(fm.hasAttribute('drop-active')).toBe(false);
    expect(fm.uploads).toHaveLength(1);
  });

  it('ignores the whole drag while uploading is switched off', async () => {
    fm.allowUpload = false;
    await settle();
    const enter = drag('dragenter', ['Files']);
    const over = drag('dragover', ['Files']);
    drag('dragleave', ['Files']);
    expect(enter.defaultPrevented).toBe(false);
    expect(over.defaultPrevented).toBe(false);
    expect(fm.hasAttribute('drop-active')).toBe(false);
  });

  it('ignores a drop that carries no data transfer', async () => {
    const ev = new Event('drop', { bubbles: true, cancelable: true });
    fm.shadowRoot!.querySelector('.content-pane')!.dispatchEvent(ev);
    await settleAsync();
    expect(ev.defaultPrevented).toBe(false);
    expect(fm.uploads).toEqual([]);
  });
});

describe('what the datatable reports back in the list view', () => {
  beforeEach(async () => {
    mount((el) => { el.viewMode = 'list'; });
    await settleAsync();
  });

  const rowEvent = (type: string, id: string, originalEvent: Event = new MouseEvent(type)) =>
    datatable().dispatchEvent(
      new CustomEvent(type, {
        detail: { row: TREE.find((n) => n.id === id), rowIndex: 0, rowKey: id, originalEvent },
        bubbles: true,
        composed: true,
      }),
    );

  it('opens a folder on row double-click', async () => {
    const navigations: unknown[] = [];
    fm.addEventListener('mp-navigate', (e) => navigations.push((e as CustomEvent).detail));
    rowEvent('mp-datatable-row-dblclick', 'docs');
    await settle();

    expect(navigations).toEqual([{ folderId: 'docs' }]);
  });

  it('opens a file on row double-click', () => {
    const opened: unknown[] = [];
    fm.addEventListener('mp-node-open', (e) => opened.push((e as CustomEvent).detail.node.id));
    rowEvent('mp-datatable-row-dblclick', 'readme');

    expect(opened).toEqual(['readme']);
  });

  it('opens the context menu on a row right-click, suppressing the browser menu', async () => {
    const original = new MouseEvent('contextmenu', { cancelable: true });
    rowEvent('mp-datatable-row-contextmenu', 'readme', original);
    await settleAsync();

    expect(original.defaultPrevented).toBe(true);
    expect(menu()).not.toBeNull();
  });

  it('re-emits the selection on a row click', () => {
    internals()._selection = new Set(['readme']);
    rowEvent('mp-datatable-row-click', 'readme');
    expect(selections.at(-1)).toEqual(['readme']);
  });
});

describe('what the folder tree reports back', () => {
  beforeEach(async () => {
    mount();
    await settle();
  });

  it('navigates to the folder chosen in the tree', async () => {
    treeview().dispatchEvent(
      new CustomEvent('tree-node-select', {
        detail: { node: { id: 'work', label: 'Work', children: [] }, selectedIds: ['work'] },
      }),
    );
    await settle();

    expect(fm.currentFolderId).toBe('work');
  });

  it('expands every ancestor of a deep folder it navigates to', async () => {
    treeview().dispatchEvent(
      new CustomEvent('tree-node-select', {
        detail: { node: { id: 'deep', label: 'Deep', children: [] }, selectedIds: ['deep'] },
      }),
    );
    await settle();

    expect([...treeview().expandedIds].sort()).toEqual(['deep', 'docs', 'work']);
  });

  it('hands the tree a loader that routes to the consumer and merges what it loaded', async () => {
    const loaded: FileSystemNode[] = [{ id: 'sub', parentId: 'pics', name: 'Holiday', type: 'folder' }];
    const consumer = vi.fn(async () => loaded);
    fm.loadChildren = consumer;
    internals().requestUpdate();
    await settle();

    const treeLoader = (treeview() as unknown as { loadChildren?: (id: string) => Promise<unknown[]> }).loadChildren;
    expect(treeLoader).toBeTypeOf('function');
    const children = await treeLoader!('pics');

    expect(consumer).toHaveBeenCalledWith('pics');
    expect(children).toEqual([expect.objectContaining({ id: 'sub', label: 'Holiday' })]);
    expect(fm.nodes.some((n) => n.id === 'sub')).toBe(true);
  });

  it('gives the tree no loader when the consumer has none', () => {
    expect((treeview() as unknown as { loadChildren?: unknown }).loadChildren).toBeUndefined();
  });

  it('remembers what the tree expanded and collapsed', async () => {
    treeview().dispatchEvent(new CustomEvent('tree-node-expand', { detail: { expandedIds: ['docs', 'pics'] } }));
    internals().requestUpdate();
    await settle();
    expect(treeview().expandedIds).toEqual(['docs', 'pics']);

    treeview().dispatchEvent(new CustomEvent('tree-node-collapse', { detail: { expandedIds: ['pics'] } }));
    internals().requestUpdate();
    await settle();
    expect(treeview().expandedIds).toEqual(['pics']);
  });
});

describe('the icon card context menu', () => {
  it('opens without selecting when selection is switched off', async () => {
    mount((el) => { el.selectionMode = 'none'; });
    await settle();
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    cardFor('Documents').dispatchEvent(ev);
    await settleAsync();

    expect(ev.defaultPrevented).toBe(true);
    expect(internals()._selection.size).toBe(0);
    expect(menu()).not.toBeNull();
  });

  it('lists only the operations the permission map allows', async () => {
    mount((el) => {
      el.allowOperations = { rename: false, delete: false, cut: false, copy: false, paste: false, newFolder: true };
    });
    await settle();
    cardFor('Documents').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await settleAsync();

    expect(menuLabels()).toEqual(['New folder']);
  });
});

describe('each context-menu item performs its own operation', () => {
  const openMenuOn = async (name: string) => {
    cardFor(name).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await settleAsync();
  };
  const choose = async (label: string) => {
    [...fm.shadowRoot!.querySelectorAll<HTMLButtonElement>('.menu-item')]
      .find((b) => b.textContent!.trim() === label)!
      .click();
    await settleAsync();
  };
  let ops: CustomEvent[];

  beforeEach(async () => {
    mount((el) => {
      el.dialogResolver = async (req) => (req.kind === 'prompt' ? 'Fresh' : true);
    });
    ops = [];
    fm.addEventListener('mp-operation', (e) => ops.push(e as CustomEvent));
    await settle();
  });

  it('Rename opens the rename editor on the pressed node', async () => {
    await openMenuOn('readme.txt');
    await choose('Rename');
    expect(menu()).toBeNull();
    expect((fm as unknown as { _renameTarget: string | null })._renameTarget).toBe('readme');
  });

  it('Cut then Paste requests a move of the node', async () => {
    await openMenuOn('readme.txt');
    await choose('Cut');
    fm.currentFolderId = 'docs';
    await settle();
    await openMenuOn('notes.md');
    await choose('Paste');

    expect(ops.at(-1)!.detail).toMatchObject({ kind: 'paste', mode: 'cut', sourceIds: ['readme'], targetFolderId: 'docs' });
  });

  it('Copy then Paste requests a copy of the node', async () => {
    await openMenuOn('readme.txt');
    await choose('Copy');
    await openMenuOn('readme.txt');
    await choose('Paste');

    expect(ops.at(-1)!.detail).toMatchObject({ kind: 'paste', mode: 'copy', sourceIds: ['readme'] });
  });

  it('New folder asks for a name and requests the folder', async () => {
    await openMenuOn('readme.txt');
    await choose('New folder');

    expect(ops.at(-1)!.detail).toMatchObject({ kind: 'new-folder', name: 'Fresh', parentId: null });
  });
});

describe('the view toggle', () => {
  it('switches to the icon view', async () => {
    mount((el) => { el.viewMode = 'list'; });
    await settle();
    fm.shadowRoot!.querySelector<HTMLButtonElement>('.view-toggle button[aria-label="Icons view"]')!.click();
    await settle();

    expect(fm.viewMode).toBe('icons');
    expect(cards().length).toBeGreaterThan(0);
  });
});

describe('the icon resolver', () => {
  const CUSTOM = '<svg data-custom="1"></svg>';

  it('draws the icon the consumer resolves for a card', async () => {
    const resolver = vi.fn((key: string) => (key === 'folder' ? CUSTOM : undefined));
    mount((el) => { el.iconResolver = resolver; });
    await settle();

    expect(cardFor('Documents').querySelector('[data-custom]')).not.toBeNull();
    expect(resolver).toHaveBeenCalledWith('folder', expect.objectContaining({ id: 'docs' }));
  });

  it('keeps the built-in icon when the resolver declines', async () => {
    mount((el) => { el.iconResolver = () => undefined; });
    await settle();

    expect(cardFor('readme.txt').querySelector('.file-icon svg')).not.toBeNull();
    expect(cardFor('readme.txt').querySelector('[data-custom]')).toBeNull();
  });

  it('hands the tree the resolved icon for the matching folder node', async () => {
    const resolver = vi.fn(() => CUSTOM);
    mount((el) => { el.iconResolver = resolver; });
    await settle();
    const treeResolver = (treeview() as unknown as { iconResolver(k: string, n: { id: string }): string }).iconResolver;

    expect(treeResolver('folder', { id: 'docs' })).toBe(CUSTOM);
    expect(resolver).toHaveBeenCalledWith('folder', expect.objectContaining({ id: 'docs' }));
  });

  it('falls back to the folder icon in the tree when the resolver declines', async () => {
    mount((el) => { el.iconResolver = () => undefined; });
    await settle();
    const treeResolver = (treeview() as unknown as { iconResolver(k: string, n: { id: string }): string }).iconResolver;

    expect(treeResolver('folder', { id: 'docs' })).toContain('<svg');
  });
});

describe('the browser-dialog fallback', () => {
  beforeEach(async () => {
    mount();
    await settle();
  });

  it('asks window.prompt for a new folder name when no dialog resolver is wired', async () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Archive');
    const ops: CustomEvent[] = [];
    fm.addEventListener('mp-operation', (e) => ops.push(e as CustomEvent));
    toolbarButton('New folder')!.click();
    await settleAsync();

    expect(prompt).toHaveBeenCalledWith('Folder name', 'New folder');
    expect(ops[0].detail).toMatchObject({ kind: 'new-folder', name: 'Archive' });
  });

  it('asks window.confirm before a delete when no dialog resolver is wired', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const ops: Event[] = [];
    fm.addEventListener('mp-operation', (e) => ops.push(e));
    cardFor('readme.txt').click();
    await settle();
    toolbarButton('Delete')!.click();
    await settleAsync();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(ops).toEqual([]);
  });
});

describe('localized search placeholder', () => {
  // The placeholder fell back to a hard-coded English 'Search…' when the
  // attribute was removed or the property cleared, ignoring `messages`.
  it('falls back to the localized placeholder when the attribute is removed', async () => {
    mount((el) => { el.messages = { searchPlaceholder: 'Zoeken…' }; });
    fm.setAttribute('search-placeholder', 'Find');
    await settle();
    fm.removeAttribute('search-placeholder');
    await settle();

    expect(fm.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!.placeholder).toBe('Zoeken…');
  });

  it('falls back to the localized placeholder when the property is cleared', async () => {
    mount((el) => { el.messages = { searchPlaceholder: 'Zoeken…' }; });
    fm.searchPlaceholder = 'Find';
    await settle();
    fm.searchPlaceholder = '';
    await settle();

    expect(fm.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!.placeholder).toBe('Zoeken…');
  });
});
