import { Component } from '@angular/core';
import { BsToastHeaderComponent } from '@mintplayer/ng-bootstrap/toast';

@Component({
  selector: 'bs-toast-header',
  templateUrl: './toast-header.component.html',
  styleUrls: ['./toast-header.component.scss'],
  providers: [
    { provide: BsToastHeaderComponent, useExisting: BsToastHeaderMockComponent },
  ],
})
export class BsToastHeaderMockComponent {}
