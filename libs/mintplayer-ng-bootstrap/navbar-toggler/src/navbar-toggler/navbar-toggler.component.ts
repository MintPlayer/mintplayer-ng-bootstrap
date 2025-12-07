import { Component, EventEmitter, HostListener, Input, Output, signal, effect } from '@angular/core';

@Component({
  selector: 'bs-navbar-toggler',
  templateUrl: './navbar-toggler.component.html',
  styleUrls: ['./navbar-toggler.component.scss'],
  standalone: true,
  imports: []
})
export class BsNavbarTogglerComponent {
  constructor() {
    let previousState: boolean | null = null;
    effect(() => {
      const state = this.stateSignal();
      if (previousState !== state) {
        this.stateChange.emit(state);
        previousState = state;
      }
    });
  }

  //#region State
  stateSignal = signal<boolean>(false);
  @Input() set state(val: boolean) {
    this.stateSignal.set(val);
  }
  @Output() public stateChange = new EventEmitter<boolean>();
  //#endregion

  @Input() public toggleOnClick = true;

  @HostListener('click', ['$event'])
  toggleState(ev: MouseEvent) {
    if (this.toggleOnClick) {
      this.stateSignal.set(!this.stateSignal());
    }
  }
}
