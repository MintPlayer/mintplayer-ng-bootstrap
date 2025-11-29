import { Directive, ElementRef, Host, HostListener, inject, Input, OnDestroy, SkipSelf, TemplateRef } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsOverlayService, getConnectedPositions, OverlayHandle } from '@mintplayer/ng-bootstrap/overlay';
import { BsTooltipComponent } from '../component/tooltip.component';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Directive({
  selector: '*[bsTooltip]',
  standalone: false,
})
export class BsTooltipDirective implements OnDestroy {
  private overlayService = inject(BsOverlayService);
  private templateRef = inject(TemplateRef);
  private parent = inject(ElementRef, { host: true, skipSelf: true });

  @Input() public bsTooltip: Position = 'bottom';

  private handle: OverlayHandle<BsTooltipComponent> | null = null;

  constructor() {
    this.parent.nativeElement.onmouseenter = () => {
      this.showTooltip();
    };
    this.parent.nativeElement.onmouseleave = () => {
      this.hideTooltip();
    };
  }

  @HostListener('window:blur') private onBlur() {
    this.hideTooltip();
  }

  showTooltip() {
    const positions = getConnectedPositions(this.bsTooltip);

    this.handle = this.overlayService.createConnected<BsTooltipComponent>({
      connectedTo: this.parent,
      positions,
      contentComponent: BsTooltipComponent,
      contentToken: TOOLTIP_CONTENT,
      template: this.templateRef,
      scrollStrategy: 'reposition',
    });

    if (this.handle.componentRef) {
      this.handle.componentRef.instance.position = this.bsTooltip;
    }
  }

  hideTooltip() {
    this.handle?.dispose();
    this.handle = null;
  }

  ngOnDestroy() {
    this.hideTooltip();
  }
}
