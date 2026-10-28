import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './generated';
import type { MpFileManager } from './generated';
import type { DialogResolver, FileSystemNode, OperationEventDetail, UploadRequestEventDetail } from '@mintplayer/ui-core/file-manager';

/**
 * The generated Lit front of the file manager (#437 D10). It derives what the
 * user sees from one flat `nodes` array: the tree, the breadcrumb, the open
 * folder and which commands are available. Most specs drive the icon view,
 * a plain button per node; the list view is a virtual-scrolling datatable
 * that jsdom cannot lay out, so its specs talk to the composed datatable
 * through its own events.
 */
const TREE: FileSystemNode[] = [
  { id: 'docs', parentId: null, name: 'Documents', type: 'folder' },
  { id: 'pics', parentId: null, name: 'Pictures', type: 'folder' },
  { id: 'readme', parentId: null, name: 'readme.txt', type: 'file', size: 512 },
  { id: 'work', parentId: 'docs', name: 'Work', type: 'folder' },
  { id: 'notes', parentId: 'docs', name: 'notes.md', type: 'file', size: 2048 },
  { id: 'report', parentId: 'work', name: 'report.pdf', type: 'file', size: 5_242_880 },
];

let fm: MpFileManager;

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Two passes: the first client render, then the hydrated one (controls enable once live). */
async function settle(): Promise<void> {
  await fm.updateComplete;
  await frame();
  await fm.updateComplete;
  await Promise.all([...fm.querySelectorAll('[data-mp-owned]')].map((el) => (el as unknown as { updateComplete?: Promise<unknown> }).updateComplete));
  await fm.updateComplete;
}

async function mount(setup: (el: MpFileManager) => void = () => undefined): Promise<MpFileManager> {
  fm = document.createElement('mp-file-manager') as MpFileManager;
  fm.viewMode = 'icons';
  fm.nodes = TREE.map((n) => ({ ...n }));
  setup(fm);
  document.body.appendChild(fm);
  await settle();
  return fm;
}

afterEach(() => {
  fm?.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const cards = () => [...fm.querySelectorAll<HTMLButtonElement>('.icon-card')];
const card = (name: string) => cards().find((c) => c.querySelector('.file-name')!.textContent!.trim() === name)!;
const cardNames = () => cards().map((c) => c.querySelector('.file-name')!.textContent!.trim());
const crumbs = () => [...fm.querySelectorAll<HTMLElement>('.breadcrumb-segment')];
const command = (name: string) => fm.querySelector<HTMLButtonElement>(`.toolbar [data-fm-command="${name}"]`);
const search = () => fm.querySelector<HTMLInputElement>('.search-input')!;
const menu = () => fm.querySelector<HTMLElement>('.context-menu');
const menuItem = (name: string) => fm.querySelector<HTMLButtonElement>(`.context-menu [data-fm-command="${name}"]`);

function record<T>(type: string): T[] {
  const seen: T[] = [];
  fm.addEventListener(type, (e) => seen.push((e as CustomEvent<T>).detail));
  return seen;
}

const click = (el: Element, init: MouseEventInit = {}) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
const key = (el: Element, name: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(event);
  return event;
};

async function open(name: string): Promise<void> {
  card(name).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await settle();
}

async function select(...names: string[]): Promise<void> {
  names.forEach((name, i) => click(card(name), { ctrlKey: i > 0 }));
  await settle();
}

const dialog = (answer: string | boolean | null) => vi.fn<DialogResolver>(() => Promise.resolve(answer));

describe('mp-file-manager: what it shows', () => {
  it('lists the open folder, folders first, then files, each alphabetically', async () => {
    await mount();
    expect(cardNames()).toEqual(['Documents', 'Pictures', 'readme.txt']);
    await open('Documents');
    expect(cardNames()).toEqual(['Work', 'notes.md']);
  });

  it('re-derives when the node list is replaced', async () => {
    await mount();
    fm.nodes = [...TREE, { id: 'a', parentId: null, name: 'archive.zip', type: 'file' }];
    await settle();
    expect(cardNames()).toEqual(['Documents', 'Pictures', 'archive.zip', 'readme.txt']);
  });

  it('filters the open folder by a case-insensitive substring, and restores it when cleared', async () => {
    await mount();
    search().value = '  READ ';
    search().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(cardNames()).toEqual(['readme.txt']);
    search().value = '';
    search().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(cardNames()).toEqual(['Documents', 'Pictures', 'readme.txt']);
  });

  it('walks the breadcrumb from Home to the open folder, current on the last', async () => {
    await mount();
    expect(crumbs().map((c) => c.textContent!.trim())).toEqual(['Home']);
    await open('Documents');
    await open('Work');
    expect(crumbs().map((c) => c.textContent!.trim())).toEqual(['Home', 'Documents', 'Work']);
    expect(crumbs().map((c) => c.getAttribute('aria-current'))).toEqual([null, null, 'page']);
    click(crumbs()[0]);
    await settle();
    expect(cardNames()).toEqual(['Documents', 'Pictures', 'readme.txt']);
  });

  it('reports a navigation and the open folder', async () => {
    await mount();
    const navigations = record<{ folderId: string | null }>('navigate');
    const folders = record<string | null>('currentfolderidchange');
    await open('Documents');
    expect(navigations).toEqual([{ folderId: 'docs' }]);
    expect(folders).toEqual(['docs']);
    expect(fm.currentFolderId).toBe('docs');
  });

  it('asks the consumer to open a file instead of navigating', async () => {
    await mount();
    const opened = record<{ node: FileSystemNode }>('nodeopen');
    await open('readme.txt');
    expect(opened.map((o) => o.node.id)).toEqual(['readme']);
    expect(cardNames()).toEqual(['Documents', 'Pictures', 'readme.txt']);
  });

  it('opens every ancestor in the tree when it navigates to a deep folder', async () => {
    await mount((el) => (el.currentFolderId = null));
    await open('Documents');
    await open('Work');
    const tree = fm.querySelector('mp-treeview') as unknown as { expandedIds: readonly string[] };
    expect([...tree.expandedIds].sort()).toEqual(['docs', 'work']);
  });
});

describe('mp-file-manager: permissions', () => {
  it('offers every operation by default, and none when operations are off', async () => {
    await mount();
    expect(['newFolder', 'rename', 'delete', 'cut', 'copy', 'paste'].map((c) => !!command(c))).toEqual([true, true, true, true, true, true]);
    fm.allowOperations = false;
    await settle();
    expect(fm.querySelectorAll('.toolbar [data-fm-command]')).toHaveLength(0);
  });

  it('withdraws exactly the operations a flag map denies', async () => {
    await mount((el) => (el.allowOperations = { delete: false }));
    expect(command('delete')).toBeNull();
    expect(command('rename')).not.toBeNull();
  });

  it('disables selection commands until something is selected, and rename for more than one', async () => {
    await mount();
    expect(command('delete')!.disabled).toBe(true);
    await select('readme.txt');
    expect(command('delete')!.disabled).toBe(false);
    expect(command('rename')!.disabled).toBe(false);
    await select('readme.txt', 'Pictures');
    expect(command('rename')!.disabled).toBe(true);
  });

  it('refuses an operation any selected node denies, and a node cannot override a global refusal', async () => {
    await mount((el) => {
      el.nodes = TREE.map((n) => (n.id === 'readme' ? { ...n, allowOperations: { delete: false } } : n));
    });
    await select('Pictures', 'readme.txt');
    expect(command('delete')!.disabled).toBe(true);
    fm.allowOperations = { cut: false };
    fm.nodes = TREE.map((n) => (n.id === 'pics' ? { ...n, allowOperations: { cut: true } } : n));
    await settle();
    expect(command('cut')).toBeNull();
  });

  it('shows the upload button only when uploading is allowed', async () => {
    await mount();
    expect(command('upload')).toBeNull();
    fm.allowUpload = true;
    await settle();
    expect(command('upload')).not.toBeNull();
  });
});

describe('mp-file-manager: selection', () => {
  it('selects one card per click, toggles with a modifier, and reports it', async () => {
    await mount();
    const changes = record<{ selectedIds: string[] }>('selectionchanged');
    await select('Pictures');
    click(card('readme.txt'), { ctrlKey: true });
    await settle();
    expect(fm.selectedIds).toEqual(['pics', 'readme']);
    expect(changes.at(-1)).toEqual({ selectedIds: ['pics', 'readme'] });
    expect(card('Pictures').getAttribute('aria-selected')).toBe('true');
    click(card('Pictures'), { ctrlKey: true });
    await settle();
    expect(card('Pictures').getAttribute('aria-selected')).toBe('false');
  });

  it('extends a range with Shift from the last selected card', async () => {
    await mount();
    await select('Documents');
    click(card('readme.txt'), { shiftKey: true });
    await settle();
    expect(fm.selectedIds).toEqual(['docs', 'pics', 'readme']);
  });

  it('keeps one card in single mode, and none when selection is off', async () => {
    await mount((el) => (el.selectionMode = 'single'));
    await select('Documents');
    click(card('readme.txt'), { ctrlKey: true });
    await settle();
    expect(fm.selectedIds).toEqual(['readme']);
    fm.selectionMode = 'none';
    await settle();
    expect(fm.selectedIds).toEqual([]);
  });

  it('drops a selected node that leaves the list, and clears on navigation', async () => {
    await mount();
    await select('Pictures', 'readme.txt');
    fm.nodes = TREE.filter((n) => n.id !== 'readme');
    await settle();
    expect(fm.selectedIds).toEqual(['pics']);
    await open('Documents');
    expect(fm.selectedIds).toEqual([]);
  });
});

describe('mp-file-manager: accessibility', () => {
  it('is a region named by its messages, and a consumer aria-label wins', async () => {
    await mount();
    expect(fm.getAttribute('role')).toBe('region');
    expect(fm.getAttribute('aria-label')).toBe('File manager');
    fm.messages = { ariaFileManager: 'Bestandsbeheer' };
    await settle();
    expect(fm.getAttribute('aria-label')).toBe('Bestandsbeheer');
    fm.setAttribute('aria-label', 'Project files');
    await settle();
    expect(fm.getAttribute('aria-label')).toBe('Project files');
  });

  it('names the toolbar, the view switch, the search box and the breadcrumb', async () => {
    await mount();
    expect(fm.querySelector('.toolbar')!.getAttribute('aria-label')).toBe('File manager toolbar');
    expect(fm.querySelector('.view-toggle')!.getAttribute('aria-label')).toBe('View mode');
    expect(search().getAttribute('aria-label')).toBe('Search…');
    expect(fm.querySelector('nav.breadcrumb-bar')!.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('moves aria-pressed between the view buttons', async () => {
    await mount();
    const [list, icons] = [...fm.querySelectorAll<HTMLButtonElement>('[data-fm-view]')];
    expect([list.getAttribute('aria-pressed'), icons.getAttribute('aria-pressed')]).toEqual(['false', 'true']);
    const modes = record<string>('viewmodechange');
    click(list);
    await settle();
    expect(modes).toEqual(['list']);
    expect(fm.querySelector('[data-fm-view="list"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(fm.querySelector('mp-datatable')).not.toBeNull();
  });

  it('shows the icon view as a multiselectable listbox with one roving tab stop', async () => {
    await mount();
    const grid = fm.querySelector('.icon-grid')!;
    expect(grid.getAttribute('role')).toBe('listbox');
    expect(grid.getAttribute('aria-multiselectable')).toBe('true');
    expect(cards().map((c) => c.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    cards()[0].focus();
    key(cards()[0], 'ArrowRight');
    await settle();
    expect(document.activeElement).toBe(card('Pictures'));
    expect(cards().map((c) => c.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    key(card('Pictures'), 'End');
    await settle();
    expect(document.activeElement).toBe(card('readme.txt'));
  });

  it('announces a finished upload politely and a failed one assertively', async () => {
    await mount((el) => (el.allowUpload = true));
    const file = new File(['x'], 'a.txt');
    fm.uploads = [{ id: 'u1', file, targetFolderId: null, progress: 0, status: 'uploading' }];
    await settle();
    fm.reportUploadProgress('u1', 100, 'done');
    await settle();
    expect(fm.querySelector('[role="status"]')!.textContent).toBe('Upload of a.txt complete.');
    fm.reportUploadProgress('u1', 100, 'error');
    await settle();
    expect(fm.querySelector('[role="alert"]')!.textContent).toBe('Upload of a.txt failed.');
  });
});

describe('mp-file-manager: operations', () => {
  it('asks for a folder name and requests the folder in the open folder', async () => {
    const resolver = dialog('  Invoices ');
    await mount((el) => (el.dialogResolver = resolver));
    await open('Documents');
    const operations = record<OperationEventDetail>('operation');
    click(command('newFolder')!);
    await settle();
    expect(resolver).toHaveBeenCalledWith({ kind: 'prompt', label: 'Folder name', defaultValue: 'New folder' });
    expect(operations).toEqual([{ kind: 'new-folder', parentId: 'docs', name: 'Invoices' }]);
  });

  it('requests nothing for a cancelled or blank name', async () => {
    await mount((el) => (el.dialogResolver = dialog(null)));
    const operations = record<OperationEventDetail>('operation');
    click(command('newFolder')!);
    await settle();
    fm.dialogResolver = dialog('   ');
    click(command('newFolder')!);
    await settle();
    expect(operations).toEqual([]);
  });

  it('confirms a delete with the count, requests it and clears the selection', async () => {
    const resolver = dialog(true);
    await mount((el) => (el.dialogResolver = resolver));
    await select('Pictures', 'readme.txt');
    const operations = record<OperationEventDetail>('operation');
    key(card('readme.txt'), 'Delete');
    await settle();
    expect(resolver).toHaveBeenCalledWith({ kind: 'confirm', message: 'Delete 2 items?' });
    expect(operations).toEqual([{ kind: 'delete', nodeIds: ['pics', 'readme'] }]);
    expect(fm.selectedIds).toEqual([]);
  });

  it('requests nothing when the delete is declined', async () => {
    await mount((el) => (el.dialogResolver = dialog(false)));
    await select('readme.txt');
    const operations = record<OperationEventDetail>('operation');
    click(command('delete')!);
    await settle();
    expect(operations).toEqual([]);
  });

  it('copies into the open folder and keeps the clipboard; a cut is marked and emptied by its paste', async () => {
    await mount();
    await select('readme.txt');
    key(card('readme.txt'), 'c', { ctrlKey: true });
    await open('Documents');
    const operations = record<OperationEventDetail>('operation');
    click(command('paste')!);
    await settle();
    expect(operations.at(-1)).toEqual({ kind: 'paste', mode: 'copy', sourceIds: ['readme'], targetFolderId: 'docs', conflicts: {} });
    expect(command('paste')!.disabled).toBe(false);

    await select('notes.md');
    click(command('cut')!);
    await settle();
    expect(card('notes.md').getAttribute('data-cut')).toBe('true');
    key(card('notes.md'), 'v', { ctrlKey: true });
    await settle();
    expect(operations.at(-1)).toMatchObject({ kind: 'paste', mode: 'cut', sourceIds: ['notes'] });
    expect(command('paste')!.disabled).toBe(true);
  });

  it('asks the conflict resolver about a name that exists in the target, and carries the decision', async () => {
    const resolver = vi.fn(() => Promise.resolve({ action: 'rename' as const, newName: 'notes (2).md' }));
    await mount((el) => {
      el.conflictResolver = resolver;
      el.nodes = [...TREE, { id: 'notes2', parentId: null, name: 'notes.md', type: 'file' }];
    });
    await open('Documents');
    await select('notes.md');
    click(command('copy')!);
    click(crumbs()[0]);
    await settle();
    const operations = record<OperationEventDetail>('operation');
    click(command('paste')!);
    await settle();
    expect(resolver).toHaveBeenCalledWith(expect.objectContaining({ incomingName: 'notes.md', mode: 'paste' }));
    expect(operations[0]).toMatchObject({ kind: 'paste', conflicts: { notes: { action: 'rename', newName: 'notes (2).md' } } });
  });
});

describe('mp-file-manager: rename (list view)', () => {
  async function renaming(): Promise<HTMLInputElement> {
    await mount((el) => {
      el.viewMode = 'list';
      el.selectedIds = ['readme'];
    });
    click(command('rename')!);
    await settle();
    await frame();
    return fm.querySelector<HTMLInputElement>('.rename-input')!;
  }

  it('opens a named editor on the selected row and requests the rename on Enter', async () => {
    const input = await renaming();
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-label')).toBe('New name for readme.txt');
    const operations = record<OperationEventDetail>('operation');
    input.value = ' README.md ';
    key(input, 'Enter');
    await settle();
    expect(operations).toEqual([{ kind: 'rename', nodeId: 'readme', previousName: 'readme.txt', newName: 'README.md' }]);
    expect(fm.querySelector('.rename-input')).toBeNull();
  });

  it('abandons the edit on Escape, and an unchanged name requests nothing', async () => {
    const input = await renaming();
    const operations = record<OperationEventDetail>('operation');
    input.value = 'other.txt';
    key(input, 'Escape');
    await settle();
    expect(fm.querySelector('.rename-input')).toBeNull();
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(operations).toEqual([]);
  });

  it('commits when the editor loses focus, and the editor keeps the file shortcuts', async () => {
    const resolver = dialog(true);
    const input = await renaming();
    fm.dialogResolver = resolver;
    key(input, 'Delete');
    key(input, 'c', { ctrlKey: true });
    await settle();
    expect(resolver).not.toHaveBeenCalled();
    const operations = record<OperationEventDetail>('operation');
    input.value = 'notes.txt';
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle();
    expect(operations).toEqual([{ kind: 'rename', nodeId: 'readme', previousName: 'readme.txt', newName: 'notes.txt' }]);
  });
});

describe('mp-file-manager: the list view', () => {
  const datatable = () => fm.querySelector('mp-datatable')!;
  const row = (name: string): FileSystemNode => TREE.find((n) => n.name === name)!;
  const fire = (type: string, detail: unknown) => datatable().dispatchEvent(new CustomEvent(type, { detail }));

  beforeEach(async () => {
    await mount((el) => (el.viewMode = 'list'));
  });

  it('opens a folder or a file on a row double click', async () => {
    const opened = record<{ node: FileSystemNode }>('nodeopen');
    fire('rowdblclick', { row: row('readme.txt'), rowIndex: 2, rowKey: 'readme', originalEvent: new MouseEvent('dblclick') });
    fire('rowdblclick', { row: row('Documents'), rowIndex: 0, rowKey: 'docs', originalEvent: new MouseEvent('dblclick') });
    await settle();
    expect(opened.map((o) => o.node.id)).toEqual(['readme']);
    expect(fm.currentFolderId).toBe('docs');
  });

  it('opens the context menu on a row right click, suppressing the browser menu, and selects the row', async () => {
    const original = new MouseEvent('contextmenu', { cancelable: true, clientX: 40, clientY: 60 });
    fire('rowcontextmenu', { row: row('readme.txt'), rowIndex: 2, rowKey: 'readme', originalEvent: original });
    await settle();
    expect(original.defaultPrevented).toBe(true);
    expect(menu()).not.toBeNull();
    expect(fm.selectedIds).toEqual(['readme']);
  });

  it('takes the selection the datatable reports', async () => {
    const changes = record<{ selectedIds: string[] }>('selectionchanged');
    fire('selectedidschange', ['pics']);
    await settle();
    expect(fm.selectedIds).toEqual(['pics']);
    expect(changes).toEqual([{ selectedIds: ['pics'] }]);
  });

  it('hands the datatable its rows already sorted, with sorting left to the file manager', async () => {
    const table = datatable() as unknown as { data: FileSystemNode[]; autoSort: boolean };
    expect(table.autoSort).toBe(false);
    expect(table.data.map((n) => n.id)).toEqual(['docs', 'pics', 'readme']);
    fire('sortcolumnschange', [{ property: 'name', direction: 'descending' }]);
    await settle();
    expect((datatable() as unknown as { data: FileSystemNode[] }).data.map((n) => n.id)).toEqual(['readme', 'pics', 'docs']);
  });
});

describe('mp-file-manager: context menu', () => {
  it('is a named menu that takes focus on open, roves with arrows and returns focus on Escape', async () => {
    await mount();
    card('readme.txt').focus();
    card('readme.txt').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 20 }));
    await settle();
    await frame();
    expect(menu()!.getAttribute('role')).toBe('menu');
    expect(menu()!.getAttribute('aria-label')).toBe('File operations');
    expect(fm.selectedIds).toEqual(['readme']);
    const enabled = [...menu()!.querySelectorAll<HTMLButtonElement>('.menu-item:not([disabled])')];
    expect(document.activeElement).toBe(enabled[0]);
    key(enabled[0], 'ArrowDown');
    expect(document.activeElement).toBe(enabled[1]);
    key(enabled[1], 'Escape');
    await settle();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(card('readme.txt'));
  });

  it('runs a command and closes', async () => {
    await mount((el) => (el.dialogResolver = dialog(true)));
    const operations = record<OperationEventDetail>('operation');
    card('readme.txt').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await settle();
    click(menuItem('delete')!);
    await settle();
    expect(menu()).toBeNull();
    expect(operations).toEqual([{ kind: 'delete', nodeIds: ['readme'] }]);
  });

  it('opens from the keyboard on the selection with Shift+F10', async () => {
    await mount();
    await select('Pictures');
    key(card('Pictures'), 'F10', { shiftKey: true });
    await settle();
    expect(menu()).not.toBeNull();
  });
});

describe('mp-file-manager: touch and upload', () => {
  const touch = (target: Element, type: string, count = 1) => {
    const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
    const touches = Array.from({ length: count }, () => ({ clientX: 5, clientY: 5, target }));
    Object.defineProperty(event, 'touches', { value: touches });
    target.dispatchEvent(event);
  };

  it('opens the menu after a 600 ms press on a node, and a move abandons it', async () => {
    await mount();
    vi.useFakeTimers();
    touch(card('Pictures'), 'touchstart');
    touch(card('Pictures'), 'touchmove');
    vi.advanceTimersByTime(700);
    expect(fm.selectedIds).toEqual([]);
    touch(card('Pictures'), 'touchstart');
    vi.advanceTimersByTime(599);
    expect(fm.selectedIds).toEqual([]);
    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    await settle();
    expect(fm.selectedIds).toEqual(['pics']);
    expect(menu()).not.toBeNull();
  });

  it('ignores a two-finger touch', async () => {
    await mount();
    vi.useFakeTimers();
    touch(card('Pictures'), 'touchstart', 2);
    vi.advanceTimersByTime(700);
    vi.useRealTimers();
    await settle();
    expect(menu()).toBeNull();
  });

  async function drop(files: File[]): Promise<void> {
    const pane = fm.querySelector('.content-pane')!;
    const transfer = { types: ['Files'], files, dropEffect: 'none' };
    const fire = (type: string) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: transfer });
      pane.dispatchEvent(event);
    };
    fire('dragenter');
    await settle();
    expect(fm.classList.contains('drop-active')).toBe(true);
    fire('drop');
    await settle();
  }

  it('turns a file drop into an upload request in the open folder, tracked in uploads', async () => {
    await mount((el) => (el.allowUpload = true));
    const requests = record<UploadRequestEventDetail>('uploadrequest');
    await drop([new File(['x'], 'a.txt'), new File(['y'], 'b.txt')]);
    expect(fm.classList.contains('drop-active')).toBe(false);
    expect(requests[0].files.map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
    expect(requests[0].targetFolderId).toBeNull();
    expect(fm.uploads.map((u) => u.status)).toEqual(['pending', 'pending']);
    fm.clearUpload(fm.uploads[0].id);
    await settle();
    expect(fm.uploads).toHaveLength(1);
  });

  it('skips an upload the conflict resolver skips', async () => {
    await mount((el) => {
      el.allowUpload = true;
      el.conflictResolver = () => Promise.resolve({ action: 'skip' });
    });
    const requests = record<UploadRequestEventDetail>('uploadrequest');
    await drop([new File(['x'], 'readme.txt'), new File(['y'], 'new.txt')]);
    expect(requests[0].files.map((f) => f.name)).toEqual(['new.txt']);
  });

  it('opens a hidden multi-file picker from the Upload button', async () => {
    await mount((el) => (el.allowUpload = true));
    const clicked = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    click(command('upload')!);
    const picker = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(clicked).toHaveBeenCalled();
    expect(picker.multiple).toBe(true);
    expect(picker.hidden).toBe(true);
    picker.dispatchEvent(new Event('cancel'));
    expect(document.body.querySelector('input[type="file"]')).toBeNull();
  });
});

describe('mp-file-manager: methods', () => {
  it('tracks pending operations two-way', async () => {
    await mount();
    const changes = record<Record<string, string>>('pendingchange');
    fm.markPending('readme', 'rename');
    await settle();
    expect(card('readme.txt').getAttribute('aria-busy')).toBe('true');
    fm.clearPending('readme');
    await settle();
    expect(changes).toEqual([{ readme: 'rename' }, {}]);
    expect(card('readme.txt').hasAttribute('aria-busy')).toBe(false);
  });

  it('reports an error for the consumer', async () => {
    await mount();
    const errors = record<unknown>('errorreported');
    fm.reportError('Disk full', 'readme');
    expect(errors).toEqual([{ kind: 'operation', message: 'Disk full', nodeId: 'readme' }]);
  });
});

describe('mp-file-manager: lazy tree', () => {
  it('routes the tree loader to the consumer, merges what it loaded and reports it', async () => {
    const loader = vi.fn(() => Promise.resolve([{ id: 'sub', parentId: 'pics', name: 'Holiday', type: 'folder' as const }]));
    await mount((el) => (el.loadChildren = loader));
    const loaded = record<{ parentId: string }>('childrenloaded');
    const tree = fm.querySelector('mp-treeview') as unknown as { loadChildren: (id: string) => Promise<{ id: string }[]> };
    const children = await tree.loadChildren('pics');
    await settle();
    expect(loader).toHaveBeenCalledWith('pics');
    expect(children.map((c) => c.id)).toEqual(['sub']);
    expect(loaded.map((l) => l.parentId)).toEqual(['pics']);
    await open('Pictures');
    expect(cardNames()).toEqual(['Holiday']);
  });

  it('gives the tree no loader without one', async () => {
    await mount();
    expect((fm.querySelector('mp-treeview') as unknown as { loadChildren: unknown }).loadChildren).toBeNull();
  });
});
