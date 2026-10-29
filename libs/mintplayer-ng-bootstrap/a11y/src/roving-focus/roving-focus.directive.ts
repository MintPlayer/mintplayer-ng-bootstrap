import { computed, contentChildren, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { firstEnabledIndex, lastEnabledIndex, nextEnabledIndex } from '@mintplayer/ui-core/roving';
import { BsRovingFocusItemDirective } from './roving-focus-item.directive';

export type BsRovingFocusOrientation = 'vertical' | 'horizontal' | 'both';

/**
 * APG roving-tabindex container.
 *
 * Place on a list/menu/tablist; mark each focusable child with
 * `bsRovingFocusItem`. Arrow keys, Home, and End move the active item; the
 * directive auto-handles disabled items, wrap-around, and orientation. Only
 * the active item has `tabindex="0"`; real DOM focus moves.
 *
 * The former `activedescendant` mode (focus parked on a combobox input) was
 * removed with the typeahead's move to its headless core (#436 D10): the
 * typeahead core owns that keyboard model, and nothing else used the mode.
 *
 * Consumers that need to react to the active item externally read
 * `activeIndex()` (signal).
 */
@Directive({
  selector: '[bsRovingFocus]',
  exportAs: 'bsRovingFocus',
  host: {
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsRovingFocusDirective {
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly orientation = input<BsRovingFocusOrientation>('vertical');
  readonly wrap = input(true);

  readonly items = contentChildren(BsRovingFocusItemDirective);
  readonly activeIndex = signal(0);

  focusFirst(): void {
    this.moveTo(this.firstEnabledIndex());
  }

  focusLast(): void {
    this.moveTo(this.lastEnabledIndex());
  }

  next(): void {
    this.step(+1);
  }

  prev(): void {
    this.step(-1);
  }

  setActiveItem(item: BsRovingFocusItemDirective): void {
    const idx = this.items().indexOf(item);
    if (idx < 0) return;
    if (item.disabled()) return;
    this.activeIndex.set(idx);
  }

  onKeydown(event: KeyboardEvent): void {
    // Don't intercept browser/OS chords (Alt+Arrow=back, Ctrl+Home=top of doc, Cmd+Arrow=word jump on macOS).
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const orient = this.orientation();
    let consumed = true;
    switch (event.key) {
      case 'ArrowDown':
        if (orient === 'horizontal') { consumed = false; break; }
        this.next();
        break;
      case 'ArrowUp':
        if (orient === 'horizontal') { consumed = false; break; }
        this.prev();
        break;
      case 'ArrowRight':
        if (orient === 'vertical') { consumed = false; break; }
        this.next();
        break;
      case 'ArrowLeft':
        if (orient === 'vertical') { consumed = false; break; }
        this.prev();
        break;
      case 'Home':
        this.focusFirst();
        break;
      case 'End':
        this.focusLast();
        break;
      default:
        consumed = false;
    }
    if (consumed) event.preventDefault();
  }

  /**
   * Index math delegates to the shared pure functions in
   * @mintplayer/ui-core/roving — this directive and the WC RovingFocus
   * controller had independently identical copies that had ALREADY drifted
   * (wrap-vs-clamp default). One implementation, two adapters. The directive
   * keeps its own signals and discovery: those are Angular/light-DOM concerns
   * the WC controller rightly lacks.
   *
   * Public so consumers can detect edges without re-implementing the
   * disabled-aware scan.
   */
  firstEnabledIndex(): number {
    const items = this.items();
    return firstEnabledIndex(items.length, (i) => items[i].disabled());
  }

  lastEnabledIndex(): number {
    const items = this.items();
    return lastEnabledIndex(items.length, (i) => items[i].disabled());
  }

  private step(delta: 1 | -1): void {
    const items = this.items();
    const next = nextEnabledIndex(
      items.length,
      this.activeIndex(),
      delta,
      this.wrap(),
      (i) => items[i].disabled(),
    );
    if (next >= 0) this.moveTo(next);
  }

  private moveTo(index: number): void {
    if (index < 0) return;
    this.activeIndex.set(index);
    if (this.elementRef.nativeElement.contains(document.activeElement)) {
      this.items()[index]?.elementRef.nativeElement.focus();
    }
  }
}
