import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { MintTile, TileLayoutChange, TileLayouts } from '@mintplayer/ui-core/tile-manager';
import BsTileManager from '../../tile-manager/src/BsTileManager.vue';
import type { BsTileManagerExposed } from '../../tile-manager/src/types';

/**
 * The Vue front of the headless tile-manager core (#440). Wiring only: props reach the
 * machine, the template renders connect()'s bags, events come back out. The layout and ARIA
 * rules themselves are pinned in ui-core's specs.
 */
interface DemoTile extends MintTile {
  title: string;
}

const TILES: DemoTile[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma', disableResize: true },
];

let wrapper: VueWrapper;
let changes: TileLayoutChange[];
const layouts = ref<TileLayouts>({});
const dragMode = ref<'header' | 'tile' | 'off'>('header');
const exposed = ref<BsTileManagerExposed | null>(null);

const Host = defineComponent({
  setup: () => () =>
    h(
      BsTileManager as never,
      {
        ref: exposed,
        'aria-label': 'Dashboard',
        tiles: TILES,
        layouts: layouts.value,
        'onUpdate:layouts': (next: TileLayouts) => (layouts.value = next),
        onLayoutChange: (c: TileLayoutChange) => changes.push(c),
        breakpoints: [{ minWidth: 0, columns: 2 }],
        dragMode: dragMode.value,
      },
      {
        header: ({ tile }: { tile: DemoTile }) => h('span', { class: 'head' }, tile.title),
        content: ({ tile }: { tile: DemoTile }) => h('p', { class: 'body' }, `${tile.id} body`),
      },
    ),
});

const root = () => wrapper.element as HTMLElement;
const tile = (id: string) => root().querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
const key = async (id: string, k: string) => {
  tile(id).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  await nextTick();
};
const captured = () => exposed.value!.captureLayout();

// jsdom has no layout: a fake observer reports the width, and the frame runs at once.
let observed: ((entries: unknown[]) => void) | null;
class FakeResizeObserver {
  constructor(callback: (entries: unknown[]) => void) {
    observed = callback;
  }
  observe() {}
  disconnect() {}
}
const measure = async (width: number) => {
  observed?.([{ contentRect: { width } }]);
  await nextTick();
};

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  observed = null;
  changes = [];
  layouts.value = {};
  dragMode.value = 'header';
  wrapper = mount(Host, { attachTo: document.body });
});

afterEach(() => {
  wrapper.unmount();
  vi.unstubAllGlobals();
});

describe('BsTileManager (Vue front)', () => {
  it('renders the header and content slots per tile, with the tile as slot prop', () => {
    expect([...root().querySelectorAll('.tile-header .head')].map((n) => n.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(tile('b').querySelector('.tile-content .body')?.textContent).toBe('b body');
  });

  it('renders no <mp-tile-manager>: the template is the DOM', () => {
    expect(root().querySelector('mp-tile-manager')).toBeNull();
    expect(root().matches('.mp-tile-manager[data-mps="tile-manager"]')).toBe(true);
  });

  it('a consumer aria-label names the region', () => {
    expect(root().getAttribute('role')).toBe('region');
    expect(root().getAttribute('aria-label')).toBe('Dashboard');
  });

  it('a consumer role does not replace the region', () => {
    const other = mount(BsTileManager as never, { props: { tiles: TILES, role: 'none' }, attachTo: document.body });
    expect((other.element as HTMLElement).getAttribute('role')).toBe('region');
    other.unmount();
  });

  it('before the first measure: tier 2 groups, no grips, the layout rules inline', () => {
    expect(tile('a').getAttribute('role')).toBe('group');
    expect(tile('a').hasAttribute('tabindex')).toBe(false);
    expect(root().querySelectorAll('.tile-grip')).toHaveLength(0);
    expect(root().querySelector(':scope > style')?.textContent).toContain('[data-tile-id="b"]');
  });

  describe('once measured', () => {
    beforeEach(() => measure(800));

    it('places tiles, sets the track template and drops the inline rules', () => {
      expect(root().querySelector<HTMLElement>('.tile-grid')!.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
      expect(tile('b').style.gridColumn).toContain('2');
      expect(root().querySelector(':scope > style')).toBeNull();
    });

    it('renders resize grips only where resizing is allowed', () => {
      expect(tile('a').querySelectorAll('.tile-grip')).toHaveLength(3);
      expect(tile('c').querySelectorAll('.tile-grip')).toHaveLength(0);
    });

    it('forwards a changed prop to the machine', async () => {
      dragMode.value = 'tile';
      await nextTick();
      await nextTick();
      expect(tile('a').hasAttribute('data-draggable')).toBe(true);
    });

    it('a keyboard commit updates v-model:layouts and emits layoutChange once', async () => {
      await key('a', 'm');
      await key('a', 'ArrowDown');
      await key('a', 'Enter');
      expect(changes).toHaveLength(1);
      expect(changes[0].columnCount).toBe(2);
      expect(layouts.value).toBe(changes[0].layouts);
    });

    it('an unrelated prop change does not re-push a stale layouts over the commit', async () => {
      await key('a', 'm');
      await key('a', 'ArrowDown');
      await key('a', 'Enter');
      const committed = captured();
      dragMode.value = 'tile';
      await nextTick();
      expect(captured()).toEqual(committed);
    });

    it('a consumer write to layouts reaches the machine', async () => {
      layouts.value = { 2: [{ id: 'a', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }] };
      await nextTick();
      expect(captured().layout.find((p) => p.id === 'a')?.position.colStart).toBe(2);
    });

    it('arrow keys move focus between tiles', async () => {
      tile('a').focus();
      await key('a', 'ArrowRight');
      expect(document.activeElement).toBe(tile('b'));
      expect(tile('b').getAttribute('tabindex')).toBe('0');
    });
  });
});

describe('BsTileManager under SSR', () => {
  it('renders every tile with its content, no inline position, and the layout rules', async () => {
    const app = createSSRApp({
      render: () =>
        h(
          BsTileManager as never,
          { tiles: TILES, stackBelow: 600, label: 'Dashboard' },
          {
            header: ({ tile }: { tile: DemoTile }) => `${tile.title} title`,
            content: ({ tile }: { tile: DemoTile }) => `${tile.id} body`,
          },
        ),
    });
    const html = await renderToString(app);
    expect(html).toMatch(/<div[^>]*role="region"/);
    expect(html).toContain('aria-label="Dashboard"');
    const tiles = html.match(/<div[^>]*class="tile"[^>]*>/g) ?? [];
    expect(tiles).toHaveLength(3);
    expect(tiles.every((t) => t.includes('role="group"') && !t.includes('tabindex') && !t.includes('grid-column'))).toBe(true);
    expect(html).toContain('Beta title');
    expect(html).not.toContain('tile-grip');
    expect(html).toContain('@container (min-width: 600px)');
  });
});
