import { Component, ContentChildren, HostBinding, Input } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { BsTabPageComponent } from '../tab-page/tab-page.component';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss']
})
export class BsTabControlComponent {

  constructor() {
    this.tabControlId$ = new BehaviorSubject<number>(++BsTabControlComponent.tabControlCounter);
    this.tabControlName$ = this.tabControlId$.pipe(map((id) => `bs-tab-control-${id}`));
  }

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  @ContentChildren(BsTabPageComponent) tabPages!: BsTabPageComponent[];
  @Input() public border = true;
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

}
