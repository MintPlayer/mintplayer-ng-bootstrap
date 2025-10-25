import { Component, ElementRef, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsDockPane } from '../panes/dock-pane';
import { EPaneType } from '../enums/pane-type.enum';
import { BsSplitPane } from '../panes/split-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { BsDockComponent } from '../dock/dock.component';

@Component({
  selector: 'bs-dock-pane-renderer',
  templateUrl: './dock-pane-renderer.component.html',
  styleUrls: ['./dock-pane-renderer.component.scss'],
  standalone: false,
})
export class BsDockPaneRendererComponent implements OnDestroy {

  constructor(private element: ElementRef<HTMLElement>, private dock: BsDockComponent) {
    this.hostElement = element.nativeElement;
  }

  private hostElement: HTMLElement;
  private registeredPane?: BsDockPane | null;

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
    if (this.registeredPane && this.registeredPane !== value) {
      this.dock.unregisterRenderer(this.registeredPane, this);
      this.registeredPane = undefined;
    }

    this.layout$.next(value);

    if (value && this.registeredPane !== value) {
      this.registeredPane = value;
      this.dock.registerRenderer(value, this, this.hostElement);
    }
  }
  //#endregion

  ngOnDestroy() {
    if (this.registeredPane) {
      this.dock.unregisterRenderer(this.registeredPane, this);
      this.registeredPane = undefined;
    }
  }
}
