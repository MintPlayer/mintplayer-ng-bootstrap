import { Directive, TemplateRef } from '@angular/core';
import { BsShellComponent } from '../shell/shell.component';

@Directive({
  selector: '[bsShellSidebar]',
  standalone: false,
})
export class BsShellSidebarDirective {
  constructor(shell: BsShellComponent, template: TemplateRef<any>) {
    shell.sidebarTemplate = template;
  }
}
