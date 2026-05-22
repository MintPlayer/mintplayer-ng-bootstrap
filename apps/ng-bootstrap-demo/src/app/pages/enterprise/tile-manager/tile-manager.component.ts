import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsTileManagerComponent, BsTileComponent, BsTileHeaderComponent, TileLayoutSnapshot, TilePosition, TileGestureBlocked } from '@mintplayer/ng-bootstrap/tile-manager';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
const STORAGE_KEY = 'tile-manager-demo-layout-v1';

interface DemoTile {
  id: string;
  title: string;
  body: string;
  defaultPosition: TilePosition;
  position: TilePosition;
  locked: boolean;
}

const DEFAULT_TILES: ReadonlyArray<Pick<DemoTile, 'id' | 'title' | 'body' | 'defaultPosition'>> = [
  { id: 'weather', title: 'Weather', body: 'Sunny · 22 °C · 5 km/h NW', defaultPosition: { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 } },
  { id: 'inbox', title: 'Inbox', body: '3 unread · 2 starred', defaultPosition: { colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 2 } },
  { id: 'stats', title: 'Stats', body: '1.2k visits · ↑12% week-over-week', defaultPosition: { colStart: 4, rowStart: 1, colSpan: 1, rowSpan: 1 } },
  { id: 'calendar', title: 'Calendar', body: 'Next: Standup at 10:00', defaultPosition: { colStart: 1, rowStart: 2, colSpan: 2, rowSpan: 1 } },
  { id: 'notes', title: 'Notes', body: '“Refactor packer · push v1 by Friday”', defaultPosition: { colStart: 4, rowStart: 2, colSpan: 1, rowSpan: 1 } },
  { id: 'activity', title: 'Activity', body: '7 commits · 2 PRs reviewed today', defaultPosition: { colStart: 1, rowStart: 3, colSpan: 4, rowSpan: 1 } },
];

@Component({
  selector: 'demo-tile-manager',
  templateUrl: './tile-manager.component.html',
  styleUrls: ['./tile-manager.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    BsFormComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsSelectComponent,
    BsSelectOption,
    BsCheckboxComponent,
    BsTileManagerComponent,
    BsTileComponent,
    BsTileHeaderComponent,
    BsCodeSnippetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TileManagerComponent {
  readonly manager = viewChild(BsTileManagerComponent);

  readonly columnCount = signal<number | null>(4);
  readonly minColumnWidth = signal<string>('200px');
  readonly minRowHeight = signal<string>('8rem');
  readonly gap = signal<string>('0.75rem');
  readonly dragMode = signal<'tile' | 'header' | 'off'>('header');
  readonly resizeMode = signal<'hover' | 'always' | 'off'>('hover');
  readonly animateReflow = signal<boolean>(true);

  readonly tiles = signal<DemoTile[]>(this.loadInitialTiles());

  readonly latestSnapshot = signal<TileLayoutSnapshot | null>(null);
  readonly latestBlocked = signal<TileGestureBlocked | null>(null);

  readonly snapshotJson = computed(() =>
    this.latestSnapshot() ? JSON.stringify(this.latestSnapshot(), null, 2) : '—',
  );

  onLayoutChange(snapshot: TileLayoutSnapshot): void {
    this.latestSnapshot.set(snapshot);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // localStorage may be unavailable (private mode, SSR). Demo silently degrades.
    }
  }

  onTilePositionChange(id: string, position: TilePosition): void {
    this.tiles.update((tiles) =>
      tiles.map((t) => (t.id === id ? { ...t, position } : t)),
    );
  }

  onGestureBlocked(blocked: TileGestureBlocked): void {
    this.latestBlocked.set(blocked);
  }

  toggleLocked(id: string): void {
    this.tiles.update((tiles) =>
      tiles.map((t) => (t.id === id ? { ...t, locked: !t.locked } : t)),
    );
  }

  saveNow(): void {
    const snapshot = this.manager()?.captureLayout();
    if (snapshot) {
      this.latestSnapshot.set(snapshot);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.tiles.set(this.buildDefaultTiles());
    this.latestSnapshot.set(null);
  }

  private loadInitialTiles(): DemoTile[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return this.buildDefaultTiles();
      const snapshot: TileLayoutSnapshot = JSON.parse(saved);
      const positionsById = new Map(snapshot.map((s) => [s.id, s.position]));
      return this.buildDefaultTiles().map((t) => ({
        ...t,
        position: positionsById.get(t.id) ?? t.position,
      }));
    } catch {
      return this.buildDefaultTiles();
    }
  }

  private buildDefaultTiles(): DemoTile[] {
    return DEFAULT_TILES.map((t) => ({
      ...t,
      position: { ...t.defaultPosition },
      locked: false,
    }));
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-tile-manager
      [columnCount]="4"
      [gap]="'0.75rem'"
      [label]="'Dashboard'"
      (layoutChange)="onLayoutChange($event)">
      @for (tile of tiles(); track tile.id) {
        <bs-tile
          [id]="tile.id"
          [position]="tile.position"
          [label]="tile.title"
          (positionChange)="onTilePositionChange(tile.id, $event)">
          <bs-tile-header>{{ tile.title }}</bs-tile-header>
          <div class="tile-body">{{ tile.body }}</div>
        </bs-tile>
      }
    </bs-tile-manager>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsTileManagerComponent, BsTileComponent, BsTileHeaderComponent, TileLayoutSnapshot, TilePosition } from '@mintplayer/ng-bootstrap/tile-manager';
    interface DashboardTile {
      id: string;
      title: string;
      body: string;
      position: TilePosition;
    }

    @Component({
      selector: 'my-dashboard',
      templateUrl: './my-dashboard.component.html',
      imports: [BsTileManagerComponent, BsTileComponent, BsTileHeaderComponent],
    })
    export class MyDashboardComponent {
      readonly tiles = signal<DashboardTile[]>([
        { id: 'weather',  title: 'Weather',  body: 'Sunny · 22 °C',
          position: { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 } },
        { id: 'inbox',    title: 'Inbox',    body: '3 unread',
          position: { colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 2 } },
        { id: 'calendar', title: 'Calendar', body: 'Next: Standup at 10:00',
          position: { colStart: 1, rowStart: 2, colSpan: 2, rowSpan: 1 } },
      ]);

      onTilePositionChange(id: string, position: TilePosition): void {
        this.tiles.update((tiles) =>
          tiles.map((t) => (t.id === id ? { ...t, position } : t)));
      }

      onLayoutChange(snapshot: TileLayoutSnapshot): void {
        localStorage.setItem('dashboard-layout', JSON.stringify(snapshot));
      }
    }
  `;

  protected readonly snippetPersistTs = dedent`
    // Restore on mount: snapshot is an array of { id, position } entries.
    // Merge it with your default tiles to handle added / removed widgets.
    readonly manager = viewChild(BsTileManagerComponent);

    ngOnInit(): void {
      const raw = localStorage.getItem('dashboard-layout');
      if (!raw) return;
      const snapshot: TileLayoutSnapshot = JSON.parse(raw);
      const byId = new Map(snapshot.map((s) => [s.id, s.position]));
      this.tiles.update((tiles) =>
        tiles.map((t) => ({ ...t, position: byId.get(t.id) ?? t.position })));
    }

    saveNow(): void {
      const snapshot = this.manager()?.captureLayout();
      if (snapshot) localStorage.setItem('dashboard-layout', JSON.stringify(snapshot));
    }
  `;
}
