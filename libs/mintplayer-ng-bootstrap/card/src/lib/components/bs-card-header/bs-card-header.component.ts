import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import {
  applyHeaderNavStyle,
  applyTextBgClass,
  isNavTargetNode,
  type CardHeaderNavStyle,
} from '@mintplayer/web-components/card';

/**
 * Card header.
 *
 * `[navStyle]` decorates a slotted `<nav>` / `<ul>` with
 * `card-header-tabs` / `card-header-pills` so Bootstrap's `_card.scss`
 * tab/pill integration kicks in. The class lands on the first nav/ul
 * descendant, and a MutationObserver re-applies it when the consumer
 * swaps the slotted markup (e.g. an `@if` that flips the nav in or out).
 */
@Component({
  selector: 'bs-card-header',
  template: '<ng-content></ng-content>',
  host: { class: 'card-header' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardHeaderComponent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly color = input<Color | undefined>(undefined);
  readonly navStyle = input<CardHeaderNavStyle | undefined>(undefined);

  constructor() {
    effect(() => {
      const c = this.color();
      const name = c === undefined ? null : Color[c];
      applyTextBgClass(this.el.nativeElement, name);
    });

    effect(() => {
      applyHeaderNavStyle(this.el.nativeElement, this.navStyle() ?? null);
    });

    // Slotted navs may appear after the component is created (Angular @if,
    // structural directives). Re-apply the nav-style class on child changes
    // so a late-rendered nav still picks up `card-header-tabs` / `-pills`.
    // Scope to direct children only: the slotted nav must be a direct child
    // for Bootstrap's `.card-header-tabs` styling to apply; deep subtree
    // mutations (Angular re-renders of nested content) would otherwise
    // trigger a full `querySelector` walk on every keystroke.
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((records) => {
        const navAffected = records.some((r) =>
          [...Array.from(r.addedNodes), ...Array.from(r.removedNodes)].some(isNavTargetNode),
        );
        if (!navAffected) return;
        applyHeaderNavStyle(this.el.nativeElement, this.navStyle() ?? null);
      });
      observer.observe(this.el.nativeElement, { childList: true, subtree: false });
      this.destroyRef.onDestroy(() => observer.disconnect());
    }
  }
}
