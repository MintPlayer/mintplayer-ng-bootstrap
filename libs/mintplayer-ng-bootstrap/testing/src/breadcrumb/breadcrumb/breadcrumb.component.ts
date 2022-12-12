import { Component } from '@angular/core';
import { BsBreadcrumbComponent } from '@mintplayer/ng-bootstrap/breadcrumb';

@Component({
  selector: 'bs-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  providers: [
    { provide: BsBreadcrumbComponent, useExisting: BsBreadcrumbMockComponent }
  ]
})
export class BsBreadcrumbMockComponent {}
