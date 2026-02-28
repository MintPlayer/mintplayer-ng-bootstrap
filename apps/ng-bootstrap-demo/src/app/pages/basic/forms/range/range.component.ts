import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeComponent, BsRangeValueAccessor } from '@mintplayer/ng-bootstrap/range';
import { BsToggleButtonComponent, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  imports: [FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsRangeComponent, BsRangeValueAccessor, BsToggleButtonComponent, BsToggleButtonValueAccessor],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeComponent {

  rangeValue = signal(2);
  isDisabled = signal(false);

}
