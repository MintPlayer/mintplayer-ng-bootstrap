import { Component } from '@angular/core';
import { BsToastBodyComponent } from '@mintplayer/ng-bootstrap/toast';

@Component({
  selector: 'bs-toast-body',
  templateUrl: './toast-body.component.html',
  styleUrls: ['./toast-body.component.scss'],
  providers: [
    { provide: BsToastBodyComponent, useExisting: BsToastBodyMockComponent },
  ],
})
export class BsToastBodyMockComponent {}
