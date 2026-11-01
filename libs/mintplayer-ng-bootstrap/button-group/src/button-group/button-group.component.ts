import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapButtonGroup } from '@mintplayer/ui-core/bootstrap';

@Component({
  selector: 'bs-button-group',
  templateUrl: './button-group.component.html',
  styleUrls: ['./button-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsButtonGroupComponent {
  constructor() {
    // #452: the button-group partial ships with this component, scoped to the elements it stamps (data-mps="button-group").
    useBootstrap(bootstrapButtonGroup);
  }

  ariaLabel = input<string | null>(null);
}
