import { Directive, inject, input, TemplateRef } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Directive({
  selector: '[bsPriorityNavItem]',
})
export class BsPriorityNavItemDirective {
  templateRef = inject(TemplateRef);

  priority = input<number | null>(null, { alias: 'bsPriorityNavItem' });
  hideBelow = input<Breakpoint | null>(null, { alias: 'bsPriorityNavItemHideBelow' });

  readonly id: number = ++BsPriorityNavItemDirective.idCounter;
  private static idCounter = 0;
}
