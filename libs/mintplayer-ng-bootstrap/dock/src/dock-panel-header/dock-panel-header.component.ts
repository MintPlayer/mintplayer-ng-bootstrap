import { Component, ElementRef, HostBinding, HostListener, Inject, Optional, forwardRef } from '@angular/core';
import { take } from 'rxjs';
import { BsTabControlComponent } from '@mintplayer/ng-bootstrap/tab-control';
import { Parentified } from '@mintplayer/parentify';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockComponent } from '../dock/dock.component';
import { BsDockPane } from '../panes/dock-pane';
import { BsSplitPane } from '../panes/split-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { RemoveFromPaneResult } from '../interfaces/remove-from-pane-result';
import { DragOperation } from '../interfaces/drag-operation';
import { BsDockService } from '../services/dock/dock.service';

@Component({
  selector: 'bs-dock-panel-header',
  templateUrl: './dock-panel-header.component.html',
  styleUrls: ['./dock-panel-header.component.scss']
})
export class BsDockPanelHeaderComponent {
  constructor(private dockPanel: BsDockPanelComponent, private dock: BsDockComponent, private dockService: BsDockService, private element: ElementRef<HTMLElement>) {}

  isMouseDown = false;
  dragOperation?: DragOperation;
  isDragging = false;
  @HostListener('mousedown', ['$event']) onMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    this.isMouseDown = true;
  }

  @HostListener('document:mousemove', ['$event']) onMouseMove(ev: MouseEvent) {
    if (this.isMouseDown) {
      if (!this.isDragging) {
        this.isDragging = true;
          
        this.dock.parentifiedLayout$.pipe(take(1)).subscribe((layout) => {
        // this.dock.layout$.pipe(take(1)).subscribe((layout) => {
          const traces = this.dockService.buildTraces(layout);
          console.log('traces', {layout, traces});
          const matching = traces.filter(t => {
            const lastPane = t.trace[t.trace.length - 1];
            // return (lastPane instanceof BsContentPane) && (lastPane.dockPanel === this.dockPanel);
            return (lastPane instanceof BsContentPane) && (lastPane.dockPanel === this.dockPanel);
          });
          console.log('matching', matching);
          if (matching.length !== 1) {
            return;
          }

          // const tabs = matching[0].trace.filter(pane => pane instanceof BsTabGroupPane);
          // const lastTabGroup = tabs[tabs.length - 1];
          // // console.log('last tabgroup', lastTabGroup);

          let tabControlEl = this.element.nativeElement;
          do {
            if (tabControlEl.parentElement) {
              tabControlEl = tabControlEl!.parentElement;
            } else {
              throw 'No more parents';
            }
          } while (tabControlEl.tagName.toUpperCase() !== 'BS-TAB-CONTROL');

          const coords = {
            width: tabControlEl.clientWidth,
            height: tabControlEl.clientHeight,
            left: ev.clientX - ev.offsetX,
            top: ev.clientY - ev.offsetY,
          };

          this.dockPanel.headerPortal?.isAttached && this.dockPanel.headerPortal?.detach();
          this.dockPanel.contentPortal?.isAttached && this.dockPanel.contentPortal?.detach();
          this.removeFromPane(layout.rootPane, this.dockPanel);

          const floatingPane = new BsFloatingPane({
            pane: new BsTabGroupPane({
              panes: [
                new BsContentPane({
                  dockPanel: this.dockPanel
                })
              ]
            }),
            size: {
              width: coords.width,
              height: coords.height,
            },
            location: {
              x: coords.left,
              y: coords.top,
            }
          });
          this.dragOperation = {
            offsetX: ev.offsetX,
            offsetY: ev.offsetY,
            floatingPane
          };
          layout.floatingPanes.push(floatingPane);
          setTimeout(() => this.dock.layout$.next(layout), 5);
          // console.log('traces', { traces, matching, dockPanel: this.dockPanel, equals: traces[2].trace[3] });

          //     let element: HTMLElement | null = this.element.nativeElement;
          //     let tree: HTMLElement[] = [];
          //     do {
          //       tree.push(element!);
          //       element = element!.parentElement;
          //     } while (element);

          //     const tabControls = tree.filter(el => el.tagName.toUpperCase() === 'BS-TAB-CONTROL');
          //     if (tabControls.length > 0) {
          //       const coords = {
          //         width: tabControls[0].clientWidth,
          //         height: tabControls[0].clientHeight,
          //         left: ev.clientX - ev.offsetX,
          //         top: ev.clientY - ev.offsetY,
          //       };

          //       this.dockPanel.headerPortal?.isAttached && this.dockPanel.headerPortal?.detach();
          //       this.dockPanel.contentPortal?.isAttached && this.dockPanel.contentPortal?.detach();
          //       this.removeFromPane(layout.rootPane, this.dockPanel);

          //       const floatingPane = new BsFloatingPane({
          //         pane: new BsTabGroupPane({
          //           panes: [
          //             new BsContentPane({
          //               dockPanel: this.dockPanel
          //             })
          //           ]
          //         }),
          //         size: {
          //           width: coords.width,
          //           height: coords.height,
          //         },
          //         location: {
          //           x: coords.left,
          //           y: coords.top,
          //         }
          //       });
                
          //       this.dragOperation = {
          //         offsetX: ev.offsetX,
          //         offsetY: ev.offsetY,
          //         floatingPane
          //       };

          //       layout.floatingPanes.push(floatingPane);
          //       this.dock.layout$.next(layout);
          //     }
        });
      } else {
        if (this.dragOperation) {
          if (this.dragOperation.floatingPane.location) {
            this.dragOperation.floatingPane.location.x = ev.clientX - this.dragOperation.offsetX;
            this.dragOperation.floatingPane.location.y = ev.clientY - this.dragOperation.offsetY;
          }
      //   } else {
      //     const traces = this.dockService.buildTraces(this.dock.layout);
      //     const matchingTrace = traces.filter(trace => {
      //       const pane = trace.trace[trace.trace.length - 1];
      //       return (pane instanceof BsContentPane) && (pane.dockPanel === this.dockPanel);
      //     });

      //     console.log('matching', { traces, matchingTrace });
      //     // this.dragOperation = {
            
      //     // }
        }
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
    this.isMouseDown = false;
    this.isDragging = false;
    this.dragOperation = undefined;
  }

  @HostBinding('class.d-block') dBlock = true;
}
