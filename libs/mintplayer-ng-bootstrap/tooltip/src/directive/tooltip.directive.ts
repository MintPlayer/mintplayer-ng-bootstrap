import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Directive, ElementRef, Host, input, Injector, OnDestroy, SkipSelf, TemplateRef } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsTooltipComponent } from '../component/tooltip.component';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Directive({
  selector: '*[bsTooltip]',
  standalone: false,
  host: {
    '(window:blur)': 'onBlur()',
  },
})
export class BsTooltipDirective implements OnDestroy {

  constructor(
    private overlay: Overlay,
    private templateRef: TemplateRef<any>,
    private parentInjector: Injector,
    @Host() @SkipSelf() private parent: ElementRef
  ) {
    this.injector = Injector.create({
      providers: [{ provide: TOOLTIP_CONTENT, useValue: this.templateRef }],
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
  }

  hideTooltip() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  ngOnDestroy() {
    this.hideTooltip();
  }

}
