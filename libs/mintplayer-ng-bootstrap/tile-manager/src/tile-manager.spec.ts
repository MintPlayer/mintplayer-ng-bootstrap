import { Component, destroyPlatform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MintTile, TileBreakpoint, TileLayoutChange, TileLayouts } from '@mintplayer/ui-core/tile-manager';
import { tileManagerDomMismatches } from '@mintplayer/ui-core/_conformance/tile-manager-dom';
import { BsTileManagerComponent, BsTileManagerContentDirective, BsTileManagerHeaderDirective } from '../index';

/**
 * The generated Angular tile manager (#440, #458 M4). Wiring only: inputs reach the
 * machine, the template renders connect()'s bags, events come back out. The layout and
 * ARIA rules themselves are pinned in ui-core's specs.
 */
@Component({
  selector: 'bs-tile-manager-host',
  imports: [BsTileManagerComponent, BsTileManagerHeaderDirective, BsTileManagerContentDirective],
  template: `
    <bs-tile-manager
      aria-label="Dashboard"
      [tiles]="tiles()"
      [(layouts)]="layouts"
      [breakpoints]="breakpoints"
      [dragMode]="dragMode()"
      (layoutchange)="changes.push($event)">
      <span *bsTileManagerHeader="let tile = tile" class="head">{{ tile.label }}</span>
      <p *bsTileManagerContent="let tile = tile" class="body">{{ tile.id }} body</p>
    </bs-tile-manager>
  `,
})
class HostComponent {
  readonly tiles = signal<MintTile[]>([
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma', disableResize: true },
  ]);
  readonly layouts = signal<TileLayouts>({});
  readonly dragMode = signal<'header' | 'tile' | 'off'>('header');
  readonly breakpoints: TileBreakpoint[] = [{ minWidth: 0, columns: 2 }];
  readonly changes: TileLayoutChange[] = [];
}

// jsdom has no layout: a fake observer reports the width. Frames are queued and flushed by
// measure(): run synchronously they would also re-enter Angular's zoneless scheduler.
let frames: FrameRequestCallback[] = [];
let observed: ((entries: unknown[]) => void) | null;
class FakeResizeObserver {
  constructor(callback: (entries: unknown[]) => void) {
    observed = callback;
  }
  observe() {}
  disconnect() {}
}

describe('BsTileManagerComponent (generated, #458)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  const board = () => el.querySelector<HTMLElement>('bs-tile-manager')!;
  const tile = (id: string) => el.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
  const key = (id: string, k: string) => {
    tile(id).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const measure = (width: number) => {
    observed?.([{ contentRect: { width } }]);
    frames.splice(0).forEach((cb) => cb(0));
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    frames = [];
    observed = null;
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    document.body.appendChild(el);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    el.remove();
    vi.unstubAllGlobals();
  });

  it('the host is the region, named by the consumer aria-label', () => {
    expect(board().classList.contains('mp-tile-manager')).toBe(true);
    expect(board().getAttribute('data-mps')).toBe('tile-manager');
    expect(board().getAttribute('role')).toBe('region');
    expect(board().getAttribute('aria-label')).toBe('Dashboard');
  });

  it('renders the header and content templates per tile, with the tile in context', () => {
    expect([...el.querySelectorAll('.tile-header .head')].map((n) => n.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(tile('b').querySelector('.tile-content .body')?.textContent).toBe('b body');
  });

  it('before the first measure: tier 2 groups, no grips, the layout rules in the head', () => {
    expect(tile('a').getAttribute('role')).toBe('group');
    expect(tile('a').hasAttribute('tabindex')).toBe(false);
    expect(el.querySelectorAll('.tile-grip')).toHaveLength(0);
    const layout = document.head.querySelector(`style[data-mp-light-styles="tile-manager-layout-${board().id}"]`);
    expect(layout?.textContent).toContain('[data-tile-id="b"]');
  });

  describe('once measured', () => {
    beforeEach(() => measure(800));

    it('places tiles, sets the track template and removes the layout rules', () => {
      expect(el.querySelector<HTMLElement>('.tile-grid')!.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
      expect(tile('b').style.gridColumn).toContain('2');
      expect(document.head.querySelector(`style[data-mp-light-styles="tile-manager-layout-${board().id}"]`)).toBeNull();
    });

    it('renders exactly the DOM connect() describes (four-front conformance)', () => {
      const inputs = { tiles: host.tiles(), breakpoints: host.breakpoints, dragMode: 'header' as const, label: 'Dashboard' };
      expect(tileManagerDomMismatches(el, inputs, 800)).toEqual([]);
    });

    it('a changed input reaches the machine', () => {
      host.dragMode.set('tile');
      fixture.detectChanges();
      expect(tile('a').hasAttribute('data-draggable')).toBe(true);
    });

    it('a keyboard commit writes layouts back and fires layoutchange once', () => {
      key('a', 'm');
      key('a', 'ArrowDown');
      key('a', 'Enter');
      expect(host.changes).toHaveLength(1);
      expect(host.layouts()).toBe(host.changes[0].layouts);
    });

    it('an unrelated input change does not re-push a stale layouts over the commit', () => {
      key('a', 'm');
      key('a', 'ArrowDown');
      key('a', 'Enter');
      const row = tile('a').style.gridRow;
      host.dragMode.set('tile');
      fixture.detectChanges();
      expect(tile('a').style.gridRow).toBe(row);
    });

    it('a consumer write to layouts reaches the machine', () => {
      host.layouts.set({ 2: [{ id: 'a', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }] });
      fixture.detectChanges();
      expect(tile('a').style.gridColumn).toMatch(/^2 /);
    });
  });
});

@Component({
  selector: 'bs-tile-manager-ssr-root',
  imports: [BsTileManagerComponent, BsTileManagerHeaderDirective, BsTileManagerContentDirective],
  template: `
    <bs-tile-manager [tiles]="tiles" [stackBelow]="600" label="Dashboard">
      <span *bsTileManagerHeader="let tile = tile">{{ tile.id }} title</span>
      <p *bsTileManagerContent="let tile = tile">{{ tile.id }} body</p>
    </bs-tile-manager>
  `,
})
class SsrRootComponent {
  readonly tiles: MintTile[] = [{ id: 'a' }, { id: 'b' }];
}

describe('BsTileManagerComponent under Angular SSR', () => {
  beforeAll(() => destroyPlatform());

  it('renders every tile with its templates, no inline position, and the layout rules in <head>', async () => {
    const html = await renderApplication(
      (context) => bootstrapApplication(SsrRootComponent, { providers: [provideServerRendering()] }, context),
      { document: '<html><head></head><body><bs-tile-manager-ssr-root></bs-tile-manager-ssr-root></body></html>', url: '/' },
    );
    expect(html).not.toContain('<mp-tile-manager');
    expect(html).toMatch(/<bs-tile-manager[^>]*role="region"/);
    expect(html).toContain('aria-label="Dashboard"');
    const tiles = html.match(/<div[^>]*class="tile"[^>]*>/g) ?? [];
    expect(tiles).toHaveLength(2);
    expect(tiles.every((t) => t.includes('role="group"') && !t.includes('tabindex') && !t.includes('grid-column'))).toBe(true);
    expect(html).toContain('a title');
    expect(html).toContain('b body');
    expect(html).not.toContain('class="tile-grip"');
    expect((html.match(/data-mp-light-styles="tile-manager"/g) ?? []).length).toBe(1);
    const layout = /<style data-mp-light-styles="tile-manager-layout-[^"]+">([^<]*)<\/style>/.exec(html)?.[1] ?? '';
    expect(layout).toContain('@container (min-width: 600px)');
    expect(layout).toContain('[data-tile-id="b"]');
  });
});
