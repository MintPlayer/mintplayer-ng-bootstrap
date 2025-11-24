import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'bs-navbar-toggler',
  templateUrl: './navbar-toggler.component.html',
  styleUrls: ['./navbar-toggler.component.scss'],
  
  imports: [AsyncPipe]
})
export class BsNavbarTogglerComponent {
  constructor() {
    this.state$.pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(state => this.stateChange.emit(state));
  }

  //#region State
  state$ = new BehaviorSubject<boolean>(false);
  @Output() public stateChange = new EventEmitter<boolean>();
  public get state() {
    return this.state$.value;
  }
  @Input() public set state(value: boolean) {
    this.state$.next(value);
  }
  //#endregion

  @Input() public toggleOnClick = true;

  @HostListener('click', ['$event'])
  toggleState(ev: MouseEvent) {
    if (this.toggleOnClick) {
      this.state$.next(!this.state);
    }
  }
}
