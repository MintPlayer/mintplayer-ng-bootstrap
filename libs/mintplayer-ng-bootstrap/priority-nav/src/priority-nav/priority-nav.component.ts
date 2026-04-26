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
  // Visible strip width
  stripSizer = viewChild<BsObserveSizeDirective>('stripSize');
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

  // Items in declaration order
  itemList = computed(() => this.items());

  // Items in overflow order. Convention: a LOWER priority number means MORE
  // important (priority: 1 stays visible longest). Items without a priority
  // are treated as least important and overflow before any prioritized item.
  // Tiebreaker uses declaration order (last-declared overflows first when
  // overflowFrom='end').
  overflowOrder = computed(() => {
    const items = this.items();
    const fromEnd = this.overflowFrom() === 'end';
    return [...items]
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const pa = a.item.priority;
        const pb = b.item.priority;
        // Unprioritized items overflow first
        if (pa === null && pb !== null) return -1;
        if (pa !== null && pb === null) return 1;
        // Both prioritized: higher number overflows first (less important)
        if (pa !== null && pb !== null && pa !== pb) return pb - pa;
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

  overflowingIds = computed<Set<number>>(() => {
    if (this.isServerSide) return new Set();
    if (this.forceCollapse()) {
      return new Set(this.items().map(i => i.id));
    }

    const stripWidth = this.stripSizer()?.width() ?? 0;
    const moreWidth = this.moreSizer()?.width() ?? 0;
    const widths = this.itemWidths();

    if (stripWidth === 0 || widths.size === 0) return new Set();

    const totalNeeded = Array.from(widths.values()).reduce((a, b) => a + b, 0);
    if (totalNeeded <= stripWidth) return new Set();

    // Reserve space for the More toggle, then walk overflow order kicking items out.
    const overflowing = new Set<number>();
    let used = totalNeeded;
    const budget = stripWidth - moreWidth;

    for (const item of this.overflowOrder()) {
      if (used <= budget) break;
      overflowing.add(item.id);
      used -= widths.get(item.id) ?? 0;
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

  constructor() {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }

    effect(() => {
      const overflowing = this.overflowingIds();
      const overflowingItems = this.items().filter(i => overflowing.has(i.id));
      this.overflowChange.emit(overflowingItems);
    });
  }

  onWindowResize() {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }
  }

  toggleMore() {
    this.isMoreOpen.update(v => !v);
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.isMoreOpen()) return;
    if (!this.element.nativeElement.contains(event.target as Node)) {
      this.isMoreOpen.set(false);
    }
  }

  isOverflowing(item: BsPriorityNavItemDirective): boolean {
    return this.overflowingIds().has(item.id);
  }

  hideBelowClass(item: BsPriorityNavItemDirective): string {
    return item.hideBelow ? `priority-nav-item-hide-below-${item.hideBelow}` : '';
  }
}
