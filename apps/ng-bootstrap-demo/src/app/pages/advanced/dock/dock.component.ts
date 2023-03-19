import { Component, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsContentPane, BsDockLayout, BsDockPanelComponent, BsDocumentHost, BsSplitPane, BsTabGroupPane, EPaneType, ESplitPaneOrientation } from '@mintplayer/ng-bootstrap/dock';

@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
})
export class DockComponent {
  constructor() {
    this.layout$ = new BehaviorSubject<BsDockLayout>({
      rootPane: <BsSplitPane>{
        type: EPaneType.splitPane,
        orientation: ESplitPaneOrientation.horizontal,
        panes: [
          <BsContentPane>{
            type: EPaneType.contentPane,
            dockPanel: this.panel1,
          },
          <BsDocumentHost>{
            type: EPaneType.documentHost,
            rootPane: <BsTabGroupPane>{
              type: EPaneType.tabGroupPane,
              panes: [
                <BsContentPane>{
                  type: EPaneType.contentPane,
                  dockPanel: this.panel2,
                },
                <BsContentPane>{
                  type: EPaneType.contentPane,
                  dockPanel: this.panel3,
                },
              ]
            }
          },
          <BsContentPane>{
            type: EPaneType.contentPane,
            dockPanel: this.panel4,
          },
        ]
      },
      floatingPanes: []
    });

  }

  layout$: BehaviorSubject<BsDockLayout>;
  @ViewChild('panel1') panel1!: BsDockPanelComponent;
  @ViewChild('panel2') panel2!: BsDockPanelComponent;
  @ViewChild('panel3') panel3!: BsDockPanelComponent;
  @ViewChild('panel4') panel4!: BsDockPanelComponent;
}
