import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'bs-breadcrumb-item',
  templateUrl: './breadcrumb-item.component.html',
  styleUrls: ['./breadcrumb-item.component.scss'],
  standalone: false,
})
export class BsBreadcrumbItemComponent {
  @HostBinding('class.breadcrumb-item') classes = true;
}
