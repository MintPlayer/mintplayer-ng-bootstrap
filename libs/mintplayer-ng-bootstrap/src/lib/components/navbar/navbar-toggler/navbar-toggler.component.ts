import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'bs-navbar-toggler',
  templateUrl: './navbar-toggler.component.html',
  styleUrls: ['./navbar-toggler.component.scss']
})
export class BsNavbarTogglerComponent {

  //#region State
  _state: 'open' | 'closed' = 'closed';
  @Output() public stateChange = new EventEmitter<'open' | 'closed'>();
  public get state() {
    return this._state;
  }
  @Input() public set state(value: 'open' | 'closed') {
    this._state = value;
    this.stateChange.emit(this._state);
  }
  //#endregion
  
  @HostListener('click', ['$event'])
  toggleState(ev: MouseEvent) {
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
