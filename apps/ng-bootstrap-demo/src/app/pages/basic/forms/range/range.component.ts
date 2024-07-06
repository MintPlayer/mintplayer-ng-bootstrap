import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeModule } from '@mintplayer/ng-bootstrap/range';

@Component({
  selector: 'demo-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  standalone: true,
  imports: [FormsModule, BsGridModule, BsRangeModule, BsCheckboxModule]
})
export class RangeComponent {

  rangeValue = 2;
  isDisabled = false;

}
