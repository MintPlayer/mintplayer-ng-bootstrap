import { CdkDragDrop, CdkDragStart, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, ContentChildren, ElementRef, HostBinding, Input, OnDestroy, QueryList, Renderer2 } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, map, Observable, Subject, takeUntil } from 'rxjs';
import { BsTabPageComponent } from '../tab-page/tab-page.component';
import { BsTabsPosition } from '../tabs-position';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  providers: [
    { provide: 'TAB_CONTROL', useExisting: BsTabControlComponent }
  ]
})
export class BsTabControlComponent implements OnDestroy {

  constructor(element: ElementRef<any>) {
    this.tabControlId$ = new BehaviorSubject<number>(++BsTabControlComponent.tabControlCounter);
    this.tabControlName$ = this.tabControlId$.pipe(map((id) => `bs-tab-control-${id}`));
    this.element = element;
    combineLatest([this.tabPages$, this.activeTab$, this.selectFirstTab$])
      .pipe(filter(([tabPages, activeTab, selectFirstTab]) => {
        return !!tabPages && (!activeTab || !tabPages.some(tp => tp === activeTab)) && selectFirstTab;
      }))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([tabPages, activeTab, selectFirstTab]) => {
        const notDisabled = tabPages!.filter((tp) => !tp.disabled);
        if (notDisabled.length > 0) {
          setTimeout(() => this.activeTab$.next(notDisabled[0]));
        }
      });
    this.topTabs$ = this.tabsPosition$.pipe(map(position => position === 'top'));
    this.bottomTabs$ = this.tabsPosition$.pipe(map(position => position === 'bottom'));
    this.disableDragDrop$ = this.allowDragDrop$.pipe(map(allow => !allow));
  }

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  @ContentChildren(BsTabPageComponent) set setTabPages(value: QueryList<BsTabPageComponent>) {
    this.tabPages$.next(value);
    const list = value.toArray();
    const toAdd = value.filter(tp => !this.orderedTabPages.includes(tp));
    this.orderedTabPages = this.orderedTabPages.concat(toAdd).filter((tp) => list.includes(tp));
  }
  @Input() public border = true;
  @Input() public set restrictDragging(value: boolean) {
    this.dragBoundarySelector = value ? 'ul' : '';
  }
  dragBoundarySelector = '';
  element: ElementRef<any>;
  tabPages$ = new BehaviorSubject<QueryList<BsTabPageComponent> | null>(null);
  activeTab$ = new BehaviorSubject<BsTabPageComponent | null>(null);
  orderedTabPages: BsTabPageComponent[] = [];
  tabControlId$: BehaviorSubject<number>;
  tabControlName$: Observable<string>;
  topTabs$: Observable<boolean>;
  bottomTabs$: Observable<boolean>;
  disableDragDrop$: Observable<boolean>;
  static tabControlCounter = 0;
  tabCounter = 0;
  destroyed$ = new Subject()

  //#region SelectFirstTab
  selectFirstTab$ = new BehaviorSubject<boolean>(true);
  public get selectFirstTab() {
    return this.selectFirstTab$.value;
  }
  @Input() public set selectFirstTab(value: boolean) {
    this.selectFirstTab$.next(value);
  }
  //#endregion
  //#region TabsPosition
  tabsPosition$ = new BehaviorSubject<BsTabsPosition>('top');
  public get tabsPosition() {
    return this.tabsPosition$.value;
  }
  @Input() public set tabsPosition(value: BsTabsPosition) {
    this.tabsPosition$.next(value);
  }
  //#endregion
  //#region AllowDragDrop
  allowDragDrop$ = new BehaviorSubject<boolean>(false);
  public get allowDragDrop() {
    return this.allowDragDrop$.value;
  }
  @Input() public set allowDragDrop(value: boolean) {
    this.allowDragDrop$.next(value);
  }
  //#endregion

  setActiveTab(tab: BsTabPageComponent) {
    if (!tab.disabled) {
      this.activeTab$.next(tab);
    }
    return false;
  }

  startDragTab(ev: CdkDragStart<BsTabPageComponent>) {
    if ('vibrate' in navigator) {
      navigator.vibrate([30]);
    }
  }

  moveTab(ev: CdkDragDrop<QueryList<BsTabPageComponent> | null>) {
    if (ev.previousContainer === ev.container) {
      moveItemInArray(
        this.orderedTabPages,
        ev.previousIndex, 
        ev.currentIndex);
    } else {
      // transferArrayItem(
      //   ev.previousContainer.data,
      //   ev.container.data,
      //   ev.previousIndex,
      //   ev.currentIndex);
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

}
