import { Component, ContentChildren, HostBinding, QueryList } from '@angular/core';
import { BsObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';
import { BsPrioNavElementDirective } from '../prio-nav-element.directive';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'bs-prio-nav',
  templateUrl: './prio-nav.component.html',
  styleUrl: './prio-nav.component.scss',
  hostDirectives: [BsObserveSizeDirective]
})
export class BsPrioNavComponent {
  constructor(private observer: BsObserveSizeDirective) {}

  @HostBinding('class.d-block') classList = true;
  elements$ = new BehaviorSubject<BsPrioNavElementDirective[]>([]);

  @ContentChildren(BsPrioNavElementDirective) set elements(value: QueryList<BsPrioNavElementDirective>) {
    this.elements$.next(value.toArray());
  }
}
