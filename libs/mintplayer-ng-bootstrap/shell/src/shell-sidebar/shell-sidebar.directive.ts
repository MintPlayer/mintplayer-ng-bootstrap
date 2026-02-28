import { Directive, inject, TemplateRef } from '@angular/core';
import { BsShellComponent } from '../shell/shell.component';

@Directive({
  selector: '[bsShellSidebar]',
})
export class BsShellSidebarDirective {
  constructor() {
    const shell = inject(BsShellComponent);
    const template = inject(TemplateRef);
    shell.sidebarTemplate = template;
  }
}
