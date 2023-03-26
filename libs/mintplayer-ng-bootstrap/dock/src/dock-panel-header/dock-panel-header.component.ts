import { GlobalPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Component, HostBinding, HostListener } from '@angular/core';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockComponent } from '../dock/dock.component';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsFloatingPane } from '../panes/floating-pane';

@Component({
  selector: 'bs-dock-panel-header',
  templateUrl: './dock-panel-header.component.html',
  styleUrls: ['./dock-panel-header.component.scss']
})
export class BsDockPanelHeaderComponent {
  constructor(private overlay: Overlay, private dockPanel: BsDockPanelComponent, private dock: BsDockComponent) {
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global()
    });
  }

  isDragging = false;
  overlayRef: OverlayRef;
  isLayoutDetached = false;
  @HostListener('mousedown', ['$event']) onMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    this.isDragging = true;
  }

  @HostListener('document:mousemove', ['$event']) onMouseMove(ev: MouseEvent) {
    if (this.isDragging) {
      if (!this.isLayoutDetached) {
        this.isLayoutDetached = true;
        this.dock.layout$.subscribe((layout) => {
          layout.floatingPanes.push(new BsFloatingPane({
            pane: new BsTabGroupPane({
              panes: [
                new BsContentPane({
                  dockPanel: this.dockPanel
                })
              ]
            }) 
          }))
        });
      }
    }
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.isDragging = false;
  }

  @HostBinding('class.d-block') dBlock = true;
}
