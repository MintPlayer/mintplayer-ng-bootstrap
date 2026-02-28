import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';

@Component({
  selector: 'bs-floating-label',
  templateUrl: './floating-label.component.html',
  styleUrls: ['./floating-label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsFloatingLabelComponent {
  constructor() {
    const bsForm = inject(BsFormComponent, { optional: true });
    if (!bsForm) {
      throw '<bs-floating-label> must be inside a <bs-form>';
    }
  }
}
