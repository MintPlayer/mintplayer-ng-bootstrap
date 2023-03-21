import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsContentPane, BsDockLayout, BsDockPanelComponent, BsSplitPane, BsTabGroupPane, EPaneType } from '@mintplayer/ng-bootstrap/dock';
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
  }

  colors = Color;
  layout$: BehaviorSubject<BsDockLayout>;
  @ViewChild('panel1') panel1!: BsDockPanelComponent;
  @ViewChild('panel2') panel2!: BsDockPanelComponent;
  @ViewChild('panel3') panel3!: BsDockPanelComponent;
  @ViewChild('panel4') panel4!: BsDockPanelComponent;
  @ViewChild('panel5') panel5!: BsDockPanelComponent;

  ngAfterViewInit() {
    console.log('panel1', this.panel1);
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
      floatingPanes: []
    });
  }
  
}
