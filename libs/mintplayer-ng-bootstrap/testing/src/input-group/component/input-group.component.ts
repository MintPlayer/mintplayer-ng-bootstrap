import { Component } from '@angular/core';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';

@Component({
  selector: 'bs-input-group',
  templateUrl: './input-group.component.html',
  styleUrls: ['./input-group.component.scss'],
  providers: [
    { provide: BsInputGroupComponent, useExisting: BsInputGroupMockComponent },
  ],
})
export class BsInputGroupMockComponent {}
