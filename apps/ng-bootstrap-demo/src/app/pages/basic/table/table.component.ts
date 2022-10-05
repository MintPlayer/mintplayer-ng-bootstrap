import { Component } from '@angular/core';

@Component({
  selector: 'demo-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent {

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