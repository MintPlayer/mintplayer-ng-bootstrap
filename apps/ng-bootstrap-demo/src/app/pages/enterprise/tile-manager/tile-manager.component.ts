import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import {
  BsTileColumnCountChange,
  BsTileContentDirective,
  BsTileDirective,
  BsTileHeaderDirective,
  BsTileManagerComponent,
  MintTile,
  TileGestureBlocked,
  TileDragMode,
  TileLayouts,
  TileResizeMode,
} from '@mintplayer/ng-bootstrap/tile-manager';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

const STORAGE_KEY = 'tile-manager-demo-layouts-v2';

interface DemoTile extends MintTile {
  title: string;
  body: string;
}

const PANELS: readonly DemoTile[] = [
  { id: 'weather', title: 'Weather', label: 'Weather', body: 'Sunny · 22 °C · 5 km/h NW', defaultSize: { colSpan: 2, rowSpan: 1 } },
  { id: 'inbox', title: 'Inbox', label: 'Inbox', body: '3 unread · 2 starred', defaultSize: { colSpan: 1, rowSpan: 2 } },
  { id: 'stats', title: 'Stats', label: 'Stats', body: '1.2k visits · ↑12% week-over-week' },
  { id: 'calendar', title: 'Calendar', label: 'Calendar', body: 'Next: Standup at 10:00', defaultSize: { colSpan: 2, rowSpan: 1 } },
  { id: 'notes', title: 'Notes', label: 'Notes', body: '“Refactor packer · push v1 by Friday”' },
  { id: 'activity', title: 'Activity', label: 'Activity', body: '7 commits · 2 PRs reviewed today', defaultSize: { colSpan: 4, rowSpan: 1 } },
];

@Component({
  selector: 'demo-tile-manager',
  templateUrl: './tile-manager.component.html',
  styleUrls: ['./tile-manager.component.scss'],
  imports: [
    FormsModule,
    BsFormComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsSelectComponent,
    BsSelectOption,
    BsCheckboxComponent,
    BsTileManagerComponent,
    BsTileDirective,
    BsTileHeaderDirective,
    BsTileContentDirective,
    BsCodeSnippetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TileManagerComponent {
  readonly panels = PANELS;
  readonly stackBelow = signal<number>(576);
  readonly gap = signal<number>(12);
  readonly editing = signal<boolean>(true);
  readonly animateReflow = signal<boolean>(true);
  readonly hidden = signal<ReadonlySet<string>>(new Set());
  readonly locked = signal<ReadonlySet<string>>(new Set());

  /** Host-owned visibility (D9): a hidden panel is simply absent from `tiles`; its stored positions stay. */
  readonly tiles = computed(() =>
    this.panels
      .filter((p) => !this.hidden().has(p.id))
      .map((p) => (this.locked().has(p.id) ? { ...p, disableMove: true, disableResize: true } : p)),
  );
  readonly layouts = signal<TileLayouts>(loadLayouts());
  readonly dragMode = computed<TileDragMode>(() => (this.editing() ? 'header' : 'off'));
  readonly resizeMode = computed<TileResizeMode>(() => (this.editing() ? 'hover' : 'off'));

  readonly columnCount = signal<number | null>(null);
  readonly latestBlocked = signal<TileGestureBlocked | null>(null);
  readonly layoutsJson = computed(() => JSON.stringify(this.layouts(), null, 2));

  constructor() {
    effect(() => {
      const layouts = this.layouts();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
      } catch {
        // localStorage may be unavailable (private mode, SSR). The demo silently degrades.
      }
    });
  }

  onColumnCountChange(change: BsTileColumnCountChange): void {
    this.columnCount.set(change.columnCount);
  }

  toggle(set: 'hidden' | 'locked', id: string): void {
    this[set].update((ids) => (ids.has(id) ? new Set([...ids].filter((x) => x !== id)) : new Set([...ids, id])));
  }

  reset(): void {
    this.layouts.set({});
  }

  protected readonly snippetHtml = dedent`
    <bs-tile-manager
      [(layouts)]="layouts"
      [stackBelow]="576"
      [gap]="12"
      label="Dashboard">
      <ng-container *bsTile="let tile of tiles()">
        <span *bsTileHeader>{{ tile.title }}</span>
        <div *bsTileContent class="tile-body">{{ tile.body }}</div>
      </ng-container>
    </bs-tile-manager>
  `;

  protected readonly snippetTs = dedent`
    import { Component, effect, signal } from '@angular/core';
    import {
      BsTileManagerComponent,
      BsTileDirective,
      BsTileHeaderDirective,
      BsTileContentDirective,
      MintTile,
      TileLayouts,
    } from '@mintplayer/ng-bootstrap/tile-manager';

    interface DashboardTile extends MintTile {
      title: string;
      body: string;
    }

    @Component({
      selector: 'my-dashboard',
      templateUrl: './my-dashboard.component.html',
      imports: [BsTileManagerComponent, BsTileDirective, BsTileHeaderDirective, BsTileContentDirective],
    })
    export class MyDashboardComponent {
      readonly tiles = signal<DashboardTile[]>([
        { id: 'weather', title: 'Weather', body: 'Sunny · 22 °C', defaultSize: { colSpan: 2, rowSpan: 1 } },
        { id: 'inbox', title: 'Inbox', body: '3 unread' },
      ]);
      // One layout per column count; a commit writes the full next record.
      readonly layouts = signal<TileLayouts>(JSON.parse(localStorage.getItem('dashboard') ?? '{}'));

      constructor() {
        effect(() => localStorage.setItem('dashboard', JSON.stringify(this.layouts())));
      }
    }
  `;
}

function loadLayouts(): TileLayouts {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}
