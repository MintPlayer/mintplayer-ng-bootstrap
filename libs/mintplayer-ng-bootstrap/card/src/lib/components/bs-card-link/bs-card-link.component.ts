import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Card link. The HOST carries `.card-link`, so Bootstrap's
 * `.card-link + .card-link` spacing matches sibling `<bs-card-link>`s; the
 * inner `<a>` is the link.
 */
@Component({
  selector: 'bs-card-link',
  template: '<a [attr.href]="hrefAttr()"><ng-content></ng-content></a>',
  host: { class: 'card-link' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardLinkComponent {
  readonly href = input<string | undefined>(undefined);

  // Coalesce `undefined` to `null` so Angular drops the attribute entirely
  // when the input is unset.
  readonly hrefAttr = computed(() => this.href() ?? null);
}
