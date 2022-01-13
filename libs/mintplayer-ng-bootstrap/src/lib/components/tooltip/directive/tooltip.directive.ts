import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentFactoryResolver, Directive, ElementRef, Host, HostListener, Injector, Input, SkipSelf, TemplateRef, ViewContainerRef } from '@angular/core';
import { Position } from '../../../enums/position.enum';
import { BsTooltipComponent } from '../component/tooltip.component';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Directive({
  selector: '*[bsTooltip]'
})
export class BsTooltipDirective {

  constructor(
    private overlay: Overlay,
    private templateRef: TemplateRef<any>,
    componentFactoryResolver: ComponentFactoryResolver,
    private parentInjector: Injector,
    @Host() @SkipSelf() private parent: ElementRef
  ) {
    this.injector = Injector.create({
      providers: [{ provide: TOOLTIP_CONTENT, useValue: this.templateRef }],
      parent: this.parentInjector
    });
    this.portal = new ComponentPortal(BsTooltipComponent, null, this.injector, componentFactoryResolver);

    parent.nativeElement.onmouseenter = () => {
      this.showTooltip();
    };
    parent.nativeElement.onmouseleave = () => {
      this.hideTooltip();
    }
  }

  @Input() public bsTooltip: Position = Position.bottom;

  private injector: Injector;
  private portal: ComponentPortal<any>;
  private overlayRef: OverlayRef | null = null;

  @HostListener('window:blur') private onBlur() {
    this.hideTooltip();
  }

  showTooltip() {
    const positions: ConnectedPosition[] = [];
    switch (this.bsTooltip) {
      case Position.bottom: {
        positions.push({
          originX: "center",
          originY: "bottom", //<--
          overlayX: "center",
          overlayY: "top"
        });
      } break;
      case Position.top: {
        positions.push({
          originX: "center",
          originY: "top", //<--
          overlayX: "center",
          overlayY: "bottom"
        });
      } break;
      case Position.left: {
        positions.push({
          originX: "start", //<--
          originY: "center",
          overlayX: "end",
          overlayY: "center",
        });
      } break;
      case Position.right: {
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
    component.instance.position = this.bsTooltip;
  }

  hideTooltip() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

}
