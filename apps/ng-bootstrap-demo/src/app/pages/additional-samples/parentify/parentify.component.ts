import { AfterViewInit, Component, effect, signal } from '@angular/core';
import { BsGridColDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { deepClone } from '@mintplayer/parentify';

@Component({
  selector: 'demo-parentify',
  templateUrl: './parentify.component.html',
  styleUrls: ['./parentify.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColDirective]
})
export class ParentifyComponent implements AfterViewInit {
  constructor() {
    effect(() => {
      const example = this.example();
      if (example === null) {
        return;
      }
      const clone = deepClone(example, true, [Object]);
      console.log(clone);
    });
  }

  example = signal<any>(null);

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

    (address as any)['person'] = person;

    this.example.set(person);
  }
}
