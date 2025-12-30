import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'bs-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsBreadcrumbComponent {}
