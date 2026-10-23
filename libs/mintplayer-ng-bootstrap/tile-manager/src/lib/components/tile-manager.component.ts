import { DOCUMENT, isPlatformServer, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  HostAttributeToken,
  inject,
  Injector,
  input,
  model,
  output,
  PLATFORM_ID,
  untracked,
  viewChild,
} from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { machineSignal, MpPropsDirective, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { writeScopedStyleTag } from '@mintplayer/ui-core/scoped-styles';
import {
  breakpointCss,
  connect,
  DEFAULT_GAP,
  DEFAULT_MIN_COLUMN_WIDTH,
  gridPointer,
  readCellMetrics,
  TILE_MANAGER_SCOPE,
  TileFlip,
  TileManagerMachine,
  tileManagerScopedStyles,
  type MintTile,
  type TileBreakpoint,
  type TileDragMode,
  type TileGestureBlocked,
  type TileLayoutChange,
  type TileLayouts,
  type TileLayoutSnapshot,
  type TileManagerInputPatch,
  type TileManagerMessages,
  type TilePart,
  type TileResizeMode,
} from '@mintplayer/ui-core/tile-manager';
import { BsTileContentDirective, BsTileHeaderDirective, type BsTileTemplateContext } from '../directives/tile-template.directives';

/** Payload of `columnCountChange`. */
export interface BsTileColumnCountChange {
  columnCount: number;
  previous: number | null;
}

/**
 * Tile manager: a dashboard grid whose tiles the user moves and resizes, with one layout per
 * column count (#440).
 *
 * The Angular front of `TileManagerMachine` (`@mintplayer/ui-core/tile-manager`). Every decision
 * (layout per column count, gestures, keyboard, ARIA) is the machine's; this component renders
 * its own template from `connect()`'s bags with `[mpProps]`, measures the grid, owns pointer
 * capture and the FLIP animation, and turns the machine's events into outputs. Tile header and
 * body come from the `*bsTileHeader` / `*bsTileContent` templates.
 *
 * SSR: the whole tree is rendered, plus a `<style>` in `<head>` holding the `@container` rules
 * that place every tile at every column count (D14), so the server HTML paints the right layout
 * with no JS. No-JS tier 2: before the first measure the tiles are named groups with no tab stop
 * or grips.
 */
@Component({
  selector: 'bs-tile-manager',
  templateUrl: './tile-manager.component.html',
  imports: [NgTemplateOutlet, MpPropsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-block' },
})
export class BsTileManagerComponent<T extends MintTile = MintTile> {
  /** The visible tiles, in DOM order. */
  readonly tiles = input<readonly T[]>([]);
  /** One layout per column count. Two-way: a commit writes the full next record. */
  readonly layouts = model<TileLayouts>({});
  /** Explicit `{ minWidth, columns }` map. Wins over `stackBelow` and the generated map. */
  readonly breakpoints = input<readonly TileBreakpoint[] | null>(null);
  /** px. Below this width the tiles stack in one column. */
  readonly stackBelow = input<number | null>(null);
  /** Upper bound of the generated map when `layouts` is empty. */
  readonly maxColumns = input<number>(6);
  /** px. No column is narrower than this, except at one column. */
  readonly minColumnWidth = input<number>(DEFAULT_MIN_COLUMN_WIDTH);
  /** CSS length of one grid row. */
  readonly minRowHeight = input<string>('8rem');
  /** px between tiles. */
  readonly gap = input<number>(DEFAULT_GAP);
  readonly dragMode = input<TileDragMode>('header');
  readonly resizeMode = input<TileResizeMode>('hover');
  /** Animate tiles to their new place when the layout reflows. Off under reduced motion. */
  readonly animateReflow = input<boolean>(true);
  /** Accessible name of the board. A host `aria-label` / `aria-labelledby` wins. */
  readonly label = input<string | null>(null);
  /** Localized strings for the board's descriptions and announcements. */
  readonly messages = input<Partial<TileManagerMessages>>({});

  /** Each step of a gesture or keyboard move: the layout as it would be committed. */
  readonly layoutPreview = output<TileLayoutChange>();
  /** A commit, with the full layouts record and the stale narrower counts (D15). */
  readonly layoutChange = output<TileLayoutChange>();
  readonly columnCountChange = output<BsTileColumnCountChange>();
  readonly gestureBlocked = output<TileGestureBlocked>();

  readonly headerTemplate = contentChild(BsTileHeaderDirective);
  readonly contentTemplate = contentChild(BsTileContentDirective);

  readonly id = inject(BsIdService).next('bs-tile-manager');
  readonly machine = new TileManagerMachine({ vibrate: (ms) => navigator.vibrate?.(ms) });
  readonly state = machineSignal(this.machine);
  /** Host transparency: a consumer's aria-* on `<bs-tile-manager>` lands on the region. */
  private readonly hostAria = takeHostAria();
  readonly api = computed(() => {
    this.state();
    const api = connect(this.machine, this.id);
    const describedBy = [api.board.attrs['aria-describedby'], this.hostAria['aria-describedby']].filter(Boolean).join(' ') || null;
    return { ...api, board: { ...api.board, attrs: { ...api.board.attrs, ...this.hostAria, 'aria-describedby': describedBy } } };
  });
  /** The `*bsTileHeader` / `*bsTileContent` context per tile id, stable across change detection. */
  readonly tileContext = computed(() => new Map(this.tiles().map((t) => [t.id, { $implicit: t } as BsTileTemplateContext<T>])));

  // Not `.required`: the machine notifies (onChange) while effects configure it, before the view exists.
  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly injector = inject(Injector);
  private readonly flip = new TileFlip();
  private lastRendered: TileLayoutSnapshot | null = null;
  private focusSeq = 0;
  private resizeObserver: ResizeObserver | null = null;
  private measureFrame = 0;
  private width = 0;

  constructor() {
    useScopedStyles(TILE_MANAGER_SCOPE, tileManagerScopedStyles);

    // Inputs → machine. One effect per input, so an unrelated input change never re-pushes a
    // stale controlled `layouts` over the layout the machine just committed (S3).
    const forward = <K extends keyof TileManagerInputPatch>(key: K, read: () => TileManagerInputPatch[K]) =>
      effect(() => {
        const value = read();
        untracked(() => this.machine.setInputs({ [key]: value } as TileManagerInputPatch));
      });
    forward('tiles', this.tiles);
    forward('breakpoints', this.breakpoints);
    forward('stackBelow', this.stackBelow);
    forward('maxColumns', this.maxColumns);
    forward('minColumnWidth', this.minColumnWidth);
    forward('minRowHeight', this.minRowHeight);
    forward('gap', this.gap);
    forward('dragMode', this.dragMode);
    forward('resizeMode', this.resizeMode);
    forward('label', this.label);
    forward('messages', this.messages);
    // A consumer write to [(layouts)], not the echo of our own commit.
    effect(() => {
      const layouts = this.layouts();
      if (layouts !== untracked(() => this.machine.snapshot.layouts)) untracked(() => this.machine.setInputs({ layouts }));
    });

    const offEvents = this.machine.onEvent((e) => {
      switch (e.type) {
        case 'layoutchange': {
          const { type: _, ...change } = e;
          this.layouts.set(change.layouts);
          this.layoutChange.emit(change);
          break;
        }
        case 'layoutpreview': {
          const { type: _, ...change } = e;
          this.layoutPreview.emit(change);
          break;
        }
        case 'columncountchange':
          this.columnCountChange.emit({ columnCount: e.columnCount, previous: e.previous });
          break;
        case 'gestureblocked': {
          const { type: _, ...blocked } = e;
          this.gestureBlocked.emit(blocked);
          break;
        }
      }
    });

    if (isPlatformServer(inject(PLATFORM_ID))) {
      // D14: Angular strips <style> from templates, so the container rules go into <head>.
      const doc = inject(DOCUMENT);
      effect(() => {
        const css = breakpointCss(
          this.layouts(),
          this.tiles(),
          { breakpoints: this.breakpoints(), stackBelow: this.stackBelow(), minColumnWidth: this.minColumnWidth(), gap: this.gap(), maxColumns: this.maxColumns(), layouts: this.layouts() },
          this.id,
        );
        writeScopedStyleTag(doc, `${TILE_MANAGER_SCOPE}-layout-${this.id}`, css);
      });
    }

    // FLIP "first" runs in the store notification, before change detection writes the new positions.
    const unsubscribe = this.machine.subscribe(() => this.onChange());
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') this.machine.cancelGesture();
    };
    afterNextRender(() => {
      document.addEventListener('visibilitychange', onVisibilityChange);
      this.observe();
    });

    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      offEvents();
      this.resizeObserver?.disconnect();
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.measureFrame);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
      this.machine.destroy();
    });
  }

  /** What is rendered: the resolved column count and its layout (the preview while editing). */
  captureLayout(): { columnCount: number; layout: TileLayoutSnapshot } {
    return { columnCount: this.machine.snapshot.columnCount, layout: this.machine.rendered.map((p) => ({ id: p.id, position: { ...p.position } })) };
  }

  /** Drops `layouts[count]` and commits, so that count derives again (D15). */
  resetLayout(count: number): void {
    this.machine.resetLayout(count);
  }

  /** True while a pointer drag or resize is in flight. */
  get isGestureActive(): boolean {
    const kind = this.machine.snapshot.gesture.kind;
    return kind === 'drag' || kind === 'resize';
  }

  // ---- template handlers --------------------------------------------------

  down(e: PointerEvent, id: string, part: TilePart): void {
    const grid = this.grid()?.nativeElement;
    if (!grid) return;
    const verdict = this.machine.pointerDown(id, part, gridPointer(e, grid), readCellMetrics(grid, this.machine.snapshot.columnCount));
    if (verdict === 'capture') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-tile-id]')?.setPointerCapture(e.pointerId);
    }
  }

  move(e: PointerEvent): void {
    const grid = this.grid()?.nativeElement;
    if (grid && this.machine.pointerMove(gridPointer(e, grid)) === 'capture') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  key(e: KeyboardEvent, id: string): void {
    if (this.machine.keydown(id, e.key, { shift: e.shiftKey })) e.preventDefault();
  }

  // ---- internals ----------------------------------------------------------

  // One observer on the grid; `measure` runs in the next frame, never inside the callback (S2).
  private observe(): void {
    const grid = this.grid()?.nativeElement;
    if (!grid || this.resizeObserver || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      this.width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      if (this.measureFrame) return;
      this.measureFrame = requestAnimationFrame(() => {
        this.measureFrame = 0;
        this.machine.measure(this.width);
      });
    });
    this.resizeObserver.observe(grid);
  }

  private onChange(): void {
    const s = this.machine.snapshot;
    const rendered = this.machine.rendered;
    const grid = this.grid()?.nativeElement;
    const reflow = rendered !== this.lastRendered && !!grid && untracked(this.animateReflow) && s.measured;
    this.lastRendered = rendered;
    if (reflow && grid) this.flip.first(grid);
    const wantsFocus = !!s.focusRequest && s.focusRequest.seq !== this.focusSeq;
    if (!reflow && !wantsFocus) return;
    afterNextRender(
      () => {
        const now = this.machine.snapshot;
        if (reflow && grid) this.flip.play(grid,now.gesture.kind === 'drag' ? now.gesture.tileId : null);
        if (now.focusRequest && now.focusRequest.seq !== this.focusSeq) {
          this.focusSeq = now.focusRequest.seq;
          this.host.querySelector<HTMLElement>(`[data-tile-id="${CSS.escape(now.focusRequest.tileId)}"]`)?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}

const HOST_ARIA = ['aria-label', 'aria-labelledby', 'aria-describedby'] as const;

/**
 * A consumer's static `aria-label` / `-labelledby` / `-describedby` on `<bs-tile-manager>`. Read
 * from the template (HostAttributeToken), not the DOM, so server and hydrated client agree; the
 * copy on the roleless host is removed so nothing is announced twice.
 */
function takeHostAria(): Record<string, string> {
  const host = inject(ElementRef).nativeElement as HTMLElement;
  const bag: Record<string, string> = Object.fromEntries(
    HOST_ARIA.flatMap((name) => {
      const value = inject(new HostAttributeToken(name), { optional: true });
      return value === null ? [] : [[name, value]];
    }),
  );
  Object.keys(bag).forEach((name) => host.removeAttribute(name));
  return bag;
}
