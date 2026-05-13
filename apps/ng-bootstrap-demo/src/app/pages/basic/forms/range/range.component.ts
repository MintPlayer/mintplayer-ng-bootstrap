import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

@Component({
  selector: 'demo-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  imports: [FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsRangeComponent, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeComponent {

  rangeValue = model(2);
  isDisabled = model(false);

}
