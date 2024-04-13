import { AfterViewInit, Directive, TemplateRef, ViewContainerRef } from '@angular/core';
import { BsShellComponent } from '../shell/shell.component';
import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Directive({
  selector: '[bsShellSidebar]',
})
export class BsShellSidebarDirective implements AfterViewInit {

  constructor(private shell: BsShellComponent, private template: TemplateRef<any>, private overlayService: Overlay, private vcRef: ViewContainerRef) {

  }

  ngAfterViewInit() {
    const portal = new TemplatePortal(this.template, this.vcRef);
    const overlay = this.overlayService.create({});
    const viewRef = overlay.attach(portal);
  }

}
