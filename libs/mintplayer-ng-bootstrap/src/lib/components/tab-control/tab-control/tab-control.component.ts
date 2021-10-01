import { AfterViewInit, Component, ContentChildren, OnInit } from '@angular/core';
import { BsTabPageHeaderComponent } from '../tab-page-header/tab-page-header.component';
import { BsTabPageComponent } from '../tab-page/tab-page.component';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss']
})
export class BsTabControlComponent implements OnInit, AfterViewInit {

  constructor() {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    console.log('headers', this.tabPageHeaders);
  }

  @ContentChildren(BsTabPageComponent) tabPages!: BsTabPageComponent[];
  @ContentChildren(BsTabPageHeaderComponent, { descendants: true }) tabPageHeaders!: BsTabPageHeaderComponent[];
  activeTab: BsTabPageComponent | null = null;
}
