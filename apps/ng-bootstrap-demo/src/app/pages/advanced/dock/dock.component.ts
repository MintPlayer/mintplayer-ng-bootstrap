import { Component, ViewChild, AfterContentInit, AfterViewInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsContentPane, BsDockLayout, BsDockPane, BsDockPanelComponent, BsDocumentHost, BsSplitPane, BsTabGroupPane, EPaneType, ESplitPaneOrientation } from '@mintplayer/ng-bootstrap/dock';

@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
})
export class DockComponent implements AfterContentInit, AfterViewInit {

  constructor() {
    this.layout$ = new BehaviorSubject<BsDockLayout>({
      rootPane: new BsSplitPane({
        orientation: ESplitPaneOrientation.horizontal,
        panes: [
          new BsTabGroupPane({
            panes: []
          })
        ]
      }),
      floatingPanes: []
    });
  }

  layout$: BehaviorSubject<BsDockLayout>;
  @ViewChild('panel1') panel1!: BsDockPanelComponent;
  @ViewChild('panel2') panel2!: BsDockPanelComponent;
  @ViewChild('panel3') panel3!: BsDockPanelComponent;
  @ViewChild('panel4') panel4!: BsDockPanelComponent;

  ngAfterContentInit() {
    // const root = new BsSplitPane({
    //   orientation: ESplitPaneOrientation.horizontal,
    //   panes: [
    //     // new BsContentPane({
    //     //   dockPanel: this.panel1,
    //     // }),
    //     // new BsDocumentHost({
    //     //   rootPane: new BsTabGroupPane({
    //     //     panes: [
    //     //       new BsContentPane({
    //     //         dockPanel: this.panel2,
    //     //       }),
    //     //       new BsContentPane({
    //     //         dockPanel: this.panel3,
    //     //       }),
    //     //     ]
    //     //   })
    //     // }),
    //     // new BsContentPane({
    //     //   dockPanel: this.panel4,
    //     // }),
    //     new BsContentPane(this.panel1),
    //     new BsContentPane(this.panel4),
    //   ]
    // });
    console.log('');
  }

  ngAfterViewInit() {
    console.log('panel1', this.panel1);
    const root = new BsSplitPane({
      orientation: ESplitPaneOrientation.horizontal,
      panes: [
        new BsContentPane({
          dockPanel: this.panel1,
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
        new BsContentPane({
          dockPanel: this.panel4,
        })
      ]
    });

    this.layout$.next({
      rootPane: root,
      floatingPanes: []
    });
  }
  
}
