import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'bs-playlist-toggler',
  templateUrl: './playlist-toggler.component.html',
  styleUrls: ['./playlist-toggler.component.scss'],
  standalone: true,
  imports: [AsyncPipe]
})
export class BsPlaylistTogglerComponent {
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
