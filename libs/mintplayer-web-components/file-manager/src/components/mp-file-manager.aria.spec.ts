import { beforeEach, describe, expect, it } from 'vitest';
import './mp-file-manager';
import type { MpFileManager, UploadEntry } from './mp-file-manager';
import type { FileSystemNode } from '../types';

/**
 * The ARIA surface of `<mp-file-manager>`: the landmark + named regions, the
 * listbox/option icon view (it was gridcells with no row chain before Phase E),
 * and the states that move — `aria-pressed` on the view toggle, `aria-current`
 * along the breadcrumb, `aria-selected` + the roving tab stop across the cards,
 * and the two live regions (polite for outcomes, assertive for upload failure).
 *
 * The existing spec is keyboard-only (`mp-file-manager.keyboard.spec.ts`); none
 * of the below is asserted there. Host `role`/`aria-label` are plain attributes
 * written in `connectedCallback`, so they are observable in jsdom.
 */
const NODES: FileSystemNode[] = [
  { id: 'f1', parentId: null, name: 'Documents', type: 'folder' },
  { id: 'f2', parentId: 'f1', name: 'Reports', type: 'folder' },
  { id: 'a1', parentId: null, name: 'notes.txt', type: 'file', size: 10 },
];

async function mount(attrs = ''): Promise<MpFileManager> {
  document.body.innerHTML = `<mp-file-manager ${attrs}></mp-file-manager>`;
  const el = document.querySelector('mp-file-manager') as MpFileManager;
  el.nodes = NODES;
  await flush(el);
  return el;
}

async function flush(el: MpFileManager): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

const q = <T extends Element>(el: MpFileManager, selector: string): T =>
  el.shadowRoot!.querySelector<T>(selector) as T;

const all = <T extends Element>(el: MpFileManager, selector: string): T[] =>
  Array.from(el.shadowRoot!.querySelectorAll<T>(selector));

const cards = (el: MpFileManager): HTMLElement[] => all<HTMLElement>(el, '.icon-card');

async function mountIconView(): Promise<MpFileManager> {
  const el = await mount('view-mode="icons"');
  return el;
}

describe('mp-file-manager region and landmark ARIA', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names itself as a region, and never clobbers a consumer role or name', async () => {
    const el = await mount();
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('File manager');

    document.body.innerHTML = '<mp-file-manager role="group" aria-label="Project files"></mp-file-manager>';
    const custom = document.querySelector('mp-file-manager') as MpFileManager;
    custom.nodes = NODES;
    await flush(custom);
    expect(custom.getAttribute('role')).toBe('group');
    expect(custom.getAttribute('aria-label')).toBe('Project files');
  });

  it('re-labels the host when the messages bundle is swapped at runtime', async () => {
    const el = await mount();
    el.messages = { ariaFileManager: 'Bestandsbeheer' };
    await flush(el);
    expect(el.getAttribute('aria-label')).toBe('Bestandsbeheer');
  });

  it('names the toolbar, the view-mode group, the search box and the breadcrumb', async () => {
    const el = await mount();
    const toolbar = q<HTMLElement>(el, '.toolbar');
    expect(toolbar.getAttribute('role')).toBe('toolbar');
    expect(toolbar.getAttribute('aria-label')).toBe('File manager toolbar');

    const group = q<HTMLElement>(el, '.view-toggle');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('View mode');

    expect(q(el, 'input.search-input').getAttribute('aria-label')).toBe('Search…');
    expect(q(el, 'nav.breadcrumb-bar').getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('routes the message overrides into the region names', async () => {
    const el = await mountIconView();
    el.messages = { ariaToolbar: 'Werkbalk', ariaFileList: 'Bestanden en mappen' };
    await flush(el);
    expect(q(el, '.toolbar').getAttribute('aria-label')).toBe('Werkbalk');
    expect(q(el, '.icon-grid').getAttribute('aria-label')).toBe('Bestanden en mappen');
  });
});

describe('mp-file-manager ARIA state transitions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('moves aria-pressed between the view-mode buttons in both directions', async () => {
    const el = await mount();
    const pressed = () =>
      all<HTMLButtonElement>(el, '.view-toggle button').map((b) => b.getAttribute('aria-pressed'));
    expect(pressed()).toEqual(['true', 'false']);

    el.viewMode = 'icons';
    await flush(el);
    expect(pressed()).toEqual(['false', 'true']);

    el.viewMode = 'list';
    await flush(el);
    expect(pressed()).toEqual(['true', 'false']);
  });

  it('moves aria-current="page" to the deepest breadcrumb segment as the folder changes', async () => {
    const el = await mount();
    const current = () =>
      all<HTMLButtonElement>(el, '.breadcrumb-segment').map((b) => b.getAttribute('aria-current'));
    expect(current()).toEqual(['page']);

    el.currentFolderId = 'f2';
    await flush(el);
    // Home, Documents, Reports — only the last is the current page.
    expect(current()).toEqual(['false', 'false', 'page']);

    el.currentFolderId = null;
    await flush(el);
    expect(current()).toEqual(['page']);
  });

  it('exposes the icon view as a multiselectable listbox of options', async () => {
    const el = await mountIconView();
    const grid = q<HTMLElement>(el, '.icon-grid');
    expect(grid.getAttribute('role')).toBe('listbox');
    expect(grid.getAttribute('aria-multiselectable')).toBe('true');
    expect(grid.getAttribute('aria-label')).toBe('Files and folders');
    expect(cards(el).length).toBe(2);
    expect(cards(el).every((c) => c.getAttribute('role') === 'option')).toBe(true);
  });

  it('flips aria-selected on a card when it is selected and again when it is toggled off', async () => {
    const el = await mountIconView();
    const selected = () => cards(el).map((c) => c.getAttribute('aria-selected'));
    expect(selected()).toEqual(['false', 'false']);

    cards(el)[0].click();
    await flush(el);
    expect(selected()).toEqual(['true', 'false']);

    // Ctrl-click on the selected card removes it from the selection.
    cards(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ctrlKey: true }));
    await flush(el);
    expect(selected()).toEqual(['false', 'false']);
  });

  it('keeps exactly one tab stop among the option cards and moves it with ArrowRight', async () => {
    const el = await mountIconView();
    const stops = () => cards(el).filter((c) => c.getAttribute('tabindex') === '0');
    expect(stops().length).toBe(1);
    expect(stops()[0].dataset['nodeId']).toBe('f1');

    cards(el)[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true, cancelable: true }),
    );
    await flush(el);
    expect(stops().length).toBe(1);
    expect(stops()[0].dataset['nodeId']).toBe('a1');
  });

  it('builds the context menu as a real menu: named, role="menu", menuitems and separators', async () => {
    const el = await mount();
    (el as unknown as { openContextMenu(id: string, x: number, y: number): void }).openContextMenu('a1', 5, 5);
    await flush(el);

    const menu = q<HTMLElement>(el, '.context-menu');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-label')).toBe('File operations');
    expect(all(el, '.context-menu .menu-item').every((i) => i.getAttribute('role') === 'menuitem')).toBe(true);
    // The <li> wrappers must not be exposed as list items between menu and menuitem.
    expect(all(el, '.context-menu > li:not(.menu-separator)').every((li) => li.getAttribute('role') === 'none')).toBe(true);
    expect(all(el, '.context-menu li.menu-separator').every((s) => s.getAttribute('role') === 'separator')).toBe(true);
  });
});

describe('mp-file-manager live regions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function seedUpload(el: MpFileManager, id: string, name: string): void {
    const entry: UploadEntry = {
      id,
      file: new File(['x'], name),
      targetFolderId: null,
      progress: 0,
      status: 'pending',
    };
    (el as unknown as { _uploads: UploadEntry[] })._uploads = [entry];
  }

  it('announces a completed upload politely', async () => {
    const el = await mount();
    seedUpload(el, 'u1', 'photo.png');

    el.reportUploadProgress('u1', 100, 'done');
    await flush(el);
    expect(q<HTMLElement>(el, '[role="status"]').textContent).toBe('Upload of photo.png complete.');
    expect(q<HTMLElement>(el, '[role="status"]').getAttribute('aria-live')).toBe('polite');
  });

  it('interrupts with an assertive alert when an upload fails — a missed failure costs the file', async () => {
    const el = await mount();
    seedUpload(el, 'u2', 'report.pdf');

    el.reportUploadProgress('u2', 40, 'error', 'network');
    await flush(el);
    const alert = q<HTMLElement>(el, '[role="alert"]');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.textContent).toBe('Upload of report.pdf failed.');
    // The failure must NOT be downgraded into the polite region.
    expect(q<HTMLElement>(el, '[role="status"]').textContent).toBe('');
  });
});
