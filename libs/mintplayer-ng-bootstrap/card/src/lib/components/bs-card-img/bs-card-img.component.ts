import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { CardImagePosition } from '@mintplayer/web-components/card';
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
 * Projection uses `*ngTemplateOutlet` instead of inlining `<ng-content>` in
 * each `@case`: multiple `<ng-content>` slots in conditional branches silently
 * drop the projected children. One `<ng-content>` inside a `<ng-template>`
 * works around the limitation, at the cost of importing `NgTemplateOutlet`.
 */
@Component({
  selector: 'bs-card-img',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #projected><ng-content></ng-content></ng-template>
    <ng-template #imgTpl>
      <img [class]="imgClass()" [attr.src]="srcAttr()" [attr.alt]="altAttr()" />
    </ng-template>

    @switch (position()) {
      @case ('overlay') {
        <ng-container *ngTemplateOutlet="imgTpl"></ng-container>
        <div class="card-img-overlay">
          <ng-container *ngTemplateOutlet="projected"></ng-container>
        </div>
      }
      @case ('bottom') {
        <ng-container *ngTemplateOutlet="projected"></ng-container>
        <ng-container *ngTemplateOutlet="imgTpl"></ng-container>
      }
      @default {
        <ng-container *ngTemplateOutlet="imgTpl"></ng-container>
        <ng-container *ngTemplateOutlet="projected"></ng-container>
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

  // The inner <img> carries the same card-img-* class so Bootstrap's
  // `width: 100%` rule sizes the actual image element.
  readonly imgClass = computed(() => this.hostClass());

  // `?? null` so an absent input removes the attribute instead of leaving an
  // empty `src=""` / `alt=""` on the DOM. Hoisted out of the template per
  // the workspace's "computed over inline expression" memory rule.
  readonly srcAttr = computed(() => this.src() ?? null);
  readonly altAttr = computed(() => this.alt() ?? null);
}
