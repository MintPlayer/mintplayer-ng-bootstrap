import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Directive, ElementRef, Host, inject, input, Injector, OnDestroy, SkipSelf, TemplateRef } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsTooltipComponent } from '../component/tooltip.component';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';
import { TOOLTIP_ID } from '../providers/tooltip-id.provider';

@Directive({
  selector: '*[bsTooltip]',
  host: {
    '(window:blur)': 'onBlur()',
    '(document:keydown.escape)': 'hideTooltip()',
  },
})
export class BsTooltipDirective implements OnDestroy {
  private ids = inject(BsIdService);
  private readonly tooltipId = this.ids.next('bs-tooltip');

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

    parent.nativeElement.onmouseenter = () => {
      this.showTooltip();
    };
    parent.nativeElement.onmouseleave = () => {
      this.hideTooltip();
    }
  }

  readonly bsTooltip = input<Position>('bottom');

  private injector: Injector;
  private portal: ComponentPortal<any>;
  private overlayRef: OverlayRef | null = null;

  onBlur() {
    this.hideTooltip();
  }

  showTooltip() {
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

    this.parent.nativeElement.setAttribute('aria-describedby', this.tooltipId);
  }

  hideTooltip() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.parent.nativeElement.removeAttribute('aria-describedby');
  }

  ngOnDestroy() {
    this.hideTooltip();
  }

}
