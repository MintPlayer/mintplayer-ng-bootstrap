import { isPlatformServer, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, computed, contentChildren, effect, ElementRef,
  inject, input, output, PLATFORM_ID, signal, TemplateRef, viewChild, viewChildren
} from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';
import { BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';
import { BsPriorityNavItemDirective } from '../priority-nav-item/priority-nav-item.directive';
import { computeOverflowIds, computeOverflowOrder } from './overflow';

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
  private overlayStack = inject(BsOverlayStackService);
  private stackToken: symbol | null = null;

  isServerSide = isPlatformServer(this.platformId);

  private static counter = 0;
  uid = `pn-${++BsPriorityNavComponent.counter}`;

  // Inputs
  moreLabel = input('More');
  moreLabelTemplate = input<TemplateRef<{ $implicit: boolean }> | null>(null);
  collapseAt = input<Breakpoint | null>(null);
  overflowFrom = input<'start' | 'end'>('end');
  hideEmptyMore = input(true);
  ariaLabel = input<string>('Navigation');

  // Outputs
  overflowChange = output<BsPriorityNavItemDirective[]>();

  // Children
  readonly items = contentChildren(BsPriorityNavItemDirective);

  // Per-item width measurements (from the off-screen measure strip)
  private measureSizers = viewChildren<BsObserveSizeDirective>('measureItem');
  // Visible strip width and its element (for reading computed `column-gap`)
  stripSizer = viewChild.required<BsObserveSizeDirective>('stripSize');
  private stripElement = viewChild.required('stripSize', { read: ElementRef });
  // More button width. Optional on purpose: the button exists only in the JS branch of the
  // template (the server renders a label instead), so this query is empty on the server.
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

  // Items in overflow order (see computeOverflowOrder for the priority convention).
  overflowOrder = computed(() => {
    const entries = this.items().map((item) => ({ item, priority: item.priority() }));
    return computeOverflowOrder(entries, this.overflowFrom() === 'end').map(({ item }) => item);
  });

  // Per-item width map (from measure strip, indexed by item id, in items() order)
  itemWidths = computed<Map<number, number>>(() => {
    if (this.isServerSide) return new Map();
    const sizers = this.measureSizers();
    return new Map(this.items()
      .map((item, i) => [item.id, sizers[i]?.width()] as const)
      .filter((entry): entry is readonly [number, number] => entry[1] !== undefined));
  });

  // The strip's `column-gap` (or `gap`) value in pixels. Read from computed
  // style so consumers' `gap` declarations get factored into the overflow math
  // — without this, items overflow late or layout-shift when a gap is set.
  // Re-read whenever the strip width changes (covers media-query gap changes
  // that piggy-back on the same breakpoint).
  itemGap = computed(() => {
    if (this.isServerSide) return 0;
    this.stripSizer().width();
    const cs = getComputedStyle(this.stripElement().nativeElement as HTMLElement);
    const raw = parseFloat(cs.columnGap || cs.gap || '0');
    return Number.isFinite(raw) ? raw : 0;
  });

  overflowingIds = computed<Set<number>>(() => {
    if (this.isServerSide) return new Set();
    if (this.forceCollapse()) {
      return new Set(this.items().map(i => i.id));
    }
    return computeOverflowIds({
      stripWidth: this.stripSizer().width() ?? 0,
      moreWidth: this.moreSizer()?.width() ?? 0,
      gap: this.itemGap(),
      widths: this.itemWidths(),
      order: this.overflowOrder().map((item) => item.id),
    });
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

    effect(() => {
      const open = this.isMoreOpen();
      if (open && this.stackToken === null) {
        this.stackToken = this.overlayStack.push();
      } else if (!open && this.stackToken !== null) {
        this.overlayStack.release(this.stackToken);
        this.stackToken = null;
      }
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
    if (this.isMoreOpen() && this.stackToken !== null && this.overlayStack.isTop(this.stackToken)) {
      this.isMoreOpen.set(false);
    }
  }

  onDocumentClick(event: MouseEvent) {
    if (event.button !== 0 || !this.isMoreOpen()) return;
    if (!this.element.nativeElement.contains(event.target as Node)) {
      this.isMoreOpen.set(false);
    }
  }

}
