import { DestroyRef, Directive, effect, forwardRef, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownMenu]',
  standalone: true,
  host: {
    '(clickOutside)': 'clickedOutside($event)',
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class BsDropdownMenuDirective extends ClickOutsideDirective {

  private dropdown = inject(forwardRef(() => BsDropdownDirective));
  private viewContainerRef = inject(ViewContainerRef);
  private templateRef = inject(TemplateRef);
  private overlay = inject(Overlay);
  private destroy = inject(DestroyRef);
  private bsDevelopment = inject(BS_DEVELOPMENT, { optional: true });

  private wait = false;
  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

  constructor() {
    super();

    effect(() => {
      const isOpen = this.dropdown.isOpen();
      if (isOpen) {
        // Prevent creating duplicate overlays if effect re-runs while still open
        if (this.overlayRef) {
          return;
        }

        this.wait = true;
        setTimeout(() => this.wait = false, 100);

        this.overlayRef = this.overlay.create({
          hasBackdrop: this.dropdown.hasBackdrop(),
          scrollStrategy: this.overlay.scrollStrategies.reposition(),
          positionStrategy: this.overlay.position()
            .flexibleConnectedTo(!this.dropdown.toggle() ? this.dropdown.elementRef : this.dropdown.toggle()!.toggleButton)
            .withPositions([
              { originX: "start", originY: "bottom", overlayX: "start", overlayY: "top", offsetY: 0 },
              { originX: "start", originY: "top", overlayX: "start", overlayY: "bottom", offsetY: 0 },
            ]),
        });

        if (this.dropdown.hasBackdrop() && this.dropdown.closeOnClickOutside()) {
          this.overlayRef.backdropClick().subscribe(() => {
            this.dropdown.isOpen.set(false);
          });
        }

        this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
        const view = this.overlayRef.attach(this.templatePortal);

        if (this.dropdown.sameDropdownWidth()) {
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

  clickedOutside(event: Event) {
    const ev = event as MouseEvent;
    if (!this.bsDevelopment) {
      if (!this.wait) {
        if (!this.overlayRef?.overlayElement.contains(<any>ev.target)) {
          this.doClose();
        }
      }
    }
  }

  onEscape(event: Event) {
    this.doClose();
  }

  private doClose() {
    const isOpen = this.dropdown.isOpen();
    if (isOpen && !this.dropdown.hasBackdrop() && this.dropdown.closeOnClickOutside()) {
      this.dropdown.isOpen.set(false);
    }
  }
}
