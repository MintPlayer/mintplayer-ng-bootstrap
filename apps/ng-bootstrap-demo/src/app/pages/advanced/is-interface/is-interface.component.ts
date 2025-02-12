import { Component, Pipe, PipeTransform } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';

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

@Pipe({
  name: 'asVisitor',
  standalone: true,
  pure: true, // Not necessary
})
export class AsVisitorPipe implements PipeTransform {
  transform(person: Employee | Visitor) {
    console.log('Ran isVisitor');
    return ('reason' in person) ? person : null;
  }
}

@Pipe({
  name: 'asEmployee',
  standalone: true,
  pure: true, // Not necessary
})
export class AsEmployeePipe implements PipeTransform {
  transform(person: Employee | Visitor) {
    console.log('Ran isEployee');
    return ('officeNumber' in person) ? person : null;
  }
}

@Component({
  selector: 'demo-is-interface',
  standalone: true,
  imports: [
    BsTableComponent,
    BsButtonTypeDirective,
    AsVisitorPipe,
    AsEmployeePipe
  ],
  templateUrl: './is-interface.component.html',
  styleUrl: './is-interface.component.scss',
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
}
