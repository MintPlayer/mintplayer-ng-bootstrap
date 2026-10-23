import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MintTile, TileBreakpoint, TileLayoutChange, TileLayouts } from '@mintplayer/ui-core/tile-manager';
import { BsTileManagerComponent } from './tile-manager.component';
import { BsTileContentDirective, BsTileDirective, BsTileHeaderDirective } from '../directives/tile-template.directives';

// Wiring only: inputs reach the machine, the template renders connect()'s bags, events come back
// out. The layout and ARIA rules themselves are pinned in ui-core's specs.

interface DemoTile extends MintTile {
  title: string;
}

@Component({
  selector: 'bs-tile-manager-host',
  imports: [BsTileManagerComponent, BsTileDirective, BsTileHeaderDirective, BsTileContentDirective],
  template: `
    <bs-tile-manager
      aria-label="Dashboard"
      [(layouts)]="layouts"
      [breakpoints]="breakpoints"
      [dragMode]="dragMode()"
      (layoutChange)="changes.push($event)"
      (layoutPreview)="previews.push($event)">
      <ng-container *bsTile="let tile of tiles()">
        <span *bsTileHeader class="head">{{ tile.title }}</span>
        <p *bsTileContent class="body">{{ tile.id }} body</p>
      </ng-container>
    </bs-tile-manager>
  `,
})
class HostComponent {
  readonly manager = viewChild.required(BsTileManagerComponent);
  readonly tiles = signal<DemoTile[]>([
    { id: 'a', title: 'Alpha' },
    { id: 'b', title: 'Beta' },
    { id: 'c', title: 'Gamma', disableResize: true },
  ]);
  readonly layouts = signal<TileLayouts>({});
  readonly dragMode = signal<'header' | 'tile' | 'off'>('header');
  readonly breakpoints: TileBreakpoint[] = [{ minWidth: 0, columns: 2 }];
  readonly changes: TileLayoutChange[] = [];
  readonly previews: TileLayoutChange[] = [];
}

describe('BsTileManagerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  const tile = (id: string) => el.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
  const key = (id: string, k: string) => {
    tile(id).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    host.manager().machine.measure(800);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the header and content templates per tile, with the tile as context', () => {
    expect(Array.from(el.querySelectorAll('.tile-header .head')).map((n) => n.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(tile('b').querySelector('.tile-content .body')?.textContent).toBe('b body');
  });

  it('keeps a tile\'s template view when the tile object changes, and updates its binding', () => {
    const before = tile('a').querySelector('.head');
    host.tiles.update((tiles) => tiles.map((t) => (t.id === 'a' ? { ...t, title: 'Alpha 2' } : t)));
    fixture.detectChanges();
    expect(tile('a').querySelector('.head')).toBe(before);
    expect(before?.textContent).toBe('Alpha 2');
  });

  it('renders no <mp-tile-manager>: the Angular template is the DOM', () => {
    expect(el.querySelector('mp-tile-manager')).toBeNull();
    expect(el.querySelector('.mp-tile-manager[data-mps="tile-manager"]')).not.toBeNull();
  });

  it('places tiles from the derived layout and sets the track template once measured', () => {
    expect(el.querySelector<HTMLElement>('.tile-grid')!.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(tile('b').style.gridColumn).toContain('2');
  });

  it('renders resize grips only where resizing is allowed', () => {
    expect(tile('a').querySelectorAll('.tile-grip').length).toBe(3);
    expect(tile('c').querySelectorAll('.tile-grip').length).toBe(0);
  });

  it('forwards a changed input to the machine', () => {
    host.dragMode.set('tile');
    fixture.detectChanges();
    expect(host.manager().machine.snapshot.dragMode).toBe('tile');
    expect(tile('a').hasAttribute('data-draggable')).toBe(true);
  });

  it('a host aria-label names the region and leaves the host', () => {
    const board = el.querySelector('.mp-tile-manager')!;
    expect(board.getAttribute('role')).toBe('region');
    expect(board.getAttribute('aria-label')).toBe('Dashboard');
    expect(el.querySelector('bs-tile-manager')!.hasAttribute('aria-label')).toBe(false);
  });

  it('a keyboard commit writes [(layouts)] and emits layoutChange once', () => {
    key('a', 'm');
    key('a', 'ArrowDown');
    expect(host.previews.length).toBeGreaterThan(0);
    key('a', 'Enter');
    expect(host.changes).toHaveLength(1);
    expect(host.changes[0].columnCount).toBe(2);
    expect(host.layouts()).toBe(host.changes[0].layouts);
    expect(host.layouts()[2]).toEqual(host.changes[0].layout);
  });

  it('an unrelated input change does not re-push a stale layouts over the commit', () => {
    key('a', 'm');
    key('a', 'ArrowDown');
    key('a', 'Enter');
    const committed = host.manager().captureLayout();
    host.dragMode.set('tile');
    fixture.detectChanges();
    expect(host.manager().captureLayout()).toEqual(committed);
  });

  it('a consumer write to layouts reaches the machine', () => {
    host.layouts.set({ 2: [{ id: 'a', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }] });
    fixture.detectChanges();
    expect(host.manager().captureLayout().layout.find((p) => p.id === 'a')?.position.colStart).toBe(2);
  });

  it('resetLayout drops a stored count and commits', () => {
    host.layouts.set({ 2: [{ id: 'a', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }] });
    fixture.detectChanges();
    host.manager().resetLayout(2);
    expect(host.changes.at(-1)?.layouts[2]).toBeUndefined();
    expect(host.layouts()[2]).toBeUndefined();
  });

  it('arrow keys move focus between tiles', async () => {
    tile('a').focus();
    key('a', 'ArrowRight');
    await fixture.whenStable();
    expect(document.activeElement).toBe(tile('b'));
    expect(tile('b').getAttribute('tabindex')).toBe('0');
  });
});
