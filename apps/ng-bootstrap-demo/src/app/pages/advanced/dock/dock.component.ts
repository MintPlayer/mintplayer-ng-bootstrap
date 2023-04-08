import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { BehaviorSubject, Observable, map, delay } from 'rxjs';
import { BsContentPane, BsDockLayout, BsDockPane, BsDockPanelComponent, BsFloatingPane, BsSplitPane, BsTabGroupPane, EPaneType } from '@mintplayer/ng-bootstrap/dock';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
})
export class DockComponent implements AfterViewInit {

  constructor() {
    this.layout$ = new BehaviorSubject<BsDockLayout>({
      rootPane: new BsSplitPane({
        orientation: 'horizontal',
        panes: [
          new BsTabGroupPane({
            panes: []
          })
        ]
      }),
      floatingPanes: []
    });

    // this.layoutFiltered$ = this.layout$.pipe(map((layout) => {
    //   return this.getData(layout);
    // }));
  }

  colors = Color;
  layout$: BehaviorSubject<BsDockLayout>;
  // layoutFiltered$: Observable<any>;
  @ViewChild('panel1') panel1!: BsDockPanelComponent;
  @ViewChild('panel2') panel2!: BsDockPanelComponent;
  @ViewChild('panel3') panel3!: BsDockPanelComponent;
  @ViewChild('panel4') panel4!: BsDockPanelComponent;
  @ViewChild('panel5') panel5!: BsDockPanelComponent;
  // @ViewChild('panel6') panel6!: BsDockPanelComponent;

  getData(pane: BsDockLayout | BsDockPane): any {
    if (('rootPane' in pane) && ('floatingPanes' in pane)) {
      return {
        rootPane: this.getData(pane.rootPane),
        floatingPanes: pane.floatingPanes.map((fp) => this.getData(fp))
      }
    } else if (pane instanceof BsSplitPane) {
      return {
        orientation: pane.orientation,
        panes: pane.panes.map((p) => this.getData(p))
      }
    } else if (pane instanceof BsTabGroupPane) {
      return {
        panes: pane.panes.map((p) => this.getData(p))
      }
    } else if (pane instanceof BsFloatingPane) {
      return {
        location: pane.location,
        size: pane.size,
        pane: pane.pane ? this.getData(pane.pane) : null
      }
    } else if (pane instanceof BsContentPane) {
      return {
        panelId: pane.dockPanel.panelId
      }
    }
  }

  ngAfterViewInit() {
    // const root = new BsTabGroupPane({
    //   panes: [
    //     new BsContentPane({ dockPanel: this.panel1 }),
    //     new BsContentPane({ dockPanel: this.panel2 }),
    //     new BsContentPane({ dockPanel: this.panel3 }),
    //     new BsContentPane({ dockPanel: this.panel4 }),
    //     new BsContentPane({ dockPanel: this.panel5 }),
    //   ]
    // });
    const root = new BsSplitPane({
      orientation: 'vertical',
      panes: [
        new BsTabGroupPane({
          panes: [
            new BsContentPane({
              dockPanel: this.panel5
            })
          ]
        }),
        new BsSplitPane({
          orientation: 'horizontal',
          panes: [
            new BsTabGroupPane({
              panes: [
                new BsContentPane({
                  dockPanel: this.panel1,
                }),
              ]
            }),
            // new BsDocumentHost({
            //   rootPane: new BsTabGroupPane({
            //     panes: [
            //       new BsContentPane({
            //         dockPanel: this.panel2,
            //       }),
            //       new BsContentPane({
            //         dockPanel: this.panel3,
            //       }),
            //     ]
            //   })
            // }),
            new BsTabGroupPane({
              panes: [
                new BsContentPane({
                  dockPanel: this.panel2,
                }),
                new BsContentPane({
                  dockPanel: this.panel3,
                }),
              ]
            }),
            new BsTabGroupPane({
              panes: [
                new BsContentPane({
                  dockPanel: this.panel4,
                })
              ]
            }),
          ]
        })
      ]
    });

    this.layout$.next({
      rootPane: root,
      floatingPanes: [
        // new BsFloatingPane({
        //   pane: new BsContentPane({ dockPanel: this.panel2 }),
        // })
        // new BsFloatingPane({
        //   pane: new BsTabGroupPane({
        //     panes: [
        //       new BsContentPane({
        //         dockPanel: this.panel2,
        //       })
        //     ]
        //   })
        // })
      ]
    });
  }
  
}
