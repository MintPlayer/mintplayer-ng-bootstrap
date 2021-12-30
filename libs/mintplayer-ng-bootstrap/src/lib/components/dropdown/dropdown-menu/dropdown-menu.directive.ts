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
    @Inject(forwardRef(() => BsDropdownDirective)) private dropdown: BsDropdownDirective,
    @Inject(DOCUMENT) document: any,
    private viewContainerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>,
    private overlay: Overlay
  ) {
    this.document = <Document>document;
    this.dropdown.isOpen$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isOpen) => {
        if (isOpen) {
          this.overlayRef = this.overlay.create({
            hasBackdrop: this.dropdown.hasBackdrop,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            positionStrategy: this.overlay.position()
              .flexibleConnectedTo(this.dropdown.toggle.toggleButton)
              .withPositions([
                { originX: "start", "originY": "bottom", overlayX: "start", overlayY: "top", offsetY: 0 },
                { originX: "start", "originY": "top", overlayX: "start", overlayY: "bottom", offsetY: 0 },
              ]),
          });

          this.overlayRef.backdropClick().subscribe(() => this.dropdown.isOpen$.next(false));
      
          this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
          this.overlayRef.attach(this.templatePortal);
        } else {
          if (this.overlayRef) {
            this.overlayRef.detach();
            this.overlayRef.dispose();
          }
        }
      });
  }

  private document: Document;
  private destroyed$ = new Subject();
  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

}
