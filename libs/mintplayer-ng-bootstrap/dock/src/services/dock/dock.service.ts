import { Injectable } from '@angular/core';
import { BsDockPane } from '../../panes/dock-pane';
import { BsSplitPane } from '../../panes/split-pane';
import { BsContentPane } from '../../panes/content-pane';
import { BsTabGroupPane } from '../../panes/tab-group-pane';
import { BsFloatingPane } from '../../panes/floating-pane';
import { BsDocumentHost } from '../../panes/document-host-pane';
import { BsDockLayout } from '../../interfaces/dock-layout';

@Injectable({
  providedIn: 'root'
})
export class BsDockService {
  public buildTraces(layout: BsDockLayout) {
    const result = [layout.rootPane, ...layout.floatingPanes].map(pane => this.buildTracesPrivate([pane]));
    // const result = this.buildTracesPrivate([layout.rootPane]);
    return result.flatMap(traceGroup => traceGroup);
  }

  private buildTracesPrivate(currentSequence: BsDockPane[]): PaneTraceResult[] {
    const children = this.getChildPanes(currentSequence[currentSequence.length - 1]);
    if (children.length === 0) {
      return [{
        finished: true,
        trace: currentSequence
      }];
    } else {
      const result = children.map(child => this.buildTracesPrivate([...currentSequence, child]));
      return result.flatMap(r => r);
    }
  }

  private getChildPanes(pane: BsDockPane): BsDockPane[] {
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

export interface PaneTraceResult {
  trace: BsDockPane[];
  finished: boolean;
}