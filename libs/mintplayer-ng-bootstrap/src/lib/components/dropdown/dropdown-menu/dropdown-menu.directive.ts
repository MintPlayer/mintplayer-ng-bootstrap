import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, EmbeddedViewRef, forwardRef, Inject, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Subject, takeUntil } from 'rxjs';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { TemplatePortal } from '@angular/cdk/portal';

@Directive({
  selector: '[bsDropdownMenu]',
  host: {
    '[class.show]': 'dropdown.isOpen',
  },
})
export class BsDropdownMenuDirective {
  constructor(
    @Inject(forwardRef(() => BsDropdownDirective))
    private dropdown: BsDropdownDirective,
    @Inject(DOCUMENT) document: any,
    private renderer: Renderer2,
    private viewContainerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>,
    private overlay: Overlay,
    private elementRef: ElementRef
  ) {
    this.document = <Document>document;
    this.dropdown.isOpen$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isOpen) => {
        if (isOpen) {
          this.overlayRef = this.overlay.create({
            hasBackdrop: false,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            positionStrategy: this.overlay.position()
              .flexibleConnectedTo(this.dropdown.toggle.toggleButton)
              .withPositions([
                { originX: "end", "originY": "bottom", overlayX: "start", overlayY: "top", offsetY: 8}
              ])
          });
      
          this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
          this.overlayRef.attach(this.templatePortal);
        } else {
          if (this.overlayRef) {
            this.overlayRef.detach();
          }
        }
      });
  }

  private document: Document;
  private destroyed$ = new Subject();
  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

}
