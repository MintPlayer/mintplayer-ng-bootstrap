import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-has-property',
  templateUrl: './has-property.component.html',
  styleUrls: ['./has-property.component.css']
})
export class HasPropertyComponent {
  colors = Color;
  data?: A | B | C;
}

interface A {
  a: string;
}

interface B {
  b: number;
}

interface C {
  c: boolean;
}