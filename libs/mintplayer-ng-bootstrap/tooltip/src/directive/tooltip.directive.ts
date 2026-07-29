import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Directive, ElementRef, Host, inject, input, Injector, OnDestroy, SkipSelf, TemplateRef } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsIdService, BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { BsTooltipComponent } from '../component/tooltip.component';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';
import { TOOLTIP_ID } from '../providers/tooltip-id.provider';

@Directive({
  selector: '*[bsTooltip]',
  host: {
    '(window:blur)': 'onBlur()',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class BsTooltipDirective implements OnDestroy {
  private ids = inject(BsIdService);
  private overlayStack = inject(BsOverlayStackService);
  private readonly tooltipId = this.ids.next('bs-tooltip');
  private stackToken: symbol | null = null;

  constructor(
    private overlay: Overlay,
    private templateRef: TemplateRef<any>,
    private parentInjector: Injector,
    @Host() @SkipSelf() private parent: ElementRef
  ) {
    this.injector = Injector.create({
      providers: [
        { provide: TOOLTIP_CONTENT, useValue: this.templateRef },
        { provide: TOOLTIP_ID, useValue: this.tooltipId },
      ],
      parent: this.parentInjector
    });
    this.portal = new ComponentPortal(BsTooltipComponent, null, this.injector);

    /* addEventListener rather than the on* properties the old code assigned —
       those silently CLOBBER any handler the consumer set on their own element. */
    parent.nativeElement.addEventListener('mouseenter', () => this.showTooltip());
    parent.nativeElement.addEventListener('mouseleave', () => this.scheduleHide());
    // WCAG 1.4.13: content on hover must also appear on FOCUS. A keyboard user
    // could never see these tooltips at all.
    parent.nativeElement.addEventListener('focusin', () => this.showTooltip());
    parent.nativeElement.addEventListener('focusout', () => this.hideTooltip());
  }

  /**
   * WCAG 1.4.13 "hoverable": the pointer must be able to travel INTO the
   * tooltip (to select/zoom its text) without it vanishing. Hide on a short
   * delay; entering the overlay cancels it, leaving the overlay hides.
   */
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleHide(): void {
    this.cancelScheduledHide();
    this.hideTimer = setTimeout(() => this.hideTooltip(), 150);
  }

  private cancelScheduledHide(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  readonly bsTooltip = input<Position>('bottom');

  private injector: Injector;
  private portal: ComponentPortal<any>;
  private overlayRef: OverlayRef | null = null;

  onBlur() {
    this.hideTooltip();
  }

  onEscape() {
    if (this.stackToken !== null && this.overlayStack.isTop(this.stackToken)) {
      this.hideTooltip();
    }
  }

  showTooltip() {
    this.cancelScheduledHide();
    if (this.overlayRef) return;

    const positions: ConnectedPosition[] = [];
    switch (this.bsTooltip()) {
      case 'bottom': {
        positions.push({
          originX: "center",
          originY: "bottom", //<--
          overlayX: "center",
          overlayY: "top"
        });
      } break;
      case 'top': {
        positions.push({
          originX: "center",
          originY: "top", //<--
          overlayX: "center",
          overlayY: "bottom"
        });
      } break;
      case 'start': {
        positions.push({
          originX: "start", //<--
          originY: "center",
          overlayX: "end",
          overlayY: "center",
        });
      } break;
      case 'end': {
        positions.push({
          originX: "end", //<--
          originY: "center",
          overlayX: "start",
          overlayY: "center"
        });
      } break;
    }

    this.overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .flexibleConnectedTo(this.parent)
        .withPositions(positions),
    });
    const component = this.overlayRef.attach<BsTooltipComponent>(this.portal);
    component.setInput('position', this.bsTooltip());

    // Hoverable half of 1.4.13 — see scheduleHide().
    this.overlayRef.overlayElement.addEventListener('mouseenter', () => this.cancelScheduledHide());
    this.overlayRef.overlayElement.addEventListener('mouseleave', () => this.scheduleHide());

    this.parent.nativeElement.setAttribute('aria-describedby', this.tooltipId);
    if (this.stackToken === null) {
      this.stackToken = this.overlayStack.push();
    }
  }

  hideTooltip() {
    this.cancelScheduledHide();
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.parent.nativeElement.removeAttribute('aria-describedby');
    if (this.stackToken !== null) {
      this.overlayStack.release(this.stackToken);
      this.stackToken = null;
    }
  }

  ngOnDestroy() {
    this.hideTooltip();
  }

}
