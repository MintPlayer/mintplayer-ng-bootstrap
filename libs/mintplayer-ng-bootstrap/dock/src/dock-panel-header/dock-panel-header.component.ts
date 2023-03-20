import { GlobalPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Component, HostBinding, HostListener } from '@angular/core';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';

@Component({
  selector: 'bs-dock-panel-header',
  templateUrl: './dock-panel-header.component.html',
  styleUrls: ['./dock-panel-header.component.scss']
})
export class BsDockPanelHeaderComponent {
  constructor(private overlay: Overlay, private dockPanel: BsDockPanelComponent) {
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global()
    });
  }

  isDragging = false;
  overlayRef: OverlayRef;
  @HostListener('mousedown', ['$event']) onMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    this.isDragging = true;
  }

  @HostListener('document:mousemove', ['$event']) onMouseMove(ev: MouseEvent) {
    // console.log('attached', this.overlayRef.hasAttached);
    if (this.isDragging && !this.overlayRef.hasAttached()) {
      this.dockPanel.portal?.attach(this.overlayRef);
    }
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.isDragging = false;
  }

  @HostBinding('class.d-block') dBlock = true;
}
