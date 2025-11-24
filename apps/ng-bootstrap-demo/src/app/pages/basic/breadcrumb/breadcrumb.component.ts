import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BsBreadcrumbComponent, BsBreadcrumbItemComponent } from '@mintplayer/ng-bootstrap/breadcrumb';

@Component({
  selector: 'demo-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  imports: [RouterLink, BsBreadcrumbComponent, BsBreadcrumbItemComponent]
})
export class BreadcrumbComponent {}
