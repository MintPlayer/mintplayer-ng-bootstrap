import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, forwardRef, HostListener, Inject, NgZone, PLATFORM_ID, TemplateRef, ViewContainerRef } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Subject, take, takeUntil } from 'rxjs';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { ClickOutsideDirective } from '../../click-outside/click-outside.directive';

@Directive({
  selector: '[bsDropdownMenu]',
  host: {
    '[class.show]': 'dropdown.isOpen',
  },
})
export class BsDropdownMenuDirective extends ClickOutsideDirective {
  constructor(
    @Inject(forwardRef(() => BsDropdownDirective)) private dropdown: BsDropdownDirective,
    @Inject(DOCUMENT) document: any,
    private viewContainerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>,
    private overlay: Overlay,

    elementRef: ElementRef<any>,
    zone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    super(elementRef, zone, platformId);

    this.document = <Document>document;
    this.dropdown.isOpen$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isOpen) => {
        if (isOpen) {
          this.wait = true;
          setTimeout(() => this.wait = false, 100);

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

          if (this.dropdown.hasBackdrop && this.dropdown.closeOnClickOutside) {
            this.overlayRef.backdropClick().subscribe(() => this.dropdown.isOpen$.next(false));
          }
      
          this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
          this.overlayRef.attach(this.templatePortal);
        } else {
          if (this.overlayRef) {
            this.overlayRef.detach();
            this.overlayRef.dispose();
            this.overlayRef = null;
          }
        }
      });
  }

  @HostListener('clickOutside') clickedOutside() {
    console.log('wait', this.wait);
    if (!this.wait) {
      this.dropdown.isOpen$.pipe(take(1)).subscribe((isOpen) => {
        if (isOpen && !this.dropdown.hasBackdrop && this.dropdown.closeOnClickOutside) {
          this.dropdown.isOpen$.next(false);
        }
      });
    }
  }

  private wait: boolean = false;
  private document: Document;
  private destroyed$ = new Subject();
  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

}
