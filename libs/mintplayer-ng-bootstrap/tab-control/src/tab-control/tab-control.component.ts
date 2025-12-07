import { CdkDragDrop, CdkDragStart, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ContentChildren, ElementRef, HostBinding, Input, QueryList, signal, computed, effect, untracked } from '@angular/core';
import { BsTabPageComponent } from '../tab-page/tab-page.component';
import { BsTabsPosition } from '../tabs-position';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  standalone: false,
  providers: [
    { provide: 'TAB_CONTROL', useExisting: BsTabControlComponent }
  ],
})
export class BsTabControlComponent {

  constructor(element: ElementRef<any>) {
    this.tabControlId = signal<number>(++BsTabControlComponent.tabControlCounter);
    this.tabControlName = computed(() => `bs-tab-control-${this.tabControlId()}`);
    this.element = element;

    // Effect to select first tab when needed
    effect(() => {
      const tabPages = this.tabPages();
      const activeTab = this.activeTab();
      const selectFirstTab = this.selectFirstTabSignal();
      untracked(() => {
        if (tabPages && (!activeTab || !tabPages.some(tp => tp === activeTab)) && selectFirstTab) {
          const notDisabled = tabPages.filter((tp) => !tp.disabled);
          if (notDisabled.length > 0) {
            setTimeout(() => this.activeTab.set(notDisabled[0]));
          }
        }
      });
    });

    this.topTabs = computed(() => this.tabsPositionSignal() === 'top');
    this.bottomTabs = computed(() => this.tabsPositionSignal() === 'bottom');
    this.disableDragDrop = computed(() => !this.allowDragDropSignal());
  }

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  @ContentChildren(BsTabPageComponent) set setTabPages(value: QueryList<BsTabPageComponent>) {
    this.tabPages.set(value.toArray());
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
  tabPages = signal<BsTabPageComponent[]>([]);
  activeTab = signal<BsTabPageComponent | null>(null);
  orderedTabPages: BsTabPageComponent[] = [];
  tabControlId;
  tabControlName;
  topTabs;
  bottomTabs;
  disableDragDrop;
  static tabControlCounter = 0;
  tabCounter = 0;

  //#region SelectFirstTab
  selectFirstTabSignal = signal<boolean>(true);
  @Input() set selectFirstTab(val: boolean) {
    this.selectFirstTabSignal.set(val);
  }
  //#endregion
  //#region TabsPosition
  tabsPositionSignal = signal<BsTabsPosition>('top');
  @Input() set tabsPosition(val: BsTabsPosition) {
    this.tabsPositionSignal.set(val);
  }
  //#endregion
  //#region AllowDragDrop
  allowDragDropSignal = signal<boolean>(false);
  @Input() set allowDragDrop(val: boolean) {
    this.allowDragDropSignal.set(val);
  }
  //#endregion

  setActiveTab(tab: BsTabPageComponent) {
    if (!tab.disabled) {
      this.activeTab.set(tab);
    }
    return false;
  }

  startDragTab(ev: CdkDragStart<BsTabPageComponent>) {
    if ('vibrate' in navigator) {
      navigator.vibrate([30]);
    }
  }

  moveTab(ev: CdkDragDrop<BsTabPageComponent[]>) {
    if (ev.previousContainer === ev.container) {
      moveItemInArray(
        this.orderedTabPages,
        ev.previousIndex,
        ev.currentIndex);
    }
  }
}
