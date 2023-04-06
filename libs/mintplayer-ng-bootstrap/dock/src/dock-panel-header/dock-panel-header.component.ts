import { GlobalPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Component, HostBinding, HostListener } from '@angular/core';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockComponent } from '../dock/dock.component';
import { BsDockPane } from '../panes/dock-pane';
import { BsSplitPane } from '../panes/split-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { take } from 'rxjs';

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
        this.dock.layout$.pipe(take(1)).subscribe((layout) => {
          layout.floatingPanes.push(new BsFloatingPane({
            pane: new BsTabGroupPane({
              panes: [
                new BsContentPane({
                  dockPanel: this.dockPanel
                })
              ]
            }) 
          }));

          this.removeFromPane(layout.rootPane, this.dockPanel);
        });
      }
    }
  }

  removeFromPane(host: BsDockPane, panel: BsDockPanelComponent) {
    if (host instanceof BsContentPane) {
    } else if (host instanceof BsDocumentHost) {
      host.rootPane && this.removeFromPane(host.rootPane, panel);
    } else if (host instanceof BsTabGroupPane) {
      const matching = host.panes.filter(p => p.dockPanel === panel);
      if (matching.length > 0) {
        host.panes = host.panes.filter(p => p.dockPanel !== panel);
      } else {
        host.panes.forEach((parentPane) => {
          this.removeFromPane(parentPane, panel);
        });
      }
    } else if (host instanceof BsSplitPane) {
      const matching = host.panes
        .filter(p => p instanceof BsContentPane)
        .map(p => <BsContentPane>p)
        .filter(p => p.dockPanel === panel);
      
      if (matching.length > 0) {
        host.panes = host.panes.filter(p => (p instanceof BsContentPane) && !matching.includes(p));
      } else {
        host.panes.forEach((splitPane) => {
          this.removeFromPane(splitPane, panel);
        });
      }
    }
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.isDragging = false;
  }

  @HostBinding('class.d-block') dBlock = true;
}
