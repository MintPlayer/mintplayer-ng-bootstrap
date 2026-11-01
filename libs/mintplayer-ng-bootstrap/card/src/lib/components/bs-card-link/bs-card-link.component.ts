import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap';

/**
 * Card link. The HOST carries `.card-link`, so Bootstrap's
 * `.card-link + .card-link` spacing matches sibling `<bs-card-link>`s; the
 * inner `<a>` is the link.
 */
@Component({
  selector: 'bs-card-link',
  template: '<a data-mps="card" [attr.href]="hrefAttr()"><ng-content></ng-content></a>',
  host: { '[attr.data-mps]': '"card"', class: 'card-link' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardLinkComponent {
  constructor() {
    // #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
    useBootstrap(bootstrapCard);
  }

  readonly href = input<string | undefined>(undefined);

  // Coalesce `undefined` to `null` so Angular drops the attribute entirely
  // when the input is unset.
  readonly hrefAttr = computed(() => this.href() ?? null);
}
