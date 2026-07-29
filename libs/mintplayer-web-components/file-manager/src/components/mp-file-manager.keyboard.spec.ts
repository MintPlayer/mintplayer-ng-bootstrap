import { beforeEach, describe, expect, it } from 'vitest';
import './mp-file-manager';
import type { MpFileManager } from './mp-file-manager';
import type { FileSystemNode } from '../types';

/**
 * Keyboard operability for `<mp-file-manager>` (Phase C):
 * Enter activates the selection in every view (opening was double-click only),
 * the upload button exists for mouse/keyboard users (it was gated on
 * `pointer: coarse`, making drag-and-drop the only upload path elsewhere), and
 * the context menu is a real APG menu — focus moves in, arrows navigate, and
 * focus returns where it came from.
 */
const NODES: FileSystemNode[] = [
  { id: 'f1', parentId: null, name: 'Documents', type: 'folder' },
  { id: 'a1', parentId: null, name: 'notes.txt', type: 'file', size: 10 },
];

async function mount(): Promise<MpFileManager> {
  document.body.innerHTML = '<mp-file-manager></mp-file-manager>';
  const el = document.querySelector('mp-file-manager') as MpFileManager;
  (el as unknown as { nodes: FileSystemNode[] }).nodes = NODES;
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
  return el;
}

const shadow = (el: MpFileManager) => el.shadowRoot!;
const key = (target: HTMLElement | Element, k: string, init: KeyboardEventInit = {}) => {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...init });
  target.dispatchEvent(ev);
  return ev;
};

describe('mp-file-manager keyboard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the upload button for every input modality, not only pointer:coarse', async () => {
    const el = await mount();
    (el as unknown as { allowUpload: boolean }).allowUpload = true;
    await el.updateComplete;

    const uploads = Array.from(shadow(el).querySelectorAll<HTMLButtonElement>('.toolbar button'))
      .filter((b) => b.textContent?.includes('📤'));
    expect(uploads).toHaveLength(1);
  });

  it('Enter opens the selected folder — the double-click action, keyboard-reachable', async () => {
    const el = await mount();
    const navigations: unknown[] = [];
    el.addEventListener('mp-navigate', (e) => navigations.push((e as CustomEvent).detail));

    // There is no public selection property; reach the internal set the way the
    // click path populates it (TS-private is compile-time only).
    (el as unknown as { _selection: Set<string> })._selection = new Set(['f1']);
    (el as unknown as { requestUpdate(): void }).requestUpdate();
    await el.updateComplete;

    const grid = shadow(el).querySelector<HTMLElement>('mp-datatable, .icon-grid')!;
    const ev = key(grid, 'Enter');

    expect(ev.defaultPrevented).toBe(true);
    expect(navigations).toHaveLength(1);
    expect((navigations[0] as { folderId: string }).folderId).toBe('f1');
  });

  it('Enter inside the rename editor is left to the editor', async () => {
    const el = await mount();
    (el as unknown as { _selection: Set<string> })._selection = new Set(['a1']);
    (el as unknown as { requestUpdate(): void }).requestUpdate();
    await el.updateComplete;

    const opens: unknown[] = [];
    el.addEventListener('mp-open-file', (e) => opens.push((e as CustomEvent).detail));

    const input = document.createElement('input');
    shadow(el).querySelector('.icon-grid, mp-datatable')!.appendChild(input);
    key(input, 'Enter');

    expect(opens).toHaveLength(0);
  });

  it('the context menu takes focus on open, arrows move it, and it RETURNS on close', async () => {
    const el = await mount();
    (el as unknown as { _selection: Set<string> })._selection = new Set(['a1']);
    (el as unknown as { requestUpdate(): void }).requestUpdate();
    await el.updateComplete;

    // Something real has focus before the menu opens.
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    (el as unknown as { openContextMenu(id: string, x: number, y: number): void }).openContextMenu('a1', 10, 10);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const items = Array.from(shadow(el).querySelectorAll<HTMLElement>('.context-menu .menu-item:not([disabled])'));
    expect(items.length).toBeGreaterThan(0);
    expect(shadow(el).activeElement).toBe(items[0]);

    key(items[0], 'ArrowDown');
    expect(shadow(el).activeElement).toBe(items[1]);

    (el as unknown as { closeContextMenu(): void }).closeContextMenu();
    await el.updateComplete;
    expect(document.activeElement).toBe(outside);
  });
});
