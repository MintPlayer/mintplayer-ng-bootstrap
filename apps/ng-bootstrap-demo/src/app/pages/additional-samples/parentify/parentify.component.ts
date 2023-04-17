import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { deepClone } from '@mintplayer/parentify';
import { BehaviorSubject, Observable, Subject, map, takeUntil } from 'rxjs';

@Component({
  selector: 'demo-parentify',
  templateUrl: './parentify.component.html',
  styleUrls: ['./parentify.component.scss']
})
export class ParentifyComponent implements AfterViewInit, OnDestroy {
  constructor() {
    this.example$
      .pipe(map(deepClone))
      // .pipe(map((clone) => JSON.stringify(clone)))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(console.log);
  }

  example$ = new BehaviorSubject<any>(null);
  destroyed$ = new Subject();

  ngAfterViewInit() {
    const address = {
      street: 'Muppetstreet',
      house: 85,
      box: null,
      postalCode: 11004,
      city: 'New York City'
    };

    const person = {
      firstName: 'Pieterjan',
      lastName: 'De Clippel',
      address
    };

    (<any>address)['person'] = person;

    this.example$.next(person);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
