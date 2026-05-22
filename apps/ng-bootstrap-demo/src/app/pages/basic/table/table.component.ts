import { DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridComponent, BsGridRowDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  imports: [BsCodeSnippetComponent, DatePipe, FormsModule, BsGridComponent, BsGridRowDirective, BsGridColDirective, BsTableComponent, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent {

  protected readonly snippetBasicHtml = dedent`
    <bs-table [isResponsive]="true">
      <thead>
        <tr>
          <th>#</th>
          <th>First name</th>
          <th>Last name</th>
        </tr>
      </thead>
      <tbody>
        @for (person of people; track person.id) {
          <tr>
            <th scope="row">{{ person.id }}</th>
            <td>{{ person.firstName }}</td>
            <td>{{ person.lastName }}</td>
          </tr>
        }
      </tbody>
    </bs-table>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
    interface Person {
      id: number;
      firstName: string;
      lastName: string;
    }

    @Component({
      selector: 'my-table-demo',
      templateUrl: './my-table-demo.component.html',
      imports: [BsTableComponent],
    })
    export class MyTableDemoComponent {
      protected readonly people: Person[] = [
        { id: 1, firstName: 'Tim', lastName: 'Bergling' },
        { id: 2, firstName: 'Ivan', lastName: 'Petunin' },
        { id: 3, firstName: 'Michael', lastName: 'Jackson' },
      ];
    }
  `;


  people: Person[] = [{
    id: 1,
    firstName: 'Tim',
    lastName: 'Bergling',
    nickName: 'Avicii',
    occupation: 'Music artist',
    dateOfBirth: new Date(1989, 8, 8),
    placeOfBirth: 'Stockholm',
    dateOfDeath: new Date(2018, 3, 20),
    placeOfDeath: 'Muscat',
  }, {
    id: 2,
    firstName: 'Ivan',
    lastName: 'Petunin',
    nickName: 'Walkie',
    occupation: 'Rapper',
    dateOfBirth: new Date(1995, 4, 24),
    placeOfBirth: 'Russia',
    dateOfDeath: new Date(2022, 8, 30),
    placeOfDeath: 'Krasnodar',
  }, {
    id: 3,
    firstName: 'Michael',
    lastName: 'Jackson',
    nickName: 'Michael Jackson',
    occupation: 'Singer',
    dateOfBirth: new Date(1958, 7, 29),
    placeOfBirth: 'Gary',
    dateOfDeath: new Date(2009, 5, 25),
    placeOfDeath: 'Los Angeles',
  }];
  isResponsive = true;
}

interface Person {
  id: number;
  firstName: string;
  lastName: string;
  nickName?: string;
  occupation: string;
  dateOfBirth: Date;
  placeOfBirth: string;
  dateOfDeath?: Date;
  placeOfDeath?: string;
}