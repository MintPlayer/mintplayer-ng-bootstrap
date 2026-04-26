import { isPlatformServer, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, computed, contentChildren, effect, ElementRef,
  inject, input, output, PLATFORM_ID, signal, TemplateRef, viewChild, viewChildren
} from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsObserveSizeDirective } from '@mintplayer/ng-swiper/observe-size';
import { BsPriorityNavItemDirective } from '../priority-nav-item/priority-nav-item.directive';

@Component({
  selector: 'bs-priority-nav',
  templateUrl: './priority-nav.component.html',
  styleUrls: ['./priority-nav.component.scss'],
  imports: [NgClass, NgTemplateOutlet, BsNoNoscriptDirective, BsObserveSizeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
    '(window:resize)': 'onWindowResize()',
  },
})
export class BsPriorityNavComponent {
  private platformId = inject(PLATFORM_ID);
  private element = inject(ElementRef);

  isServerSide = isPlatformServer(this.platformId);

  private static counter = 0;
  uid = `pn-${++BsPriorityNavComponent.counter}`;

  // Inputs
  moreLabel = input('More');
  moreLabelTemplate = input<TemplateRef<{ $implicit: boolean }> | null>(null);
  collapseAt = input<Breakpoint | null>(null);
  overflowFrom = input<'start' | 'end'>('end');
  hideEmptyMore = input(true);

  // Outputs
  overflowChange = output<BsPriorityNavItemDirective[]>();

  // Children
  readonly items = contentChildren(BsPriorityNavItemDirective);

  // Per-item width measurements (from the off-screen measure strip)
  private measureSizers = viewChildren<BsObserveSizeDirective>('measureItem');
  // Visible strip width and its element (for reading computed `column-gap`)
  stripSizer = viewChild<BsObserveSizeDirective>('stripSize');
  private stripElement = viewChild('stripSize', { read: ElementRef });
  // More button width
  moreSizer = viewChild<BsObserveSizeDirective>('moreSize');

  // Open/closed state for the More menu (JS path)
  isMoreOpen = signal(false);
  windowWidth = signal<number>(0);

  collapseAtPx = computed(() => {
    switch (this.collapseAt()) {
      case 'xxl': return 1400;
      case 'xl': return 1200;
      case 'lg': return 992;
      case 'md': return 768;
      case 'sm': return 576;
      case 'xs': return 0;
      default: return null;
    }
  });

  forceCollapse = computed(() => {
    const bp = this.collapseAtPx();
    if (bp === null) return false;
    const w = this.windowWidth();
    return w > 0 && w < bp;
  });

  // Items in overflow order. Convention: a LOWER priority number means MORE
  // important (priority: 1 stays visible longest). Items without a priority
  // are treated as least important and overflow before any prioritized item.
  // Tiebreaker uses declaration order (last-declared overflows first when
  // overflowFrom='end').
  overflowOrder = computed(() => {
    const items = this.items();
    const fromEnd = this.overflowFrom() === 'end';
    return [...items]
      .map((item, index) => ({ item, index, priority: item.priority() }))
      .sort((a, b) => {
        // Unprioritized items overflow first
        if (a.priority === null && b.priority !== null) return -1;
        if (a.priority !== null && b.priority === null) return 1;
        // Both prioritized: higher number overflows first (less important)
        if (a.priority !== null && b.priority !== null && a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Tiebreaker by declaration order
        return fromEnd ? b.index - a.index : a.index - b.index;
      })
      .map(x => x.item);
  });

  // Per-item width map (from measure strip, indexed by item id, in items() order)
  itemWidths = computed<Map<number, number>>(() => {
    if (this.isServerSide) return new Map();
    const sizers = this.measureSizers();
    const items = this.items();
    const map = new Map<number, number>();
    items.forEach((item, i) => {
      const sizer = sizers[i];
      if (!sizer) return;
      const w = sizer.width();
      if (w !== undefined) map.set(item.id, w);
    });
    return map;
  });

  // The strip's `column-gap` (or `gap`) value in pixels. Read from computed
  // style so consumers' `gap` declarations get factored into the overflow math
  // — without this, items overflow late or layout-shift when a gap is set.
  // Re-read whenever the strip width changes (covers media-query gap changes
  // that piggy-back on the same breakpoint).
  itemGap = computed(() => {
    if (this.isServerSide) return 0;
    this.stripSizer()?.width();
    const el = this.stripElement()?.nativeElement as HTMLElement | undefined;
    if (!el) return 0;
    const cs = getComputedStyle(el);
    const raw = parseFloat(cs.columnGap || cs.gap || '0');
    return Number.isFinite(raw) ? raw : 0;
  });

  overflowingIds = computed<Set<number>>(() => {
    if (this.isServerSide) return new Set();
    if (this.forceCollapse()) {
      return new Set(this.items().map(i => i.id));
    }

    const stripWidth = this.stripSizer()?.width() ?? 0;
    const moreWidth = this.moreSizer()?.width() ?? 0;
    const widths = this.itemWidths();
    const gap = this.itemGap();

    if (stripWidth === 0 || widths.size === 0) return new Set();

    // Layout when all items fit (no More toggle): N items separated by N-1 gaps
    const sumWidths = Array.from(widths.values()).reduce((a, b) => a + b, 0);
    const allVisibleWidth = sumWidths + gap * Math.max(0, widths.size - 1);
    if (allVisibleWidth <= stripWidth) return new Set();

    // Need overflow → More toggle is shown. Layout when K items are kicked:
    //   (N - K) items + 1 More toggle = (N - K + 1) elements with (N - K) gaps
    const overflowing = new Set<number>();
    let visibleSum = sumWidths;
    let visibleCount = widths.size;

    for (const item of this.overflowOrder()) {
      const totalWithMore = visibleSum + moreWidth + gap * visibleCount;
      if (totalWithMore <= stripWidth) break;
      visibleSum -= widths.get(item.id) ?? 0;
      visibleCount -= 1;
      overflowing.add(item.id);
    }
    return overflowing;
  });

  hasAnyOverflow = computed(() => this.overflowingIds().size > 0);
  showMoreButton = computed(() => !this.hideEmptyMore() || this.hasAnyOverflow());

  // When every item is overflowing the toggle ends up at the start edge of
  // the strip (no inline items push it). Anchor the dropdown to that side
  // so it stays visually attached to the toggle.
  fullyCollapsed = computed(() => {
    const items = this.items();
    return items.length > 0 && this.overflowingIds().size === items.length;
  });

  // Derived per-item view used by all three rendering passes (measure strip,
  // inline strip, overflow menu). Pre-computes the breakpoint class string and
  // the JS-mode-only hide flags so the template can stay purely declarative —
  // no method calls, no inline `!isServerSide` guards. The SSR/noscript path
  // relies on CSS media queries instead of these flags, so both `hideInline`
  // and `hideInOverflow` are forced to false on the server.
  itemsWithMeta = computed(() => {
    const items = this.items();
    const overflowing = this.overflowingIds();
    const ssr = this.isServerSide;
    return items.map(item => {
      const bp = item.hideBelow();
      const isOverflowing = overflowing.has(item.id);
      return {
        item,
        hideBelowClass: bp ? `priority-nav-item-hide-below-${bp}` : '',
        hideInline: !ssr && isOverflowing,
        hideInOverflow: !ssr && !isOverflowing,
      };
    });
  });

  constructor() {
    if (!this.isServerSide) {
      this.windowWidth.set(window.innerWidth);
    }

    effect(() => {
      const overflowing = this.overflowingIds();
      const overflowingItems = this.items().filter(i => overflowing.has(i.id));
      this.overflowChange.emit(overflowingItems);
    });
  }

  onWindowResize() {
    if (!this.isServerSide) {
      this.windowWidth.set(window.innerWidth);
    }
  }

  toggleMore() {
    this.isMoreOpen.update(v => !v);
  }

  onEscape() {
    if (this.isMoreOpen()) this.isMoreOpen.set(false);
  }

  onDocumentClick(event: MouseEvent) {
    if (event.button !== 0 || !this.isMoreOpen()) return;
    if (!this.element.nativeElement.contains(event.target as Node)) {
      this.isMoreOpen.set(false);
    }
  }

}
