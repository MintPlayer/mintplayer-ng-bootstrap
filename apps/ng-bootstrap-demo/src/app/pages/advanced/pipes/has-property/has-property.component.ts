import { Component } from '@angular/core';

@Component({
  selector: 'demo-has-property',
  templateUrl: './has-property.component.html',
  styleUrls: ['./has-property.component.scss']
})
export class HasPropertyComponent {
  animal?: Fish | Bird;

  // fish = Fish
  // get isBird() {
  //   return this.animal && ('bar' in this.animal);
  // }
}


export type Animal = Fish | Bird

export interface Fish {
  // type: 'fish';
  blub: string;
}

export interface Bird {
  // type: 'bird';
  chirp: string;
}