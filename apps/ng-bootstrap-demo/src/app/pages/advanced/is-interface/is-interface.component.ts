import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  officeNumber: number;
}

interface Visitor {
  id: number;
  firstName: string;
  lastName: string;
  reason: string;
}

@Component({
  selector: 'demo-is-interface',
  templateUrl: './is-interface.component.html',
  styleUrl: './is-interface.component.scss'
})
export class IsInterfaceComponent {
  employeesOrVisitors: (Employee | Visitor)[] = [
    { id: 1, firstName: 'A', lastName: 'B', officeNumber: 1 },
    { id: 2, firstName: 'C', lastName: 'D', officeNumber: 2 },
    { id: 3, firstName: 'E', lastName: 'F', reason: 'passport' },
    { id: 4, firstName: 'G', lastName: 'H', officeNumber: 3 },
    { id: 5, firstName: 'I', lastName: 'J', reason: 'visum' },
  ];
  counter = 1;
  colors = Color;

  isEployee(person: Employee | Visitor) {
    console.log('Ran isEployee');
    return ('officeNumber' in person) ? person : null;
  }

  isVisitor(person: Employee | Visitor) {
    console.log('Ran isVisitor');
    return ('reason' in person) ? person : null;
  }
}
