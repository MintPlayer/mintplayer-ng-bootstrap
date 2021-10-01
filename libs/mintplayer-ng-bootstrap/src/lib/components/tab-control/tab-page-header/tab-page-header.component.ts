import { Component, OnInit } from '@angular/core';
import { BsTabControlComponent } from '../tab-control/tab-control.component';
import { BsTabPageComponent } from '../tab-page/tab-page.component';

@Component({
  selector: 'bs-tab-page-header',
  templateUrl: './tab-page-header.component.html',
  styleUrls: ['./tab-page-header.component.scss']
})
export class BsTabPageHeaderComponent implements OnInit {

  constructor(private tabPage: BsTabPageComponent, private tabControl: BsTabControlComponent) {
  }

  ngOnInit(): void {
  }

  headerClicked(event: MouseEvent) {
    this.tabControl.activeTab = this.tabPage;
  }

}
