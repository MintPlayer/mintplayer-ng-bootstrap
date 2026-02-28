import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: 'demo-track-by',
  templateUrl: './track-by.component.html',
  styleUrls: ['./track-by.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsButtonTypeDirective, BsListGroupComponent, BsListGroupItemComponent, BsAlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackByComponent {
  people: Person[] = [];
  counter = 1;
  colors = Color;

  peopleFromServer: Person[] = [
    { id: 1, firstName: 'Andy', lastName: 'Sharp' },
    { id: 2, firstName: 'Chelsea', lastName: 'Downs' },
    { id: 3, firstName: 'Kelsey', lastName: 'Arroyo' },
    { id: 4, firstName: 'Veronica', lastName: 'Wyatt' },
    { id: 5, firstName: 'Brenda', lastName: 'Wondo' },
    { id: 6, firstName: 'Farrah', lastName: 'Conner' },
    { id: 7, firstName: 'Brandon', lastName: 'Flores' },
    { id: 8, firstName: 'Juliet', lastName: 'Bowen' },
    { id: 9, firstName: 'Melanie', lastName: 'Morales' },
  ];

  addSomeone() {
    // We need new copies of the items to notice the effect of the trackBy function
    this.people = this.peopleFromServer.slice(0, this.counter++).map((p) => ({ ...p }));
  }
}

interface Person {
  id: number;
  firstName: string;
  lastName: string;
}