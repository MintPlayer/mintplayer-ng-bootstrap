import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { BsViewState } from '../../../types/view-state.type';

@Component({
  selector: 'bs-navbar-toggler',
  templateUrl: './navbar-toggler.component.html',
  styleUrls: ['./navbar-toggler.component.scss'],
})
export class BsNavbarTogglerComponent {
  //#region State
  _state: BsViewState = 'closed';
  @Output() public stateChange = new EventEmitter<BsViewState>();
  public get state() {
    return this._state;
  }
  @Input() public set state(value: BsViewState) {
    this._state = value;
    this.stateChange.emit(this._state);
  }
  //#endregion

  @Input() public toggleOnClick = true;

  @HostListener('click', ['$event'])
  toggleState(ev: MouseEvent) {
    if (this.toggleOnClick) {
      switch (this._state) {
        case 'open':
          this.state = 'closed';
          break;
        default:
          this.state = 'open';
          break;
      }
    }
  }
}
