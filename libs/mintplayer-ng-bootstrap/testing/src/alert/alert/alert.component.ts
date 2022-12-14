import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: 'bs-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  providers: [
    { provide: BsAlertComponent, useExisting: BsAlertMockComponent }
  ],
})
export class BsAlertMockComponent {
  
  @Input() public type: Color = Color.primary;
  @Input() public isVisible: boolean = true;
  @Output() public isVisibleChange = new EventEmitter<boolean>();
  @Output() public afterOpenedOrClosed = new EventEmitter();

}