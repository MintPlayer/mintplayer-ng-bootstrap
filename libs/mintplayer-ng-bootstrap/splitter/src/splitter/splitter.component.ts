import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
// Eager side-effect registration: the splitter has no DSD chrome to protect,
// and deferring to afterNextRender would flash the `:not(:defined)` fallback
// layout on every load.
import '@mintplayer/web-components/splitter';
import type {
  Direction,
  MpSplitter,
  ResizeKey,
  SplitterResizeEventDetail,
} from '@mintplayer/web-components/splitter';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

/**
 * `<bs-splitter>` — Angular wrapper around the `<mp-splitter>` web component.
 *
 * Panes are plain content children; the WC slots each direct child into its
 * own resizable panel and inserts draggable/keyboard-operable dividers
 * between them. Nest splitters to build dock-style layouts:
 *
 *     <bs-splitter>
 *       <div>Left</div>
 *       <bs-splitter orientation="vertical" [minPanelSize]="80">
 *         <div>Top</div>
 *         <div>Bottom</div>
 *       </bs-splitter>
 *     </bs-splitter>
 *
 * Each wrapper claims exactly the events of its own `<mp-splitter>`: the
 * target guard keeps a nested splitter's bubbled events from being re-emitted
 * by the outer wrapper, and `stopPropagation()` *after* the guard ensures a
 * claimed event is delivered once, as a typed output only. The stop is
 * required: Angular registers BOTH a DOM listener and the output subscription
 * for an element event binding, so a consumer's `(resizing)` handler would
 * otherwise also receive the identically-named bubbling CustomEvent raw.
 * Unclaimed events (from a nested raw `<mp-splitter>`) bubble on untouched.
 *
 * Before the custom element upgrades (or with JS off), a `:not(:defined)`
 * fallback stylesheet renders the panes as a static flex layout with visible
 * divider chrome, so server-rendered pages don't flash unstyled content.
 */
@Component({
  selector: 'bs-splitter',
  templateUrl: './splitter.component.html',
  imports: [BsForwardAriaDirective],
  styleUrls: ['./splitter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The fallback stylesheet must match the CONSUMER-projected pane children,
  // which never carry this component's emulated-encapsulation attribute —
  // so the styles ship unscoped. They stay inert once the element upgrades
  // (`:not(:defined)` no longer matches).
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsSplitterComponent {
  /** Axis along which the panes are laid out (and resized). */
  readonly orientation = input<Direction>('horizontal');
  /** Minimum pane size in px a divider can shrink a pane to (WC default 50). */
  readonly minPanelSize = input<number | null>(null);
  /** Widen the invisible divider hit area for touch use. */
  readonly touchMode = input(false);

  /** A divider drag started. Detail: current `{ sizes, orientation }`. */
  readonly resizeStart = output<SplitterResizeEventDetail>();
  /** Fires on every drag-preview frame with the in-flight sizes. */
  readonly resizing = output<SplitterResizeEventDetail>();
  /** Drag or keyboard resize committed. Detail: final `{ sizes, orientation }`. */
  readonly resizeEnd = output<SplitterResizeEventDetail>();

  protected readonly element = viewChild<ElementRef<MpSplitter>>('element');

  protected readonly minPanelSizeAttr = computed(() => {
    const value = this.minPanelSize();
    return value != null ? String(value) : null;
  });
  protected readonly touchModeAttr = computed(() => (this.touchMode() ? '' : null));

  /** Current pane sizes in px, in document order. */
  getPanelSizes(): number[] {
    return this.element()?.nativeElement.getPanelSizes() ?? [];
  }

  /** Programmatically distribute pane sizes (px, one entry per pane). */
  setPanelSizes(sizes: number[]): void {
    this.element()?.nativeElement.setPanelSizes(sizes);
  }

  /**
   * Drive a keyboard-style resize on divider `dividerIndex` (arrows ±10%,
   * `fine` = ±1%, Home/End to the limits).
   */
  resizeDividerBy(dividerIndex: number, key: ResizeKey, fine = false): void {
    this.element()?.nativeElement.resizeDividerBy(dividerIndex, key, fine);
  }

  protected onResizeStart(event: Event): void {
    if (event.target !== this.element()?.nativeElement) return;
    event.stopPropagation();
    this.resizeStart.emit((event as CustomEvent<SplitterResizeEventDetail>).detail);
  }

  protected onResizing(event: Event): void {
    if (event.target !== this.element()?.nativeElement) return;
    event.stopPropagation();
    this.resizing.emit((event as CustomEvent<SplitterResizeEventDetail>).detail);
  }

  protected onResizeEnd(event: Event): void {
    if (event.target !== this.element()?.nativeElement) return;
    event.stopPropagation();
    this.resizeEnd.emit((event as CustomEvent<SplitterResizeEventDetail>).detail);
  }
}
