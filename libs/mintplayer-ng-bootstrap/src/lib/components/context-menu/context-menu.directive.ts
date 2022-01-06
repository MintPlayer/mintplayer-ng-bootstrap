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

      console.log('d', element.nativeElement);
      this.overlayRef = this.overlay.create({
        hasBackdrop: false,
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        positionStrategy: this.overlay.position()
        // .flexibleConnectedTo({ x: ev.x, y: ev.y })
        .flexibleConnectedTo(this.element)
        .withPositions([
          // element: TopLeft - dropdown: TopLeft
          { originX: "start", originY: "top", overlayX: "start", overlayY: "top", offsetX: ev.offsetX, offsetY: ev.offsetY },
          // // element: TopLeft - dropdown: BottomLeft
          // { originX: "start", originY: "top", overlayX: "start", overlayY: "bottom", offsetX: ev.offsetX, offsetY: ev.offsetY },
          
          // // element: TopLeft - dropdown: TopRight
          // { originX: "start", originY: "top", overlayX: "end", overlayY: "top", offsetX: ev.offsetX, offsetY: ev.offsetY },
          // // element: TopLeft - dropdown: BottomRight
          // { originX: "start", originY: "top", overlayX: "end", overlayY: "bottom", offsetX: ev.offsetX, offsetY: ev.offsetY },

        ])
      });
      this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
      const view = this.overlayRef.attach(this.templatePortal);
      view.rootNodes.forEach(node => node.classList.add('position-static'));
    };
  }

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

  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

}
