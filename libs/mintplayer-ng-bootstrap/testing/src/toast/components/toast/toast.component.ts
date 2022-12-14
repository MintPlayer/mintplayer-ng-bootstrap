import { Component, Input } from '@angular/core';
import { BsToastComponent } from '@mintplayer/ng-bootstrap/toast';

@Component({
  selector: 'bs-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  providers: [
    { provide: BsToastComponent, useExisting: BsToastMockComponent },
  ],
})
export class BsToastMockComponent {
  @Input() public isVisible = false;
}
