import { Component, Input } from '@angular/core';
import { BsMultiselectComponent } from '@mintplayer/ng-bootstrap/multiselect';

@Component({
  selector: 'bs-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss'],
  providers: [
    { provide: BsMultiselectComponent, useExisting: BsMultiselectMockComponent },
  ]
})
export class BsMultiselectMockComponent {
  @Input() public items: any[] = [];
  @Input() public selectedItems: any[] = [];
}
