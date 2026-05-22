import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Card link. The inner `<a>` carries `.card-link` (so Bootstrap's hover /
 * spacing styling and the `+` adjacency rule both apply). For the adjacency
 * margin between sibling `<bs-card-link>` wrappers, see the compensating
 * CSS in `mp-card.element.scss`.
 */
@Component({
  selector: 'bs-card-link',
  template: '<a class="card-link" [attr.href]="hrefAttr()"><ng-content></ng-content></a>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardLinkComponent {
  readonly href = input<string | undefined>(undefined);

  // Coalesce `undefined` to `null` so Angular drops the attribute entirely
  // when the input is unset. Hoisted out of the template per the workspace's
  // "computed over inline expression" memory rule.
  readonly hrefAttr = computed(() => this.href() ?? null);
}
