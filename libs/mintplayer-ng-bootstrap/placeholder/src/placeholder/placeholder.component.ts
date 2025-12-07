import { Component, EventEmitter, HostBinding, Input, signal } from '@angular/core';

@Component({
  selector: 'bs-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  standalone: false,
})
export class BsPlaceholderComponent {
  //#region isLoading
  isLoadingSignal = signal<boolean>(false);
  isLoadingChange = new EventEmitter<boolean>();
  public get isLoading() {
    return this.isLoadingSignal();
  }
  @Input() public set isLoading(value: boolean) {
    this.isLoadingSignal.set(value);
    this.isLoadingChange.emit(value);
  }
  //#endregion
}
