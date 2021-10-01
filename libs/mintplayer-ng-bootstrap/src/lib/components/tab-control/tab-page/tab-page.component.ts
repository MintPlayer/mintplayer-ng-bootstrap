import { Component, OnInit, ContentChild } from '@angular/core';
import { BsTabControlComponent } from '../tab-control/tab-control.component';
import { BsTabPageHeaderComponent } from '../tab-page-header/tab-page-header.component';

@Component({
  selector: 'bs-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss']
})
export class BsTabPageComponent implements OnInit {

  tabControl: BsTabControlComponent;
  constructor(tabControl: BsTabControlComponent) {
    this.tabControl = tabControl;
  }

  @ContentChild(BsTabPageHeaderComponent) header!: BsTabPageHeaderComponent;

  ngOnInit() {
  }

}
