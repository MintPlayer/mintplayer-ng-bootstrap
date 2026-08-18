import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import './mp-file-manager';
import type { MpFileManager } from './mp-file-manager';
import type { FileSystemNode } from '../types/file-system-node';

/**
 * The file operations: new folder, rename, delete, cut/copy/paste, and the
 * context menu that offers them.
 *
 * **The component never mutates the consumer's data.** Every operation is a
 * REQUEST — an `mp-operation` event the application acts on, or does not. That
 * is why these tests assert events rather than state: there is no state to
 * assert. It also means the two resolver hooks are load-bearing rather than
 * cosmetic. `dialogResolver` replaces `window.prompt`/`window.confirm`, which
 * an application needs both for styling and because a headless environment has
 * neither; `conflictResolver` decides what a name clash means.
 *
 * Two rules run through all of it, and both are the kind that break quietly:
 * a cancelled dialog must emit NOTHING (an application that trusted the event
 * would delete files the user said not to), and every command must respect the
 * permission model before it fires.
 */

const TREE: FileSystemNode[] = [
  { id: 'docs', parentId: null, name: 'Documents', type: 'folder' },
  { id: 'pics', parentId: null, name: 'Pictures', type: 'folder' },
  { id: 'readme', parentId: null, name: 'readme.txt', type: 'file', size: 512 },
  { id: 'notes', parentId: 'docs', name: 'notes.md', type: 'file' },
  { id: 'clash', parentId: 'docs', name: 'readme.txt', type: 'file' },
];

let fm: MpFileManager;
let operations: CustomEvent[];

beforeEach(() => {
  fm = document.createElement('mp-file-manager') as MpFileManager;
  fm.viewMode = 'icons';
  fm.nodes = TREE.map((n) => ({ ...n }));
  operations = [];
  fm.addEventListener('mp-operation', (e) => operations.push(e as CustomEvent));
  document.body.appendChild(fm);
});

afterEach(() => {
  fm.remove();
  vi.restoreAllMocks();
});

const settle = () => fm.updateComplete;

/** Let a resolver promise and the re-render that follows it both land. */
async function settleAsync(): Promise<void> {
  await settle();
  await Promise.resolve();
  await Promise.resolve();
  await settle();
}

const cards = () => [...fm.shadowRoot!.querySelectorAll<HTMLElement>('.icon-card')];
const cardFor = (name: string) =>
  cards().find((c) => c.querySelector('.file-name')!.textContent!.trim() === name)!;
const toolbarButton = (label: string) =>
  fm.shadowRoot!.querySelector<HTMLButtonElement>(`.toolbar button[aria-label="${label}"]`)!;
const menu = () => fm.shadowRoot!.querySelector<HTMLElement>('.context-menu');
const menuItems = () => [...fm.shadowRoot!.querySelectorAll<HTMLButtonElement>('.menu-item')];
const menuItem = (label: string) => menuItems().find((b) => b.textContent!.trim() === label)!;
/*
 * The rename editor lives in the LIST view, because it is a cell renderer the
 * datatable draws — which means it renders inside the datatable's own shadow
 * root, one boundary deeper than everything else here. The icon view has no
 * rename affordance of its own; `F2` there sets the target and nothing appears
 * until the user switches views.
 */
const datatable = () => fm.shadowRoot!.querySelector('mp-datatable');
const renameInput = () =>
  datatable()?.shadowRoot?.querySelector<HTMLInputElement>('.rename-input') ?? null;

/** Select a row the way the datatable reports it, and switch to the list view. */
async function selectInList(ids: string[]): Promise<void> {
  fm.viewMode = 'list';
  await settleAsync();
  datatable()!.dispatchEvent(
    new CustomEvent('mp-datatable-selection-change', {
      detail: { selectedIds: ids, selectedRows: ids.map((id) => TREE.find((n) => n.id === id)) },
      bubbles: true,
      composed: true,
    }),
  );
  await settleAsync();
}

async function select(name: string): Promise<void> {
  await settle();
  cardFor(name).click();
  await settle();
}

const key = (init: KeyboardEventInit) =>
  new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, ...init });

describe('new folder', () => {
  it('asks the consumer for a name and requests the folder', async () => {
    fm.dialogResolver = async () => 'Invoices';
    await settle();

    toolbarButton('New folder').click();
    await settleAsync();

    expect(operations).toHaveLength(1);
    expect(operations[0].detail).toMatchObject({
      kind: 'new-folder',
      parentId: null,
      name: 'Invoices',
    });
  });

  it('creates it inside the folder currently open', async () => {
    fm.dialogResolver = async () => 'Sub';
    fm.currentFolderId = 'docs';
    await settle();

    toolbarButton('New folder').click();
    await settleAsync();

    expect(operations[0].detail.parentId).toBe('docs');
  });

  it('offers a default name to the dialog', async () => {
    const resolver = vi.fn(async () => 'X');
    fm.dialogResolver = resolver;
    await settle();

    toolbarButton('New folder').click();
    await settleAsync();

    expect(resolver.mock.calls[0][0]).toMatchObject({ kind: 'prompt' });
    expect((resolver.mock.calls[0][0] as { defaultValue?: string }).defaultValue).toBeTruthy();
  });

  it('trims the name it was given', async () => {
    fm.dialogResolver = async () => '  Spaced  ';
    await settle();

    toolbarButton('New folder').click();
    await settleAsync();

    expect(operations[0].detail.name).toBe('Spaced');
  });

  // A cancelled dialog must produce nothing at all. An application that acted
  // on the event would create a folder the user explicitly declined.
  it('requests nothing when the dialog is cancelled', async () => {
    fm.dialogResolver = async () => null;
    await settle();

    toolbarButton('New folder').click();
    await settleAsync();

    expect(operations).toEqual([]);
  });

  it('requests nothing for a blank name', async () => {
    fm.dialogResolver = async () => '   ';
    await settle();

    toolbarButton('New folder').click();
    await settleAsync();

    expect(operations).toEqual([]);
  });

  it('is reachable from the keyboard', async () => {
    fm.dialogResolver = async () => 'FromKeyboard';
    await settle();

    fm.shadowRoot!.querySelector('.icon-grid')!.dispatchEvent(
      key({ key: 'N', ctrlKey: true, shiftKey: true }),
    );
    await settleAsync();

    expect(operations[0].detail.name).toBe('FromKeyboard');
  });
});

describe('delete', () => {
  it('confirms first, then requests the deletion', async () => {
    fm.dialogResolver = async () => true;
    await select('Documents');

    toolbarButton('Delete').click();
    await settleAsync();

    expect(operations).toHaveLength(1);
    expect(operations[0].detail).toMatchObject({ kind: 'delete', nodeIds: ['docs'] });
  });

  it('tells the dialog how many items are going', async () => {
    const resolver = vi.fn(async () => true);
    fm.dialogResolver = resolver;
    fm.selectionMode = 'multiple';
    await settle();
    cards()[0].click();
    cards()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle();

    toolbarButton('Delete').click();
    await settleAsync();

    expect(resolver.mock.calls[0][0]).toMatchObject({ kind: 'confirm' });
    expect((resolver.mock.calls[0][0] as { message: string }).message).toContain('2');
  });

  // The confirm is the whole point of the flow.
  it('requests nothing when the confirmation is declined', async () => {
    fm.dialogResolver = async () => false;
    await select('Documents');

    toolbarButton('Delete').click();
    await settleAsync();

    expect(operations).toEqual([]);
  });

  it('clears the selection once the deletion is requested', async () => {
    const selections: CustomEvent[] = [];
    fm.addEventListener('mp-selection-change', (e) => selections.push(e as CustomEvent));
    fm.dialogResolver = async () => true;
    await select('Documents');

    toolbarButton('Delete').click();
    await settleAsync();

    expect(cards().filter((c) => c.dataset['selected'] === 'true')).toHaveLength(0);
  });

  it('is reachable with the Delete key', async () => {
    fm.dialogResolver = async () => true;
    await select('Documents');

    cardFor('Documents').dispatchEvent(key({ key: 'Delete' }));
    await settleAsync();

    expect(operations[0].detail.kind).toBe('delete');
  });

  it('refuses a node whose permissions deny it', async () => {
    fm.dialogResolver = async () => true;
    fm.nodes = [
      { id: 'locked', parentId: null, name: 'locked.txt', type: 'file', allowOperations: { delete: false } },
    ];
    await select('locked.txt');

    cardFor('locked.txt').dispatchEvent(key({ key: 'Delete' }));
    await settleAsync();

    expect(operations).toEqual([]);
  });
});

describe('rename', () => {
  it('opens an editor over the selected row', async () => {
    await selectInList(['docs']);

    toolbarButton('Rename').click();
    await settleAsync();

    expect(renameInput()).not.toBeNull();
    expect(renameInput()!.value).toBe('Documents');
  });

  it('requests the rename on Enter', async () => {
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    const input = renameInput()!;
    input.value = 'Papers';
    input.dispatchEvent(key({ key: 'Enter' }));
    await settleAsync();

    expect(operations).toHaveLength(1);
    expect(operations[0].detail).toMatchObject({
      kind: 'rename',
      nodeId: 'docs',
      previousName: 'Documents',
      newName: 'Papers',
    });
  });

  it('closes the editor once committed', async () => {
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    const input = renameInput()!;
    input.value = 'Papers';
    input.dispatchEvent(key({ key: 'Enter' }));
    await settleAsync();

    expect(renameInput()).toBeNull();
  });

  it('abandons the edit on Escape', async () => {
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    const input = renameInput()!;
    input.value = 'Papers';
    input.dispatchEvent(key({ key: 'Escape' }));
    await settleAsync();

    expect(operations).toEqual([]);
    expect(renameInput()).toBeNull();
  });

  // Renaming to the same name is not a rename. Emitting it anyway would make
  // an application write a no-op to its backend on every accidental Enter.
  it('requests nothing when the name did not change', async () => {
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    renameInput()!.dispatchEvent(key({ key: 'Enter' }));
    await settleAsync();

    expect(operations).toEqual([]);
  });

  it('requests nothing for a blank name', async () => {
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    const input = renameInput()!;
    input.value = '   ';
    input.dispatchEvent(key({ key: 'Enter' }));
    await settleAsync();

    expect(operations).toEqual([]);
  });

  it('trims the new name', async () => {
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    const input = renameInput()!;
    input.value = '  Papers  ';
    input.dispatchEvent(key({ key: 'Enter' }));
    await settleAsync();

    expect(operations[0].detail.newName).toBe('Papers');
  });

  // Clicking away is a commit, not a cancel — the convention every file
  // browser uses, and the one a user relies on when they click the next row.
  it('commits when the editor loses focus', async () => {
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    const input = renameInput()!;
    input.value = 'Papers';
    input.dispatchEvent(new FocusEvent('blur'));
    await settleAsync();

    expect(operations[0]?.detail).toMatchObject({ kind: 'rename', newName: 'Papers' });
  });

  it('is reachable with F2', async () => {
    await selectInList(['docs']);

    datatable()!.dispatchEvent(key({ key: 'F2' }));
    await settleAsync();

    expect(renameInput()).not.toBeNull();
  });

  it('does nothing without exactly one thing selected', async () => {
    await selectInList([]);

    datatable()!.dispatchEvent(key({ key: 'F2' }));
    await settleAsync();

    expect(renameInput()).toBeNull();
  });

  it('does nothing for a multi-selection', async () => {
    fm.selectionMode = 'multiple';
    await selectInList(['docs', 'pics']);

    datatable()!.dispatchEvent(key({ key: 'F2' }));
    await settleAsync();

    expect(renameInput()).toBeNull();
  });

  /*
   * The editor owns every key it receives. Guarding only Enter left the other
   * shortcuts hijacking the text field — Delete deleted the FILE instead of a
   * character, Ctrl+C copied the file instead of the text.
   */
  it('lets the editor keep the shortcuts that would otherwise act on files', async () => {
    fm.dialogResolver = async () => true;
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    renameInput()!.dispatchEvent(key({ key: 'Delete' }));
    renameInput()!.dispatchEvent(key({ key: 'c', ctrlKey: true }));
    await settleAsync();

    expect(operations).toEqual([]);
  });

  // Arrow keys inside the editor move the caret; without the stop they would
  // also rove the row focus underneath it.
  it('keeps the arrow keys inside the editor', async () => {
    await selectInList(['docs']);
    toolbarButton('Rename').click();
    await settleAsync();

    const event = key({ key: 'ArrowDown' });
    renameInput()!.dispatchEvent(event);
    await settleAsync();

    expect(renameInput()).not.toBeNull();
  });
});

describe('cut, copy and paste', () => {
  it('enables paste once something is on the clipboard', async () => {
    await select('readme.txt');
    expect(toolbarButton('Paste').disabled).toBe(true);

    toolbarButton('Copy').click();
    await settle();

    expect(toolbarButton('Paste').disabled).toBe(false);
  });

  it('requests a copy into the folder currently open', async () => {
    await select('readme.txt');
    toolbarButton('Copy').click();
    await settle();

    fm.currentFolderId = 'pics';
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(operations).toHaveLength(1);
    expect(operations[0].detail).toMatchObject({
      kind: 'paste',
      mode: 'copy',
      sourceIds: ['readme'],
      targetFolderId: 'pics',
    });
  });

  it('requests a move for a cut', async () => {
    await select('readme.txt');
    toolbarButton('Cut').click();
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(operations[0].detail.mode).toBe('cut');
  });

  // A cut is consumed by its paste — the file is now elsewhere, so pasting
  // again would move something that is no longer where the clipboard says.
  it('empties the clipboard after a cut is pasted', async () => {
    await select('readme.txt');
    toolbarButton('Cut').click();
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(toolbarButton('Paste').disabled).toBe(true);
  });

  it('keeps the clipboard after a copy, so it can be pasted again', async () => {
    await select('readme.txt');
    toolbarButton('Copy').click();
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(toolbarButton('Paste').disabled).toBe(false);
  });

  it('marks a cut item so the user can see what is in flight', async () => {
    await select('readme.txt');
    toolbarButton('Cut').click();
    await settle();

    expect(cardFor('readme.txt').dataset['cut']).toBe('true');
  });

  it.each([
    ['x', 'cut'],
    ['c', 'copy'],
  ])('is reachable with Ctrl+%s', async (letter, mode) => {
    await select('readme.txt');

    cardFor('readme.txt').dispatchEvent(key({ key: letter, ctrlKey: true }));
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(operations[0].detail.mode).toBe(mode);
  });

  it('pastes with Ctrl+V', async () => {
    await select('readme.txt');
    toolbarButton('Copy').click();
    await settle();

    cardFor('readme.txt').dispatchEvent(key({ key: 'v', ctrlKey: true }));
    await settleAsync();

    expect(operations[0].detail.kind).toBe('paste');
  });
});

describe('paste conflicts', () => {
  // The component cannot decide what a name clash means — replace, skip and
  // rename are all reasonable and it depends on the application. So it asks,
  // and carries the answer in the event for the paste handler to apply.
  it('asks the resolver about a name that already exists in the target', async () => {
    const resolver = vi.fn(async () => ({ action: 'replace' as const }));
    fm.conflictResolver = resolver;
    await select('readme.txt');
    toolbarButton('Copy').click();
    await settle();

    fm.currentFolderId = 'docs';
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver.mock.calls[0][0]).toMatchObject({ incomingName: 'readme.txt', mode: 'paste' });
  });

  it('carries the decision in the paste request', async () => {
    fm.conflictResolver = async () => ({ action: 'rename' as const, newName: 'readme (1).txt' });
    await select('readme.txt');
    toolbarButton('Copy').click();
    await settle();

    fm.currentFolderId = 'docs';
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(operations[0].detail.conflicts).toMatchObject({
      readme: { action: 'rename', newName: 'readme (1).txt' },
    });
  });

  it('does not ask about a name that is free in the target', async () => {
    const resolver = vi.fn(async () => ({ action: 'skip' as const }));
    fm.conflictResolver = resolver;
    await select('readme.txt');
    toolbarButton('Copy').click();
    await settle();

    fm.currentFolderId = 'pics';
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(resolver).not.toHaveBeenCalled();
    expect(operations[0].detail.conflicts).toEqual({});
  });

  // With no resolver wired the paste still goes ahead — the consumer's handler
  // is expected to decide. Blocking would make the resolver mandatory, which it
  // is not.
  it('pastes without a resolver at all', async () => {
    await select('readme.txt');
    toolbarButton('Copy').click();
    await settle();

    fm.currentFolderId = 'docs';
    await settle();
    toolbarButton('Paste').click();
    await settleAsync();

    expect(operations).toHaveLength(1);
    expect(operations[0].detail.conflicts).toEqual({});
  });
});

describe('the context menu', () => {
  async function openMenuOn(name: string): Promise<void> {
    await select(name);
    cardFor(name).dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true }),
    );
    await settleAsync();
  }

  it('opens on right-click', async () => {
    await openMenuOn('Documents');
    expect(menu()).not.toBeNull();
  });

  it('presents itself as a menu with a name', async () => {
    await openMenuOn('Documents');
    expect(menu()!.getAttribute('role')).toBe('menu');
    expect(menu()!.getAttribute('aria-label')).toBeTruthy();
    expect(menuItems().every((i) => i.getAttribute('role') === 'menuitem')).toBe(true);
  });

  // APG: opening a menu moves focus into it, or a keyboard user is left
  // standing outside something that has just appeared.
  it('moves focus into the menu when it opens', async () => {
    await openMenuOn('Documents');
    expect(menuItems()[0].tabIndex).toBe(0);
  });

  it('offers the operations the permissions allow', async () => {
    await openMenuOn('Documents');
    const labels = menuItems().map((i) => i.textContent!.trim());
    expect(labels).toEqual(expect.arrayContaining(['Rename', 'Delete', 'Cut', 'Copy']));
  });

  it('withdraws the operations the permissions deny', async () => {
    fm.allowOperations = { delete: false };
    await openMenuOn('Documents');
    expect(menuItems().map((i) => i.textContent!.trim())).not.toContain('Delete');
  });

  it('does not open at all when every operation is off', async () => {
    fm.allowOperations = false;
    await openMenuOn('Documents');
    expect(menu()).toBeNull();
  });

  it('performs the operation the chosen item names', async () => {
    fm.dialogResolver = async () => true;
    await openMenuOn('Documents');

    menuItem('Delete').click();
    await settleAsync();

    expect(operations[0].detail.kind).toBe('delete');
  });

  it('closes once an item is chosen', async () => {
    fm.dialogResolver = async () => true;
    await openMenuOn('Documents');

    menuItem('Copy').click();
    await settleAsync();

    expect(menu()).toBeNull();
  });

  it('closes on Escape', async () => {
    await openMenuOn('Documents');

    document.dispatchEvent(key({ key: 'Escape' }));
    await settleAsync();

    expect(menu()).toBeNull();
  });

  it('closes on a click elsewhere', async () => {
    await openMenuOn('Documents');

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settleAsync();

    expect(menu()).toBeNull();
  });

  it('stays open when the menu itself is clicked', async () => {
    await openMenuOn('Documents');

    menu()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settleAsync();

    expect(menu()).not.toBeNull();
  });

  // The roving handler reads the event's origin to know where it is, so the
  // keystroke has to come from the focused ITEM rather than from the menu.
  it('walks its items with the arrow keys', async () => {
    await openMenuOn('Documents');
    const before = menuItems().findIndex((i) => i.tabIndex === 0);

    menuItems()[before].dispatchEvent(key({ key: 'ArrowDown' }));
    await settleAsync();

    expect(menuItems().findIndex((i) => i.tabIndex === 0)).toBe(before + 1);
  });

  it('is reachable from the keyboard', async () => {
    await select('Documents');

    cardFor('Documents').dispatchEvent(key({ key: 'ContextMenu' }));
    await settleAsync();

    expect(menu()).not.toBeNull();
  });

  it('is reachable with Shift+F10', async () => {
    await select('Documents');

    cardFor('Documents').dispatchEvent(key({ key: 'F10', shiftKey: true }));
    await settleAsync();

    expect(menu()).not.toBeNull();
  });
});

describe('the icon grid keyboard', () => {
  // One tab stop for the whole surface; arrows walk the linear order, because
  // a wrap-reflow layout has no stable 2D geometry to walk instead.
  it('keeps a single tab stop', async () => {
    await settle();
    expect(cards().filter((c) => c.tabIndex === 0)).toHaveLength(1);
  });

  it('moves the tab stop as the arrows move focus', async () => {
    await settle();
    cards()[0].dispatchEvent(key({ key: 'ArrowRight' }));
    await settle();

    expect(cards()[1].tabIndex).toBe(0);
    expect(cards()[0].tabIndex).toBe(-1);
  });

  it('walks backwards too', async () => {
    await settle();
    cards()[0].dispatchEvent(key({ key: 'ArrowRight' }));
    await settle();
    cards()[1].dispatchEvent(key({ key: 'ArrowLeft' }));
    await settle();

    expect(cards()[0].tabIndex).toBe(0);
  });

  it('treats the vertical arrows as the same linear walk', async () => {
    await settle();
    cards()[0].dispatchEvent(key({ key: 'ArrowDown' }));
    await settle();

    expect(cards()[1].tabIndex).toBe(0);
  });

  it('jumps to the ends with Home and End', async () => {
    await settle();
    cards()[0].dispatchEvent(key({ key: 'End' }));
    await settle();
    expect(cards().at(-1)!.tabIndex).toBe(0);

    cards().at(-1)!.dispatchEvent(key({ key: 'Home' }));
    await settle();
    expect(cards()[0].tabIndex).toBe(0);
  });

  it('stops at the ends rather than wrapping', async () => {
    await settle();
    cards()[0].dispatchEvent(key({ key: 'ArrowLeft' }));
    await settle();

    expect(cards()[0].tabIndex).toBe(0);
  });

  it('opens the focused card with Enter', async () => {
    await settle();

    cardFor('Documents').dispatchEvent(key({ key: 'Enter' }));
    await settle();

    expect(fm.currentFolderId).toBe('docs');
  });

  // Enter acts on the FOCUSED card, not on the selection — they can differ
  // while arrowing around, and acting on the selection would open a stale node.
  it('opens the focused card even when another is selected', async () => {
    await select('Pictures');

    cardFor('Documents').dispatchEvent(key({ key: 'Enter' }));
    await settle();

    expect(fm.currentFolderId).toBe('docs');
  });
});
