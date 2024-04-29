import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group/src/check-group.directive';

@Component({
  selector: 'bs-switch',
  standalone: true,
  imports: [CommonModule, BsFormCheckComponent],
  templateUrl: './switch.component.html',
  styleUrl: './switch.component.scss',
})
export class BsSwitchComponent {
  constructor(group?: BsCheckGroupDirective) {
    this.group$.next(group);

    this.nameResult$ = combineLatest([this.group$, this.name$])
      .pipe(map(([group, name]) => group ? `${group.name}[]` : name));
  }
  
  group$ = new BehaviorSubject<BsCheckGroupDirective | undefined>(undefined);
  name$ = new BehaviorSubject<string | undefined>(undefined);
  nameResult$: Observable<string | undefined>;
  @HostBinding('class.d-inline-block') dInlineBlockClass = true;

  @Input() public set name(value: string | undefined) {
    this.name$.next(value);
  }

  //#region value
  value$ = new BehaviorSubject<string | null>(null);
  public get value() {
    return this.value$.value;
  }
  @Input() public set value(value: string | null) {
    this.value$.next(value);
  }
  //#endregion
}
