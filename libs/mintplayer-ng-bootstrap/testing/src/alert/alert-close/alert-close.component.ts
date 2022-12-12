import { Component } from '@angular/core';
import { BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: 'bs-alert-close',
  templateUrl: './alert-close.component.html',
  styleUrls: ['./alert-close.component.scss'],
  providers: [
    { provide: BsAlertCloseComponent, useExisting: BsAlertCloseMockComponent }
  ],
})
export class BsAlertCloseMockComponent {}
