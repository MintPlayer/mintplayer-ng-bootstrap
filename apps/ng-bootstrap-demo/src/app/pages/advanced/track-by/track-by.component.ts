import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-track-by',
  templateUrl: './track-by.component.html',
  styleUrls: ['./track-by.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsButtonTypeDirective, BsListGroupComponent, BsListGroupItemComponent, BsAlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackByComponent {
  people: Person[] = [];
  counter = 1;
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <bs-list-group>
      @for (person of people; track person.id) {
        <bs-list-group-item>
          {{ person.firstName }} {{ person.lastName }}
        </bs-list-group-item>
      }
    </bs-list-group>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
    interface Person {
      id: number;
      firstName: string;
      lastName: string;
    }

    @Component({
      selector: 'my-track-by-demo',
      templateUrl: './my-track-by-demo.component.html',
      imports: [BsListGroupComponent, BsListGroupItemComponent],
    })
    export class MyTrackByDemoComponent {
      protected people: Person[] = [
        { id: 1, firstName: 'Andy',    lastName: 'Sharp' },
        { id: 2, firstName: 'Chelsea', lastName: 'Downs' },
      ];
    }
  `;

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