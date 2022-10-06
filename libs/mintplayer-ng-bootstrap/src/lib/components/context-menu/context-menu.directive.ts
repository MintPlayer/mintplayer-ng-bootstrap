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

      const target = {
        getBoundingClientRect: () => {
          return  ({
            width: 0,
            height: 0,
            top: ev.clientY,
            left: ev.clientX,
            bottom: ev.clientY,
            right: ev.clientX,
          });
        },
      };
      const element = new ElementRef(target);

      this.overlayRef = this.overlay.create({
        hasBackdrop: false,
        scrollStrategy: this.overlay.scrollStrategies.close(),
        positionStrategy: this.overlay.position()
        .flexibleConnectedTo(element)
        .withPositions([
          { originX: "end", originY: "top", overlayX: "start", overlayY: "top" },
          { originX: "end", originY: "bottom", overlayX: "start", overlayY: "bottom" },
          { originX: "start", originY: "top", overlayX: "end", overlayY: "top" },
          { originX: "start", originY: "bottom", overlayX: "end", overlayY: "bottom" },
        ])
      });
      this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
      const view = this.overlayRef.attach(this.templatePortal);
      view.rootNodes.forEach(node => node.classList.add('position-static'));
    };
  }

  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

  @HostListener('document:click', ['$event']) clickAnywhere(ev: MouseEvent) {
    this.checkAndCloseExisting(ev);
  }
  
  
  @HostListener('window:blur') private onBlur() {
    this.close();
  }

  private close() {
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

}
