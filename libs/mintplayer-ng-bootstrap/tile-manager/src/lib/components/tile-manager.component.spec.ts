import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { BsTileManagerComponent } from './tile-manager.component';
import { BsTileComponent } from './tile.component';
import { BsTileHeaderComponent } from './tile-header.component';
import { TilePosition } from '../types/tile-position';
import { TileLayoutSnapshot, TileGestureBlocked } from '../types/tile-layout-snapshot';
import { MintTileManagerElement } from '../web-components/mint-tile-manager.element';

interface DemoTile {
  id: string;
  position: TilePosition;
  locked: boolean;
}

@Component({
  selector: 'bs-tile-manager-host',
  imports: [BsTileManagerComponent, BsTileComponent, BsTileHeaderComponent],
  template: `
    <bs-tile-manager
      [columnCount]="2"
      (layoutChange)="lastLayout.set($event)"
      (gestureBlocked)="lastBlocked.set($event)"
    >
      @for (t of tiles(); track t.id) {
        <bs-tile
          [id]="t.id"
          [position]="t.position"
          [disableMove]="t.locked"
          (positionChange)="onPositionChange(t.id, $event)"
        >
          <bs-tile-header>{{ t.id }} title</bs-tile-header>
          <div class="body">{{ t.id }} body</div>
        </bs-tile>
      }
    </bs-tile-manager>
  `,
})
class HostComponent {
  readonly tiles = signal<DemoTile[]>([
    { id: 'a', position: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }, locked: false },
    { id: 'b', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 }, locked: false },
  ]);

  readonly lastLayout = signal<TileLayoutSnapshot | null>(null);
  readonly lastBlocked = signal<TileGestureBlocked | null>(null);

  onPositionChange(id: string, position: TilePosition): void {
    this.tiles.update((tiles) =>
      tiles.map((t) => (t.id === id ? { ...t, position } : t)),
    );
  }
}

describe('BsTileManagerComponent (Angular wrapper)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let wcEl: MintTileManagerElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HostComponent,
        BsTileManagerComponent,
        BsTileComponent,
        BsTileHeaderComponent,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    wcEl = fixture.nativeElement.querySelector('mp-tile-manager') as MintTileManagerElement;
  });

  it('renders the underlying mp-tile-manager web component', () => {
    expect(wcEl).toBeTruthy();
    expect(wcEl.tagName.toLowerCase()).toBe('mp-tile-manager');
  });

  it('projects each <bs-tile>\'s header and body into id-keyed light-DOM slot divs', () => {
    const slotDivs = Array.from(wcEl.querySelectorAll<HTMLElement>(':scope > [slot]'));
    const slotNames = slotDivs.map((d) => d.getAttribute('slot')).sort();
    expect(slotNames).toEqual(['a-content', 'a-header', 'b-content', 'b-header']);

    const aHeaderSlot = slotDivs.find((d) => d.getAttribute('slot') === 'a-header')!;
    expect(aHeaderSlot.textContent?.trim()).toBe('a title');

    const aBodySlot = slotDivs.find((d) => d.getAttribute('slot') === 'a-content')!;
    expect(aBodySlot.textContent?.trim()).toBe('a body');
  });

  it('forwards Angular inputs as attributes on the underlying WC', () => {
    expect(wcEl.getAttribute('column-count')).toBe('2');
    // Defaults still applied
    expect(wcEl.getAttribute('drag-mode')).toBe('header');
    expect(wcEl.getAttribute('resize-mode')).toBe('hover');
  });

  it('writes the tiles array onto the WC reactive property', () => {
    expect(wcEl.tiles.length).toBe(2);
    expect(wcEl.tiles[0].id).toBe('a');
    expect(wcEl.tiles[1].id).toBe('b');
  });

  it('emits the wrapper\'s (layoutChange) when the WC dispatches tilelayoutchange', () => {
    const newLayout: TileLayoutSnapshot = [
      { id: 'a', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } },
      { id: 'b', position: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } },
    ];
    wcEl.dispatchEvent(new CustomEvent('tilelayoutchange', { detail: newLayout }));
    fixture.detectChanges();
    expect(host.lastLayout()).toEqual(newLayout);
  });

  it('routes tilepositionchange to the matching <bs-tile>\'s (positionChange)', () => {
    const newPos: TilePosition = { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 };
    wcEl.dispatchEvent(
      new CustomEvent('tilepositionchange', { detail: { id: 'a', position: newPos } }),
    );
    fixture.detectChanges();
    const a = host.tiles().find((t) => t.id === 'a')!;
    expect(a.position).toEqual(newPos);
    // Tile b unchanged.
    const b = host.tiles().find((t) => t.id === 'b')!;
    expect(b.position).toEqual({ colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 });
  });

  it('emits (gestureBlocked) when the WC dispatches tilegestureblocked', () => {
    const detail: TileGestureBlocked = { id: 'a', reason: 'locked-overlap' };
    wcEl.dispatchEvent(new CustomEvent('tilegestureblocked', { detail }));
    fixture.detectChanges();
    expect(host.lastBlocked()).toEqual(detail);
  });

  it('captureLayout() delegates to the underlying WC', () => {
    const wrapper = fixture.debugElement.children[0].componentInstance as BsTileManagerComponent;
    const snapshot = wrapper.captureLayout();
    expect(snapshot.length).toBe(2);
    expect(snapshot.map((s) => s.id).sort()).toEqual(['a', 'b']);
  });

  it('rebuilds the WC tiles array when consumer state changes', () => {
    host.tiles.update((tiles) => [
      ...tiles,
      { id: 'c', position: { colStart: 1, rowStart: 2, colSpan: 1, rowSpan: 1 }, locked: false },
    ]);
    fixture.detectChanges();
    expect(wcEl.tiles.length).toBe(3);
    expect(wcEl.tiles[2].id).toBe('c');
  });

  it('passes disableMove through as a per-tile flag', () => {
    host.tiles.update((tiles) =>
      tiles.map((t) => (t.id === 'a' ? { ...t, locked: true } : t)),
    );
    fixture.detectChanges();
    const aEntry = wcEl.tiles.find((t) => t.id === 'a')!;
    expect(aEntry.disableMove).toBe(true);
    const bEntry = wcEl.tiles.find((t) => t.id === 'b')!;
    expect(bEntry.disableMove).toBe(false);
  });
});
