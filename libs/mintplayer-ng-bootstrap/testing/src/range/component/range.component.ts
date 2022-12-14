import { Component } from '@angular/core';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';

@Component({
  selector: 'bs-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  providers: [
    { provide: BsRangeComponent, useExisting: BsRangeMockComponent },
  ]
})
export class BsRangeMockComponent {}
