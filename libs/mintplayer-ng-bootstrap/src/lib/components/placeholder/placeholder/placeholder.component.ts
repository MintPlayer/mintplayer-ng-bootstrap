import { Component, HostBinding, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: '[bsPlaceholder]',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
})
export class BsPlaceholderComponent {
  isLoading$ = new BehaviorSubject<boolean>(false);

  @Input() public set bsPlaceholder(value: boolean) {
    this.isLoading$.next(value);
  }
}
