import { Component, ElementRef, Input } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { BsDockPane } from '../panes/dock-pane';
import { EPaneType } from '../enums/pane-type.enum';
import { BsSplitPane } from '../panes/split-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { DomPortal } from '@angular/cdk/portal';

@Component({
  selector: 'bs-dock-pane-renderer',
  templateUrl: './dock-pane-renderer.component.html',
  styleUrls: ['./dock-pane-renderer.component.scss']
})
export class BsDockPaneRendererComponent {

  constructor(element: ElementRef) {
    // this.layoutType$ = this.layout$.pipe<EPaneType | null>(map((layout) => {
    //   if (layout === null) {
    //     return null;
    //   } else if (layout instanceof BsDocumentHost) {
    //     return EPaneType.documentHost;
    //   } else if (layout instanceof BsSplitPane) {
    //     return EPaneType.splitPane;
    //   } else if (layout instanceof BsContentPane) {
    //     return EPaneType.contentPane;
    //   } else if (layout instanceof BsTabGroupPane) {
    //     return EPaneType.tabGroupPane;
    //   } else {
    //     return null;
    //     // throw 'unknown pane type';
    //   }
    // }));
    this.portal = new DomPortal(element);
  }

  portal: DomPortal;

  paneTypes = EPaneType;
  readonly BsDocumentHostType = BsDocumentHost;
  readonly BsTabGroupType = BsTabGroupPane;
  readonly BsSplitterType = BsSplitPane;
  readonly BsContentPaneType = BsContentPane;

  //#region Layout
  layout$ = new BehaviorSubject<BsDockPane | null>(null);
  public get layout() {
    return this.layout$.value;
  }
  @Input() public set layout(value: BsDockPane | null) {
    console.log('set layout', value);
    this.layout$.next(value);
  }
  //#endregion

  // layoutType$: Observable<EPaneType | null>;
}