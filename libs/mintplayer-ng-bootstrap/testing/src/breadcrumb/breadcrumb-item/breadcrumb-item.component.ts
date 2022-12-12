import { Component } from '@angular/core';
import { BsBreadcrumbItemComponent } from '@mintplayer/ng-bootstrap/breadcrumb';

@Component({
  selector: 'bs-breadcrumb-item',
  templateUrl: './breadcrumb-item.component.html',
  styleUrls: ['./breadcrumb-item.component.scss'],
  providers: [
    { provide: BsBreadcrumbItemComponent, useExisting: BsBreadcrumbItemMockComponent }
  ]
})
export class BsBreadcrumbItemMockComponent {}
