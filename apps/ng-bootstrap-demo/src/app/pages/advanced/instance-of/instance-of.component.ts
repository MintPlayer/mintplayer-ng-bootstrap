import { Component } from '@angular/core';

@Component({
  selector: 'demo-instance-of',
  templateUrl: './instance-of.component.html',
  styleUrls: ['./instance-of.component.scss']
})
export class InstanceOfComponent {
  items: (Base | null)[] = [
    new A(),
    new C(),
    new D(),
    new B(),
  ];

  A = A;
  B = B;
  C = C;
}

class Base {
  text = 'text';
}
class A extends Base {
  a = 'a';
}
class B extends Base {
  b = 'b';
}
class C extends Base {
  c = 'c';
}
class D extends Base {
  d = 'd';
}