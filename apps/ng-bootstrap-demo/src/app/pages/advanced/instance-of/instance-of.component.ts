import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsInstanceOfDirective, BsInstanceofCaseDirective, BsInstanceOfDefaultDirective } from '@mintplayer/ng-bootstrap/instance-of';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-instance-of',
  templateUrl: './instance-of.component.html',
  styleUrls: ['./instance-of.component.scss'],
  imports: [BsCodeSnippetComponent, BsInstanceOfDirective, BsInstanceofCaseDirective, BsInstanceOfDefaultDirective, BsAlertComponent],
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

  protected readonly snippetBasicHtml = dedent`
    <ng-container [bsInstanceof]="item">
      <ng-container *bsInstanceofCase="A; let a">{{ a.a }}</ng-container>
      <ng-container *bsInstanceofCase="B; let b">{{ b.b }}</ng-container>
      <ng-container *bsInstanceofDefault>No match</ng-container>
    </ng-container>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsInstanceOfDirective,
      BsInstanceofCaseDirective,
      BsInstanceOfDefaultDirective,
    } from '@mintplayer/ng-bootstrap/instance-of';

    class Base { text = 'text'; }
    class A extends Base { a = 'a'; }
    class B extends Base { b = 'b'; }

    @Component({
      selector: 'my-instance-of-demo',
      templateUrl: './my-instance-of-demo.component.html',
      imports: [BsInstanceOfDirective, BsInstanceofCaseDirective, BsInstanceOfDefaultDirective],
    })
    export class MyInstanceOfDemoComponent {
      protected item: Base = new A();
      protected readonly A = A;
      protected readonly B = B;
    }
  `;
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