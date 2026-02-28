import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsInstanceOfDirective, BsInstanceofCaseDirective, BsInstanceOfDefaultDirective } from '@mintplayer/ng-bootstrap/instance-of';

@Component({
  selector: 'demo-instance-of',
  templateUrl: './instance-of.component.html',
  styleUrls: ['./instance-of.component.scss'],
  imports: [BsInstanceOfDirective, BsInstanceofCaseDirective, BsInstanceOfDefaultDirective, BsAlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  colors = Color;
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