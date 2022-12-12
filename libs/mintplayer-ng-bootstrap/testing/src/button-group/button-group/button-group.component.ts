import { Component } from '@angular/core';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';

@Component({
  selector: 'bs-button-group',
  templateUrl: './button-group.component.html',
  styleUrls: ['./button-group.component.scss'],
  providers: [
    { provide: BsButtonGroupComponent, useExisting: BsButtonGroupMockComponent }
  ]
})
export class BsButtonGroupMockComponent {}
