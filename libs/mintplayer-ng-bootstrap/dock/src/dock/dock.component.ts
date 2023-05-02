import { Component, ContentChildren, ViewChildren, Input, OnDestroy, QueryList, HostBinding } from '@angular/core';
import { BehaviorSubject, combineLatest, combineLatestAll, map, Observable, Subject, takeUntil } from 'rxjs';
import { Overlay } from '@angular/cdk/overlay';
import { Parentified, deepClone } from '@mintplayer/parentify';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { EPaneType } from '../enums/pane-type.enum';
import { BsDockLayout } from '../interfaces/dock-layout';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { BsSplitPane } from '../panes/split-pane';
import { BsDockPaneRendererComponent } from '../dock-pane-renderer/dock-pane-renderer.component';

@Component({
  selector: 'bs-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
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

    // combineLatest([this.layout$, this.panels$])
    //   .pipe(takeUntil(this.destroyed$))
    //   .subscribe(([layout, panels]) => {
        
    //   })

    this.floating$.pipe(takeUntil(this.destroyed$))
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

    this.parentifiedLayout$.pipe(takeUntil(this.destroyed$)).subscribe(console.log);
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

  @HostBinding('class.position-absolute')
  positionAbsolute = true;

  @HostBinding('style.top')
  @HostBinding('style.left')
  @HostBinding('style.bottom')
  @HostBinding('style.right')
  positionPx = 0;

  parentifiedLayout$: Observable<Parentified<BsDockLayout>>;

  destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
    this.floating$.value.forEach(panel => panel.disposeOverlay());
  }
}
