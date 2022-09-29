import { Directive, ElementRef, forwardRef, HostBinding, HostListener, Inject, NgZone, Optional, PLATFORM_ID, TemplateRef, ViewContainerRef } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { Subject, take, takeUntil } from 'rxjs';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { BS_DEVELOPMENT } from '../../../providers/development.provider';

@Directive({
  selector: '[bsDropdownMenu]'
})
export class BsDropdownMenuDirective extends ClickOutsideDirective {
  constructor(
    @Inject(forwardRef(() => BsDropdownDirective)) private dropdown: BsDropdownDirective,
    private viewContainerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>,
    private overlay: Overlay,

    elementRef: ElementRef<any>,
    zone: NgZone,
    @Inject(PLATFORM_ID) platformId: any,
    @Optional() @Inject(BS_DEVELOPMENT) private bsDevelopment?: boolean,
  ) {
    super(elementRef, zone, platformId);

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
              .flexibleConnectedTo(!this.dropdown.toggle ? dropdown.elementRef : this.dropdown.toggle.toggleButton)
              .withPositions([
                // element: BottomLeft - dropdown: TopLeft
                { originX: "start", originY: "bottom", overlayX: "start", overlayY: "top", offsetY: 0 },
                // element: TopLeft - dropdown: BottomLeft
                { originX: "start", originY: "top", overlayX: "start", overlayY: "bottom", offsetY: 0 },
              ]),
          });

          if (this.dropdown.hasBackdrop && this.dropdown.closeOnClickOutside) {
            this.overlayRef.backdropClick().subscribe(() => {
              this.dropdown.isOpen = false;
            });
          }
      
          this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
          const view = this.overlayRef.attach(this.templatePortal);
          
          if (this.dropdown.sameDropdownWidth) {
            const width = this.dropdown.elementRef.nativeElement.offsetWidth;
            view.rootNodes[0].style.width = width + 'px';
          }
        } else {
          if (this.overlayRef) {
            this.overlayRef.detach();
            this.overlayRef.dispose();
            this.overlayRef = null;
          }
        }
      });
  }

  private wait = false;
  private destroyed$ = new Subject();
  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

  @HostBinding('class.show') get show() { return this.dropdown.isOpen; }
  @HostListener('clickOutside', ['$event']) clickedOutside(ev: MouseEvent) {
    if (!this.bsDevelopment) {
      if (!this.wait) {
        if (!this.overlayRef?.overlayElement.contains(<any>ev.target)) {
          this.doClose();
        }
      }
    }
  }

  @HostListener('document:keydown.escape', ['$event']) onEscape(ev: KeyboardEvent) {
    this.doClose();
  }

  private doClose() {
    this.dropdown.isOpen$.pipe(take(1)).subscribe((isOpen) => {
      if (isOpen && !this.dropdown.hasBackdrop && this.dropdown.closeOnClickOutside) {
        this.dropdown.isOpen = false;
      }
    });
  }

}
