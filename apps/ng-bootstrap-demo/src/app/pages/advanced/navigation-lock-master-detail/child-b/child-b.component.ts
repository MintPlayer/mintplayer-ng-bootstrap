import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'demo-nav-lock-child-b',
  template: `<h2>Child B</h2><p>No lock here. You can navigate away freely.</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildBComponent {}
