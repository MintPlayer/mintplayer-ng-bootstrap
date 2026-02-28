import { Component, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BsBreadcrumbComponent, BsBreadcrumbItemComponent } from '@mintplayer/ng-bootstrap/breadcrumb';

@Component({
  selector: 'demo-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  standalone: true,
  imports: [RouterLink, BsBreadcrumbComponent, BsBreadcrumbItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {}
