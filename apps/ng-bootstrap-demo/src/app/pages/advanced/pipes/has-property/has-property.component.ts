import { Component } from '@angular/core';

@Component({
  selector: 'demo-has-property',
  templateUrl: './has-property.component.html',
  styleUrls: ['./has-property.component.scss']
})
export class HasPropertyComponent {
  person = {
    firstName: 'John',
    lastName: 'Doe'
  };
}
