import { CdkDragDrop, CdkDragStart, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, effect, ElementRef, inject, input, signal } from '@angular/core';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsTabPageComponent } from '../tab-page/tab-page.component';
import { BsTabsPosition } from '../tabs-position';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  imports: [NgTemplateOutlet, DragDropModule, BsNoNoscriptDirective],
  providers: [
    { provide: 'TAB_CONTROL', useExisting: BsTabControlComponent }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-block position-relative',
  },
})
export class BsTabControlComponent {
  element = inject(ElementRef);

  constructor() {
    this.tabControlId = signal(++BsTabControlComponent.tabControlCounter);

    effect(() => {
      const tabPages = this.tabPages();
      const activeTab = this.activeTab();
      const selectFirstTab = this.selectFirstTab();
      if (tabPages.length > 0 && (!activeTab || !tabPages.some(tp => tp === activeTab)) && selectFirstTab) {
        const notDisabled = tabPages.filter((tp) => !tp.disabled());
        if (notDisabled.length > 0) {
          setTimeout(() => this.activeTab.set(notDisabled[0]));
        }
      }
    });

    // Update orderedTabPages whenever content children change
    effect(() => {
      const list = this.tabPages();
      this.orderedTabPages.update(current => {
        const toAdd = list.filter(tp => !current.includes(tp));
        return current.concat(toAdd).filter((tp) => list.includes(tp));
      });
    });
  }

  border = input(true);
  restrictDragging = input(false);
  selectFirstTab = input(true);
  tabsPosition = input<BsTabsPosition>('top');
  allowDragDrop = input(false);

  dragBoundarySelector = computed(() => this.restrictDragging() ? 'ul' : '');
  readonly tabPages = contentChildren(BsTabPageComponent);
  activeTab = signal<BsTabPageComponent | null>(null);
  orderedTabPages = signal<BsTabPageComponent[]>([]);
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

  moveTab(ev: CdkDragDrop<readonly BsTabPageComponent[]>) {
    if (ev.previousContainer === ev.container) {
      this.orderedTabPages.update(current => {
        const copy = [...current];
        moveItemInArray(copy, ev.previousIndex, ev.currentIndex);
        return copy;
      });
    }
  }
}
