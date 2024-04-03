import { AfterViewInit, Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { deepClone } from '@mintplayer/parentify';
import { BehaviorSubject, map } from 'rxjs';

@Component({
  selector: 'demo-parentify',
  templateUrl: './parentify.component.html',
  styleUrls: ['./parentify.component.scss'],
  standalone: true,
  imports: [BsGridModule]
})
export class ParentifyComponent implements AfterViewInit {
  constructor() {
    this.example$
      .pipe(map(example => deepClone(example, true, [Object])))
      // .pipe(map((clone) => JSON.stringify(clone)))
      .pipe(takeUntilDestroyed())
      .subscribe(console.log);
  }

  example$ = new BehaviorSubject<any>(null);

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
}
