import { Component, Input } from '@angular/core';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';

@Component({
  selector: 'bs-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  providers: [
    { provide: BsSelectComponent, useExisting: BsSelectMockComponent },
  ]
})
export class BsSelectMockComponent {
  @Input() public identifier = 0;
}
