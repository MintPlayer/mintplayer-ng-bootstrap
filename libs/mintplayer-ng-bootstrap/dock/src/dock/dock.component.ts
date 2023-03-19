import { Component, ContentChildren, Input, QueryList } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { EPaneType } from '../enums/pane-type.enum';
import { BsTabGroupPane } from '../interfaces/tab-group-pane';
import { BsDockLayout } from '../interfaces/dock-layout';
import { BsDocumentHost } from '../interfaces/document-host-pane';
import { BsContentPane } from '../interfaces/content-pane';

@Component({
  selector: 'bs-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
})
export class BsDockComponent {
  constructor() {
    this.layout$ = new BehaviorSubject<BsDockLayout>({
      rootPane: <BsDocumentHost>{
        type: EPaneType.documentHost,
        rootPane: <BsTabGroupPane>{
          type: EPaneType.tabGroupPane,
          panes: []
        }
      },
      floatingPanes: []
    });
  }

  //#region Panels
  panels$ = new BehaviorSubject<BsDockPanelComponent[]>([]);
  @ContentChildren(BsDockPanelComponent) set panels(value: QueryList<BsDockPanelComponent>) {
    this.panels$.next(value.toArray());
  }
  //#endregion
  //#region Layout
  layout$: BehaviorSubject<BsDockLayout>;
  public get layout() {
    return this.layout$.value;
  }
  @Input() public set layout(value: BsDockLayout) {
    this.layout$.next(value);
  }
  //#endregion
}
