import { computed, contentChildren, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { BsRovingFocusItemDirective } from './roving-focus-item.directive';

export type BsRovingFocusOrientation = 'vertical' | 'horizontal' | 'both';
export type BsRovingFocusMode = 'tabindex' | 'activedescendant';

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

  private firstEnabledIndex(): number {
    const items = this.items();
    return items.findIndex(it => !it.disabled());
  }

  private lastEnabledIndex(): number {
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
