import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, ContentChildren, ElementRef, HostBinding, Input, QueryList, Renderer2 } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { BsTabPageComponent } from '../tab-page/tab-page.component';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss']
})
export class BsTabControlComponent {

  constructor(element: ElementRef<any>) {
    this.tabControlId$ = new BehaviorSubject<number>(++BsTabControlComponent.tabControlCounter);
    this.tabControlName$ = this.tabControlId$.pipe(map((id) => `bs-tab-control-${id}`));
    this.element = element;
  }

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  @ContentChildren(BsTabPageComponent) set setTabPages(value: QueryList<BsTabPageComponent>) {
    console.log('tabpages', value);
    this.tabPages = value;
    const missing = value.filter(tp => !this.orderedTabPages.includes(tp));
    this.orderedTabPages = this.orderedTabPages.concat(missing);
  }
  @Input() public border = true;
  @Input() public set restrictDragging(value: boolean) {
    this.dragBoundarySelector = value ? 'ul' : '';
  }
  dragBoundarySelector = '';
  element: ElementRef<any>;
  tabPages!: QueryList<BsTabPageComponent>;
  orderedTabPages: BsTabPageComponent[] = [];
  activeTab: BsTabPageComponent | null = null;
  tabControlId$: BehaviorSubject<number>;
  tabControlName$: Observable<string>;
  static tabControlCounter = 0;
  tabCounter = 0;

  setActiveTab(tab: BsTabPageComponent) {
    if (!tab.disabled) {
      this.activeTab = tab;
    }
    return false;
  }

  moveTab(ev: CdkDragDrop<QueryList<BsTabPageComponent>>) {
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

}
