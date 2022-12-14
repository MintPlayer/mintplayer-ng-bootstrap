import { Component, EventEmitter, Output } from '@angular/core';
import { BsOffcanvasHostComponent } from '@mintplayer/ng-bootstrap/offcanvas';

@Component({
  selector: 'bs-offcanvas',
  templateUrl: './offcanvas-host.component.html',
  styleUrls: ['./offcanvas-host.component.scss'],
  providers: [
    { provide: BsOffcanvasHostComponent, useExisting: BsOffcanvasHostMockComponent }
  ]
})
export class BsOffcanvasHostMockComponent {
  @Output() backdropClick = new EventEmitter<MouseEvent>();
  @Output() public stateChange = new EventEmitter<BsViewState>();
}
