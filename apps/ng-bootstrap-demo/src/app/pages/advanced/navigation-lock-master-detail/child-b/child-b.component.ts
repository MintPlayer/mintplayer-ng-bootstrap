import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'demo-nav-lock-child-b',
  templateUrl: './child-b.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildBComponent {}
