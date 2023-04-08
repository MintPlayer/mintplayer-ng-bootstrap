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
          this.removeFromPane(layout.rootPane, this.dockPanel);

          layout.floatingPanes.push(new BsFloatingPane({
            pane: new BsTabGroupPane({
              panes: [
                new BsContentPane({
                  dockPanel: this.dockPanel
                })
              ]
            }) 
          }));
          this.dock.layout$.next(layout);

          // this.removeFromPane(layout.rootPane, this.dockPanel);
          // this.dock.layout$.next(layout);
        });
      }
    }
  }

  removeFromPane(host: BsDockPane, panel: BsDockPanelComponent) {
    if (host instanceof BsContentPane) {
    } else if (host instanceof BsDocumentHost) {
      host.rootPane && this.removeFromPane(host.rootPane, panel);
    } else if (host instanceof BsTabGroupPane) {
      // console.log('Expected 3');
      const matching = host.panes.filter(p => p.dockPanel === panel);
      if (matching.length > 0) {
        // console.log('Expected 3: if');
        // host.panes = host.panes.filter(p => p.dockPanel !== panel);
        console.warn('panes before', host.panes);
        host.panes.splice(host.panes.findIndex(p => p.dockPanel === panel), 1);
        console.warn('panes after', host.panes);
      } else {
        // console.log('Expected 3: else');
        host.panes.forEach((parentPane) => {
          this.removeFromPane(parentPane, panel);
        });
      }
    } else if (host instanceof BsSplitPane) {
      // console.log('Expected 1 or 2');
      const matching = host.panes
        .filter(p => p instanceof BsContentPane)
        .map(p => <BsContentPane>p)
        .filter(p => p.dockPanel === panel);
      
      if (matching.length > 0) {
        // host.panes = host.panes.filter(p => (p instanceof BsContentPane) && !matching.includes(p));
        host.panes.splice(host.panes.findIndex(p => (p instanceof BsContentPane) && matching.includes(p)), 1);
      } else {
        host.panes.forEach((splitPane) => {
          this.removeFromPane(splitPane, panel);
        });
      }
    }

    // if (host instanceof BsTabGroupPane) {
    //   // console.log('Expected 3');
    //   const matching = host.panes.filter(p => p.dockPanel === panel);
    //   if (matching.length > 0) {
    //     // console.log('Expected 3: if');
    //     console.log('panes before', host.panes);
    //     host.panes = host.panes.filter(p => p.dockPanel !== panel);
    //     console.log('panes after', host.panes);
    //   } else {
    //     // console.log('Expected 3: else');
    //     host.panes.forEach((parentPane) => {
    //       this.removeFromPane(parentPane, panel);
    //     });
    //   }
    // }
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.isDragging = false;
  }

  @HostBinding('class.d-block') dBlock = true;
}
