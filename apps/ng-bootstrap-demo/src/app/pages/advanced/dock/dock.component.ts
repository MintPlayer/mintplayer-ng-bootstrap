import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsContentPane, BsDockLayout, BsDockModule, BsDockPanelComponent, BsDockService, BsSplitPane, BsTabGroupPane } from '@mintplayer/ng-bootstrap/dock';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss'],
  standalone: true,
  imports: [AsyncPipe, BsDockModule, BsBadgeComponent, BsButtonTypeDirective],
})
export class DockComponent implements AfterViewInit {

  constructor(private dockService: BsDockService) {
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
  @ViewChild('panel6') panel6!: BsDockPanelComponent;
  @ViewChild('panel7') panel7!: BsDockPanelComponent;
  @ViewChild('panel8') panel8!: BsDockPanelComponent;
  @ViewChild('panel9') panel9!: BsDockPanelComponent;
  @ViewChild('panel10') panel10!: BsDockPanelComponent;
  @ViewChild('panel11') panel11!: BsDockPanelComponent;
  @ViewChild('panel12') panel12!: BsDockPanelComponent;
  // @ViewChild('panel6') panel6!: BsDockPanelComponent;

  getAllPanes() {
    const result = this.dockService.buildTraces(this.layout$.value);
    console.log('all panes', result);
  }

  // getData(pane: BsDockLayout | BsDockPane): any {
  //   if (('rootPane' in pane) && ('floatingPanes' in pane)) {
  //     return {
  //       rootPane: this.getData(pane.rootPane),
  //       floatingPanes: pane.floatingPanes.map((fp) => this.getData(fp))
  //     }
  //   } else if (pane instanceof BsSplitPane) {
  //     return {
  //       orientation: pane.orientation,
  //       panes: pane.panes.map((p) => this.getData(p))
  //     }
  //   } else if (pane instanceof BsTabGroupPane) {
  //     return {
  //       panes: pane.panes.map((p) => this.getData(p))
  //     }
  //   } else if (pane instanceof BsFloatingPane) {
  //     return {
  //       location: pane.location,
  //       size: pane.size,
  //       pane: pane.pane ? this.getData(pane.pane) : null
  //     }
  //   } else if (pane instanceof BsContentPane) {
  //     return {
  //       panelId: pane.dockPanel.panelId
  //     }
  //   }
  // }

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
                }),
                // new BsContentPane({
                //   dockPanel: this.panel6,
                // }),
                new BsContentPane({
                  dockPanel: this.panel7,
                }),
                new BsContentPane({
                  dockPanel: this.panel8,
                }),
                new BsContentPane({
                  dockPanel: this.panel9,
                }),
                new BsContentPane({
                  dockPanel: this.panel10,
                }),
                new BsContentPane({
                  dockPanel: this.panel11,
                }),
                new BsContentPane({
                  dockPanel: this.panel12,
                }),
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
