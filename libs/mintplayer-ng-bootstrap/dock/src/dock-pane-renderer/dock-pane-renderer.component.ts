import { Component, ElementRef, HostBinding, Input } from '@angular/core';
import { DomPortal } from '@angular/cdk/portal';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { BsDockPane } from '../panes/dock-pane';
import { EPaneType } from '../enums/pane-type.enum';
import { BsSplitPane } from '../panes/split-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';

@Component({
  selector: 'bs-dock-pane-renderer',
  templateUrl: './dock-pane-renderer.component.html',
  styleUrls: ['./dock-pane-renderer.component.scss']
})
export class BsDockPaneRendererComponent {

  constructor(private overlay: Overlay, element: ElementRef) {
    this.portal = new DomPortal(element);
  }

  portal: DomPortal;

  paneTypes = EPaneType;
  readonly BsDocumentHostType = BsDocumentHost;
  readonly BsTabGroupType = BsTabGroupPane;
  readonly BsSplitterType = BsSplitPane;
  readonly BsContentPaneType = BsContentPane;
  readonly BsFloatingPaneType = BsFloatingPane;

  //#region Layout
  layout$ = new BehaviorSubject<BsDockPane | null>(null);
  public get layout() {
    return this.layout$.value;
  }
  @Input() public set layout(value: BsDockPane | null) {
    this.layout$.next(value);
  }
  //#endregion

  private overlayRef?: OverlayRef;
  public moveToOverlay() {
    if (!this.overlayRef && !this.portal.isAttached) {
      this.overlayRef = this.overlay.create({});
      this.portal.attach(this.overlayRef);
    }
  }

  public disposeOverlay() {
    if (this.overlayRef) {
      this.portal.detach();
      this.overlayRef.dispose();
      this.overlayRef = undefined;
    }
  }
}
