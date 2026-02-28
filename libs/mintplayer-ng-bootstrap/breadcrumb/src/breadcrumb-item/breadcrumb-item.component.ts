import { Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-breadcrumb-item',
  templateUrl: './breadcrumb-item.component.html',
  styleUrls: ['./breadcrumb-item.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.breadcrumb-item]': 'true',
  },
})
export class BsBreadcrumbItemComponent {
}
