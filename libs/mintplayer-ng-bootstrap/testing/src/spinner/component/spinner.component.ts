import { Component, Input } from '@angular/core';
import { Color } from '../../common/color.enum';

@Component({
  selector: 'bs-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
})
export class BsSpinnerMockComponent {
  @Input() type: 'border' | 'grow' = 'border';
  @Input() color: Color = Color.primary;
}
