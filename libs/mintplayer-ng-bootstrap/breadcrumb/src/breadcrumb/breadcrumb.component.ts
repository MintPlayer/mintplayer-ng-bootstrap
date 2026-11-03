import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapBreadcrumb } from '@mintplayer/ui-core/bootstrap/breadcrumb';

@Component({
  selector: 'bs-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsBreadcrumbComponent {
  constructor() {
    // #452: the breadcrumb partial ships with this component, scoped to the elements it stamps (data-mps="breadcrumb").
    useBootstrap(bootstrapBreadcrumb);
  }

  /** Accessible name for the breadcrumb landmark. Override for localisation. */
  ariaLabel = input<string>('breadcrumb');
}
