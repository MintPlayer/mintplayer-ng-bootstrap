import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BsOffcanvasHostComponent } from '@mintplayer/ng-bootstrap/offcanvas';
import { Position } from '../../types/position';
import { BsViewState } from '../../types/view-state';

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
  @Input() public state: BsViewState = 'closed';
  @Output() public stateChange = new EventEmitter<BsViewState>();
  @Input() public position: Position = 'top';
  @Input() public hasBackdrop = true;
}
