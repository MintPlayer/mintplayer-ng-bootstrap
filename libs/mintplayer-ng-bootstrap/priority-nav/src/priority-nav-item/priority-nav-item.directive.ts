import { Directive, inject, Input, TemplateRef } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Directive({
  selector: '[bsPriorityNavItem]',
})
export class BsPriorityNavItemDirective {
  templateRef = inject(TemplateRef);

  @Input('bsPriorityNavItem') priority: number | null = null;
  @Input('bsPriorityNavItemHideBelow') hideBelow: Breakpoint | null = null;

  readonly id: number = ++BsPriorityNavItemDirective.idCounter;
  private static idCounter = 0;
}
