import { AfterViewInit, Directive, TemplateRef, ViewContainerRef } from '@angular/core';
import { BsShellComponent } from '../shell/shell.component';
import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Directive({
  selector: '[bsShellSidebar]',
  standalone: false,
})
export class BsShellSidebarDirective {

  constructor(private shell: BsShellComponent, private template: TemplateRef<any>) {
    shell.sidebarTemplate = template;
  }

}
