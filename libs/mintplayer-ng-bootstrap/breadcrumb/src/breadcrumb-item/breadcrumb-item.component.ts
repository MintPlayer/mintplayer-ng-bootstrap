import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'bs-breadcrumb-item',
  templateUrl: './breadcrumb-item.component.html',
  styleUrls: ['./breadcrumb-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.breadcrumb-item]': 'true',
    '[class.active]': 'active()',
    'role': 'listitem',
    '[attr.aria-current]': 'active() ? "page" : null',
  },
})
export class BsBreadcrumbItemComponent {
  readonly active = input(false);
}
