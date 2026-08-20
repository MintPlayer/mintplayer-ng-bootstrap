import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import './mp-file-manager';
import type { MpFileManager } from './mp-file-manager';
import type { FileSystemNode } from '../types/file-system-node';

/**
 * `<mp-file-manager>` is fed one FLAT array of nodes and derives everything the
 * user sees from it: the folder tree, the breadcrumb trail, the contents of the
 * current folder, and which toolbar commands are available. None of that
 * derivation depends on geometry, so it is fully testable here even though the
 * list view it usually renders into (a virtual-scrolling datatable) is not.
 *
 * The tests drive the **icon view** for that reason: it is a plain button per
 * node, so what the component decided is directly readable. The decisions are
 * the same in both views.
 *
 * The permission model is the part with the most ways to be quietly wrong. It
 * has three layers — a global switch, a per-operation map, and a per-node
 * override — and a toolbar button that stays enabled when it should not is an
 * operation the consumer's backend then has to refuse.
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

beforeEach(() => {
  fm = document.createElement('mp-file-manager') as MpFileManager;
  fm.viewMode = 'icons';
  fm.nodes = TREE.map((n) => ({ ...n }));
  document.body.appendChild(fm);
});

afterEach(() => {
  fm.remove();
  vi.restoreAllMocks();
});

const settle = () => fm.updateComplete;

const cards = () => [...fm.shadowRoot!.querySelectorAll<HTMLElement>('.icon-card')];
const cardNames = () => cards().map((c) => c.querySelector('.file-name')!.textContent!.trim());
const crumbs = () =>
  [...fm.shadowRoot!.querySelectorAll<HTMLElement>('.breadcrumb-segment')].map((b) =>
    b.textContent!.trim(),
  );
const toolbarButton = (label: string) =>
  fm.shadowRoot!.querySelector<HTMLButtonElement>(`.toolbar button[aria-label="${label}"]`);
const search = () => fm.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!;

function file(name: string): File {
  return new File(['x'], name, { type: 'text/plain' });
}

/**
 * A file drop on the content pane. jsdom has no DataTransfer, so the event
 * carries the minimum shape the handler reads — the `types` list it checks for
 * `Files`, and the files themselves.
 */
async function drop(files: File[]): Promise<void> {
  const pane = fm.shadowRoot!.querySelector('.content-pane')!;
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { files, types: ['Files'], dropEffect: 'none' },
  });
  pane.dispatchEvent(event);
  await settle();
  // handleFiles awaits the conflict resolver before registering entries.
  await Promise.resolve();
  await Promise.resolve();
  await settle();
}

async function type(query: string): Promise<void> {
  const input = search();
  input.value = query;
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await settle();
}

describe('mp-file-manager — the contents of a folder', () => {
  it('shows only the children of the current folder', async () => {
    await settle();
    expect(cardNames()).toEqual(['Documents', 'Pictures', 'readme.txt']);
  });

  it('follows a navigation to a subfolder', async () => {
    fm.currentFolderId = 'docs';
    await settle();
    expect(cardNames()).toEqual(['Work', 'notes.md']);
  });

  // Folders first, then files, alphabetical within each — the convention every
  // file browser uses, and the reason a raw array order is never shown as-is.
  it('sorts folders before files', async () => {
    fm.nodes = [
      { id: 'z', parentId: null, name: 'zebra.txt', type: 'file' },
      { id: 'a', parentId: null, name: 'Apple', type: 'folder' },
      { id: 'b', parentId: null, name: 'aardvark.txt', type: 'file' },
      { id: 'c', parentId: null, name: 'Banana', type: 'folder' },
    ];
    await settle();
    expect(cardNames()).toEqual(['Apple', 'Banana', 'aardvark.txt', 'zebra.txt']);
  });

  it('shows an empty folder as empty', async () => {
    fm.currentFolderId = 'pics';
    await settle();
    expect(cards()).toHaveLength(0);
  });

  it('re-derives when the node list is replaced', async () => {
    fm.nodes = [{ id: 'only', parentId: null, name: 'only.txt', type: 'file' }];
    await settle();
    expect(cardNames()).toEqual(['only.txt']);
  });
});

describe('mp-file-manager — search', () => {
  it('filters the current folder by substring', async () => {
    await type('doc');
    expect(cardNames()).toEqual(['Documents']);
  });

  it('ignores case', async () => {
    await type('DOCUMENTS');
    expect(cardNames()).toEqual(['Documents']);
  });

  it('ignores surrounding whitespace', async () => {
    await type('   pic   ');
    expect(cardNames()).toEqual(['Pictures']);
  });

  // Scoped to the folder in view, not the whole tree: a global search would
  // show results the breadcrumb cannot explain.
  it('searches only inside the current folder', async () => {
    await type('report');
    expect(cards()).toHaveLength(0);
  });

  it('shows nothing when nothing matches', async () => {
    await type('zzzz');
    expect(cards()).toHaveLength(0);
  });

  it('restores the full listing when the query is cleared', async () => {
    await type('doc');
    await type('');
    expect(cardNames()).toEqual(['Documents', 'Pictures', 'readme.txt']);
  });

  it('keeps folders first among the matches', async () => {
    fm.nodes = [
      { id: 'f', parentId: null, name: 'match-file.txt', type: 'file' },
      { id: 'd', parentId: null, name: 'match-folder', type: 'folder' },
    ];
    await type('match');
    expect(cardNames()).toEqual(['match-folder', 'match-file.txt']);
  });
});

describe('mp-file-manager — the breadcrumb', () => {
  it('shows only Home at the root', async () => {
    await settle();
    expect(crumbs()).toHaveLength(1);
  });

  it('marks Home as the current location at the root', async () => {
    await settle();
    expect(
      fm.shadowRoot!.querySelector('.breadcrumb-segment')!.getAttribute('aria-current'),
    ).toBe('page');
  });

  it('walks the ancestry from the root down', async () => {
    fm.currentFolderId = 'work';
    await settle();
    expect(crumbs().slice(1)).toEqual(['Documents', 'Work']);
  });

  it('marks only the deepest segment as current', async () => {
    fm.currentFolderId = 'work';
    await settle();
    const marked = [...fm.shadowRoot!.querySelectorAll('.breadcrumb-segment')].map((b) =>
      b.getAttribute('aria-current'),
    );
    expect(marked).toEqual(['false', 'false', 'page']);
  });

  it('navigates when a segment is clicked', async () => {
    fm.currentFolderId = 'work';
    await settle();

    fm.shadowRoot!.querySelectorAll<HTMLButtonElement>('.breadcrumb-segment')[1].click();
    await settle();

    expect(fm.currentFolderId).toBe('docs');
    expect(cardNames()).toEqual(['Work', 'notes.md']);
  });

  it('returns to the root through Home', async () => {
    fm.currentFolderId = 'work';
    await settle();

    fm.shadowRoot!.querySelector<HTMLButtonElement>('.breadcrumb-segment')!.click();
    await settle();

    expect(fm.currentFolderId).toBeNull();
  });

  it('announces a navigation', async () => {
    const seen: CustomEvent[] = [];
    fm.addEventListener('mp-navigate', (e) => seen.push(e as CustomEvent));

    fm.currentFolderId = 'docs';
    await settle();
    fm.shadowRoot!.querySelector<HTMLButtonElement>('.breadcrumb-segment')!.click();
    await settle();

    expect(seen).toHaveLength(1);
    expect(seen[0].detail.folderId).toBeNull();
  });

  // A trail that cannot be walked to the root is a broken tree, and stopping is
  // better than looping forever on a dangling parent id.
  it('stops at a dangling parent rather than looping', async () => {
    fm.nodes = [{ id: 'orphan', parentId: 'ghost', name: 'Orphan', type: 'folder' }];
    fm.currentFolderId = 'orphan';
    await settle();
    expect(crumbs()).toEqual(['Home', 'Orphan']);
  });
});

describe('mp-file-manager — what operations are allowed', () => {
  const OPS = ['New folder', 'Rename', 'Delete', 'Cut', 'Copy', 'Paste'];

  it('offers every operation by default', async () => {
    await settle();
    for (const op of OPS) {
      expect(toolbarButton(op), `${op} should be offered`).not.toBeNull();
    }
  });

  // `false` is a whole-component switch, not a default to override: nothing is
  // offered at all, so the toolbar cannot suggest an action that will be refused.
  it('offers nothing when operations are switched off wholesale', async () => {
    fm.allowOperations = false;
    await settle();
    for (const op of OPS) {
      expect(toolbarButton(op), `${op} should be gone`).toBeNull();
    }
  });

  it('withdraws just the operations a flag map denies', async () => {
    fm.allowOperations = { delete: false, rename: false };
    await settle();
    expect(toolbarButton('Delete')).toBeNull();
    expect(toolbarButton('Rename')).toBeNull();
    expect(toolbarButton('Copy')).not.toBeNull();
  });

  it('treats an unmentioned operation in a flag map as allowed', async () => {
    fm.allowOperations = { delete: false };
    await settle();
    expect(toolbarButton('Cut')).not.toBeNull();
  });

  it('disables selection commands while nothing is selected', async () => {
    await settle();
    expect(toolbarButton('Delete')!.disabled).toBe(true);
    expect(toolbarButton('Copy')!.disabled).toBe(true);
  });

  it('enables them once something is selected', async () => {
    await settle();
    cards()[0].click();
    await settle();

    expect(toolbarButton('Delete')!.disabled).toBe(false);
    expect(toolbarButton('Copy')!.disabled).toBe(false);
  });

  // Rename acts on exactly one thing; enabled for a multi-selection it would
  // silently rename only one of them.
  it('keeps rename disabled for a multi-selection', async () => {
    fm.selectionMode = 'multiple';
    await settle();
    cards()[0].click();
    cards()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle();

    expect(toolbarButton('Rename')!.disabled).toBe(true);
    expect(toolbarButton('Delete')!.disabled).toBe(false);
  });

  /*
   * A per-node override beats the global default, and a selection is only as
   * permissive as its most restricted member. Getting this backwards enables a
   * delete over a read-only file, which the toolbar then has to un-do after
   * the backend refuses it.
   */
  it('refuses an operation the selected node denies', async () => {
    fm.nodes = [
      { id: 'locked', parentId: null, name: 'locked.txt', type: 'file', allowOperations: { delete: false } },
    ];
    await settle();
    cards()[0].click();
    await settle();

    expect(toolbarButton('Delete')!.disabled).toBe(true);
  });

  it('refuses when any one of several selected nodes denies it', async () => {
    fm.selectionMode = 'multiple';
    fm.nodes = [
      { id: 'free', parentId: null, name: 'free.txt', type: 'file' },
      { id: 'locked', parentId: null, name: 'locked.txt', type: 'file', allowOperations: { delete: false } },
    ];
    await settle();
    cards()[0].click();
    cards()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle();

    expect(toolbarButton('Delete')!.disabled).toBe(true);
  });

  it('allows an operation a node explicitly permits', async () => {
    fm.nodes = [
      { id: 'special', parentId: null, name: 'special.txt', type: 'file', allowOperations: { delete: true } },
    ];
    await settle();
    cards()[0].click();
    await settle();

    expect(toolbarButton('Delete')!.disabled).toBe(false);
  });

  // A per-node grant cannot re-open an operation the component has switched
  // off; the global switch is the outer gate.
  it('does not let a node override a global refusal', async () => {
    fm.allowOperations = false;
    fm.nodes = [
      { id: 'special', parentId: null, name: 'special.txt', type: 'file', allowOperations: { delete: true } },
    ];
    await settle();

    expect(toolbarButton('Delete')).toBeNull();
  });

  it('hides the upload button unless uploading is allowed', async () => {
    await settle();
    expect(toolbarButton('Upload')).toBeNull();

    fm.allowUpload = true;
    await settle();
    expect(toolbarButton('Upload')).not.toBeNull();
  });
});

describe('mp-file-manager — selection', () => {
  it('reports a selection', async () => {
    const seen: CustomEvent[] = [];
    fm.addEventListener('mp-selection-change', (e) => seen.push(e as CustomEvent));
    await settle();

    cards()[0].click();
    await settle();

    expect(seen.at(-1)!.detail.selectedIds).toEqual(['docs']);
  });

  it('replaces the selection in single mode', async () => {
    await settle();
    cards()[0].click();
    cards()[1].click();
    await settle();

    expect(cards().filter((c) => c.dataset['selected'] === 'true')).toHaveLength(1);
  });

  it('adds to the selection with a modifier in multiple mode', async () => {
    fm.selectionMode = 'multiple';
    await settle();

    cards()[0].click();
    cards()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle();

    expect(cards().filter((c) => c.dataset['selected'] === 'true')).toHaveLength(2);
  });

  it('marks the selection for assistive tech as well as visually', async () => {
    await settle();
    cards()[0].click();
    await settle();

    expect(cards()[0].getAttribute('aria-selected')).toBe('true');
    expect(cards()[1].getAttribute('aria-selected')).toBe('false');
  });

  /*
   * A selected node that disappears from the tree — deleted elsewhere, or a
   * refreshed listing — has to leave the selection with it. Otherwise the
   * toolbar stays enabled for a node that no longer exists, and the next
   * operation is dispatched against a dead id.
   */
  it('drops a selected node that leaves the tree', async () => {
    const seen: CustomEvent[] = [];
    await settle();
    cards()[0].click();
    await settle();
    fm.addEventListener('mp-selection-change', (e) => seen.push(e as CustomEvent));

    fm.nodes = TREE.filter((n) => n.id !== 'docs').map((n) => ({ ...n }));
    await settle();

    expect(seen).toHaveLength(1);
    expect(seen[0].detail.selectedIds).toEqual([]);
  });

  it('keeps a selection that survives the refresh', async () => {
    const seen: CustomEvent[] = [];
    await settle();
    cards()[0].click();
    await settle();
    fm.addEventListener('mp-selection-change', (e) => seen.push(e as CustomEvent));

    fm.nodes = TREE.map((n) => ({ ...n }));
    await settle();

    expect(seen).toHaveLength(0);
  });

  it('opens a folder on double click', async () => {
    await settle();
    cards()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();

    expect(fm.currentFolderId).toBe('docs');
  });

  // A file has no contents to navigate into, so activating one is a request to
  // the consumer rather than something the component can act on.
  it('asks the consumer to open a file rather than navigating', async () => {
    const seen: CustomEvent[] = [];
    fm.addEventListener('mp-node-open', (e) => seen.push(e as CustomEvent));
    await settle();

    cards()[2].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();

    expect(seen).toHaveLength(1);
    expect(seen[0].detail.node.id).toBe('readme');
    expect(fm.currentFolderId).toBeNull();
  });
});

describe('mp-file-manager — the view toggle', () => {
  it('reports which view is active', async () => {
    await settle();
    const [list, icons] = [
      ...fm.shadowRoot!.querySelectorAll<HTMLButtonElement>('.view-toggle button'),
    ];
    expect(list.getAttribute('aria-pressed')).toBe('false');
    expect(icons.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches view when toggled', async () => {
    await settle();
    fm.shadowRoot!.querySelectorAll<HTMLButtonElement>('.view-toggle button')[0].click();
    await settle();

    expect(fm.viewMode).toBe('list');
    expect(fm.shadowRoot!.querySelector('.icon-grid')).toBeNull();
  });

  it('keeps the current folder across a view change', async () => {
    fm.currentFolderId = 'docs';
    await settle();

    fm.viewMode = 'list';
    await settle();
    fm.viewMode = 'icons';
    await settle();

    expect(cardNames()).toEqual(['Work', 'notes.md']);
  });
});

describe('mp-file-manager — the consumer-driven status APIs', () => {
  it('tracks a pending operation on a node', () => {
    fm.markPending('docs', 'delete');
    expect([...fm.pendingOpIds]).toEqual(['docs']);

    fm.clearPending('docs');
    expect([...fm.pendingOpIds]).toEqual([]);
  });

  it('tolerates clearing something that was never pending', () => {
    expect(() => fm.clearPending('nobody')).not.toThrow();
  });

  it('announces a reported error', () => {
    const seen: CustomEvent[] = [];
    fm.addEventListener('mp-error', (e) => seen.push(e as CustomEvent));

    fm.reportError('Upload failed', 'docs');

    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toMatchObject({ message: 'Upload failed', nodeId: 'docs' });
  });

  it('starts with no uploads', () => {
    expect(fm.uploads).toEqual([]);
  });

  /*
   * An upload entry is created by a DROP, never by the progress API. That is
   * the division of labour the component is built on: it registers what the
   * user asked to upload and then reports what the consumer tells it about
   * each one, because only the consumer knows how the bytes are actually
   * travelling. `reportUploadProgress` for an id it never issued is therefore
   * a no-op rather than a new row — a phantom progress bar for a file nobody
   * dropped would be worse than silence.
   */
  it('registers an entry per dropped file', async () => {
    fm.allowUpload = true;
    await settle();

    await drop([file('a.txt'), file('b.txt')]);

    expect(fm.uploads.map((u) => u.file.name)).toEqual(['a.txt', 'b.txt']);
  });

  it('starts each entry pending at zero', async () => {
    fm.allowUpload = true;
    await settle();

    await drop([file('a.txt')]);

    expect(fm.uploads[0]).toMatchObject({ progress: 0, status: 'pending' });
  });

  it('records the folder the files landed in', async () => {
    fm.allowUpload = true;
    fm.currentFolderId = 'docs';
    await settle();

    await drop([file('a.txt')]);

    expect(fm.uploads[0].targetFolderId).toBe('docs');
  });

  it('asks the consumer to perform the upload', async () => {
    const seen: CustomEvent[] = [];
    fm.addEventListener('mp-upload-request', (e) => seen.push(e as CustomEvent));
    fm.allowUpload = true;
    await settle();

    await drop([file('a.txt')]);

    expect(seen).toHaveLength(1);
    expect(seen[0].detail.files.map((f: File) => f.name)).toEqual(['a.txt']);
    expect(seen[0].detail.uploads).toHaveLength(1);
  });

  it('ignores a drop while uploading is switched off', async () => {
    await settle();
    await drop([file('a.txt')]);
    expect(fm.uploads).toEqual([]);
  });

  it('ignores a drop carrying no files', async () => {
    fm.allowUpload = true;
    await settle();
    await drop([]);
    expect(fm.uploads).toEqual([]);
  });

  it('reports progress against an entry it issued', async () => {
    fm.allowUpload = true;
    await settle();
    await drop([file('a.txt')]);

    fm.reportUploadProgress(fm.uploads[0].id, 40);
    await settle();

    expect(fm.uploads[0].progress).toBe(40);
  });

  it('updates in place rather than adding a row', async () => {
    fm.allowUpload = true;
    await settle();
    await drop([file('a.txt')]);
    const id = fm.uploads[0].id;

    fm.reportUploadProgress(id, 40);
    fm.reportUploadProgress(id, 90);
    await settle();

    expect(fm.uploads).toHaveLength(1);
    expect(fm.uploads[0].progress).toBe(90);
  });

  it('carries a failure message', async () => {
    fm.allowUpload = true;
    await settle();
    await drop([file('a.txt')]);

    fm.reportUploadProgress(fm.uploads[0].id, 0, 'error', 'Disk full');
    await settle();

    expect(fm.uploads[0]).toMatchObject({ status: 'error', error: 'Disk full' });
  });

  it('ignores progress for an id it never issued', async () => {
    fm.reportUploadProgress('never-issued', 50);
    await settle();
    expect(fm.uploads).toEqual([]);
  });

  it('forgets an upload once cleared', async () => {
    fm.allowUpload = true;
    await settle();
    await drop([file('a.txt')]);

    fm.clearUpload(fm.uploads[0].id);
    await settle();

    expect(fm.uploads).toEqual([]);
  });

  it('tolerates clearing an upload that is not there', () => {
    expect(() => fm.clearUpload('never-issued')).not.toThrow();
  });

  // The resolver is the consumer's chance to say what a name clash means, and
  // "skip" has to actually drop the file rather than upload it anyway.
  it('skips a file the conflict resolver rejects', async () => {
    fm.allowUpload = true;
    fm.conflictResolver = async () => ({ action: 'skip' });
    await settle();

    await drop([file('readme.txt')]);

    expect(fm.uploads).toEqual([]);
  });

  it('keeps a file the resolver says to replace, and reports the decision', async () => {
    const seen: CustomEvent[] = [];
    fm.addEventListener('mp-upload-request', (e) => seen.push(e as CustomEvent));
    fm.allowUpload = true;
    fm.conflictResolver = async () => ({ action: 'replace' });
    await settle();

    await drop([file('readme.txt')]);

    expect(fm.uploads).toHaveLength(1);
    expect(seen[0].detail.conflictResolutions).toEqual([
      { fileName: 'readme.txt', action: 'replace', newName: undefined },
    ]);
  });

  it('carries the new name when the resolver renames', async () => {
    const seen: CustomEvent[] = [];
    fm.addEventListener('mp-upload-request', (e) => seen.push(e as CustomEvent));
    fm.allowUpload = true;
    fm.conflictResolver = async () => ({ action: 'rename', newName: 'readme (1).txt' });
    await settle();

    await drop([file('readme.txt')]);

    expect(seen[0].detail.conflictResolutions[0].newName).toBe('readme (1).txt');
  });

  // A clash is only a clash inside the folder being uploaded to.
  it('does not consult the resolver for a name that is free here', async () => {
    const resolver = vi.fn(async () => ({ action: 'skip' as const }));
    fm.allowUpload = true;
    fm.conflictResolver = resolver;
    await settle();

    await drop([file('brand-new.txt')]);

    expect(resolver).not.toHaveBeenCalled();
    expect(fm.uploads).toHaveLength(1);
  });

  it('does not consult the resolver for a clash in a different folder', async () => {
    const resolver = vi.fn(async () => ({ action: 'skip' as const }));
    fm.allowUpload = true;
    fm.conflictResolver = resolver;
    fm.currentFolderId = 'docs';
    await settle();

    await drop([file('readme.txt')]);

    expect(resolver).not.toHaveBeenCalled();
  });
});
