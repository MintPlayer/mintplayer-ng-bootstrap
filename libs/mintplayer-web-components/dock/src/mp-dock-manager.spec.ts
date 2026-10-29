import { afterEach, describe, expect, it } from 'vitest';
import { html } from 'lit';
import './generated';
import type { MpDockManager } from './generated';
import type { DockLayout, DockLayoutSnapshot, DockPaneActivatedEventDetail } from '@mintplayer/ui-core/dock';

/**
 * The generated Lit front of the dock manager (#437 D10). The template renders
 * the layout tree; pane content is teleported into core-owned hosts, which the
 * core seats in the active stack's panel and parks otherwise. jsdom has no
 * layout, so geometry (splitter weights, intersections, drops) is covered by
 * the core specs and e2e; these specs cover structure, ARIA and commands.
 */
const LAYOUT: DockLayout = {
  root: {
    kind: 'split',
    direction: 'horizontal',
    sizes: [1, 2],
    children: [
      { kind: 'stack', panes: ['explorer', 'search'], activePane: 'explorer' },
      { kind: 'stack', panes: ['editor'] },
    ],
  },
  titles: { explorer: 'Explorer', search: 'Search', editor: 'Editor' },
};

let dock: MpDockManager;

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Two passes: the first client render, then the hydrated one (tabs enable once live). */
async function settle(): Promise<void> {
  await dock.updateComplete;
  await frame();
  await dock.updateComplete;
  await Promise.all([...dock.querySelectorAll('[data-mp-owned]')].map((el) => (el as unknown as { updateComplete?: Promise<unknown> }).updateComplete));
  await frame();
  await dock.updateComplete;
}

async function mount(layout: DockLayout = structuredClone(LAYOUT)): Promise<MpDockManager> {
  dock = document.createElement('mp-dock-manager') as MpDockManager;
  dock.layout = layout;
  dock.paneRenderer = ({ pane }) => html`<input class="content" data-content=${pane} />`;
  document.body.appendChild(dock);
  await settle();
  return dock;
}

afterEach(() => {
  dock?.remove();
  document.body.innerHTML = '';
});

const tab = (pane: string) => dock.querySelector<HTMLButtonElement>(`.dock-tab[data-pane="${pane}"]`)!;
const content = (pane: string) => dock.querySelector<HTMLInputElement>(`[data-content="${pane}"]`)!;
const panelOf = (pane: string) => content(pane).closest<HTMLElement>('[data-dock-pane-body]');
const floating = () => [...dock.querySelectorAll<HTMLElement>('.dock-floating')];

function record<T>(type: string): T[] {
  const seen: T[] = [];
  dock.addEventListener(type, (e) => seen.push((e as CustomEvent<T>).detail));
  return seen;
}

const key = (el: Element, name: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));

describe('mp-dock-manager', () => {
  it('renders a labelled region with one tablist per stack', async () => {
    await mount();
    const root = dock;
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-label')).toBeTruthy();
    expect(dock.querySelectorAll('[role="tablist"]')).toHaveLength(2);
    expect(dock.querySelector('mp-splitter')).not.toBeNull();
    expect([...dock.querySelectorAll('.dock-tab[data-pane]')].map((t) => t.textContent!.trim())).toEqual(['Explorer', 'Search', 'Editor']);
  });

  it('marks the active tab and links it to its panel', async () => {
    await mount();
    expect(tab('explorer').getAttribute('aria-selected')).toBe('true');
    expect(tab('explorer').tabIndex).toBe(0);
    expect(tab('search').getAttribute('aria-selected')).toBe('false');
    expect(tab('search').tabIndex).toBe(-1);
    const panel = document.getElementById(tab('explorer').getAttribute('aria-controls')!)!;
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tab('explorer').id);
  });

  it('seats active panes in their panel and parks the rest', async () => {
    await mount();
    expect(panelOf('explorer')?.dataset['dockPaneBody']).toBe('explorer');
    expect(panelOf('editor')?.dataset['dockPaneBody']).toBe('editor');
    expect(panelOf('search')).toBeNull();
    expect(content('search').closest('.dock-parking')).not.toBeNull();
  });

  it('activates a tab on click, keeping the pane content alive', async () => {
    await mount();
    const changes = record<DockLayoutSnapshot>('layoutchange');
    const activated = record<DockPaneActivatedEventDetail>('paneactivated');
    const searchInput = content('search');
    searchInput.value = 'typed';
    tab('search').click();
    await settle();
    expect(tab('search').getAttribute('aria-selected')).toBe('true');
    expect(tab('explorer').getAttribute('aria-selected')).toBe('false');
    expect(activated.map((d) => d.pane)).toEqual(['search']);
    expect(changes).toHaveLength(1);
    expect(content('search')).toBe(searchInput);
    expect(content('search').value).toBe('typed');
    expect(panelOf('search')?.dataset['dockPaneBody']).toBe('search');
    expect(content('explorer').closest('.dock-parking')).not.toBeNull();
  });

  it('roves and activates with the arrow keys', async () => {
    await mount();
    tab('explorer').focus();
    key(tab('explorer'), 'ArrowRight');
    await settle();
    expect(tab('search').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('search'));
    key(tab('search'), 'ArrowRight');
    await settle();
    expect(tab('explorer').getAttribute('aria-selected')).toBe('true');
  });

  it('tears a pane off with M then F, and closes the floating window', async () => {
    await mount();
    const changes = record<DockLayoutSnapshot>('layoutchange');
    tab('search').focus();
    key(tab('search'), 'm');
    key(tab('search'), 'f');
    await settle();
    expect(changes.at(-1)!.floating).toHaveLength(1);
    expect(floating()).toHaveLength(1);
    const win = floating()[0];
    expect(win.getAttribute('role')).toBe('dialog');
    expect(win.querySelector('.dock-tab[data-pane="search"]')).not.toBeNull();
    expect(dock.layout?.floating).toHaveLength(1);
    win.querySelector<HTMLButtonElement>('.dock-floating__close')!.click();
    await settle();
    expect(floating()).toHaveLength(0);
    expect(changes.at(-1)!.floating).toHaveLength(0);
  });

  it('cancels move mode with Escape without changing the layout', async () => {
    await mount();
    const changes = record<DockLayoutSnapshot>('layoutchange');
    tab('search').focus();
    key(tab('search'), 'm');
    key(tab('search'), 'Escape');
    key(tab('search'), 'f');
    await settle();
    expect(changes).toHaveLength(0);
    expect(floating()).toHaveLength(0);
  });

  it('adopts a layout assigned from outside', async () => {
    await mount();
    dock.layout = { root: { kind: 'stack', panes: ['editor', 'explorer'], activePane: 'editor' } };
    await settle();
    expect(dock.querySelector('mp-splitter')).toBeNull();
    expect([...dock.querySelectorAll('.dock-tab[data-pane]')].map((t) => t.getAttribute('data-pane'))).toEqual(['editor', 'explorer']);
    expect(panelOf('editor')?.dataset['dockPaneBody']).toBe('editor');
    // A pane that leaves the layout keeps its content alive, parked out of sight.
    expect(content('search').closest('.dock-parking')).not.toBeNull();
  });

  it('captures a detached copy of the layout', async () => {
    await mount();
    const snapshot = dock.captureLayout();
    expect(snapshot.floating).toEqual([]);
    expect(snapshot.root).toMatchObject({ kind: 'split', direction: 'horizontal' });
    (snapshot.root as { direction: string }).direction = 'vertical';
    expect(dock.captureLayout().root).toMatchObject({ direction: 'horizontal' });
  });

  it('localizes its name through labels', async () => {
    await mount();
    dock.labels = { dock: 'Werkruimte' };
    await settle();
    expect(dock.getAttribute('aria-label')).toBe('Werkruimte');
  });
});
