import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Directive, ElementRef, Host, HostListener, SkipSelf, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[bsContextMenu]'
})
export class BsContextMenuDirective {

  constructor(
    private overlay: Overlay,
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef,
    @Host() @SkipSelf() private element: ElementRef
  ) {
    this.element.nativeElement.oncontextmenu = (ev: MouseEvent) => {
      ev.preventDefault();
      this.checkAndCloseExisting(ev);
      this.overlayRef = this.overlay.create({
        scrollStrategy: this.overlay.scrollStrategies.noop(),
        positionStrategy: this.overlay.position()
          .global()
          .left(ev.x + 'px')
          .bottom((window.innerHeight - ev.y) + 'px')
          .top(ev.y + 'px')
      });
      this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
      this.overlayRef.attach(this.templatePortal);
    };
  }

  @HostListener('document:click', ['$event']) clickAnywhere(ev: MouseEvent) {
    this.checkAndCloseExisting(ev);
  }

  @HostListener('window:blur') private close() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  private checkAndCloseExisting(ev: MouseEvent) {
    if (this.overlayRef && !this.overlayRef.overlayElement.contains(<any>ev.target)) {
      this.close();
    }
  }

  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

}
