import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'bs-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsBreadcrumbComponent {
  /** Accessible name for the breadcrumb landmark. Override for localisation. */
  ariaLabel = input<string>('breadcrumb');
}
