import { Component, EventEmitter, HostBinding, Input, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'bs-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None,
})
export class BsPlaceholderComponent {
  //#region isLoading
  isLoading$ = new BehaviorSubject<boolean>(false);
  isLoadingChange = new EventEmitter<boolean>();
  public get isLoading() {
    return this.isLoading$.value;
  }
  @Input() public set isLoading(value: boolean) {
    this.isLoading$.next(value);
    this.isLoadingChange.emit(value);
  }
  //#endregion
}
