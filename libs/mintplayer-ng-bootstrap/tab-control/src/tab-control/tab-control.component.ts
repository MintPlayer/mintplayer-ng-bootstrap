import { CdkDragDrop, CdkDragStart, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, ContentChildren, effect, ElementRef, HostBinding, inject, input, QueryList, signal } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTabControlComponent {
  element = inject(ElementRef);

  constructor() {
    this.tabControlId = signal(++BsTabControlComponent.tabControlCounter);

    effect(() => {
      const tabPages = this.tabPages();
      const activeTab = this.activeTab();
      const selectFirstTab = this.selectFirstTab();
      if (tabPages && (!activeTab || !tabPages.some(tp => tp === activeTab)) && selectFirstTab) {
        const notDisabled = tabPages.filter((tp) => !tp.disabled());
        if (notDisabled.length > 0) {
          setTimeout(() => this.activeTab.set(notDisabled[0]));
        }
      }
    });
  }

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  @ContentChildren(BsTabPageComponent) set setTabPages(value: QueryList<BsTabPageComponent>) {
    this.tabPages.set(value);
    const list = value.toArray();
    const toAdd = value.filter(tp => !this.orderedTabPages.includes(tp));
    this.orderedTabPages = this.orderedTabPages.concat(toAdd).filter((tp) => list.includes(tp));
  }

  border = input(true);
  restrictDragging = input(false);
  selectFirstTab = input(true);
  tabsPosition = input<BsTabsPosition>('top');
  allowDragDrop = input(false);

  dragBoundarySelector = computed(() => this.restrictDragging() ? 'ul' : '');
  tabPages = signal<QueryList<BsTabPageComponent> | null>(null);
  activeTab = signal<BsTabPageComponent | null>(null);
  orderedTabPages: BsTabPageComponent[] = [];
  tabControlId = signal<number>(0);
  tabControlName = computed(() => `bs-tab-control-${this.tabControlId()}`);
  topTabs = computed(() => this.tabsPosition() === 'top');
  bottomTabs = computed(() => this.tabsPosition() === 'bottom');
  disableDragDrop = computed(() => !this.allowDragDrop());
  static tabControlCounter = 0;
  tabCounter = 0;

  setActiveTab(tab: BsTabPageComponent) {
    if (!tab.disabled()) {
      this.activeTab.set(tab);
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
    }
  }
}
