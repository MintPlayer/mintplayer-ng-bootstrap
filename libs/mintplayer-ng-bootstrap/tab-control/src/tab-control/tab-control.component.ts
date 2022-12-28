import { Component, ContentChildren, HostBinding, Input } from '@angular/core';
import { BsTabPageComponent } from '../tab-page/tab-page.component';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss']
})
export class BsTabControlComponent {

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  @ContentChildren(BsTabPageComponent) tabPages!: BsTabPageComponent[];
  @Input() public border = true;
  activeTab: BsTabPageComponent | null = null;

  setActiveTab(tab: BsTabPageComponent) {
    if (!tab.disabled) {
      this.activeTab = tab;
    }
    return false;
  }

}
