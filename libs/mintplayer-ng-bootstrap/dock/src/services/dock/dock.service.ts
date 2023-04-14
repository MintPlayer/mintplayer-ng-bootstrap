import { Injectable } from '@angular/core';
import { BsDockPane } from '../../panes/dock-pane';
import { BsSplitPane } from '../../panes/split-pane';
import { BsContentPane } from '../../panes/content-pane';
import { BsTabGroupPane } from '../../panes/tab-group-pane';
import { BsFloatingPane } from '../../panes/floating-pane';
import { BsDocumentHost } from '../../panes/document-host-pane';

@Injectable({
  providedIn: 'root'
})
export class BsDockService {

  constructor() {

  }

  public getAllPanes(rootPane: BsDockPane) {
    // [rootPane].reduce((prev, curr))
    const result = this.getChildPanes(rootPane)
      .flatMap(parent => [
        parent,
        ...this.getChildPanes(parent).map(child => [parent, child])
      ]);
    
  }

  private getChildPanes(pane: BsDockPane): BsDockPane[] {
    // if (pane instanceof BsContentPane) {
    //   return [pane];
    // } else if (pane instanceof BsTabGroupPane) {
    //   return (<BsDockPane[]>pane.panes).concat(pane)
    // } else if (pane instanceof BsSplitPane) {
    //   return (<BsDockPane[]>pane.panes).concat([pane])
    // } else if (pane instanceof BsFloatingPane) {
    //   return [pane, pane.pane].filter(p => !!p).map(p => p!);
    // } else if (pane instanceof BsDocumentHost) {
    //   return [pane, pane.rootPane].filter(p => !!p).map(p => p!);
    // } else {
    //   return [];
    // }
    if (pane instanceof BsContentPane) {
      return [];
    } else if (pane instanceof BsTabGroupPane) {
      return (<BsDockPane[]>pane.panes);
    } else if (pane instanceof BsSplitPane) {
      return pane.panes;
    } else if (pane instanceof BsFloatingPane) {
      return pane.pane ? [pane.pane] : [];
    } else if (pane instanceof BsDocumentHost) {
      return pane.rootPane ? [pane.rootPane] : [];
    } else {
      return [];
    }
  }
}

export interface PaneTrace {
  pane: BsDockPane;
  trace: BsDockPane[];
}