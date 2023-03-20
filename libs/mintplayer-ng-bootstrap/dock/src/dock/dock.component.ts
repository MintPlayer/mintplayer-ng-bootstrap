import { Component, ContentChildren, Input, OnDestroy, QueryList } from '@angular/core';
import { BehaviorSubject, combineLatest, combineLatestAll, Subject, takeUntil } from 'rxjs';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { EPaneType } from '../enums/pane-type.enum';
import { BsDockLayout } from '../interfaces/dock-layout';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsDocumentHost } from '../panes/document-host-pane';

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

  destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
