import { GlobalPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Component, HostBinding, HostListener } from '@angular/core';
import { take } from 'rxjs';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockComponent } from '../dock/dock.component';
import { BsDockPane } from '../panes/dock-pane';
import { BsSplitPane } from '../panes/split-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { RemoveFromPaneResult } from '../interfaces/remove-from-pane-result';

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
          this.dockPanel.headerPortal?.isAttached && this.dockPanel.headerPortal?.detach();
          this.dockPanel.contentPortal?.isAttached && this.dockPanel.contentPortal?.detach();

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

  removeFromPane(host: BsDockPane, panel: BsDockPanelComponent /*, parents: BsDockPane[] */): RemoveFromPaneResult {
    if (host instanceof BsContentPane) {
      return { paneRemoved: false, hostIsEmpty: false };
    } else if (host instanceof BsDocumentHost) {
      // Actually documentHost should never be removed

      if (!host.rootPane) {
        return { paneRemoved: false, hostIsEmpty: true };
      }

      const result = this.removeFromPane(host.rootPane, panel);
      return { paneRemoved: result.paneRemoved, hostIsEmpty: result.hostIsEmpty };

    } else if (host instanceof BsTabGroupPane) {



      const matching = host.panes.filter(p => p.dockPanel === panel);
      if (matching.length > 0) {
        host.panes.splice(host.panes.findIndex(p => p.dockPanel === panel), 1);
        return { paneRemoved: true, hostIsEmpty: host.panes.length === 0 };
      } else {
        // ATM. all panes are ContentPanes anyway.
        // So unless you'd want to have splitters inside the tabs,
        // This code will not be hit.

        // const result = host.panes
        //   .map(parentPane => this.removeFromPane(parentPane, panel))
        //   .filter(r => r.paneRemoved);
        //
        // if (result.length > 0) {
        //   return { paneRemoved: true, hostIsEmpty: }
        // }
        return { paneRemoved: false, hostIsEmpty: host.panes.length === 0 };
      }




    } else if (host instanceof BsSplitPane) {
      const matching = host.panes
        .filter(p => p instanceof BsContentPane)
        .map(p => <BsContentPane>p)
        .filter(p => p.dockPanel === panel);
      
      if (matching.length > 0) {
        host.panes.splice(host.panes.findIndex(p => (p instanceof BsContentPane) && matching.includes(p)), 1);

        // TODO: Remove splitter if only 1 pane left?
        return { paneRemoved: true, hostIsEmpty: host.panes.length === 0 };
      } else {


        for (let splitPane of host.panes) {
          const result = this.removeFromPane(splitPane, panel);
          if (result.paneRemoved && result.hostIsEmpty) {
            // splitPane is empty now, so we can remove it from this splitter
            host.panes.splice(host.panes.indexOf(splitPane), 1);
            return { paneRemoved: true, hostIsEmpty: host.panes.length === 0 };
          }
        }
      }

      return { paneRemoved: false, hostIsEmpty: host.panes.length === 0 };
    } else {
      throw 'unknown host type';
    }
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.isDragging = false;
  }

  @HostBinding('class.d-block') dBlock = true;
}
