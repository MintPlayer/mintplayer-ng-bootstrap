import { Component, ContentChildren, OnInit } from '@angular/core';
import { BsTabPageComponent } from '../tab-page/tab-page.component';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss']
})
export class BsTabControlComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

  setActiveTab(tab: BsTabPageComponent) {
    if (!tab.disabled) {
      this.activeTab = tab;
    }
    return false;
  }

  @ContentChildren(BsTabPageComponent) tabPages!: BsTabPageComponent[];
  activeTab: BsTabPageComponent | null = null;
}
