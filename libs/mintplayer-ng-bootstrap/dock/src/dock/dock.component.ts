import { Component, ContentChildren, ViewChildren, Input, OnDestroy, QueryList, HostBinding } from '@angular/core';
import { BehaviorSubject, combineLatest, combineLatestAll, Subject, takeUntil } from 'rxjs';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { EPaneType } from '../enums/pane-type.enum';
import { BsDockLayout } from '../interfaces/dock-layout';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { BsDockPaneRendererComponent } from '../dock-pane-renderer/dock-pane-renderer.component';
import { Overlay } from '@angular/cdk/overlay';

@Component({
  selector: 'bs-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
})
export class BsDockComponent implements OnDestroy {
  constructor(private overlay: Overlay) {
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
        floating.forEach((panel) => {
          const overlayRef = this.overlay.create({});
          overlayRef.attach(panel.portal);
        });
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

  destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
