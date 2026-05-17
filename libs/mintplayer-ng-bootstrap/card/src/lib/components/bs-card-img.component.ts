import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { CardImagePosition } from '../types/card-image-position';

/**
 * Card image. `position` switches the rendered shape; `src` and `alt` map
 * to the underlying `<img>`. Overlay form additionally wraps slotted content
 * in `<div class="card-img-overlay">`.
 *
 * The host element carries the `card-img-*` class so Bootstrap's
 * `.card-group > .card > .card-img-top` corner-rounding selectors match
 * (the inner `<img>` would otherwise be a grandchild of `.card`). The inner
 * `<img>` carries the same class so Bootstrap's `width: 100%` sizing rule
 * applies; the host's border-radius is paired with `overflow: hidden` (in
 * `mp-card.element.scss`) so the img's straight corners get clipped.
 *
 * Trap: changing `position` at runtime is supported, but the host class
 * also flips — visual flicker is possible during the swap. Consumers
 * typically set `position` statically.
 */
@Component({
  selector: 'bs-card-img',
  template: `
    @switch (position()) {
      @case ('overlay') {
        <img class="card-img" [attr.src]="srcAttr()" [attr.alt]="altAttr()" />
        <div class="card-img-overlay">
          <ng-content></ng-content>
        </div>
      }
      @case ('bottom') {
        <ng-content></ng-content>
        <img class="card-img-bottom" [attr.src]="srcAttr()" [attr.alt]="altAttr()" />
      }
      @default {
        <img class="card-img-top" [attr.src]="srcAttr()" [attr.alt]="altAttr()" />
        <ng-content></ng-content>
      }
    }
  `,
  host: { '[class]': 'hostClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardImgComponent {
  readonly position = input<CardImagePosition>('top');
  readonly src = input<string | undefined>(undefined);
  readonly alt = input<string | undefined>(undefined);

  readonly hostClass = computed(() => {
    switch (this.position()) {
      case 'overlay':
        return 'card-img';
      case 'bottom':
        return 'card-img-bottom';
      default:
        return 'card-img-top';
    }
  });

  // `?? null` so an absent input removes the attribute instead of leaving an
  // empty `src=""` / `alt=""` on the DOM. Hoisted out of the template per
  // the workspace's "computed over inline expression" memory rule.
  readonly srcAttr = computed(() => this.src() ?? null);
  readonly altAttr = computed(() => this.alt() ?? null);
}
