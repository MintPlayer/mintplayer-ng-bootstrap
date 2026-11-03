import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapBreadcrumb } from '@mintplayer/ui-core/bootstrap/breadcrumb';

@Component({
  selector: 'bs-breadcrumb-item',
  templateUrl: './breadcrumb-item.component.html',
  styleUrls: ['./breadcrumb-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-mps]': '"breadcrumb"',
    '[class.breadcrumb-item]': 'true',
    '[class.active]': 'active()',
    'role': 'listitem',
    '[attr.aria-current]': 'active() ? "page" : null',
  },
})
export class BsBreadcrumbItemComponent {
  constructor() {
    // #452: the breadcrumb partial ships with this component, scoped to the elements it stamps (data-mps="breadcrumb").
    useBootstrap(bootstrapBreadcrumb);
  }

  readonly active = input(false);
}
