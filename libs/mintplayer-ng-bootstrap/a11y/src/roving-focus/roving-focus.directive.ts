import { computed, contentChildren, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { BsRovingFocusItemDirective } from './roving-focus-item.directive';

export type BsRovingFocusOrientation = 'vertical' | 'horizontal' | 'both';
export type BsRovingFocusMode = 'tabindex' | 'activedescendant';

/**
 * APG roving-tabindex / active-descendant container.
 *
 * Place on a list/menu/listbox; mark each focusable child with
 * `bsRovingFocusItem`. Arrow keys, Home, and End move the active item; the
 * directive auto-handles disabled items, wrap-around, and orientation.
 *
 * Two modes:
 * - **`tabindex`** (default) — only the active item has `tabindex="0"`; real
 *   DOM focus moves. Right for menus, treeviews, tablists.
 * - **`activedescendant`** — items keep `tabindex="-1"`; DOM focus stays on
 *   an external owner (e.g. a combobox `<input>`) which mirrors the active
 *   item's id via `aria-activedescendant`. Right for comboboxes/listboxes
 *   where the user is also typing.
 *
 * Consumers that need to react to the active item externally read
 * `activeIndex()` (signal) or `activeDescendantId()` (computed).
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
  readonly mode = input<BsRovingFocusMode>('tabindex');
  readonly wrap = input(true);

  readonly items = contentChildren(BsRovingFocusItemDirective);
  readonly activeIndex = signal(0);

  readonly activeDescendantId = computed(() => {
    if (this.mode() !== 'activedescendant') return null;
    return this.items()[this.activeIndex()]?.itemId ?? null;
  });

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

  /** Public so consumers (e.g. BsComboboxDirective's TAB handling) can detect edges without re-implementing the disabled-aware scan. */
  firstEnabledIndex(): number {
    const items = this.items();
    return items.findIndex(it => !it.disabled());
  }

  lastEnabledIndex(): number {
    const items = this.items();
    for (let i = items.length - 1; i >= 0; i--) {
      if (!items[i].disabled()) return i;
    }
    return -1;
  }

  private step(delta: 1 | -1): void {
    const items = this.items();
    const total = items.length;
    if (total === 0) return;

    const wrap = this.wrap();
    let cursor = this.activeIndex();
    for (let i = 0; i < total; i++) {
      cursor = cursor + delta;
      if (cursor < 0) {
        if (!wrap) return;
        cursor = total - 1;
      } else if (cursor >= total) {
        if (!wrap) return;
        cursor = 0;
      }
      if (!items[cursor].disabled()) {
        this.moveTo(cursor);
        return;
      }
    }
  }

  private moveTo(index: number): void {
    if (index < 0) return;
    this.activeIndex.set(index);
    if (this.mode() === 'tabindex' && this.elementRef.nativeElement.contains(document.activeElement)) {
      this.items()[index]?.elementRef.nativeElement.focus();
    }
  }
}
