import { Directive, ElementRef, HostListener, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { BsOverlayService, createVirtualElement, OverlayHandle } from '@mintplayer/ng-bootstrap/overlay';

@Directive({
  selector: '[bsContextMenu]',
  standalone: false,
})
export class BsContextMenuDirective {
  private overlayService = inject(BsOverlayService);
  private templateRef = inject(TemplateRef);
  private viewContainerRef = inject(ViewContainerRef);
  private element = inject(ElementRef, { host: true, skipSelf: true });

  private handle: OverlayHandle<unknown> | null = null;

  constructor() {
    this.element.nativeElement.oncontextmenu = (ev: MouseEvent) => {
      ev.preventDefault();
      this.checkAndCloseExisting(ev);

      const virtualElement = createVirtualElement(ev.clientX, ev.clientY);

      this.handle = this.overlayService.createConnected({
        connectedTo: virtualElement,
        positions: [
          { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top' },
          { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
          { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
          { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom' },
        ],
        template: this.templateRef,
        viewContainerRef: this.viewContainerRef,
        portalType: 'template',
        scrollStrategy: 'close',
        hasBackdrop: false,
      });

      // Add position-static class to root nodes
      this.handle.viewRef?.rootNodes.forEach((node: HTMLElement) => {
        node.classList?.add('position-static');
      });
    };
  }

  @HostListener('document:click', ['$event']) clickAnywhere(ev: MouseEvent) {
    this.checkAndCloseExisting(ev);
  }

  @HostListener('window:blur') private onBlur() {
    this.close();
  }

  private close() {
    this.handle?.dispose();
    this.handle = null;
  }

  private checkAndCloseExisting(ev: MouseEvent) {
    if (this.handle?.overlayRef && !this.handle.overlayRef.overlayElement.contains(ev.target as Node)) {
      this.close();
    }
  }
}
