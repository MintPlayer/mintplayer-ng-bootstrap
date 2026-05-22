import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  computed,
  contentChildren,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { BsTileComponent } from './tile.component';
import {
  MintTile,
  MintTileManagerElement,
  TileDragMode,
  TileResizeMode,
  TileLayoutSnapshot,
  TileGestureBlocked,
  TilePosition,
} from '@mintplayer/web-components/tile-manager';

@Component({
  selector: 'bs-tile-manager',
  template: `
    <mp-tile-manager
      #manager
      class="bs-tile-manager"
      [attr.column-count]="columnCountAttr()"
      [attr.min-column-width]="minColumnWidth()"
      [attr.min-row-height]="minRowHeight()"
      [attr.gap]="gap()"
      [attr.drag-mode]="dragMode()"
      [attr.resize-mode]="resizeMode()"
      [attr.animate-reflow]="animateReflow() ? '' : null"
      [attr.label]="label()"
      (tilelayoutchange)="onLayoutChange($event)"
      (tilepositionchange)="onPositionChange($event)"
      (tilegestureblocked)="onGestureBlocked($event)"
    >
      @for (tile of tiles(); track tile.id()) {
        <div [attr.slot]="tile.id() + '-header'" class="bs-tile-slot">
          <ng-container *ngTemplateOutlet="tile.headerTpl()"></ng-container>
        </div>
        <div [attr.slot]="tile.id() + '-content'" class="bs-tile-slot">
          <ng-container *ngTemplateOutlet="tile.contentTpl()"></ng-container>
        </div>
      }
    </mp-tile-manager>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .bs-tile-manager {
        display: block;
        width: 100%;
      }
      .bs-tile-slot {
        display: contents;
      }
    `,
  ],
  imports: [NgTemplateOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTileManagerComponent implements AfterViewInit {
  readonly columnCount = input<number | null>(null);
  readonly minColumnWidth = input<string>('200px');
  readonly minRowHeight = input<string>('8rem');
  readonly gap = input<string>('0.5rem');
  readonly dragMode = input<TileDragMode>('header');
  readonly resizeMode = input<TileResizeMode>('hover');
  readonly animateReflow = input<boolean>(true);
  readonly label = input<string | null>(null);

  readonly layoutChange = output<TileLayoutSnapshot>();
  readonly gestureBlocked = output<TileGestureBlocked>();

  readonly tiles = contentChildren(BsTileComponent);
  readonly managerRef = viewChild<ElementRef<MintTileManagerElement>>('manager');

  protected readonly columnCountAttr = computed(() => {
    const c = this.columnCount();
    return c && c > 0 ? String(c) : null;
  });

  // Snapshot of Angular tile state, derived from contentChildren signals.
  // Re-runs whenever any tile's id, position, disableMove, disableResize, or label changes.
  // contentChildren() can surface a child before Angular has finished binding its
  // required inputs; reading them then throws NG0950. flatMap-with-try lets us
  // skip the not-yet-bound entry — the effect re-runs once binding completes.
  private readonly tilesSnapshot = computed<MintTile[]>(() =>
    this.tiles().flatMap((t) => {
      try {
        return [{
          id: t.id(),
          position: t.position(),
          disableMove: t.disableMove(),
          disableResize: t.disableResize(),
          label: t.label(),
        }];
      } catch {
        return [];
      }
    }),
  );

  constructor() {
    effect(() => {
      const snapshot = this.tilesSnapshot();
      const ref = this.managerRef();
      if (!ref) return;
      ref.nativeElement.tiles = snapshot;
    });
  }

  ngAfterViewInit(): void {
    // First push happens via the constructor effect once the view is alive.
  }

  /** Returns the current layout. Mirrors `BsDockManagerComponent.captureLayout()`. */
  captureLayout(): TileLayoutSnapshot {
    const ref = this.managerRef();
    if (!ref) return [];
    return Array.from(ref.nativeElement.tiles ?? []).map((t) => ({
      id: t.id,
      position: { ...t.position },
    }));
  }

  protected onLayoutChange(event: Event): void {
    const detail = (event as CustomEvent<TileLayoutSnapshot>).detail;
    if (detail) this.layoutChange.emit(detail);
  }

  protected onPositionChange(event: Event): void {
    const detail = (event as CustomEvent<{ id: string; position: TilePosition }>).detail;
    if (!detail) return;
    const tile = this.tiles().find((t) => t.id() === detail.id);
    tile?.positionChange.emit(detail.position);
  }

  protected onGestureBlocked(event: Event): void {
    const detail = (event as CustomEvent<TileGestureBlocked>).detail;
    if (detail) this.gestureBlocked.emit(detail);
  }
}
