import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeModule } from '@mintplayer/ng-bootstrap/range';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  standalone: true,
  imports: [FormsModule, BsGridModule, BsRangeModule, BsToggleButtonComponent]
})
export class RangeComponent {

  rangeValue = 2;
  isDisabled = false;

}
