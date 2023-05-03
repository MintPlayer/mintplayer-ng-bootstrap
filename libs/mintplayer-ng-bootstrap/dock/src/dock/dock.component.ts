import { Component, ContentChildren, forwardRef, ViewChildren, Input, OnDestroy, QueryList, HostBinding } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Parentified, deepClone } from '@mintplayer/parentify';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockLayout } from '../interfaces/dock-layout';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { BsSplitPane } from '../panes/split-pane';
import { BsDockPaneRendererComponent } from '../dock-pane-renderer/dock-pane-renderer.component';
import { DraggingPanel } from '../interfaces/dragging-panel';

@Component({
  selector: 'bs-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss'],
  providers: [
    { provide: 'DOCK', useExisting: forwardRef(() => BsDockComponent) }
  ]
})
export class BsDockComponent implements OnDestroy {
  constructor() {
    const tabs = new BsTabGroupPane();
    const docHost = new BsDocumentHost();
    docHost.rootPane = tabs;

    this.layout$ = new BehaviorSubject<BsDockLayout>({
      rootPane: docHost,
      floatingPanes: []
    });

    this.floating$.pipe(takeUntilDestroyed())
      .subscribe((floating) => {
        floating.forEach((panel) => panel.moveToOverlay());
      });
      
    this.parentifiedLayout$ = this.layout$.pipe(map(layout => {
      const clone = deepClone(
        layout, true,
        // []
        [BsContentPane, BsDocumentHost, BsFloatingPane, BsSplitPane, BsTabGroupPane],
        true,
        this.paneCache);

      // this.paneCache = clone.cache;

      console.log('parentify', { layout, result: clone.result });

      return clone.result;
    }));

    // this.parentifiedLayout$.pipe(takeUntil(this.destroyed$)).subscribe(console.log);

    this.draggingPanel$.pipe(takeUntil(this.destroyed$)).subscribe(console.log);
  }

  private paneCache?: Map<any, any>;

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

  floating$ = new BehaviorSubject<BsDockPaneRendererComponent[]>([]);
  @ViewChildren('floating') set floatingPanes(value: QueryList<BsDockPaneRendererComponent>) {
    this.floating$.next(value.toArray());
  }

  draggingPanel$ = new BehaviorSubject<DraggingPanel | null>(null);

  @HostBinding('class.position-absolute')
  positionAbsolute = true;

  @HostBinding('style.top')
  @HostBinding('style.left')
  @HostBinding('style.bottom')
  @HostBinding('style.right')
  positionPx = 0;

  parentifiedLayout$: Observable<Parentified<BsDockLayout>>;

  ngOnDestroy() {
    this.floating$.value.forEach(panel => panel.disposeOverlay());
  }
}
