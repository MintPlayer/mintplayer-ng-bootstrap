import { AfterViewInit, Component, signal, effect } from '@angular/core';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { deepClone } from '@mintplayer/parentify';

@Component({
  selector: 'demo-parentify',
  templateUrl: './parentify.component.html',
  styleUrls: ['./parentify.component.scss'],
  standalone: true,
  imports: [BsGridModule]
})
export class ParentifyComponent implements AfterViewInit {
  constructor() {
    effect(() => {
      const example = this.exampleSignal();
      if (example) {
        const clone = deepClone(example, true, [Object]);
        console.log(clone);
      }
    });
  }

  exampleSignal = signal<any>(null);

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

    this.exampleSignal.set(person);
  }
}
